'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import type { StickToBottomContext } from 'use-stick-to-bottom';
import type { ImageGenerationResponse } from '@/app/api/image/route';

// Utils
import { getProviderLabel } from '@/utils/chat';
import { copyToClipboard } from '@/utils/clipboard';
import { downloadImage, generateImage } from '@/utils/image';
import { getFormattedTextModels, getFormattedImageModels } from '@/utils/models';

// Components
import { ChatHeader } from '@/components/pages/chat-header';
import { ChatView } from '@/components/pages/chat-view';
import { ImageView } from '@/components/pages/image-view';
import { ChatInput } from '@/components/pages/chat-input';
import { ModelTester } from '@/components/pages/model-tester';

export default function ChatPage() {
  const models = getFormattedTextModels();
  const imageModels = getFormattedImageModels();

  const [mode, setMode] = useState<'chat' | 'image'>('chat');
  const [input, setInput] = useState('');
  const [selectedModel, setSelectedModel] = useState<string>(models[0].value);
  const [selectedImageModel, setSelectedImageModel] = useState<string>(imageModels[0].value);
  const [webSearch, setWebSearch] = useState(false);
  const [copiedStates, setCopiedStates] = useState<Map<string, boolean>>(new Map());
  const stickContextRef = useRef<StickToBottomContext | null>(null);

  // Image generation states
  const [generatedImages, setGeneratedImages] = useState<
    Array<ImageGenerationResponse & { id: string; prompt: string }>
  >([]);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatingImageId, setGeneratingImageId] = useState<string | null>(null);

  // Model tester state
  const [showModelTester, setShowModelTester] = useState(false);

  // Use ref to avoid closure issues with selectedModel and webSearch
  const selectedModelRef = useRef(selectedModel);
  const webSearchRef = useRef(webSearch);

  useEffect(() => {
    selectedModelRef.current = selectedModel;
  }, [selectedModel]);

  useEffect(() => {
    webSearchRef.current = webSearch;
  }, [webSearch]);

  const { messages, sendMessage, status, regenerate } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      prepareSendMessagesRequest: ({ messages, body, ...options }) => ({
        ...options,
        body: {
          messages,
          model: selectedModelRef.current,
          webSearch: webSearchRef.current,
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      sendMessage({ text: input });
      setInput('');
    }
  };

  const handleCopy = (text: string, messageId: string) => {
    copyToClipboard(text, messageId, setCopiedStates);
  };

  const handleDownload = (image: ImageGenerationResponse & { id: string; prompt: string }) => {
    downloadImage(image);
  };

  const handleImageGeneration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const prompt = input.trim();
    const imageId = Date.now().toString();
    setInput('');
    setIsGeneratingImage(true);
    setGeneratingImageId(imageId);

    // Add placeholder image while generating
    const placeholderImage: ImageGenerationResponse & { id: string; prompt: string } = {
      id: imageId,
      base64: '',
      uint8Array: [],
      mediaType: 'image/jpeg' as const,
      prompt,
    };
    setGeneratedImages((prev) => [placeholderImage, ...prev]);

    try {
      const imageData = await generateImage(prompt, selectedImageModel, 4);
      const newImage = {
        ...imageData,
        id: imageId,
        prompt,
      };

      // Replace placeholder with actual image
      setGeneratedImages((prev) => prev.map((img) => (img.id === imageId ? newImage : img)));
    } catch (error) {
      console.error('Image generation error:', error);
      // Remove placeholder on error
      setGeneratedImages((prev) => prev.filter((img) => img.id !== imageId));
    } finally {
      setIsGeneratingImage(false);
      setGeneratingImageId(null);
    }
  };

  return (
    <div className="bg-background flex h-dvh flex-col">
      <ChatHeader
        mode={mode}
        setMode={setMode}
        providerLabel={providerLabel}
        onOpenTester={() => setShowModelTester(true)}
      />

      <div className="flex min-h-0 flex-1 flex-col">
        {mode === 'chat' ? (
          <ChatView
            messages={messages}
            status={status}
            copiedStates={copiedStates}
            stickContextRef={stickContextRef}
            onCopy={handleCopy}
            onRegenerate={regenerate}
          />
        ) : (
          <ImageView
            generatedImages={generatedImages}
            isGeneratingImage={isGeneratingImage}
            copiedStates={copiedStates}
            onCopy={handleCopy}
            onDownload={handleDownload}
          />
        )}
      </div>

      <ChatInput
        mode={mode}
        input={input}
        setInput={setInput}
        webSearch={webSearch}
        setWebSearch={setWebSearch}
        selectedModel={selectedModel}
        selectedImageModel={selectedImageModel}
        setSelectedModel={setSelectedModel}
        setSelectedImageModel={setSelectedImageModel}
        models={models}
        imageModels={imageModels}
        status={status}
        generatingImageId={generatingImageId}
        onSubmit={handleSubmit}
        onImageGeneration={handleImageGeneration}
      />

      {showModelTester && <ModelTester onClose={() => setShowModelTester(false)} />}
    </div>
  );
}
