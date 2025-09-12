import { getCloudflareContext } from '@opennextjs/cloudflare';
import { checkRateLimit } from '@/utils/rate-limit';

// Supported audio content types
const SUPPORTED_AUDIO_TYPES = [
  'audio/mpeg', // MP3
  'audio/mp3', // MP3 (alternative)
  'audio/wav', // WAV
  'audio/wave', // WAV (alternative)
  'audio/x-wav', // WAV (alternative)
  'audio/mp4', // MP4 audio
  'audio/m4a', // M4A
  'audio/aac', // AAC
  'audio/ogg', // OGG
  'audio/webm', // WebM audio
  'audio/webm;codecs=opus', // WebM with Opus codec
  'audio/flac', // FLAC
  'audio/3gpp', // 3GPP audio
  'audio/amr', // AMR audio
] as const;

type SupportedAudioType = (typeof SUPPORTED_AUDIO_TYPES)[number];

// Model parameters interface
interface SpeechModelParams {
  audio: {
    body: ReadableStream;
    contentType: string;
  };
  detect_language?: boolean;
  punctuate?: boolean;
  smart_format?: boolean;
}

// Deepgram API response interfaces (Cloudflare AI format)
interface WordData {
  word: string;
  start: number;
  end: number;
  confidence: number;
}

interface Alternative {
  transcript: string;
  confidence?: number;
  words?: WordData[];
}

interface Channel {
  alternatives?: Alternative[];
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface Results {
  channels?: Channel[];
  duration?: number;
  language?: string;
}

// Maximum file size (25MB)
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

// Nova-3 model constant
const SPEECH_TO_TEXT_MODEL = '@cf/deepgram/nova-3';

interface TranscriptionResult {
  transcript: string;
  confidence?: number;
  duration?: number;
  language?: string;
  words?: Array<{
    word: string;
    start: number;
    end: number;
    confidence: number;
  }>;
}

export async function POST(request: Request) {
  const { env } = getCloudflareContext();

  try {
    // Check rate limit
    const rateLimitResult = await checkRateLimit(request, 'speech');
    if (!rateLimitResult.allowed) {
      return Response.json(
        {
          error: rateLimitResult.error,
          rateLimit: {
            remaining: rateLimitResult.remaining,
            resetTime: rateLimitResult.resetTime,
            type: 'speech',
          },
        },
        { status: 429 },
      );
    }

    // Validate AI binding is available
    if (!env.AI) {
      return Response.json({ error: 'AI binding is not configured' }, { status: 500 });
    }

    // Parse form data for file upload
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return Response.json({ error: 'Invalid form data' }, { status: 400 });
    }

    // Get the audio file
    const file = formData.get('audio') as File;
    if (!file) {
      return Response.json({ error: 'No audio file provided' }, { status: 400 });
    }

    // Validate file type with fallback to file extension
    console.log('Audio file received:', { type: file.type, name: file.name, size: file.size });

    // Check MIME type first
    let isSupported = SUPPORTED_AUDIO_TYPES.includes(file.type as SupportedAudioType);

    // Fallback: check file extension if MIME type doesn't match
    if (!isSupported) {
      const fileName = file.name.toLowerCase();
      const audioExtensions = [
        '.mp3',
        '.wav',
        '.mp4',
        '.m4a',
        '.aac',
        '.ogg',
        '.webm',
        '.flac',
        '.3gp',
        '.amr',
      ];
      isSupported = audioExtensions.some((ext) => fileName.endsWith(ext));
    }

    if (!isSupported) {
      return Response.json(
        {
          error: `Unsupported audio format: ${file.type}. Supported formats: ${SUPPORTED_AUDIO_TYPES.join(', ')}`,
        },
        { status: 400 },
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return Response.json(
        {
          error: `File too large. Maximum size: ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
        },
        { status: 400 },
      );
    }

    // Validate minimum file size (audio files should be at least 1KB for meaningful content)
    if (file.size < 1000) {
      return Response.json(
        {
          error: 'Audio file too small. Please record for at least 1 second.',
        },
        { status: 400 },
      );
    }

    // Get optional parameters
    const detectLanguage =
      formData.get('detect_language') === 'true' || formData.get('detect_language') === '1';
    const punctuate = formData.get('punctuate') !== 'false'; // Default to true
    const smartFormat = formData.get('smart_format') !== 'false'; // Default to true

    // Prepare the audio input for the model
    const audioInput = {
      body: file.stream(),
      contentType: file.type,
    };

    // Prepare model parameters
    const modelParams: SpeechModelParams = {
      audio: audioInput,
    };

    // Add optional parameters
    if (detectLanguage) {
      modelParams.detect_language = true;
    }
    if (punctuate) {
      modelParams.punctuate = true;
    }
    if (smartFormat) {
      modelParams.smart_format = true;
    }

    // Call the nova-3 model
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let result: any;
    try {
      result = await env.AI.run(SPEECH_TO_TEXT_MODEL, modelParams);
    } catch (aiError: unknown) {
      console.error('Cloudflare AI model error:', aiError);

      // Handle specific AI model errors
      const errorMessage = aiError instanceof Error ? aiError.message : 'Unknown error';
      if (errorMessage.includes('5012')) {
        return Response.json(
          {
            error:
              'Audio format not supported or file too small. Please try recording again with a longer message.',
          },
          { status: 400 },
        );
      }

      if (errorMessage.includes('3030')) {
        return Response.json(
          {
            error:
              'Audio processing failed. The audio format might not be supported. Please try again.',
          },
          { status: 400 },
        );
      }

      // Generic AI model error
      throw new Error(`AI model processing failed: ${errorMessage}`);
    }

    // Process the response
    const transcription = processTranscriptionResult(result);

    return Response.json({
      success: true,
      transcription,
      metadata: {
        model: SPEECH_TO_TEXT_MODEL,
        fileName: file.name,
        fileSize: file.size,
        contentType: file.type,
        processedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Speech-to-text API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return Response.json(
      {
        error: `Speech-to-text processing failed: ${errorMessage}`,
        success: false,
      },
      { status: 500 },
    );
  }
}

// Process and normalize the transcription result from nova-3
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function processTranscriptionResult(result: any): TranscriptionResult {
  try {
    // Handle different response formats
    if (!result || typeof result !== 'object') {
      throw new Error('Invalid response format from speech model');
    }

    // Check for results in the response
    if (!result.results) {
      // If no results field, the entire response might be the transcription
      if (typeof result.transcript === 'string') {
        return {
          transcript: result.transcript,
          confidence: result.confidence,
          language: result.language,
        };
      }
      throw new Error('No transcription results found in response');
    }

    const results = result.results;

    // Handle channels structure
    if (results.channels && Array.isArray(results.channels) && results.channels.length > 0) {
      const channel = results.channels[0]; // Use first channel

      if (
        channel.alternatives &&
        Array.isArray(channel.alternatives) &&
        channel.alternatives.length > 0
      ) {
        const alternative = channel.alternatives[0]; // Use first alternative

        const transcription: TranscriptionResult = {
          transcript: alternative.transcript || '',
          confidence: alternative.confidence,
        };

        // Add words if available
        if (alternative.words && Array.isArray(alternative.words)) {
          transcription.words = alternative.words.map((word: WordData) => ({
            word: word.word || '',
            start: word.start || 0,
            end: word.end || 0,
            confidence: word.confidence || 0,
          }));
        }

        // Add duration if available
        if (results.duration) {
          transcription.duration = results.duration;
        }

        // Add language if available
        if (results.language) {
          transcription.language = results.language;
        }

        return transcription;
      }
    }

    // Fallback: try to extract transcript directly
    if (results.transcript) {
      return {
        transcript: results.transcript,
        confidence: results.confidence,
        language: results.language,
      };
    }

    // Last resort: stringify the results
    return {
      transcript: JSON.stringify(results, null, 2),
    };
  } catch (error) {
    console.error('Error processing transcription result:', error);
    throw new Error('Failed to process transcription result');
  }
}

// GET endpoint for health check and supported formats
export async function GET() {
  return Response.json({
    status: 'ok',
    model: SPEECH_TO_TEXT_MODEL,
    supportedFormats: SUPPORTED_AUDIO_TYPES,
    maxFileSize: MAX_FILE_SIZE,
    maxFileSizeMB: MAX_FILE_SIZE / (1024 * 1024),
    rateLimit: {
      type: 'speech',
      maxRequests: 10,
      windowMs: 24 * 60 * 60 * 1000, // 24 hours
    },
  });
}
