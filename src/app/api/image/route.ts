import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { IMAGE_MODEL_SCHEMAS, getOptimalParams, type ImageModelId } from '@/schemas/image-models';

export interface ImageGenerationRequest {
  prompt: string;
  model?: string;
  steps?: number;
  seed?: number;
  width?: number;
  height?: number;
  guidance?: number;
  negative_prompt?: string;
}

export interface ImageGenerationResponse {
  base64: string;
  mediaType: string;
  uint8Array: number[];
}

/**
 * Generate optimized payload for AI model based on schema
 */
function generateOptimalPayload(
  model: string,
  prompt: string,
  userParams: Partial<ImageGenerationRequest>,
): Record<string, any> {
  const modelId = model as ImageModelId;
  const schema = IMAGE_MODEL_SCHEMAS[modelId];

  if (!schema) {
    // Fallback for unknown models
    return {
      prompt: prompt.trim(),
      steps: userParams.steps || 4,
      seed: userParams.seed || Math.floor(Math.random() * 1000000),
    };
  }

  // Start with optimal parameters from schema
  const optimalParams = getOptimalParams(modelId, { prompt: prompt.trim() });

  // Override with user parameters where provided and valid
  const payload: Record<string, any> = { ...optimalParams };

  // Apply user overrides with validation
  if (userParams.seed && userParams.seed > 0) {
    payload.seed = userParams.seed;
  } else if (!payload.seed) {
    payload.seed = Math.floor(Math.random() * 1000000);
  }

  // Handle steps/num_steps parameter variations
  if (userParams.steps) {
    const stepParam =
      schema.paramRanges && 'num_steps' in schema.paramRanges ? 'num_steps' : 'steps';
    const stepRange = schema.paramRanges?.[stepParam as keyof typeof schema.paramRanges];

    if (stepRange && typeof stepRange === 'object' && 'min' in stepRange && 'max' in stepRange) {
      const min = (stepRange as any).min || 1;
      const max = (stepRange as any).max || 50;
      payload[stepParam] = Math.max(min, Math.min(max, userParams.steps));
    } else {
      payload[stepParam] = userParams.steps;
    }
  }

  // Handle dimensions with validation
  if (userParams.width && schema.paramRanges && 'width' in schema.paramRanges) {
    const widthRange = schema.paramRanges.width;
    if (widthRange && typeof widthRange === 'object') {
      const { min = 256, max = 2048 } = widthRange;
      payload.width = Math.max(min, Math.min(max, userParams.width));
    }
  }

  if (userParams.height && schema.paramRanges && 'height' in schema.paramRanges) {
    const heightRange = schema.paramRanges.height;
    if (heightRange && typeof heightRange === 'object') {
      const { min = 256, max = 2048 } = heightRange;
      payload.height = Math.max(min, Math.min(max, userParams.height));
    }
  }

  // Handle guidance with validation
  if (userParams.guidance && schema.paramRanges && 'guidance' in schema.paramRanges) {
    const guidanceRange = schema.paramRanges.guidance;
    if (guidanceRange && typeof guidanceRange === 'object') {
      const { min = 0, max = 10 } = guidanceRange;
      payload.guidance = Math.max(min, Math.min(max, userParams.guidance));
    }
  }

  // Add negative prompt if provided
  if (userParams.negative_prompt && userParams.negative_prompt.trim()) {
    payload.negative_prompt = userParams.negative_prompt.trim();
  }

  return payload;
}

/**
 * Convert binary stream to base64 efficiently
 */
async function streamToBase64(stream: ReadableStream): Promise<string> {
  const chunks: Uint8Array[] = [];
  const reader = stream.getReader();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  // Combine chunks efficiently
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const combinedArray = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    combinedArray.set(chunk, offset);
    offset += chunk.length;
  }

  // Convert to base64 with chunking for large arrays
  if (combinedArray.length > 65536) {
    const base64Chunks: string[] = [];
    for (let i = 0; i < combinedArray.length; i += 65536) {
      const chunk = combinedArray.slice(i, i + 65536);
      base64Chunks.push(String.fromCharCode(...chunk));
    }
    return btoa(base64Chunks.join(''));
  } else {
    return btoa(String.fromCharCode(...combinedArray));
  }
}

export async function POST(request: NextRequest) {
  const { env } = getCloudflareContext();

  try {
    const body: ImageGenerationRequest = await request.json();
    const { prompt, model = '@cf/black-forest-labs/flux-1-schnell', ...userParams } = body;

    // Validation
    if (!prompt || prompt.trim().length === 0) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    if (prompt.length > 2048) {
      return NextResponse.json(
        { error: 'Prompt must be 2048 characters or less' },
        { status: 400 },
      );
    }

    if (!env.AI) {
      return NextResponse.json({ error: 'AI binding is not configured' }, { status: 500 });
    }

    // Generate optimal payload based on model schema
    const requestPayload = generateOptimalPayload(model, prompt, userParams);

    console.log(`🎨 Generating image with ${model}:`, requestPayload);

    // Call Cloudflare Workers AI
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await env.AI.run(model as any, requestPayload);

    if (!response) {
      return NextResponse.json({ error: 'Failed to generate image' }, { status: 500 });
    }

    let base64Image: string;
    let mediaType: string;

    // Handle different response formats based on model output type
    try {
      if (response instanceof ReadableStream) {
        // Binary response (PNG/binary models)
        base64Image = await streamToBase64(response);
        mediaType = 'image/png';
      } else if (response.image) {
        // Base64 response (Flux, Lucid Origin)
        base64Image = response.image;
        mediaType = 'image/jpeg';
      } else {
        console.error('Unexpected response format:', response);
        return NextResponse.json(
          {
            error: 'Invalid response format from AI model',
          },
          { status: 500 },
        );
      }
    } catch (conversionError) {
      console.error('Error processing AI response:', conversionError);
      return NextResponse.json(
        {
          error: 'Failed to process image data from AI model',
        },
        { status: 500 },
      );
    }

    // Convert base64 to Uint8Array for client compatibility
    const binaryString = atob(base64Image);
    const uint8Array = Array.from(binaryString, (char) => char.charCodeAt(0));

    const imageResponse: ImageGenerationResponse = {
      base64: base64Image,
      mediaType,
      uint8Array,
    };

    return NextResponse.json(imageResponse);
  } catch (error) {
    console.error('Image generation error:', error);

    // Return more specific error messages when possible
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        return NextResponse.json(
          {
            error: 'Image generation timed out. Try reducing steps or image size.',
          },
          { status: 504 },
        );
      } else if (error.message.includes('invalid')) {
        return NextResponse.json(
          {
            error: 'Invalid parameters for the selected model.',
          },
          { status: 400 },
        );
      }
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
