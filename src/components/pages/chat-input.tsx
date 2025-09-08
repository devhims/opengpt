'use client';

import { GlobeIcon } from 'lucide-react';
import type { ChatStatus } from 'ai';
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
  PromptInputButton,
  PromptInputModelSelect,
  PromptInputModelSelectTrigger,
  PromptInputModelSelectContent,
  PromptInputModelSelectItem,
  PromptInputModelSelectValue,
  PromptInputSubmit,
} from '@/components/ai-elements/prompt-input';

interface ChatInputProps {
  mode: 'chat' | 'image';
  input: string;
  setInput: (value: string) => void;
  webSearch: boolean;
  setWebSearch: (value: boolean) => void;
  selectedModel: string;
  selectedImageModel: string;
  setSelectedModel: (value: string) => void;
  setSelectedImageModel: (value: string) => void;
  models: Array<{ name: string; value: string }>;
  imageModels: Array<{ name: string; value: string }>;
  status: ChatStatus;
  generatingImageId: string | null;
  onSubmit: (e: React.FormEvent) => void;
  onImageGeneration: (e: React.FormEvent) => void;
}

export function ChatInput({
  mode,
  input,
  setInput,
  webSearch,
  setWebSearch,
  selectedModel,
  selectedImageModel,
  setSelectedModel,
  setSelectedImageModel,
  models,
  imageModels,
  status,
  generatingImageId,
  onSubmit,
  onImageGeneration,
}: ChatInputProps) {
  return (
    <div className="sticky bottom-0 mx-auto w-full max-w-4xl pb-3">
      <PromptInput onSubmit={mode === 'chat' ? onSubmit : onImageGeneration}>
        <PromptInputTextarea
          onChange={(e) => setInput(e.target.value)}
          value={input}
          placeholder={
            mode === 'chat'
              ? 'What would you like to know?'
              : 'Describe the image you want to generate...'
          }
        />
        <PromptInputToolbar>
          <PromptInputTools>
            {mode === 'chat' && (
              <PromptInputButton
                variant={webSearch ? 'default' : 'ghost'}
                onClick={() => setWebSearch(!webSearch)}
              >
                <GlobeIcon size={16} />
                <span>Search</span>
              </PromptInputButton>
            )}
            <PromptInputModelSelect
              onValueChange={(value) => {
                if (mode === 'chat') {
                  setSelectedModel(value);
                } else {
                  setSelectedImageModel(value);
                }
              }}
              value={mode === 'chat' ? selectedModel : selectedImageModel}
            >
              <PromptInputModelSelectTrigger>
                <PromptInputModelSelectValue />
              </PromptInputModelSelectTrigger>
              <PromptInputModelSelectContent>
                {(mode === 'chat' ? models : imageModels).map((model) => (
                  <PromptInputModelSelectItem key={model.value} value={model.value}>
                    {model.name}
                  </PromptInputModelSelectItem>
                ))}
              </PromptInputModelSelectContent>
            </PromptInputModelSelect>
          </PromptInputTools>
          <PromptInputSubmit
            disabled={!input}
            status={mode === 'chat' ? status : generatingImageId ? 'submitted' : undefined}
            className="bg-white text-black hover:bg-gray-100 dark:bg-white dark:text-black dark:hover:bg-gray-100"
          />
        </PromptInputToolbar>
      </PromptInput>
    </div>
  );
}
