'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import type { StickToBottomContext } from 'use-stick-to-bottom';
import type { GeneratedImage } from '@/types';

// Utils
import { getProviderLabel } from '@/utils/chat';
import { copyToClipboard } from '@/utils/clipboard';
import { downloadImage, generateImage, ApiError } from '@/utils/image';
import { getFormattedTextModels, getFormattedImageModels } from '@/utils/models';
import { getModelSchema, type ImageModelId } from '@/schemas/image-models';

/**
 * Rate limit response data structure
 */
interface RateLimitResponseData {
  error?: string;
  rateLimit?: {
    type: 'chat' | 'image';
    remaining: number;
    resetTime: number;
  };
}

// Components
import { ChatHeader } from '@/components/pages/chat-header';
import { ChatView } from '@/components/pages/chat-view';
import { ImageView } from '@/components/pages/image-view';
import { ChatInput } from '@/components/pages/chat-input';
import { ImageInput } from '@/components/pages/image-input';

export default function ChatPage() {
  const models = getFormattedTextModels();
  const imageModels = getFormattedImageModels();

  const [mode, setMode] = useState<'chat' | 'image'>('chat');
  const [input, setInput] = useState('');
  const [selectedModel, setSelectedModel] = useState<string>(models[0].value);
  const [selectedImageModel, setSelectedImageModel] = useState<string>(imageModels[0].value);
  const [copiedStates, setCopiedStates] = useState<Map<string, boolean>>(new Map());
  const stickContextRef = useRef<StickToBottomContext | null>(null);

  // Image generation states
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [, setGeneratingImageId] = useState<string | null>(null);

  // Rate limit error states
  const [rateLimitError, setRateLimitError] = useState<{
    message: string;
    type: 'chat' | 'image';
    remaining: number;
    resetTime: number;
    isRateLimit?: boolean;
  } | null>(null);

  // Helper function to get default parameters for the selected image model
  const getDefaultImageParams = (modelId: string) => {
    try {
      const schema = getModelSchema(modelId as ImageModelId);
      const defaultParams = schema.defaultParams;

      // Normalize parameter names and ensure required fields are present
      return {
        prompt: '',
        steps: (defaultParams.steps as number) || (defaultParams.num_steps as number) || 4,
        guidance: (defaultParams.guidance as number) || 7.5,
        width: (defaultParams.width as number) || 1024,
        height: (defaultParams.height as number) || 1024,
        negative_prompt: (defaultParams.negative_prompt as string) || '',
      };
    } catch {
      // Fallback to hardcoded defaults if model schema is not found
      console.warn(`Model schema not found for ${modelId}, using fallback defaults`);
      return {
        prompt: '',
        steps: 4,
        guidance: 7.5,
        width: 1024,
        height: 1024,
        negative_prompt: '',
      };
    }
  };

  // Image generation parameters state - dynamically initialized based on selected model
  const [imageParams, setImageParams] = useState(() => getDefaultImageParams(imageModels[0].value));

  // Use ref to avoid closure issues with selectedModel
  const selectedModelRef = useRef(selectedModel);

  useEffect(() => {
    selectedModelRef.current = selectedModel;
  }, [selectedModel]);

  // Update image parameters when selected model changes
  useEffect(() => {
    const newDefaults = getDefaultImageParams(selectedImageModel);
    setImageParams((prev) => ({
      ...newDefaults,
      // Preserve user-entered prompt and any custom values
      prompt: prev.prompt,
    }));
  }, [selectedImageModel]);

  const { messages, sendMessage, status, regenerate } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      prepareSendMessagesRequest: ({ messages, body, ...options }) => ({
        ...options,
        body: {
          messages,
          model: selectedModelRef.current,
          ...body,
        },
      }),
    }),
  });

  // Ensure we follow new messages to the bottom on updates/streaming.
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      stickContextRef.current?.scrollToBottom({ animation: 'smooth' });
    });
    return () => cancelAnimationFrame(id);
  }, [messages]);

  useEffect(() => {
    if (status === 'streaming' || status === 'submitted') {
      const id = requestAnimationFrame(() => {
        stickContextRef.current?.scrollToBottom({ animation: 'smooth' });
      });
      return () => cancelAnimationFrame(id);
    }
  }, [status]);

  const providerLabel = useMemo(() => getProviderLabel(selectedModel), [selectedModel]);

  // Clear rate limit error when mode changes
  useEffect(() => {
    setRateLimitError(null);
  }, [mode]);

  // Clear rate limit error after a certain time
  useEffect(() => {
    if (rateLimitError) {
      const timer = setTimeout(() => {
        setRateLimitError(null);
      }, 10000); // Clear after 10 seconds
      return () => clearTimeout(timer);
    }
  }, [rateLimitError]);

  // Format reset time for display
  const formatResetTime = (resetTime: number) => {
    const now = Date.now();
    const timeLeft = Math.max(0, resetTime - now);
    const hours = Math.floor(timeLeft / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m`;
    } else {
      return 'soon';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      try {
        // Pre-check rate limit before sending message
        const rateLimitCheckResponse = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: [{ role: 'user', content: input }],
            model: selectedModelRef.current,
          }),
        });

        if (!rateLimitCheckResponse.ok) {
          if (rateLimitCheckResponse.status === 429) {
            const errorData: RateLimitResponseData = await rateLimitCheckResponse.json();
            if (errorData.rateLimit) {
              setRateLimitError({
                message: errorData.error || 'Rate limit exceeded',
                type: errorData.rateLimit.type || 'chat',
                remaining: errorData.rateLimit.remaining || 0,
                resetTime: errorData.rateLimit.resetTime || Date.now() + 24 * 60 * 60 * 1000,
                isRateLimit: true,
              });
            }
            return; // Don't proceed with sending the message
          }
        }

        await sendMessage({ text: input });
        setInput('');
      } catch (error: unknown) {
        // Handle rate limit errors from chat API (fallback for any other errors)
        console.error('Chat submission error:', error);

        // Check for rate limit error in various formats (fallback)
        let rateLimitData: RateLimitResponseData | null = null;

        if (
          error &&
          typeof error === 'object' &&
          'status' in error &&
          error.status === 429 &&
          'data' in error &&
          error.data &&
          typeof error.data === 'object' &&
          'rateLimit' in error.data
        ) {
          // Direct API response format
          rateLimitData = error.data as RateLimitResponseData;
        } else if (
          error &&
          typeof error === 'object' &&
          'cause' in error &&
          error.cause &&
          typeof error.cause === 'object' &&
          'status' in error.cause &&
          error.cause.status === 429 &&
          'data' in error.cause &&
          error.cause.data &&
          typeof error.cause.data === 'object' &&
          'rateLimit' in error.cause.data
        ) {
          // Wrapped error format from useChat
          rateLimitData = error.cause.data as RateLimitResponseData;
        } else if (
          error &&
          typeof error === 'object' &&
          'message' in error &&
          typeof error.message === 'string' &&
          error.message.includes('Rate limit exceeded')
        ) {
          // Fallback for message-based rate limit detection
          console.log('Detected rate limit from message');
          setRateLimitError({
            message: error.message,
            type: 'chat',
            remaining: 0,
            resetTime: Date.now() + 24 * 60 * 60 * 1000, // 24 hours from now
            isRateLimit: true,
          });
          return;
        }

        if (rateLimitData && rateLimitData.rateLimit) {
          const rateLimit = rateLimitData.rateLimit;
          setRateLimitError({
            message: rateLimitData.error || 'Rate limit exceeded',
            type: rateLimit.type || 'chat',
            remaining: rateLimit.remaining || 0,
            resetTime: rateLimit.resetTime || Date.now() + 24 * 60 * 60 * 1000,
            isRateLimit: true,
          });
        } else {
          // Re-throw other errors
          throw error;
        }
      }
    }
  };

  const handleCopy = (text: string, messageId: string) => {
    copyToClipboard(text, messageId, setCopiedStates);
  };

  const handleDownload = (image: GeneratedImage) => {
    downloadImage(image);
  };

  const handleImageParamsChange = (patch: Partial<typeof imageParams>) => {
    setImageParams((prev) => ({ ...prev, ...patch }));
  };

  const handleImageGeneration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageParams.prompt?.trim()) return;

    const prompt = imageParams.prompt.trim();
    const imageId = Date.now().toString();
    setImageParams((prev) => ({ ...prev, prompt: '' }));
    setIsGeneratingImage(true);
    setGeneratingImageId(imageId);

    // Add placeholder image while generating
    const placeholderImage: GeneratedImage = {
      id: imageId,
      base64: '',
      uint8Array: [],
      mediaType: 'image/jpeg' as const,
      prompt,
    };
    setGeneratedImages((prev) => [placeholderImage, ...prev]);

    try {
      const imageData = await generateImage(prompt, selectedImageModel, imageParams);
      const newImage = {
        ...imageData,
        id: imageId,
        prompt,
      };

      // Replace placeholder with actual image
      setGeneratedImages((prev) => prev.map((img) => (img.id === imageId ? newImage : img)));
    } catch (error: unknown) {
      console.error('Image generation error:', error);

      // Handle rate limit errors
      if (error instanceof ApiError && error.data) {
        const errorData = error.data;

        // Handle rate limit errors
        if (error.status === 429 && errorData.rateLimit) {
          const rateLimit = errorData.rateLimit;
          setRateLimitError({
            message: error.message,
            type: rateLimit.type,
            remaining: rateLimit.remaining,
            resetTime: rateLimit.resetTime,
            isRateLimit: true,
          });
        } else {
          // Display the original error message from the API
          setRateLimitError({
            message: error.message,
            type: 'image',
            remaining: 0,
            resetTime: Date.now() + 10000, // Show for 10 seconds
            isRateLimit: false,
          });
        }
      } else {
        // Display the original error message
        const errorMessage =
          error instanceof Error ? error.message : 'An unexpected error occurred';
        setRateLimitError({
          message: errorMessage,
          type: 'image',
          remaining: 0,
          resetTime: Date.now() + 10000, // Show for 10 seconds
          isRateLimit: false,
        });
      }

      // Remove placeholder on error
      setGeneratedImages((prev) => prev.filter((img) => img.id !== imageId));
    } finally {
      setIsGeneratingImage(false);
      setGeneratingImageId(null);
    }
  };

  return (
    <div className="bg-background flex h-dvh flex-col">
      <ChatHeader mode={mode} setMode={setMode} providerLabel={providerLabel} />

      {/* Rate limit error display */}
      {rateLimitError && (
        <div className="mx-4 mt-2 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {/* <div className="text-red-600 dark:text-red-400">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                    clipRule="evenodd"
                  />
                </svg>
              </div> */}
              <div className="text-sm text-red-800 dark:text-red-200">
                {/* <p className="font-medium">Rate Limit Exceeded</p> */}
                <p className="font-medium">{rateLimitError.message}</p>
                {rateLimitError.isRateLimit && (
                  <p className="mt-1 text-xs">
                    Resets in {formatResetTime(rateLimitError.resetTime)} •{' '}
                    {rateLimitError.remaining} remaining
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => setRateLimitError(null)}
              className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col">
        {mode === 'chat' ? (
          <>
            <ChatView
              messages={messages}
              status={status}
              copiedStates={copiedStates}
              stickContextRef={stickContextRef}
              onCopy={handleCopy}
              onRegenerate={regenerate}
            />
            <ChatInput
              input={input}
              setInput={setInput}
              selectedModel={selectedModel}
              setSelectedModel={setSelectedModel}
              models={models}
              status={status}
              onSubmit={handleSubmit}
            />
          </>
        ) : (
          <>
            <ImageView
              generatedImages={generatedImages}
              isGeneratingImage={isGeneratingImage}
              copiedStates={copiedStates}
              onCopy={handleCopy}
              onDownload={handleDownload}
            />
            <ImageInput
              imageParams={imageParams}
              selectedImageModel={selectedImageModel}
              setSelectedImageModel={setSelectedImageModel}
              onParamsChange={handleImageParamsChange}
              onSubmit={handleImageGeneration}
              isGenerating={isGeneratingImage}
            />
          </>
        )}
      </div>
    </div>
  );
}
