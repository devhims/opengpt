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
    '@cf/mistral/mistral-7b-instruct-v0.1-awq',
    '@cf/mistral/mistral-7b-instruct-v0.2',
    '@cf/mistral/mistral-7b-instruct-v0.2-lora',
    // Qwen models
    '@cf/qwen/qwq-32b',
    '@cf/qwen/qwen2.5-coder-32b-instruct',
    '@cf/qwen/qwen1.5-1.8b-chat',
    '@cf/qwen/qwen1.5-14b-chat-awq',
    '@cf/qwen/qwen1.5-7b-chat-awq',
    '@cf/qwen/qwen1.5-0.5b-chat',
    // Llama Guard models
    '@cf/meta/llama-guard-3-8b',
    '@hf/thebloke/llamaguard-7b-awq',
    // DeepSeek models
    '@cf/deepseek-ai/deepseek-r1-distill-qwen-32b',
    '@cf/deepseek-ai/deepseek-math-7b-instruct',
    '@hf/thebloke/deepseek-coder-6.7b-instruct-awq',
    '@hf/thebloke/deepseek-coder-6.7b-base-awq',
    // Llama 3.2 models
    '@cf/meta/llama-3.2-1b-instruct',
    '@cf/meta/llama-3.2-3b-instruct',
    '@cf/meta/llama-3.2-11b-vision-instruct',
    // Llama 3 models
    '@cf/meta/llama-3-8b-instruct',
    '@cf/meta/llama-3-8b-instruct-awq',
    '@hf/meta-llama/meta-llama-3-8b-instruct',
    // Other models
    '@cf/fblgit/una-cybertron-7b-v2-bf16',
    '@hf/nexusflow/starling-lm-7b-beta',
    '@hf/nousresearch/hermes-2-pro-mistral-7b',
    '@cf/microsoft/phi-2',
    '@cf/tinyllama/tinyllama-1.1b-chat-v1.0',
    '@cf/thebloke/discolm-german-7b-v1-awq',
    '@cf/tiiuae/falcon-7b-instruct',
    '@cf/openchat/openchat-3.5-0106',
    '@cf/defog/sqlcoder-7b-2',
    '@hf/thebloke/neural-chat-7b-v3-1-awq',
    '@hf/thebloke/openhermes-2.5-mistral-7b-awq',
    '@hf/thebloke/llama-2-13b-chat-awq',
    '@hf/thebloke/zephyr-7b-beta-awq',
    '@cf/meta/llama-2-7b-chat-fp16',
    '@cf/mistral/mistral-7b-instruct-v0.1',
    '@cf/meta/llama-2-7b-chat-int8',
    '@cf/meta/llama-2-7b-chat-hf-lora',
  ] as const,
  // Image generation models
  imageGeneration: [
    '@cf/leonardo/lucid-origin',
    '@cf/leonardo/phoenix-1.0',
    '@cf/black-forest-labs/flux-1-schnell',
    '@cf/bytedance/stable-diffusion-xl-lightning',
    '@cf/lykon/dreamshaper-8-lcm',
    '@cf/runwayml/stable-diffusion-v1-5-img2img',
    '@cf/runwayml/stable-diffusion-v1-5-inpainting',
    '@cf/stabilityai/stable-diffusion-xl-base-1.0',
  ] as const,
  embeddings: [] as const,
  speech: [] as const,
} as const;

// Default model to use when none is specified
export const DEFAULT_MODEL = '@cf/meta/llama-3.1-8b-instruct' as const;

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
