// Cloudflare Workers AI Model Types

// Import constants from the centralized constants file
import { CLOUDFLARE_AI_MODELS, DEFAULT_MODEL } from '@/constants';

// Derive the union type from all models across all capabilities
export type CloudflareAIModel = (typeof CLOUDFLARE_AI_MODELS.textGeneration)[number];

// Type guard to check if a string is a valid Cloudflare AI model
export function isValidCloudflareModel(model: string): model is CloudflareAIModel {
  return CLOUDFLARE_AI_MODELS.textGeneration.includes(model as CloudflareAIModel);
}

// Re-export constants for convenience
export { CLOUDFLARE_AI_MODELS, DEFAULT_MODEL };

// Re-export helper functions from constants
export {
  getTextGenerationModels,
  getImageGenerationModels,
  getEmbeddingModels,
  getSpeechModels,
  getModelsByCategory,
} from '@/constants';

// Helper function to get all available models (useful for frontend dropdowns)
export function getAvailableModels(): readonly CloudflareAIModel[] {
  return CLOUDFLARE_AI_MODELS.textGeneration;
}
