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
import { toast } from 'sonner';

/**
 * Standard error response data structure
 */
interface StandardErrorResponse {
  error: string;
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

  const {
    messages,
    sendMessage,
    status: rawStatus,
    regenerate,
  } = useChat({
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
    onError: (error) => {
      const message = error instanceof Error ? error.message : String(error);

      // Handle rate limit errors specially (show persistent state + toast)
      if (message.includes('Rate limit exceeded')) {
        try {
          // Parse the stringified JSON error response
          const parsedError = JSON.parse(message) as StandardErrorResponse;
          const rateLimitData = {
            message: parsedError.error,
            type: parsedError.rateLimit!.type,
            remaining: parsedError.rateLimit!.remaining,
            resetTime: parsedError.rateLimit!.resetTime,
            isRateLimit: true,
          };
          setRateLimitError(rateLimitData);

          // Also show as toast for immediate feedback
          toast.error(rateLimitData.message, {
            description: `Resets in ${formatResetTime(rateLimitData.resetTime)} • ${rateLimitData.remaining} remaining`,
          });
        } catch {
          // Fallback if JSON parsing fails
          const fallbackData = {
            message: 'Rate limit exceeded',
            type: 'chat' as const,
            remaining: 0,
            resetTime: Date.now() + 24 * 60 * 60 * 1000,
            isRateLimit: true,
          };
          setRateLimitError(fallbackData);
          toast.error(fallbackData.message);
        }
      } else {
        // Handle other errors with toast only
        toast.error('Request failed', {
          description: message,
        });
      }

      // Clear input on error to reset the submit button state
      setInput('');
    },
  });

  // Override status to prevent submit button from showing error state
  const status = rawStatus === 'error' ? 'ready' : rawStatus;

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

  // Format reset time for display (based on UTC 0:00 reset)
  const formatResetTime = (resetTime: number) => {
    const now = Date.now();
    const timeLeft = Math.max(0, resetTime - now);
    const hours = Math.floor(timeLeft / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

    return `${hours}h ${minutes}m`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      const messageText = input; // Capture the current input value
      setInput('');
      await sendMessage({ text: messageText });
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

      // Handle rate limit errors (429) - show persistent state + toast
      if (error instanceof ApiError && error.status === 429 && error.data?.rateLimit) {
        const rateLimit = error.data.rateLimit;
        const rateLimitData = {
          message: error.message,
          type: rateLimit.type,
          remaining: rateLimit.remaining,
          resetTime: rateLimit.resetTime,
          isRateLimit: true,
        };
        setRateLimitError(rateLimitData);

        // Also show as toast for immediate feedback
        toast.error(rateLimitData.message, {
          description: `Resets in ${formatResetTime(rateLimitData.resetTime)} • ${rateLimitData.remaining} remaining`,
        });

        // Clear image prompt on rate limit error to reset the submit button state
        setImageParams((prev) => ({ ...prev, prompt: '' }));
      } else {
        // Handle other image generation errors with toast only
        const errorMessage = error instanceof Error ? error.message : 'Image generation failed';
        toast.error('Image Generation Failed', {
          description: errorMessage,
        });
      }

      // Clear image prompt on error to reset the submit button state
      setImageParams((prev) => ({ ...prev, prompt: '' }));

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
