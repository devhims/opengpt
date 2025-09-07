'use client';

import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { CLOUDFLARE_AI_MODELS } from '@/constants';
import { Message, MessageContent } from '@/components/ai-elements/message';
import { Actions, Action } from '@/components/ai-elements/actions';
import { Sources, SourcesTrigger, SourcesContent, Source } from '@/components/ai-elements/sources';
import { Reasoning, ReasoningTrigger, ReasoningContent } from '@/components/ai-elements/reasoning';
import { Response } from '@/components/ai-elements/response';
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
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
import { GlobeIcon, RefreshCcwIcon, CopyIcon, CheckIcon } from 'lucide-react';
import { Loader } from '@/components/ai-elements/loader';

export default function ChatPage() {
  const models = CLOUDFLARE_AI_MODELS.textGeneration.map((model) => ({
    name: model.split('/').pop() || model,
    value: model,
  }));
  const [input, setInput] = useState('');
  const [selectedModel, setSelectedModel] = useState<string>(models[0].value);
  const [webSearch, setWebSearch] = useState(false);
  const [copiedStates, setCopiedStates] = useState<Map<string, boolean>>(new Map());

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

  const providerLabel = useMemo(() => {
    const id = selectedModel;
    if (id.includes('openai') || id.includes('gpt-oss')) return 'OpenAI';
    if (id.includes('meta') || id.includes('llama')) return 'Meta';
    if (id.includes('google') || id.includes('gemma')) return 'Google';
    if (id.includes('mistral')) return 'Mistral';
    if (id.includes('deepseek')) return 'DeepSeek';
    if (id.includes('qwen')) return 'Qwen';
    return 'Other';
  }, [selectedModel]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      sendMessage({ text: input });
      setInput('');
    }
  };

  const handleCopy = async (text: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedStates((prev) => new Map(prev.set(messageId, true)));
      setTimeout(() => {
        setCopiedStates((prev) => {
          const newMap = new Map(prev);
          newMap.delete(messageId);
          return newMap;
        });
      }, 2000);
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  };

  return (
    <div className="bg-background flex min-h-dvh flex-col">
      <header className="bg-card/80 supports-[backdrop-filter]:bg-card/60 sticky top-0 z-20 border-b shadow-sm backdrop-blur">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold tracking-tight">AI Lab Chat</h1>
            <p className="text-muted-foreground text-sm">Chat with Workers AI</p>
          </div>
          <div className="text-muted-foreground flex items-center gap-3 text-xs">
            {providerLabel}
          </div>
        </div>
      </header>

      <div className="flex-1">
        <Conversation className="mx-auto w-full max-w-4xl">
          <ConversationContent className="space-y-4 px-6 py-4 pb-28">
            {messages.length === 0 && (
              <div className="text-muted-foreground mt-8 rounded-xl border border-dashed p-6 text-center text-sm">
                Ask me anything. Try: &quot;Create a 1‑day Tokyo itinerary.&quot;
              </div>
            )}

            {messages.map((message) => (
              <div key={message.id} className="mb-4">
                {message.role === 'assistant' &&
                  message.parts?.filter((part) => part.type === 'source-url').length > 0 && (
                    <Sources>
                      <SourcesTrigger
                        count={message.parts.filter((part) => part.type === 'source-url').length}
                      />
                      {message.parts
                        .filter((part) => part.type === 'source-url')
                        .map((part, i) => (
                          <SourcesContent key={`${message.id}-${i}`}>
                            <Source key={`${message.id}-${i}`} href={part.url} title={part.url} />
                          </SourcesContent>
                        ))}
                    </Sources>
                  )}
                {message.parts?.map((part, i) => {
                  switch (part.type) {
                    case 'text':
                      // Parse thinking tags from text - handles multiple scenarios:
                      // 1. Full tags: <think>content</think> or <thinking>content</thinking>
                      // 2. Missing opening tag: content</think> (common with some models)
                      // 3. Native reasoning parts will be handled by the 'reasoning' case below
                      const fullThinkingRegex = /<think(?:ing)?>([\s\S]*?)<\/think(?:ing)?>/g;
                      const endOnlyRegex = /([\s\S]*?)<\/think(?:ing)?>/g;

                      const matches = [...part.text.matchAll(fullThinkingRegex)];
                      let reasoningText = '';
                      let cleanText = part.text;

                      if (matches.length > 0) {
                        // Normal case: full thinking tags found
                        reasoningText = matches.map((match) => match[1].trim()).join('\n\n');
                        cleanText = part.text.replace(fullThinkingRegex, '').trim();
                      } else {
                        // Check for closing tag without opening (missing opening tag case)
                        const endMatches = [...part.text.matchAll(endOnlyRegex)];
                        if (endMatches.length > 0) {
                          const lastMatch = endMatches[endMatches.length - 1];
                          if (lastMatch.index !== undefined) {
                            reasoningText = lastMatch[1].trim();
                            cleanText = part.text
                              .substring(lastMatch.index + lastMatch[0].length)
                              .trim();
                          }
                        }
                      }

                      const hasReasoning = reasoningText.length > 0;

                      if (hasReasoning) {
                        return (
                          <Fragment key={`${message.id}-${i}`}>
                            {reasoningText && (
                              <Reasoning
                                className="mb-4 w-full"
                                isStreaming={
                                  status === 'streaming' &&
                                  i === message.parts.length - 1 &&
                                  message.id === messages.at(-1)?.id
                                }
                              >
                                <ReasoningTrigger />
                                <ReasoningContent>{reasoningText}</ReasoningContent>
                              </Reasoning>
                            )}
                            {cleanText && (
                              <Message from={message.role}>
                                <MessageContent>
                                  <Response>{cleanText}</Response>
                                </MessageContent>
                              </Message>
                            )}
                            {message.role === 'assistant' && i === message.parts.length - 1 && (
                              <Actions className="mt-2">
                                <Action onClick={() => regenerate()} tooltip="Retry">
                                  <RefreshCcwIcon className="size-4" />
                                </Action>
                                <Action
                                  onClick={() => handleCopy(cleanText || part.text, message.id)}
                                  tooltip="Copy"
                                >
                                  {copiedStates.get(message.id) ? (
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
                          <Fragment key={`${message.id}-${i}`}>
                            <Message from={message.role}>
                              <MessageContent>
                                <Response>{part.text}</Response>
                              </MessageContent>
                            </Message>
                            {message.role === 'assistant' && i === message.parts.length - 1 && (
                              <Actions className="gap-0">
                                <Action onClick={() => regenerate()} tooltip="Retry">
                                  <RefreshCcwIcon className="size-4" />
                                </Action>
                                <Action
                                  onClick={() => handleCopy(part.text, message.id)}
                                  tooltip="Copy"
                                >
                                  {copiedStates.get(message.id) ? (
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
                    case 'reasoning':
                      return (
                        <Reasoning
                          key={`${message.id}-${i}`}
                          className="w-full"
                          isStreaming={
                            status === 'streaming' &&
                            i === message.parts.length - 1 &&
                            message.id === messages.at(-1)?.id
                          }
                        >
                          <ReasoningTrigger />
                          <ReasoningContent>{part.text}</ReasoningContent>
                        </Reasoning>
                      );
                    default:
                      return null;
                  }
                }) ||
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
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
      </div>

      <div className="bg-card/80 supports-[backdrop-filter]:bg-card/60 sticky bottom-0 z-20 border-t px-6 py-3 shadow-sm backdrop-blur">
        <div className="mx-auto w-full max-w-4xl">
          <PromptInput onSubmit={handleSubmit}>
            <PromptInputTextarea
              onChange={(e) => setInput(e.target.value)}
              value={input}
              placeholder="What would you like to know?"
            />
            <PromptInputToolbar>
              <PromptInputTools>
                <PromptInputButton
                  variant={webSearch ? 'default' : 'ghost'}
                  onClick={() => setWebSearch(!webSearch)}
                >
                  <GlobeIcon size={16} />
                  <span>Search</span>
                </PromptInputButton>
                <PromptInputModelSelect
                  onValueChange={(value) => {
                    setSelectedModel(value);
                  }}
                  value={selectedModel}
                >
                  <PromptInputModelSelectTrigger>
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
              <PromptInputSubmit
                disabled={!input}
                status={status}
                className="bg-white text-black hover:bg-gray-100 dark:bg-white dark:text-black dark:hover:bg-gray-100"
              />
            </PromptInputToolbar>
          </PromptInput>
        </div>
      </div>
    </div>
  );
}
