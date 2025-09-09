import { getCloudflareContext } from '@opennextjs/cloudflare';
import { createWorkersAI, type WorkersAI } from 'workers-ai-provider';
import {
  streamText,
  createUIMessageStream,
  createUIMessageStreamResponse,
  type ModelMessage,
} from 'ai';
import { type CloudflareAIModel, DEFAULT_MODEL, isValidCloudflareModel } from '@/types';
import { checkRateLimit } from '@/utils/rate-limit';

// AI SDK v5 compatible message type
interface ChatMessage {
  id?: string;
  role: 'system' | 'user' | 'assistant' | 'tool';
  content?: string | Array<{ type: 'text'; text: string }>;
  // Support for frontend message format with AI Elements
  parts?: Array<{
    type: 'text' | 'reasoning' | 'source-url';
    text?: string;
    url?: string;
  }>;
}

// GPT-OSS specific response types
interface GptOssOutput {
  id: string;
  content: Array<{ text: string; type: string }>;
  role?: string;
  type: string;
}

interface GptOssResponse {
  output?: GptOssOutput[];
  response?: string;
  result?: string;
}

// Unified message processing for AI SDK v5
function processMessages(messages: ChatMessage[]): ModelMessage[] {
  return messages.map((message) => {
    const role = message.role === 'tool' ? 'assistant' : message.role;

    // Extract content from either content field or parts field
    let content = '';
    if (typeof message.content === 'string') {
      content = message.content;
    } else if (Array.isArray(message.content)) {
      content = message.content.map((part) => part.text).join('');
    } else if (Array.isArray(message.parts)) {
      // Handle frontend format with parts array
      content = message.parts.map((part) => part.text).join('');
    }

    return {
      role: role as 'system' | 'user' | 'assistant',
      content,
    };
  });
}

// Extract text from GPT-OSS response
function extractGptOssResponse(result: GptOssResponse): string {
  if ('output' in result && Array.isArray(result.output)) {
    const assistantOutput = result.output.find(
      (output) => output.type === 'message' && output.role === 'assistant',
    );
    if (assistantOutput?.content) {
      const textContent = assistantOutput.content.find((content) => content.type === 'output_text');
      return textContent?.text || '';
    }
  }
  return result.response || result.result || '';
}

// Handle GPT-OSS models that don't support streaming
async function handleGptOssModel(
  env: CloudflareEnv,
  selectedModel: CloudflareAIModel,
  messages: ModelMessage[],
): Promise<Response> {
  if (!env.AI) {
    return Response.json(
      { error: 'AI binding is not configured for GPT-OSS models' },
      { status: 500 },
    );
  }

  // Convert messages to GPT-OSS input format
  const conversationText = messages.map((m) => `${m.role}: ${m.content}`).join('\n\n');

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = (await env.AI.run(selectedModel as any, {
      input: conversationText,
    })) as GptOssResponse;

    const assistantText = extractGptOssResponse(result);

    // Create non-streaming UI message stream for compatibility
    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        const id = `msg-${Date.now()}`;
        writer.write({ type: 'start' });
        writer.write({ type: 'text-start', id });
        if (assistantText) {
          writer.write({ type: 'text-delta', id, delta: assistantText });
        }
        writer.write({ type: 'text-end', id });
        writer.write({ type: 'finish' });
      },
    });
    return createUIMessageStreamResponse({ stream });
  } catch (error) {
    console.error('GPT-OSS model error:', error);
    return Response.json(
      {
        error: `GPT-OSS model error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  const { env } = getCloudflareContext();

  // Parse and validate request body
  let body: { messages?: ChatMessage[]; model?: string; webSearch?: boolean };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON in request body' }, { status: 400 });
  }

  const messages: ChatMessage[] = Array.isArray(body?.messages) ? body.messages : [];
  if (messages.length === 0) {
    return Response.json({ error: 'Missing or empty messages array' }, { status: 400 });
  }

  const selectedModel =
    body?.model && isValidCloudflareModel(body.model) ? body.model : DEFAULT_MODEL;
  const webSearch = body?.webSearch || false;

  // Check rate limit
  const rateLimitResult = await checkRateLimit(req, 'chat');
  if (!rateLimitResult.allowed) {
    return Response.json(
      {
        error: rateLimitResult.error,
        rateLimit: {
          remaining: rateLimitResult.remaining,
          resetTime: rateLimitResult.resetTime,
          type: 'chat',
        },
      },
      { status: 429 },
    );
  }

  // Validate AI binding is available
  if (!env.AI) {
    return Response.json({ error: 'AI binding is not configured' }, { status: 500 });
  }

  try {
    // Process messages using AI SDK v5 standards
    const coreMessages = processMessages(messages);

    // Handle GPT-OSS models (no streaming support)
    if (selectedModel.startsWith('@cf/openai/gpt-oss-')) {
      return handleGptOssModel(env, selectedModel, coreMessages);
    }

    // Handle regular Workers AI models with streaming
    const workersai = createWorkersAI({ binding: env.AI });

    // Add system context for enhanced reasoning
    const systemMessage: ModelMessage = {
      role: 'system',
      content: `You are a helpful AI assistant. ${
        webSearch
          ? 'When web search is enabled, provide sources for your information.'
          : `For complex questions that require reasoning, show your step-by-step thinking process. You can use <think> tags to wrap your reasoning if helpful.`
      }`,
    };

    const result = streamText({
      model: workersai(selectedModel as Parameters<WorkersAI>[0]),
      messages: [systemMessage, ...coreMessages],
      // AI SDK v5 streaming configuration
      temperature: 0.7,
      maxOutputTokens: 1000,
    });

    // Enable reasoning support - this works for models that natively support reasoning tokens
    // For other models, the frontend will parse thinking tags manually
    return result.toUIMessageStreamResponse({
      sendReasoning: true,
      sendSources: webSearch,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'AI processing error';
    console.error('AI API error:', err);
    return Response.json({ error: errorMessage }, { status: 500 });
  }
}
