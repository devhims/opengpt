'use client';

import { SettingsIcon } from 'lucide-react';
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
import { CLOUDFLARE_AI_MODELS } from '@/constants';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { formatModelName } from '@/utils/models';

interface ImagePromptDockProps {
  imageParams: {
    prompt: string;
    steps: number;
    guidance: number;
    width: number;
    height: number;
  };
  selectedImageModel: string;
  setSelectedImageModel: (model: string) => void;
  onParamsChange: (patch: Partial<ImagePromptDockProps['imageParams']>) => void;
  onSubmit: (e: React.FormEvent) => void;
  isGenerating: boolean;
}

export function ImageInput({
  imageParams,
  selectedImageModel,
  setSelectedImageModel,
  onParamsChange,
  onSubmit,
  isGenerating,
}: ImagePromptDockProps) {
  const hasDims = true; // Assume dimensions are supported for simplicity

  const resetToDefaults = () => {
    onParamsChange({
      steps: 4,
      guidance: 7.5,
      width: 1024,
      height: 1024,
    });
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40">
      <div className="pointer-events-auto mx-auto max-w-4xl px-4 pb-3">
        <PromptInput onSubmit={onSubmit} className="relative">
          <PromptInputTextarea
            value={imageParams.prompt}
            onChange={(e) => onParamsChange({ prompt: e.target.value })}
            placeholder="What’s on your mind’s canvas?"
          />
          <PromptInputToolbar className="border-border/80 border-t">
            <PromptInputTools>
              <PromptInputModelSelect
                onValueChange={setSelectedImageModel}
                value={selectedImageModel}
              >
                <PromptInputModelSelectTrigger variant="outline">
                  <PromptInputModelSelectValue />
                </PromptInputModelSelectTrigger>
                <PromptInputModelSelectContent>
                  {CLOUDFLARE_AI_MODELS.imageGeneration.map((m) => (
                    <PromptInputModelSelectItem key={m} value={m}>
                      {formatModelName(m)}
                    </PromptInputModelSelectItem>
                  ))}
                </PromptInputModelSelectContent>
              </PromptInputModelSelect>

              {hasDims && (
                <>
                  {[
                    { label: '1:1', w: 1024, h: 1024 },
                    { label: '16:9', w: 1344, h: 768 },
                    { label: '9:16', w: 768, h: 1344 },
                  ].map((opt) => {
                    const currentW = imageParams.width;
                    const currentH = imageParams.height;
                    const isActive = Math.abs(currentW / currentH - opt.w / opt.h) < 0.02;
                    return (
                      <PromptInputButton
                        key={opt.label}
                        variant={isActive ? 'outline' : 'ghost'}
                        onClick={() => {
                          onParamsChange({ width: opt.w, height: opt.h });
                        }}
                      >
                        {opt.label}
                      </PromptInputButton>
                    );
                  })}
                </>
              )}

              {/* Advanced settings */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <PromptInputButton variant="ghost" className="pr-2">
                    <SettingsIcon className="size-4" />
                  </PromptInputButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[min(260px,calc(100vw-2rem))]">
                  <div className="grid grid-cols-1 gap-3 px-2 py-2">
                    <div className="space-y-1">
                      <label className="text-xs font-medium">Steps</label>
                      <input
                        type="range"
                        min={1}
                        max={50}
                        value={imageParams.steps}
                        onChange={(e) => onParamsChange({ steps: Number(e.target.value) })}
                        className="accent-foreground h-1 w-full"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium">Guidance</label>
                      <input
                        type="range"
                        step={0.1}
                        min={0}
                        max={15}
                        value={imageParams.guidance}
                        onChange={(e) => onParamsChange({ guidance: Number(e.target.value) })}
                        className="accent-foreground h-1 w-full"
                      />
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <div className="flex items-center justify-between gap-2 px-2 py-2">
                    <div className="text-muted-foreground text-xs">Advanced Settings</div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={resetToDefaults}
                      className="text-xs"
                    >
                      Reset
                    </Button>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </PromptInputTools>
          </PromptInputToolbar>

          {/* Absolute submit button like docs example */}
          <PromptInputSubmit
            disabled={!imageParams.prompt.trim()}
            status={(isGenerating ? 'submitted' : undefined) as ChatStatus}
            className="absolute right-1 bottom-1 bg-white text-black hover:bg-gray-100 dark:bg-white dark:text-black dark:hover:bg-gray-100"
          />
        </PromptInput>
      </div>
    </div>
  );
}
