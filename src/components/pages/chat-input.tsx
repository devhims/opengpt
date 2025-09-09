'use client';

import type { ChatStatus } from 'ai';
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
  PromptInputModelSelect,
  PromptInputModelSelectTrigger,
  PromptInputModelSelectContent,
  PromptInputModelSelectItem,
  PromptInputModelSelectValue,
  PromptInputSubmit,
} from '@/components/ai-elements/prompt-input';

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  selectedModel: string;
  setSelectedModel: (value: string) => void;
  models: Array<{ name: string; value: string }>;
  status: ChatStatus;
  onSubmit: (e: React.FormEvent) => void;
}

export function ChatInput({
  input,
  setInput,
  selectedModel,
  setSelectedModel,
  models,
  status,
  onSubmit,
}: ChatInputProps) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40">
      <div className="pointer-events-auto mx-auto max-w-4xl px-4 pb-3">
        <PromptInput onSubmit={onSubmit} className="relative">
          <PromptInputTextarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="What question is sparking your curiosity?"
          />
          <PromptInputToolbar className="border-border/80 border-t">
            <PromptInputTools>
              <PromptInputModelSelect onValueChange={setSelectedModel} value={selectedModel}>
                <PromptInputModelSelectTrigger variant="outline">
                  <PromptInputModelSelectValue />
                </PromptInputModelSelectTrigger>
                <PromptInputModelSelectContent>
                  {models.map((model) => (
                    <PromptInputModelSelectItem key={model.value} value={model.value}>
                      {model.name}
                    </PromptInputModelSelectItem>
                  ))}
                </PromptInputModelSelectContent>
              </PromptInputModelSelect>
            </PromptInputTools>
          </PromptInputToolbar>

          {/* Absolute submit button like docs example */}
          <PromptInputSubmit
            disabled={!input}
            status={status}
            className="absolute right-1 bottom-1 bg-white text-black hover:bg-gray-100 dark:bg-white dark:text-black dark:hover:bg-gray-100"
          />
        </PromptInput>
      </div>
    </div>
  );
}
