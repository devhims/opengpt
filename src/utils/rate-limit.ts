import { getCloudflareContext } from '@opennextjs/cloudflare';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Rate limit configurations
export const RATE_LIMITS = {
  chat: {
    maxRequests: 20,
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
  },
  image: {
    maxRequests: 5,
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
  },
  speech: {
    maxRequests: 10,
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
  },
  tts: {
    maxRequests: 10,
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
  },
} as const;

export type RateLimitType = keyof typeof RATE_LIMITS;

/**
 * Get user identifier from request
 * Uses IP address for anonymous rate limiting
 */
function getUserIdentifier(request: Request): string {
  // Get IP address from Cloudflare headers (most reliable)
  const clientIP =
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
    request.headers.get('X-Real-IP') ||
    request.headers.get('Forwarded')?.split(',')[0]?.trim() ||
    'anonymous';

  // Log IP for debugging only in development
  if (process.env.NODE_ENV === 'development') {
    console.log('Rate limit - Detected IP:', clientIP);
  }

  return clientIP;
}

/**
 * Check rate limit using Upstash (preferred for production)
 */
async function checkRateLimitUpstash(
  request: Request,
  type: RateLimitType,
  env: CloudflareEnv,
): Promise<{ allowed: boolean; remaining: number; resetTime: number; error?: string }> {
  const userId = getUserIdentifier(request);
  const maxRequests = RATE_LIMITS[type].maxRequests;

  // Initialize Upstash Redis within the request context
  let redis: Redis | null = null;
  let ratelimit: Ratelimit | null = null;

  if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
    try {
      redis = new Redis({
        url: env.UPSTASH_REDIS_REST_URL,
        token: env.UPSTASH_REDIS_REST_TOKEN,
      });

      ratelimit = new Ratelimit({
        redis,
        limiter: Ratelimit.fixedWindow(maxRequests, '24 h'),
        prefix: `ratelimit:${type}`,
      });
    } catch (error) {
      console.error('Failed to initialize Upstash Redis:', error);
      return checkRateLimitKV(request, type, env);
    }
  } else {
    // Upstash not configured, fallback to KV
    return checkRateLimitKV(request, type, env);
  }

  if (!ratelimit) {
    return checkRateLimitKV(request, type, env);
  }

  try {
    const result = await ratelimit.limit(userId);

    if (!result.success) {
      console.log(`Rate limit exceeded for ${type}`);
      return {
        allowed: false,
        remaining: Math.max(0, result.remaining),
        resetTime: result.reset,
        error: `Rate limit exceeded. ${maxRequests} ${type} generations allowed per day.`,
      };
    }

    return {
      allowed: true,
      remaining: Math.max(0, result.remaining),
      resetTime: result.reset,
    };
  } catch (error) {
    console.error('Upstash rate limit error:', error);
    // Fallback to KV on error
    return checkRateLimitKV(request, type, env);
  }
}

/**
 * Check rate limit using Cloudflare KV (fallback)
 */
async function checkRateLimitKV(
  request: Request,
  type: RateLimitType,
  env: CloudflareEnv,
): Promise<{ allowed: boolean; remaining: number; resetTime: number; error?: string }> {
  if (!env.RATE_LIMIT_KV) {
    console.warn('RATE_LIMIT_KV binding not configured');
    return { allowed: true, remaining: RATE_LIMITS[type].maxRequests, resetTime: 0 };
  }

  const userId = getUserIdentifier(request);
  const dayTimestamp = getCurrentDayTimestamp();
  const key = `ratelimit:${type}:${userId}:${dayTimestamp}`;
  const maxRequests = RATE_LIMITS[type].maxRequests;
  const resetTime = getCurrentDayTimestamp() + RATE_LIMITS[type].windowMs;

  try {
    // Get current count
    const currentCountStr = await env.RATE_LIMIT_KV.get(key);
    const currentCount = currentCountStr ? parseInt(currentCountStr, 10) : 0;

    if (currentCount >= maxRequests) {
      console.log('KV Rate limit exceeded');
      return {
        allowed: false,
        remaining: 0,
        resetTime,
        error: `Rate limit exceeded. ${maxRequests} ${type} generations allowed per day.`,
      };
    }

    // Increment count
    const newCount = currentCount + 1;
    await env.RATE_LIMIT_KV.put(key, newCount.toString(), {
      expirationTtl: Math.floor((resetTime - Date.now()) / 1000),
    });

    return {
      allowed: true,
      remaining: maxRequests - newCount,
      resetTime,
    };
  } catch (error) {
    console.error('Rate limit check error:', error);
    return {
      allowed: false,
      remaining: 0,
      resetTime,
      error: 'Rate limit check failed. Please try again later.',
    };
  }
}

/**
 * Get the current UTC day timestamp (resets at 0:00 UTC)
 */
function getCurrentDayTimestamp(): number {
  const now = new Date();
  const utcDate = new Date(now.getTime() + now.getTimezoneOffset() * 60000);
  utcDate.setUTCHours(0, 0, 0, 0);
  return utcDate.getTime();
}

/**
 * Check and update rate limit for a user
 * Tries Upstash first, falls back to Cloudflare KV
 */
export async function checkRateLimit(
  request: Request,
  type: RateLimitType,
): Promise<{ allowed: boolean; remaining: number; resetTime: number; error?: string }> {
  // Disable rate limiting in development
  if (process.env.NODE_ENV === 'development') {
    return {
      allowed: true,
      remaining: 999,
      resetTime: Date.now() + 24 * 60 * 60 * 1000, // 24 hours from now
    };
  }

  // Try Upstash first (if configured)
  const { env } = getCloudflareContext();

  if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
    return checkRateLimitUpstash(request, type, env);
  }

  // Fallback to Cloudflare KV
  return checkRateLimitKV(request, type, env);
}

/**
 * Get rate limit status without incrementing counter
 */
export async function getRateLimitStatus(
  request: Request,
  type: RateLimitType,
): Promise<{ remaining: number; resetTime: number; used: number }> {
  // Disable rate limiting in development
  if (process.env.NODE_ENV === 'development') {
    return {
      remaining: 999,
      resetTime: Date.now() + 24 * 60 * 60 * 1000, // 24 hours from now
      used: 0,
    };
  }

  const { env } = getCloudflareContext();

  // If Upstash is configured, use it for status
  if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
    try {
      const redis = new Redis({
        url: env.UPSTASH_REDIS_REST_URL,
        token: env.UPSTASH_REDIS_REST_TOKEN,
      });

      const ratelimit = new Ratelimit({
        redis,
        limiter: Ratelimit.fixedWindow(RATE_LIMITS[type].maxRequests, '24 h'),
        prefix: `ratelimit:${type}`,
      });

      const userId = getUserIdentifier(request);
      const result = await ratelimit.limit(userId);
      const maxRequests = RATE_LIMITS[type].maxRequests;

      return {
        remaining: Math.max(0, result.remaining),
        resetTime: result.reset,
        used: maxRequests - result.remaining,
      };
    } catch (error) {
      console.error('Upstash status check error:', error);
    }
  }

  // Fallback to KV status
  if (!env.RATE_LIMIT_KV) {
    return {
      remaining: RATE_LIMITS[type].maxRequests,
      resetTime: getCurrentDayTimestamp() + RATE_LIMITS[type].windowMs,
      used: 0,
    };
  }

  const userId = getUserIdentifier(request);
  const dayTimestamp = getCurrentDayTimestamp();
  const key = `ratelimit:${type}:${userId}:${dayTimestamp}`;
  const resetTime = getCurrentDayTimestamp() + RATE_LIMITS[type].windowMs;

  try {
    const currentCountStr = await env.RATE_LIMIT_KV.get(key);
    const currentCount = currentCountStr ? parseInt(currentCountStr, 10) : 0;
    const maxRequests = RATE_LIMITS[type].maxRequests;

    return {
      remaining: Math.max(0, maxRequests - currentCount),
      resetTime,
      used: currentCount,
    };
  } catch (error) {
    console.error('KV Rate limit status check error:', error);
    return {
      remaining: RATE_LIMITS[type].maxRequests,
      resetTime,
      used: 0,
    };
  }
}
