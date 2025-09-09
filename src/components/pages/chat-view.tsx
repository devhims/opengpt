'use client';

import React from 'react';
import type { UIMessage } from 'ai';
import type { StickToBottomContext } from 'use-stick-to-bottom';
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import { Sources, SourcesTrigger, SourcesContent, Source } from '@/components/ai-elements/sources';
import { Message, MessageContent } from '@/components/ai-elements/message';
import { Response } from '@/components/ai-elements/response';
import { Loader } from '@/components/ai-elements/loader';
import { ChatMessagePart } from './chat-message-part';

interface ChatViewProps {
  messages: UIMessage[];
  status: string;
  copiedStates: Map<string, boolean>;
  stickContextRef: React.MutableRefObject<StickToBottomContext | null>;
  onCopy: (text: string, messageId: string) => void;
  onRegenerate: () => void;
}

export function ChatView({
  messages,
  status,
  copiedStates,
  stickContextRef,
  onCopy,
  onRegenerate,
}: ChatViewProps) {
  return (
    <Conversation contextRef={stickContextRef} className="ai-conversation w-full flex-1">
      <ConversationContent
        className={`space-y-4 py-4 pb-28 ${messages.length === 0 ? 'flex min-h-full flex-col justify-center' : ''}`}
      >
        <div className="mx-auto w-full max-w-4xl px-4 sm:px-6">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="relative">
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-pink-600/20 blur-lg"></div>
                <div className="border-border/50 from-background via-background/80 to-muted/20 relative w-full max-w-[600px] min-w-[280px] rounded-xl border bg-gradient-to-br p-6 text-center shadow-lg backdrop-blur-sm sm:min-w-[480px] sm:p-8">
                  <div className="mb-3 text-3xl sm:mb-4 sm:text-4xl">💬</div>
                  <h3 className="text-foreground mb-1 text-base font-semibold sm:text-lg">
                    Ready to chat
                  </h3>
                  <h4 className="text-muted-foreground text-sm leading-relaxed">
                    Let’s turn ideas into words
                  </h4>
                </div>
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div key={message.id} className="mb-4">
              {message.role === 'assistant' &&
                message.parts?.filter(
                  (part: unknown) => (part as { type: string }).type === 'source-url',
                ).length > 0 && (
                  <Sources>
                    <SourcesTrigger
                      count={
                        message.parts.filter(
                          (part: unknown) => (part as { type: string }).type === 'source-url',
                        ).length
                      }
                    />
                    {message.parts
                      .filter((part: unknown) => (part as { type: string }).type === 'source-url')
                      .map((part: unknown, i: number) => (
                        <SourcesContent key={`${message.id}-${i}`}>
                          <Source
                            key={`${message.id}-${i}`}
                            href={(part as { url: string }).url}
                            title={(part as { url: string }).url}
                          />
                        </SourcesContent>
                      ))}
                  </Sources>
                )}
              {message.parts?.map((part: unknown, i: number) => (
                <ChatMessagePart
                  key={`${message.id}-${i}`}
                  part={part as { type: string; text: string; url?: string }}
                  messageId={message.id}
                  messageRole={message.role}
                  partIndex={i}
                  isLastPart={i === message.parts.length - 1}
                  isStreaming={
                    status === 'streaming' &&
                    i === message.parts.length - 1 &&
                    message.id === messages.at(-1)?.id
                  }
                  copiedStates={copiedStates}
                  onCopy={onCopy}
                  onRegenerate={onRegenerate}
                />
              )) ||
                (message.role === 'user' && (
                  <Message from={message.role}>
                    <MessageContent>
                      <Response>{(message as { content?: string }).content || ''}</Response>
                    </MessageContent>
                  </Message>
                ))}
            </div>
          ))}
          {status === 'submitted' && <Loader />}
        </div>
      </ConversationContent>
      <ConversationScrollButton className="bottom-12 z-30" />
    </Conversation>
  );
}
