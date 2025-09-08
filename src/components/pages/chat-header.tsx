'use client';

import { MessageSquareIcon, ImageIcon, FlaskConicalIcon } from 'lucide-react';

interface ChatHeaderProps {
  mode: 'chat' | 'image';
  setMode: (mode: 'chat' | 'image') => void;
  providerLabel: string;
  onOpenTester?: () => void;
}

export function ChatHeader({ mode, setMode, providerLabel, onOpenTester }: ChatHeaderProps) {
  return (
    <header className="bg-card/80 supports-[backdrop-filter]:bg-card/60 sticky top-0 z-20 border-b shadow-sm backdrop-blur">
      <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold tracking-tight">AI Lab</h1>
          <p className="text-muted-foreground text-sm">
            {mode === 'chat' ? 'Chat with Open Models' : 'Generate images with AI'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-muted flex rounded-lg border p-1">
            <button
              onClick={() => setMode('chat')}
              className={`flex items-center gap-2 rounded-md px-3 py-1 text-xs transition-colors ${
                mode === 'chat'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <MessageSquareIcon size={14} />
              Chat
            </button>
            <button
              onClick={() => setMode('image')}
              className={`flex items-center gap-2 rounded-md px-3 py-1 text-xs transition-colors ${
                mode === 'image'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <ImageIcon size={14} />
              Image
            </button>
          </div>

          {mode === 'image' && onOpenTester && (
            <button
              onClick={onOpenTester}
              className="text-muted-foreground hover:text-foreground flex items-center gap-2 rounded-md border px-3 py-1 text-xs transition-colors"
              title="Test all image models"
            >
              <FlaskConicalIcon size={14} />
              Test Models
            </button>
          )}

          <div className="text-muted-foreground text-xs">
            {mode === 'chat' ? providerLabel : 'Cloudflare'}
          </div>
        </div>
      </div>
    </header>
  );
}
