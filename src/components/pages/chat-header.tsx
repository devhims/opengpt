'use client';

import { MessageSquareIcon, ImageIcon } from 'lucide-react';

interface ChatHeaderProps {
  mode: 'chat' | 'image';
  setMode: (mode: 'chat' | 'image') => void;
  providerLabel: string;
}

export function ChatHeader({ mode, setMode, providerLabel }: ChatHeaderProps) {
  return (
    <header className="bg-card/80 supports-[backdrop-filter]:bg-card/60 sticky top-0 z-20 border-b shadow-sm backdrop-blur">
      <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-4 py-3 sm:px-6 sm:pt-4 sm:pb-2">
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-3">
          <h1 className="text-lg font-semibold tracking-tight sm:text-xl">AiX</h1>
          <p className="text-muted-foreground text-xs sm:text-sm">
            {/* {mode === 'chat' ? 'Chat with Open Models' : 'Generate images with AI'} */}
            Experiment with Open Models
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-2">
          <div className="text-muted-foreground flex items-center gap-1 text-xs">
            <div className="h-1.5 w-1.5 rounded-full bg-green-600"></div>
            {mode === 'chat' ? providerLabel : 'Cloudflare'}
          </div>
          <div className="bg-muted flex rounded-lg border p-0.5 sm:p-1">
            <button
              onClick={() => setMode('chat')}
              className={`flex items-center gap-1.5 rounded px-2 py-1.5 text-xs transition-colors sm:gap-2 sm:px-3 sm:py-1 sm:text-xs ${
                mode === 'chat'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <MessageSquareIcon size={12} className="sm:h-[14px] sm:w-[14px]" />
              <span className="xs:inline hidden sm:inline">Chat</span>
            </button>
            <button
              onClick={() => setMode('image')}
              className={`flex items-center gap-1.5 rounded px-2 py-1.5 text-xs transition-colors sm:gap-2 sm:px-3 sm:py-1 sm:text-xs ${
                mode === 'image'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <ImageIcon size={12} className="sm:h-[14px] sm:w-[14px]" />
              <span className="xs:inline hidden sm:inline">Image</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
