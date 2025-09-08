'use client';

import { Fragment } from 'react';
import { RefreshCcwIcon, CopyIcon, CheckIcon } from 'lucide-react';
import { parseThinkingTags } from '@/utils/chat';
import { Message, MessageContent } from '@/components/ai-elements/message';
import { Actions, Action } from '@/components/ai-elements/actions';
import { Reasoning, ReasoningTrigger, ReasoningContent } from '@/components/ai-elements/reasoning';
import { Response } from '@/components/ai-elements/response';

interface ChatMessagePartProps {
  part: { type: string; text: string; url?: string };
  messageId: string;
  messageRole: 'system' | 'user' | 'assistant';
  partIndex: number;
  isLastPart: boolean;
  isStreaming: boolean;
  copiedStates: Map<string, boolean>;
  onCopy: (text: string, messageId: string) => void;
  onRegenerate: () => void;
}

export function ChatMessagePart({
  part,
  messageId,
  messageRole,
  partIndex,
  isLastPart,
  isStreaming,
  copiedStates,
  onCopy,
  onRegenerate,
}: ChatMessagePartProps) {
  switch (part.type) {
    case 'text': {
      const { reasoningText, cleanText, hasReasoning } = parseThinkingTags(part.text);

      if (hasReasoning) {
        return (
          <Fragment key={`${messageId}-${partIndex}`}>
            {reasoningText && (
              <Reasoning className="mb-4 w-full" isStreaming={isStreaming}>
                <ReasoningTrigger />
                <ReasoningContent>{reasoningText}</ReasoningContent>
              </Reasoning>
            )}
            {cleanText && (
              <Message from={messageRole}>
                <MessageContent>
                  <Response>{cleanText}</Response>
                </MessageContent>
              </Message>
            )}
            {messageRole === 'assistant' && isLastPart && (
              <Actions className="mt-2">
                <Action onClick={onRegenerate} tooltip="Retry">
                  <RefreshCcwIcon className="size-4" />
                </Action>
                <Action onClick={() => onCopy(cleanText || part.text, messageId)} tooltip="Copy">
                  {copiedStates.get(messageId) ? (
                    <CheckIcon className="size-4 text-white" />
                  ) : (
                    <CopyIcon className="size-4" />
                  )}
                </Action>
              </Actions>
            )}
          </Fragment>
        );
      } else {
        return (
          <Fragment key={`${messageId}-${partIndex}`}>
            <Message from={messageRole}>
              <MessageContent>
                <Response>{part.text}</Response>
              </MessageContent>
            </Message>
            {messageRole === 'assistant' && isLastPart && (
              <Actions className="gap-0">
                <Action onClick={onRegenerate} tooltip="Retry">
                  <RefreshCcwIcon className="size-4" />
                </Action>
                <Action onClick={() => onCopy(part.text, messageId)} tooltip="Copy">
                  {copiedStates.get(messageId) ? (
                    <CheckIcon className="size-4 text-white" />
                  ) : (
                    <CopyIcon className="size-4" />
                  )}
                </Action>
              </Actions>
            )}
          </Fragment>
        );
      }
    }
    case 'reasoning':
      return (
        <Reasoning key={`${messageId}-${partIndex}`} className="w-full" isStreaming={isStreaming}>
          <ReasoningTrigger />
          <ReasoningContent>{part.text}</ReasoningContent>
        </Reasoning>
      );
    default:
      return null;
  }
}
