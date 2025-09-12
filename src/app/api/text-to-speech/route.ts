import { getCloudflareContext } from '@opennextjs/cloudflare';
import { checkRateLimit } from '@/utils/rate-limit';
import {
  TTS_MODELS,
  DEFAULT_TTS_MODEL,
  MELO_TTS_LANGUAGES,
  MELO_TTS_ENGLISH_SPEAKERS,
  DEFAULT_MELO_TTS_LANGUAGE,
  type MeloTTSLanguage,
  type MeloTTSEnglishSpeaker,
} from '@/constants';

// TTS configuration
const MAX_TEXT_LENGTH = 10000; // 10k characters
const DEFAULT_SPEAKER = 'angus';
const DEFAULT_ENCODING = 'mp3';
const DEFAULT_SAMPLE_RATE = 22050;

// Supported output formats for Aura-1
const SUPPORTED_OUTPUT_FORMATS = ['mp3', 'wav', 'flac', 'ogg', 'aac'] as const;

// Supported speakers for Aura-1
const SUPPORTED_SPEAKERS = [
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

// Helper function to get content type from encoding
function getContentType(encoding: string): string {
  const types: Record<string, string> = {
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    flac: 'audio/flac',
    ogg: 'audio/ogg',
    aac: 'audio/aac',
  };
  return types[encoding] || 'audio/mpeg';
}

interface TTSRequest {
  text: string;
  speaker?: string;
  encoding?: string;
  sample_rate?: number;
  bit_rate?: number;
  model?: string;
  language?: MeloTTSLanguage;
  meloSpeaker?: MeloTTSEnglishSpeaker;
}

interface TTSResponse {
  success: boolean;
  audio?: {
    base64: string;
    contentType: string;
    filename: string;
  };
  metadata?: {
    model: string;
    speaker?: string;
    language?: string;
    encoding?: string;
    textLength: number;
    sampleRate?: number;
    generatedAt: string;
    note?: string;
  };
  error?: string;
}

interface Aura1ModelParams {
  text: string;
  speaker?: string;
  encoding?: string;
}

interface MeloTTSModelParams {
  prompt: string;
  lang: string;
  speaker?: string;
}

type ModelParams = Aura1ModelParams | MeloTTSModelParams;

// TTS Result types
interface TTSObjectResult {
  audio: string;
}

type TTSResult = string | ReadableStream | ArrayBuffer | Uint8Array | TTSObjectResult;

export async function POST(request: Request) {
  const { env } = getCloudflareContext();

  try {
    // Check rate limit
    const rateLimitResult = await checkRateLimit(request, 'tts');
    if (!rateLimitResult.allowed) {
      return Response.json(
        {
          error: rateLimitResult.error,
          rateLimit: {
            remaining: rateLimitResult.remaining,
            resetTime: rateLimitResult.resetTime,
            type: 'tts',
          },
        },
        { status: 429 },
      );
    }

    // Validate AI binding is available
    if (!env.AI) {
      return Response.json({ error: 'AI binding is not configured' }, { status: 500 });
    }

    // Parse request body
    let requestData: TTSRequest;
    try {
      requestData = await request.json();
    } catch {
      return Response.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    // Validate required text parameter
    if (!requestData.text || typeof requestData.text !== 'string') {
      return Response.json(
        { error: 'Text parameter is required and must be a string' },
        { status: 400 },
      );
    }

    // Validate text length
    if (requestData.text.length > MAX_TEXT_LENGTH) {
      return Response.json(
        {
          error: `Text too long. Maximum length: ${MAX_TEXT_LENGTH} characters. Provided: ${requestData.text.length}`,
        },
        { status: 400 },
      );
    }

    // Validate minimum text length
    if (requestData.text.trim().length < 1) {
      return Response.json({ error: 'Text cannot be empty' }, { status: 400 });
    }

    // Validate TTS model first
    const selectedModel = requestData.model || DEFAULT_TTS_MODEL;
    const isAura1 = selectedModel === TTS_MODELS.AURA_1;
    const isMeloTTS = selectedModel === TTS_MODELS.MELO_TTS;

    // Validate speaker/language based on model
    let voice: string;
    let meloSpeaker: string | undefined;
    if (isAura1) {
      voice = requestData.speaker || DEFAULT_SPEAKER;
      if (!SUPPORTED_SPEAKERS.includes(voice as (typeof SUPPORTED_SPEAKERS)[number])) {
        return Response.json(
          {
            error: `Invalid speaker. Supported speakers: ${SUPPORTED_SPEAKERS.join(', ')}`,
          },
          { status: 400 },
        );
      }
    } else if (isMeloTTS) {
      // Handle both language codes and English speaker variants
      const requestedSpeaker = requestData.speaker || DEFAULT_MELO_TTS_LANGUAGE;

      // Check if the speaker is an English accent variant
      if (MELO_TTS_ENGLISH_SPEAKERS.includes(requestedSpeaker as MeloTTSEnglishSpeaker)) {
        voice = 'EN';
        meloSpeaker = requestedSpeaker;
      } else {
        // It's a language code
        voice = requestedSpeaker;
        if (!MELO_TTS_LANGUAGES.includes(voice as (typeof MELO_TTS_LANGUAGES)[number])) {
          return Response.json(
            {
              error: `Invalid language. Supported languages: ${MELO_TTS_LANGUAGES.join(', ')}`,
            },
            { status: 400 },
          );
        }

        // For English, also validate speaker if provided separately
        if (voice === 'EN' && requestData.meloSpeaker) {
          if (
            !MELO_TTS_ENGLISH_SPEAKERS.includes(requestData.meloSpeaker as MeloTTSEnglishSpeaker)
          ) {
            return Response.json(
              {
                error: `Invalid English speaker. Supported speakers: ${MELO_TTS_ENGLISH_SPEAKERS.join(', ')}`,
              },
              { status: 400 },
            );
          }
          meloSpeaker = requestData.meloSpeaker;
        }
      }
    } else {
      return Response.json(
        {
          error: `Invalid TTS model. Supported models: ${Object.values(TTS_MODELS).join(', ')}`,
        },
        { status: 400 },
      );
    }

    // Validate encoding format (only for Aura-1)
    const encoding = requestData.encoding || DEFAULT_ENCODING;
    if (
      isAura1 &&
      !SUPPORTED_OUTPUT_FORMATS.includes(encoding as (typeof SUPPORTED_OUTPUT_FORMATS)[number])
    ) {
      return Response.json(
        {
          error: `Invalid encoding. Supported formats: ${SUPPORTED_OUTPUT_FORMATS.join(', ')}`,
        },
        { status: 400 },
      );
    }

    // Validate sample rate (if provided)
    const sampleRate = requestData.sample_rate || DEFAULT_SAMPLE_RATE;
    const validSampleRates = [8000, 16000, 22050, 24000, 44100, 48000];
    if (!validSampleRates.includes(sampleRate)) {
      return Response.json(
        {
          error: `Invalid sample rate. Supported rates: ${validSampleRates.join(', ')}`,
        },
        { status: 400 },
      );
    }

    // Log processing for debugging
    console.log('Processing TTS request:', {
      textLength: requestData.text.length,
      model: selectedModel,
      voice: voice,
    });

    // Prepare model parameters based on selected model
    let modelParams: ModelParams;

    if (isAura1) {
      // Aura-1 parameters
      modelParams = {
        text: requestData.text.trim(),
        ...(voice !== DEFAULT_SPEAKER && { speaker: voice }),
        ...(encoding !== DEFAULT_ENCODING && { encoding }),
      };
    } else if (isMeloTTS) {
      // MeloTTS parameters
      modelParams = {
        prompt: requestData.text.trim(),
        lang: voice,
        ...(voice === 'EN' && { speaker: meloSpeaker || 'EN-Default' }),
      };
    } else {
      // This should never happen due to validation above, but TypeScript needs it
      throw new Error('Invalid model configuration');
    }

    // Call the selected TTS model
    let result: TTSResult;
    try {
      // Try without returnRawResponse first
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      result = await env.AI.run(selectedModel as any, modelParams);
    } catch (aiError: unknown) {
      console.error('Cloudflare AI model error:', aiError);

      // Handle specific AI model errors
      const errorMessage = aiError instanceof Error ? aiError.message : 'Unknown error';
      if (errorMessage && errorMessage.includes('invalid_request_error')) {
        return Response.json(
          {
            error: 'Invalid request parameters. Please check your input and try again.',
          },
          { status: 400 },
        );
      }

      if (errorMessage && errorMessage.includes('model_error')) {
        return Response.json(
          {
            error: 'AI model processing failed. The text may be too complex or unsupported.',
          },
          { status: 400 },
        );
      }

      // Generic AI model error
      throw new Error(`AI model processing failed: ${errorMessage}`);
    }

    // Process the TTS response
    let base64Audio: string = '';

    if (result && typeof result === 'object' && 'audio' in result) {
      // MeloTTS object response
      base64Audio = String((result as TTSObjectResult).audio);
    } else if (result instanceof ReadableStream) {
      // Convert stream to base64
      const reader = result.getReader();
      const chunks: Uint8Array[] = [];
      let done = false;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) chunks.push(value);
      }

      const combined = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
      let offset = 0;
      for (const chunk of chunks) {
        combined.set(chunk, offset);
        offset += chunk.length;
      }
      base64Audio = Buffer.from(combined).toString('base64');
    } else if (typeof result === 'string') {
      // Direct base64 string
      base64Audio = result;
    } else if (result instanceof ArrayBuffer) {
      // Convert ArrayBuffer to base64
      base64Audio = Buffer.from(result).toString('base64');
    } else if (result instanceof Uint8Array) {
      // Convert Uint8Array to base64
      const buffer = result.buffer.slice(result.byteOffset, result.byteOffset + result.byteLength);
      base64Audio = Buffer.from(buffer).toString('base64');
    } else {
      throw new Error('Invalid response format from TTS model');
    }

    // Generate response metadata
    const timestamp = Date.now();
    const contentType = isAura1 ? getContentType(encoding) : 'audio/mpeg';
    const filename = isAura1
      ? `tts_${voice}_${timestamp}.${encoding}`
      : `tts_melotts_${voice}_${timestamp}.mp3`;

    const metadata: NonNullable<TTSResponse['metadata']> = {
      model: selectedModel,
      speaker: isAura1 ? voice : voice === 'EN' && meloSpeaker ? meloSpeaker : undefined,
      language: isMeloTTS ? voice : undefined,
      encoding: isAura1 ? encoding : undefined,
      textLength: requestData.text.length,
      sampleRate: isAura1 ? sampleRate : undefined,
      generatedAt: new Date().toISOString(),
    };

    const response: TTSResponse = {
      success: true,
      audio: {
        base64: base64Audio,
        contentType,
        filename,
      },
      metadata,
    };

    return Response.json(response);
  } catch (error) {
    console.error('Text-to-speech API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return Response.json(
      {
        error: `Text-to-speech processing failed: ${errorMessage}`,
        success: false,
      },
      { status: 500 },
    );
  }
}

// GET endpoint for health check
export async function GET() {
  return Response.json({
    status: 'ok',
    supportedFormats: SUPPORTED_OUTPUT_FORMATS,
    supportedSpeakers: SUPPORTED_SPEAKERS,
    maxTextLength: MAX_TEXT_LENGTH,
  });
}
