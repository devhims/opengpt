import type { ImageGenerationRequest, ImageGenerationResponse } from '@/app/api/image/route';
import type { GeneratedImage } from '@/types';

/**
 * Rate limit error data structure
 */
interface RateLimitErrorData {
  error?: string;
  rateLimit?: {
    type: 'chat' | 'image';
    remaining: number;
    resetTime: number;
  };
}

/**
 * Custom error class for API errors with additional properties
 */
export class ApiError extends Error {
  public status: number;
  public data?: RateLimitErrorData;

  constructor(message: string, status: number, data?: RateLimitErrorData) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Download generated image
 */
export async function downloadImage(image: GeneratedImage): Promise<void> {
  try {
    // Convert base64 to blob
    const response = await fetch(`data:${image.mediaType};base64,${image.base64}`);
    const blob = await response.blob();

    // Create download link
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ai-generated-${image.id}.jpg`;

    // Trigger download
    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to download image:', error);
  }
}

/**
 * Generate image via API
 */
export async function generateImage(
  prompt: string,
  model: string,
  params: Partial<ImageGenerationRequest> = {},
): Promise<ImageGenerationResponse> {
  const response = await fetch('/api/image', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      model,
      ...params,
    }),
  });

  if (!response.ok) {
    const contentType = response.headers.get('content-type') || '';
    // Try to parse JSON error body for message/details
    if (contentType.includes('application/json')) {
      const errorData = (await response.json().catch(() => ({}))) as RateLimitErrorData;
      const message = errorData?.error || `Request failed with status ${response.status}`;
      if (response.status === 429) {
        throw new ApiError(message, 429, errorData);
      }
      throw new ApiError(message, response.status, errorData);
    }

    // Fallback to raw text if not JSON
    const text = await response.text().catch(() => '');
    const message = text || `Request failed with status ${response.status}`;
    if (response.status === 429) {
      throw new ApiError(message, 429);
    }
    throw new ApiError(message, response.status);
  }

  return response.json();
}
