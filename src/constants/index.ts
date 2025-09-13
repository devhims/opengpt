// Cloudflare Workers AI Model Constants

// Organized by capabilities for future extensibility
export const CLOUDFLARE_AI_MODELS = {
  textGeneration: [
    // GPT-OSS models
    '@cf/openai/gpt-oss-120b',
    '@cf/openai/gpt-oss-20b',
    // Llama 4 models
    '@cf/meta/llama-4-scout-17b-16e-instruct',
    // Llama 3.3 models
    '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
    // Llama 3.1 models
    '@cf/meta/llama-3.1-8b-instruct-fast',
    '@cf/meta/llama-3.1-8b-instruct-awq',
    '@cf/meta/llama-3.1-8b-instruct-fp8',
    '@cf/meta/llama-3.1-8b-instruct',
    '@cf/meta/llama-3.1-70b-instruct',
    // Gemma models
    '@cf/google/gemma-3-12b-it',
    '@cf/google/gemma-7b-it',
    '@cf/google/gemma-7b-it-lora',
    '@cf/google/gemma-2b-it-lora',
    // Mistral models
    '@cf/mistralai/mistral-small-3.1-24b-instruct',
    '@cf/mistral/mistral-7b-instruct-v0.1',
    '@cf/mistral/mistral-7b-instruct-v0.2-lora',
    // Qwen models
    '@cf/qwen/qwq-32b',
    '@cf/qwen/qwen2.5-coder-32b-instruct',
    // Llama Guard models
    '@cf/meta/llama-guard-3-8b',
    // DeepSeek models
    '@cf/deepseek-ai/deepseek-r1-distill-qwen-32b',
    // Llama 3.2 models
    '@cf/meta/llama-3.2-1b-instruct',
    '@cf/meta/llama-3.2-3b-instruct',
    '@cf/meta/llama-3.2-11b-vision-instruct',
    // Llama 3 models
    '@cf/meta/llama-3-8b-instruct',
    '@cf/meta/llama-3-8b-instruct-awq',
    '@hf/meta-llama/meta-llama-3-8b-instruct',
    // Other models
    '@hf/nousresearch/hermes-2-pro-mistral-7b',
    '@cf/microsoft/phi-2',
    '@cf/defog/sqlcoder-7b-2',
    '@cf/meta/llama-2-7b-chat-fp16',
    '@cf/meta/llama-2-7b-chat-int8',
    '@cf/meta/llama-2-7b-chat-hf-lora',
  ] as const,
  // Image generation models
  imageGeneration: [
    '@cf/leonardo/lucid-origin',
    '@cf/leonardo/phoenix-1.0',
    '@cf/black-forest-labs/flux-1-schnell',
    '@cf/bytedance/stable-diffusion-xl-lightning',
    '@cf/stabilityai/stable-diffusion-xl-base-1.0',
    // '@cf/lykon/dreamshaper-8-lcm',
    // '@cf/runwayml/stable-diffusion-v1-5-img2img',
  ] as const,
  embeddings: [] as const,
  speech: ['@cf/deepgram/nova-3'] as const,
  textToSpeech: ['@cf/deepgram/aura-1', '@cf/myshell-ai/melotts'] as const,
} as const;

// Default model to use when none is specified
export const DEFAULT_MODEL = '@cf/meta/llama-4-scout-17b-16e-instruct' as const;

// Helper functions for different model types (ready for future expansion)
export function getTextGenerationModels(): readonly string[] {
  return CLOUDFLARE_AI_MODELS.textGeneration;
}

export function getImageGenerationModels(): readonly string[] {
  return CLOUDFLARE_AI_MODELS.imageGeneration;
}

export function getEmbeddingModels(): readonly string[] {
  return CLOUDFLARE_AI_MODELS.embeddings;
}

export function getSpeechModels(): readonly string[] {
  return CLOUDFLARE_AI_MODELS.speech;
}

export function getTextToSpeechModels(): readonly string[] {
  return CLOUDFLARE_AI_MODELS.textToSpeech;
}

// TTS Speaker voices supported by Aura-1
export const AURA_TTS_SPEAKERS = [
  'angus',
  'asteria',
  'arcas',
  'orion',
  'orpheus',
  'athena',
  'luna',
  'zeus',
  'perseus',
  'helios',
  'hera',
  'stella',
] as const;

export type AuraTTSSpeaker = (typeof AURA_TTS_SPEAKERS)[number];

// Default TTS speaker for Aura-1
export const DEFAULT_AURA_TTS_SPEAKER = 'luna' as const;

// TTS Models (convenience constants that map to CLOUDFLARE_AI_MODELS.textToSpeech)
export const TTS_MODELS = {
  AURA_1: '@cf/deepgram/aura-1',
  MELO_TTS: '@cf/myshell-ai/melotts',
} as const;

export const DEFAULT_TTS_MODEL = TTS_MODELS.AURA_1;

// Supported languages for MeloTTS (uppercase codes as required by API)
export const MELO_TTS_LANGUAGES = [
  'EN', // English (Default)
  'ES', // Spanish
  'FR', // French
  'ZH', // Chinese
  'JP', // Japanese
  'KR', // Korean
] as const;

// English accent speakers for MeloTTS (when lang='EN')
export const MELO_TTS_ENGLISH_SPEAKERS = [
  'EN-Default', // English (Default)
  'EN-US', // English (American)
  'EN-BR', // English (British)
  'EN_INDIA', // English (Indian)
  'EN-AU', // English (Australian)
] as const;

export type MeloTTSLanguage = (typeof MELO_TTS_LANGUAGES)[number];
export type MeloTTSEnglishSpeaker = (typeof MELO_TTS_ENGLISH_SPEAKERS)[number];
export const DEFAULT_MELO_TTS_LANGUAGE = 'EN' as const;

// Helper function to get models by category (within text generation)
export function getModelsByCategory(): Record<string, readonly string[]> {
  const categories: Record<string, string[]> = {
    OpenAI: [],
    Llama: [],
    Gemma: [],
    Mistral: [],
    Qwen: [],
    DeepSeek: [],
    Other: [],
  };

  CLOUDFLARE_AI_MODELS.textGeneration.forEach((model) => {
    if (model.includes('openai') || model.includes('gpt-oss')) {
      categories.OpenAI.push(model);
    } else if (model.includes('llama')) {
      categories.Llama.push(model);
    } else if (model.includes('gemma')) {
      categories.Gemma.push(model);
    } else if (model.includes('mistral')) {
      categories.Mistral.push(model);
    } else if (model.includes('qwen')) {
      categories.Qwen.push(model);
    } else if (model.includes('deepseek')) {
      categories.DeepSeek.push(model);
    } else {
      categories.Other.push(model);
    }
  });

  return categories;
}
