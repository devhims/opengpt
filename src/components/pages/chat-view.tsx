'use client';

import { useRef, Fragment } from 'react';
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
      <ConversationContent className="space-y-4 py-4 pb-28">
        <div className="mx-auto w-full max-w-4xl px-6">
          {messages.length === 0 && (
            <div className="text-muted-foreground mt-8 rounded-xl border border-dashed p-6 text-center text-sm">
              Ask me anything. Try: &quot;Create a 1‑day Tokyo itinerary.&quot;
            </div>
          )}

          {messages.map((message) => (
            <div key={message.id} className="mb-4">
              {message.role === 'assistant' &&
                message.parts?.filter((part: any) => part.type === 'source-url').length > 0 && (
                  <Sources>
                    <SourcesTrigger
                      count={message.parts.filter((part: any) => part.type === 'source-url').length}
                    />
                    {message.parts
                      .filter((part: any) => part.type === 'source-url')
                      .map((part: any, i: number) => (
                        <SourcesContent key={`${message.id}-${i}`}>
                          <Source key={`${message.id}-${i}`} href={part.url} title={part.url} />
                        </SourcesContent>
                      ))}
                  </Sources>
                )}
              {message.parts?.map((part: any, i: number) => (
                <ChatMessagePart
                  key={`${message.id}-${i}`}
                  part={part}
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
