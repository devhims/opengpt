// Chat-related utility functions

/**
 * Get provider label from model ID
 */
export function getProviderLabel(modelId: string): string {
  if (modelId.includes('openai') || modelId.includes('gpt-oss')) return 'OpenAI';
  if (modelId.includes('meta') || modelId.includes('llama')) return 'Meta';
  if (modelId.includes('google') || modelId.includes('gemma')) return 'Google';
  if (modelId.includes('mistral')) return 'Mistral';
  if (modelId.includes('deepseek')) return 'DeepSeek';
  if (modelId.includes('qwen')) return 'Qwen';
  return 'Other';
}

/**
 * Parse thinking tags from text content
 * Handles multiple scenarios:
 * 1. Full tags: <think>content</think> or <thinking>content</thinking>
 * 2. Missing opening tag: content</think> (common with some models)
 */
export function parseThinkingTags(text: string): {
  reasoningText: string;
  cleanText: string;
  hasReasoning: boolean;
} {
  const fullThinkingRegex = /<think(?:ing)?>([\s\S]*?)<\/think(?:ing)?>/g;
  const endOnlyRegex = /([\s\S]*?)<\/think(?:ing)?>/g;

  const matches = [...text.matchAll(fullThinkingRegex)];
  let reasoningText = '';
  let cleanText = text;

  if (matches.length > 0) {
    // Normal case: full thinking tags found
    reasoningText = matches.map((match) => match[1].trim()).join('\n\n');
    cleanText = text.replace(fullThinkingRegex, '').trim();
  } else {
    // Check for closing tag without opening (missing opening tag case)
    const endMatches = [...text.matchAll(endOnlyRegex)];
    if (endMatches.length > 0) {
      const lastMatch = endMatches[endMatches.length - 1];
      if (lastMatch.index !== undefined) {
        reasoningText = lastMatch[1].trim();
        cleanText = text.substring(lastMatch.index + lastMatch[0].length).trim();
      }
    }
  }

  return {
    reasoningText,
    cleanText,
    hasReasoning: reasoningText.length > 0,
  };
}
