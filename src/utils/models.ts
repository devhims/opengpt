import { CLOUDFLARE_AI_MODELS } from '@/constants';

/**
 * Transform model ID to display name
 */
export function formatModelName(model: string): string {
  return (
    model
      .split('/')
      .pop()
      ?.replace('-', ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase()) || model
  );
}

/**
 * Get formatted text generation models for UI display
 */
export function getFormattedTextModels() {
  return CLOUDFLARE_AI_MODELS.textGeneration.map((model) => ({
    name: model.split('/').pop() || model,
    value: model,
  }));
}

/**
 * Get formatted image generation models for UI display
 */
export function getFormattedImageModels() {
  return CLOUDFLARE_AI_MODELS.imageGeneration.map((model) => ({
    name: formatModelName(model),
    value: model,
  }));
}
