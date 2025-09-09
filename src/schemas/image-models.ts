/**
 * Image Generation Model Schemas for Cloudflare Workers AI
 * Based on Cloudflare Workers AI documentation
 *
 * This file defines comprehensive schemas for all supported image generation models,
 * including their parameters, capabilities, and optimal configurations.
 */

// ============================================================================
// Base Types and Interfaces
// ============================================================================

export interface BaseImageInputParams {
  prompt: string; // Required for all models
  seed?: number; // Optional random seed for reproducibility
}

export interface BaseImageOutputParams {
  image?: string; // Base64 encoded image (most models)
  base64?: string; // Alternative base64 field name
  mediaType?: string; // MIME type of the image
  uint8Array?: number[]; // Binary image data
}

// Parameter range definition for validation
export interface ParameterRange {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
}

export type ModelCapability =
  | 'text-to-image'
  | 'img2img'
  | 'inpainting'
  | 'high-resolution'
  | 'fast-generation'
  | 'photorealism'
  | 'graphic-design'
  | 'prompt-adherence'
  | 'coherent-text';

export type OutputFormat = 'base64' | 'binary';

// ============================================================================
// Model-Specific Input Parameter Interfaces
// ============================================================================

export interface LeonardoLucidOriginInputParams extends BaseImageInputParams {
  guidance?: number; // Default: 4.5, Range: 0-10
  height?: number; // Default: 1120, Range: 0-2500
  width?: number; // Default: 1120, Range: 0-2500
  steps?: number; // Range: 1-40
}

export interface LeonardoPhoenixInputParams extends BaseImageInputParams {
  guidance?: number; // Default: 2, Range: 2-10
  height?: number; // Default: 1024, Range: 0-2048
  width?: number; // Default: 1024, Range: 0-2048
  num_steps?: number; // Default: 25, Range: 1-50
  negative_prompt?: string; // What to exclude from generated images
}

export interface FluxSchnellInputParams extends BaseImageInputParams {
  steps?: number; // Default: 4, Max: 8
}

export interface StableDiffusionInputParams extends BaseImageInputParams {
  negative_prompt?: string; // What to exclude
  height?: number; // Range: 256-2048
  width?: number; // Range: 256-2048
  num_steps?: number; // Default: 20, Max: 20
  strength?: number; // Default: 1, Range: 0-1 (for img2img)
  guidance?: number; // Default: 7.5
  // Image-to-image parameters
  image?: number[]; // Input image as array of integers (0-255)
  image_b64?: string; // Input image as base64
  mask?: number[]; // Mask for inpainting (0-255)
}

// ============================================================================
// Model Schema Definition
// ============================================================================

export interface ImageModelSchema {
  name: string;
  provider: string;
  description: string;
  pricing: string;
  isPartner: boolean;
  isBeta?: boolean;
  capabilities: readonly ModelCapability[];
  defaultParams: Record<string, unknown>;
  paramRanges?: Record<string, ParameterRange>;
  outputFormat: OutputFormat;
  /** Optimal performance configuration */
  performance: {
    recommendedSteps: number;
    maxConcurrentRequests: number;
    estimatedResponseTime: string; // e.g., "2-4s"
  };
}

// ============================================================================
// Model Schema Registry
// ============================================================================

export const IMAGE_MODEL_SCHEMAS = {
  // Leonardo Models - Premium partner models
  '@cf/leonardo/lucid-origin': {
    name: 'Lucid Origin',
    provider: 'Leonardo',
    description:
      'Most adaptable and prompt-responsive model with sharp graphic design and text accuracy',
    pricing: '$0.007 per 512x512 tile, $0.00013 per step',
    isPartner: true,
    capabilities: ['text-to-image', 'high-resolution', 'graphic-design'] as const,
    defaultParams: {
      guidance: 4.5,
      height: 1120,
      width: 1120,
      steps: 25,
    },
    paramRanges: {
      guidance: { min: 0, max: 10 },
      // Docs list min 0 and max 2500 for both
      height: { min: 0, max: 2500 },
      width: { min: 0, max: 2500 },
      // Prefer `steps` for this model to avoid duplication in payloads
      steps: { min: 1, max: 40 },
    },
    outputFormat: 'base64' as const,
    performance: {
      recommendedSteps: 4,
      maxConcurrentRequests: 3,
      estimatedResponseTime: '3-5s',
    },
  },
  '@cf/leonardo/phoenix-1.0': {
    name: 'Phoenix 1.0',
    provider: 'Leonardo',
    description: 'Exceptional prompt adherence and coherent text generation',
    pricing: '$0.0058 per 512x512 tile, $0.00011 per step',
    isPartner: true,
    capabilities: ['text-to-image', 'prompt-adherence', 'coherent-text'] as const,
    defaultParams: {
      // Tuned for better default quality while keeping speed reasonable
      guidance: 2.5,
      height: 1024,
      width: 1024,
      num_steps: 35,
      negative_prompt:
        'low quality, low-res, grain, noisy, noise, artifacts, jpeg artifacts, blurry, deformed, oversharpened',
    },
    paramRanges: {
      guidance: { min: 2, max: 10 },
      // Docs list min 0 and max 2048
      height: { min: 0, max: 2048 },
      width: { min: 0, max: 2048 },
      num_steps: { min: 1, max: 50 },
      negative_prompt: { minLength: 1 },
    },
    outputFormat: 'binary' as const,
    performance: {
      recommendedSteps: 25,
      maxConcurrentRequests: 2,
      estimatedResponseTime: '4-8s',
    },
  },
  // Black Forest Labs - Fast, high-quality models
  '@cf/black-forest-labs/flux-1-schnell': {
    name: 'FLUX.1 [schnell]',
    provider: 'Black Forest Labs',
    description: '12B parameter rectified flow transformer for fast, high-quality image generation',
    pricing: '$0.000053 per 512x512 tile, $0.00011 per step',
    isPartner: false,
    capabilities: ['text-to-image', 'fast-generation', 'high-resolution'] as const,
    defaultParams: {
      steps: 8,
    },
    paramRanges: {
      steps: { min: 1, max: 8 },
      prompt: { minLength: 1, maxLength: 2048 },
    },
    outputFormat: 'base64' as const,
    performance: {
      recommendedSteps: 4,
      maxConcurrentRequests: 5,
      estimatedResponseTime: '2-3s',
    },
  },

  // ByteDance - Lightning-fast SDXL variant
  '@cf/bytedance/stable-diffusion-xl-lightning': {
    name: 'SDXL-Lightning',
    provider: 'ByteDance',
    description: 'Lightning-fast text-to-image generation with high-quality 1024px images',
    pricing: '$0.00 per step',
    isPartner: false,
    isBeta: true,
    capabilities: ['text-to-image', 'fast-generation', 'img2img', 'inpainting'] as const,
    defaultParams: {
      // Per docs: num_steps default 20, max 20. Height/width not specified, choose sensible defaults.
      num_steps: 20,
      guidance: 7.5,
      height: 1024,
      width: 1024,
    },
    paramRanges: {
      height: { min: 256, max: 2048 },
      width: { min: 256, max: 2048 },
      num_steps: { min: 20, max: 20 },
      // strength and guidance are accepted; docs specify defaults but no explicit min/max beyond description
      strength: { min: 0, max: 1 },
    },
    outputFormat: 'binary' as const,
    performance: {
      recommendedSteps: 4,
      maxConcurrentRequests: 4,
      estimatedResponseTime: '1-2s',
    },
  },

  // Lykon - Photorealistic model
  '@cf/lykon/dreamshaper-8-lcm': {
    name: 'DreamShaper 8 LCM',
    provider: 'Lykon',
    description: 'Fine-tuned for photorealism without sacrificing range',
    pricing: '$0.00 per step',
    isPartner: false,
    capabilities: ['text-to-image', 'photorealism', 'img2img', 'inpainting'] as const,
    defaultParams: {
      // Per docs: num_steps default 20, max 20. Height/width not specified, choose sensible defaults.
      num_steps: 20,
      guidance: 7.5,
      height: 1024,
      width: 1024,
    },
    paramRanges: {
      height: { min: 256, max: 2048 },
      width: { min: 256, max: 2048 },
      num_steps: { min: 20, max: 20 },
      strength: { min: 0, max: 1 },
    },
    outputFormat: 'binary' as const,
    performance: {
      recommendedSteps: 4,
      maxConcurrentRequests: 4,
      estimatedResponseTime: '1-3s',
    },
  },

  // Stability AI - Standard SDXL
  '@cf/stabilityai/stable-diffusion-xl-base-1.0': {
    name: 'Stable Diffusion XL Base 1.0',
    provider: 'Stability.ai',
    description: 'Diffusion-based text-to-image generative model',
    pricing: '$0.00 per step',
    isPartner: false,
    isBeta: true,
    capabilities: ['text-to-image', 'img2img', 'inpainting'] as const,
    defaultParams: {
      num_steps: 20,
      guidance: 7.5,
      height: 1024,
      width: 1024,
    },
    paramRanges: {
      height: { min: 256, max: 2048 },
      width: { min: 256, max: 2048 },
      num_steps: { min: 20, max: 20 },
      strength: { min: 0, max: 1 },
    },
    outputFormat: 'binary' as const,
    performance: {
      recommendedSteps: 8,
      maxConcurrentRequests: 3,
      estimatedResponseTime: '2-4s',
    },
  },

  // RunwayML - Specialized models
  '@cf/runwayml/stable-diffusion-v1-5-img2img': {
    name: 'Stable Diffusion v1.5 Img2Img',
    provider: 'RunwayML',
    description: 'Generate new images from input images. Supports inpainting via masks.',
    pricing: '$0.00 per step',
    isPartner: false,
    isBeta: true,
    capabilities: ['img2img', 'inpainting'] as const,
    defaultParams: {
      num_steps: 20,
      strength: 0.8,
      guidance: 7.5,
      height: 512,
      width: 512,
    },
    paramRanges: {
      height: { min: 256, max: 2048 },
      width: { min: 256, max: 2048 },
      num_steps: { min: 20, max: 20 },
      strength: { min: 0, max: 1 },
    },
    outputFormat: 'binary' as const,
    performance: {
      recommendedSteps: 20,
      maxConcurrentRequests: 2,
      estimatedResponseTime: '3-6s',
    },
  },
} as const;

// ============================================================================
// Type Definitions and Exports
// ============================================================================

export type ImageModelId = keyof typeof IMAGE_MODEL_SCHEMAS;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get the schema for a specific model
 */
export function getModelSchema(modelId: ImageModelId): ImageModelSchema {
  return IMAGE_MODEL_SCHEMAS[modelId];
}

/**
 * Get optimal parameters for a model, merging defaults with custom parameters
 */
export function getOptimalParams(
  modelId: ImageModelId,
  customParams: Partial<BaseImageInputParams & Record<string, unknown>> = {},
): Record<string, unknown> {
  const schema = getModelSchema(modelId);
  return {
    ...schema.defaultParams,
    ...customParams,
  };
}

/**
 * Check if a model is a premium partner model
 */
export function isPartnerModel(modelId: ImageModelId): boolean {
  return IMAGE_MODEL_SCHEMAS[modelId].isPartner;
}

/**
 * Check if a model is in beta
 */
export function isBetaModel(modelId: ImageModelId): boolean {
  const schema = IMAGE_MODEL_SCHEMAS[modelId];
  return 'isBeta' in schema && schema.isBeta === true;
}

/**
 * Get all models that support a specific capability
 */
export function getModelsByCapability(capability: ModelCapability): ImageModelId[] {
  return Object.entries(IMAGE_MODEL_SCHEMAS)
    .filter(([, schema]) =>
      (schema.capabilities as readonly ModelCapability[]).includes(capability),
    )
    .map(([modelId]) => modelId as ImageModelId);
}

/**
 * Get models sorted by performance (fastest first)
 */
export function getModelsByPerformance(): ImageModelId[] {
  return Object.entries(IMAGE_MODEL_SCHEMAS)
    .sort((a, b) => {
      // Sort by estimated response time (convert to seconds for comparison)
      const getSeconds = (timeStr: string): number => {
        const match = timeStr.match(/(\d+)/);
        return match ? parseInt(match[1]) : 5;
      };

      const timeA = getSeconds(a[1].performance.estimatedResponseTime);
      const timeB = getSeconds(b[1].performance.estimatedResponseTime);

      return timeA - timeB;
    })
    .map(([modelId]) => modelId as ImageModelId);
}

/**
 * Get recommended models for different use cases
 */
export function getRecommendedModels() {
  return {
    fastest: getModelsByPerformance().slice(0, 3),
    highQuality: ['@cf/leonardo/phoenix-1.0', '@cf/leonardo/lucid-origin'],
    photorealistic: getModelsByCapability('photorealism'),
    textToImage: getModelsByCapability('text-to-image'),
    img2img: getModelsByCapability('img2img'),
    inpainting: getModelsByCapability('inpainting'),
  };
}

// ============================================================================
// Testing Configuration
// ============================================================================

export const TEST_CONFIGURATIONS = {
  // Basic prompts for quick testing
  basicPrompts: [
    'A cyberpunk cat with neon lights',
    'A serene mountain landscape at dawn',
    'Portrait of a wise old wizard',
    'Modern architecture, glass and steel',
    'Abstract geometric art, colorful',
  ],

  // Performance test prompts
  performancePrompts: [
    'Simple red circle', // Minimal complexity
    'Beautiful sunset over ocean', // Medium complexity
    'Detailed fantasy castle with dragons flying around it under a starry night sky', // High complexity
  ],

  // Parameter test ranges
  parameterTests: {
    guidance: [1, 7.5, 15], // Low, medium, high guidance
    steps: [1, 4, 8, 16], // Fast, default, quality, high-quality
    dimensions: [
      { width: 512, height: 512 }, // Standard
      { width: 768, height: 768 }, // Medium
      { width: 1024, height: 1024 }, // High
      { width: 1024, height: 768 }, // Landscape
      { width: 768, height: 1024 }, // Portrait
    ],
  },

  // Quality assessment criteria
  qualityMetrics: {
    responseTime: { excellent: 2, good: 4, acceptable: 8 }, // seconds
    imageSize: { min: 256, preferred: 1024, max: 2048 }, // pixels
    successRate: { excellent: 95, good: 85, acceptable: 70 }, // percentage
  },
};

// ============================================================================
// Default Export
// ============================================================================

export default IMAGE_MODEL_SCHEMAS;
