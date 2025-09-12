'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import type { ChatStatus } from 'ai';
import { MicIcon, Loader2, Check, X } from 'lucide-react';
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
import type { TranscriptionResult } from '@/types';
import { AURA_TTS_SPEAKERS, TTS_MODELS, type AuraTTSSpeaker } from '@/constants';
import { toast } from 'sonner';
import { AudioVisualizer } from '@/components/audio/audio-visualizer';

interface ChatInputProps {
  input: string;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  selectedModel: string;
  setSelectedModel: (value: string) => void;
  selectedTTSModel: string;
  setSelectedTTSModel: (value: string) => void;
  selectedSpeaker: AuraTTSSpeaker;
  setSelectedSpeaker: (value: AuraTTSSpeaker) => void;
  models: Array<{ name: string; value: string }>;
  status: ChatStatus;
  onSubmit: (e: React.FormEvent) => void;
}

export function ChatInput({
  input,
  setInput,
  selectedModel,
  setSelectedModel,
  selectedTTSModel,
  setSelectedTTSModel,
  selectedSpeaker,
  setSelectedSpeaker,
  models,
  status,
  onSubmit,
}: ChatInputProps) {
  // Audio recording states
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const recordingStartTimeRef = useRef<number>(0);
  const shouldProcessRef = useRef<boolean>(true);

  // TTS model and speaker selection (managed by parent)

  // Process audio transcription
  const processAudioTranscription = useCallback(
    async (blob: Blob) => {
      setIsTranscribing(true);

      try {
        const formData = new FormData();
        // Create file with appropriate extension based on blob type
        const fileExtension = blob.type.includes('webm')
          ? 'webm'
          : blob.type.includes('mp4')
            ? 'mp4'
            : 'webm';
        const audioFile = new File([blob], `recording.${fileExtension}`, { type: blob.type });
        formData.append('audio', audioFile);
        formData.append('punctuate', 'true');
        formData.append('smart_format', 'true');

        const response = await fetch('/api/speech-to-text', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = (await response.json()) as {
            error?: string;
            rateLimit?: {
              remaining: number;
              resetTime: string;
              type: string;
            };
          };
          const errorMessage = errorData.error || 'Transcription failed';

          // Handle rate limit errors specially
          if (response.status === 429 && errorData.rateLimit) {
            const resetTime = new Date(errorData.rateLimit.resetTime).toLocaleTimeString();
            toast.error('Speech transcription limit reached', {
              description: `${errorData.rateLimit.remaining} requests remaining. Resets at ${resetTime}`,
            });
          } else {
            toast.error('Speech transcription failed', {
              description: errorMessage,
            });
          }

          throw new Error(errorMessage);
        }

        const result = (await response.json()) as {
          success: boolean;
          transcription?: TranscriptionResult;
          error?: string;
        };

        if (result.success && result.transcription) {
          // Add transcribed text to the existing input (preserve previous input)
          const newText = result.transcription.transcript.trim();
          if (newText) {
            setInput((prev) => (prev ? `${prev} ${newText}` : newText));
          }
        } else {
          throw new Error(result.error || 'Invalid transcription response');
        }
      } catch (error) {
        console.error('Transcription error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown transcription error';

        // Don't show toast for user-cancelled errors
        if (!errorMessage.includes('canceled')) {
          toast.error('Speech transcription failed', {
            description: errorMessage,
          });
        }
      } finally {
        setIsTranscribing(false);
      }
    },
    [setInput],
  );

  // Start audio recording
  const startRecording = useCallback(async () => {
    try {
      // Ensure we process unless user explicitly cancels
      shouldProcessRef.current = true;
      // Clean up any existing recording first
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((track) => track.stop());
        audioStreamRef.current = null;
      }

      // Check for browser support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Audio recording is not supported in this browser');
      }

      if (!window.MediaRecorder) {
        throw new Error('MediaRecorder is not supported in this browser');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      audioStreamRef.current = stream;

      // Try different formats based on browser support
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'audio/mp4';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = ''; // Let browser choose default
          }
        }
      }

      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});

      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType || 'audio/webm' });

        // Only process if this was a user-initiated stop (not an automatic short recording)
        const recordingDuration = Date.now() - recordingStartTimeRef.current;
        if (recordingDuration < 500) {
          return;
        }

        // Check if we have enough data
        if (blob.size < 1000) {
          return;
        }

        if (!shouldProcessRef.current) {
          return;
        }

        processAudioTranscription(blob);
      };

      mediaRecorder.onstart = () => {};

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
      };

      mediaRecorderRef.current = mediaRecorder;
      recordingStartTimeRef.current = Date.now();
      // Start recording with a larger timeslice to ensure we get data
      mediaRecorder.start(1000); // Request data every 1 second
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  }, [processAudioTranscription]);

  // Stop audio recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      const recordingDuration = Date.now() - recordingStartTimeRef.current;

      // Check minimum recording duration
      if (recordingDuration < 500) {
        // Less than 500ms - don't process

        // Stop recording and clean up
        mediaRecorderRef.current.stop();
        setIsRecording(false);

        if (audioStreamRef.current) {
          audioStreamRef.current.getTracks().forEach((track) => track.stop());
          audioStreamRef.current = null;
        }
        return;
      }

      // Recording is long enough, stop
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      // Stop all tracks to release microphone
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((track) => track.stop());
        audioStreamRef.current = null;
      }
    }
  }, [isRecording]);

  // Cancel recording without processing
  const cancelRecording = useCallback(() => {
    shouldProcessRef.current = false;
    stopRecording();
  }, [stopRecording]);

  // Cleanup on component unmount or when recording state changes
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Additional cleanup when isRecording changes
  useEffect(() => {
    if (!isRecording) {
      // Clean up any leftover media recorder
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    }
  }, [isRecording]);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40">
      <div className="pointer-events-auto mx-auto max-w-4xl px-4 pb-3">
        <PromptInput onSubmit={onSubmit} className="relative overflow-hidden">
          {/* Audio Visualizer Overlay (within bounds, white) */}
          {isRecording && (
            <div className="pointer-events-none absolute inset-x-0 top-0 z-10 px-3 pt-2">
              <div className="relative rounded-lg bg-black/30 p-0 backdrop-blur-sm">
                <AudioVisualizer audioStream={audioStreamRef.current} />
              </div>
            </div>
          )}

          <PromptInputTextarea
            value={isRecording ? '' : input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isRecording ? '' : 'What question is sparking your curiosity?'}
          />

          <PromptInputToolbar className="border-border/80 border-t">
            <PromptInputTools>
              {/* Left side tools (hidden during recording) */}
              {!isRecording ? (
                <>
                  <PromptInputButton
                    onClick={startRecording}
                    disabled={isTranscribing || status === 'streaming' || status === 'submitted'}
                    variant="ghost"
                    className="cursor-pointer"
                    title="Start voice recording"
                  >
                    {isTranscribing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <MicIcon className="h-4 w-4" />
                    )}
                  </PromptInputButton>

                  <PromptInputModelSelect onValueChange={setSelectedModel} value={selectedModel}>
                    <PromptInputModelSelectTrigger variant="outline" className="max-w-40">
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

                  <PromptInputModelSelect
                    onValueChange={setSelectedTTSModel}
                    value={selectedTTSModel}
                  >
                    <PromptInputModelSelectTrigger variant="outline">
                      <PromptInputModelSelectValue />
                    </PromptInputModelSelectTrigger>
                    <PromptInputModelSelectContent>
                      <PromptInputModelSelectItem value={TTS_MODELS.AURA_1}>
                        Aura-1
                      </PromptInputModelSelectItem>
                      <PromptInputModelSelectItem value={TTS_MODELS.MELO_TTS}>
                        MeloTTS
                      </PromptInputModelSelectItem>
                    </PromptInputModelSelectContent>
                  </PromptInputModelSelect>

                  {selectedTTSModel === TTS_MODELS.AURA_1 && (
                    <div className="hidden md:block">
                      <PromptInputModelSelect
                        onValueChange={setSelectedSpeaker}
                        value={selectedSpeaker}
                      >
                        <PromptInputModelSelectTrigger variant="outline">
                          <PromptInputModelSelectValue />
                        </PromptInputModelSelectTrigger>
                        <PromptInputModelSelectContent>
                          {AURA_TTS_SPEAKERS.map((speaker) => (
                            <PromptInputModelSelectItem key={speaker} value={speaker}>
                              {speaker.charAt(0).toUpperCase() + speaker.slice(1)}
                            </PromptInputModelSelectItem>
                          ))}
                        </PromptInputModelSelectContent>
                      </PromptInputModelSelect>
                    </div>
                  )}
                </>
              ) : null}
            </PromptInputTools>

            {/* Right side actions in the toolbar while recording */}
            {isRecording ? (
              <div className="ml-auto flex items-center gap-1">
                <PromptInputButton
                  onClick={cancelRecording}
                  size="icon"
                  variant="default"
                  className="bg-white text-black hover:bg-gray-100 dark:bg-white dark:text-black dark:hover:bg-gray-100"
                  title="Cancel recording"
                >
                  <X className="h-4 w-4" />
                </PromptInputButton>
                <PromptInputButton
                  onClick={stopRecording}
                  size="icon"
                  variant="default"
                  className="bg-white text-black hover:bg-gray-100 dark:bg-white dark:text-black dark:hover:bg-gray-100"
                  title="Accept recording"
                >
                  <Check className="h-4 w-4" />
                </PromptInputButton>
              </div>
            ) : null}
          </PromptInputToolbar>

          {/* Submit stays absolute; hidden while recording */}
          {!isRecording && (
            <PromptInputSubmit
              disabled={!input || isTranscribing}
              status={status}
              className="absolute right-1 bottom-1 bg-white text-black hover:bg-gray-100 dark:bg-white dark:text-black dark:hover:bg-gray-100"
            />
          )}
        </PromptInput>
      </div>
    </div>
  );
}
