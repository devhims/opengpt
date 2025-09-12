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

// Image Generation Types
export interface GeneratedImage {
  id: string;
  prompt: string;
  base64: string;
  mediaType: string;
  uint8Array: number[];
}

// Audio Transcription Types
export interface TranscriptionWord {
  word: string;
  start: number;
  end: number;
  confidence: number;
  punctuated_word?: string;
}

export interface TranscriptionResult {
  id: string;
  transcript: string;
  confidence?: number;
  duration?: number;
  language?: string;
  words?: TranscriptionWord[];
  fileName: string;
  fileSize: number;
  contentType: string;
  processedAt: string;
}

export interface AudioUploadParams {
  detectLanguage?: boolean;
  punctuate?: boolean;
  smartFormat?: boolean;
  file?: File | null;
}
