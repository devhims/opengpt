'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import type { ChatStatus } from 'ai';
import { MicIcon, Loader2, Check, X } from 'lucide-react';
import { Visualizer } from 'react-sound-visualizer';
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

// Audio Visualizer Component using react-sound-visualizer
function AudioVisualizer({ audioStream }: { audioStream: MediaStream | null }) {
  return (
    <div className="flex h-12 w-full items-center justify-center">
      {audioStream ? (
        <Visualizer
          audio={audioStream}
          strokeColor="#ffffff"
          mode="continuous"
          slices={60}
          autoStart={true}
        >
          {({ canvasRef }) => (
            <canvas ref={canvasRef} className="h-12 w-full" />
          )}
        </Visualizer>
      ) : (
        <div className="flex w-full max-w-xs justify-center space-x-1">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="h-4 w-1 animate-pulse rounded-sm bg-white/80"
              style={{
                animationDelay: `${i * 0.1}s`,
                animationDuration: '0.8s',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface ChatInputProps {
  input: string;
  setInput: React.Dispatch<React.SetStateAction<string>>;
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
  // Audio recording states
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const recordingStartTimeRef = useRef<number>(0);
  const shouldProcessRef = useRef<boolean>(true);

  // Start audio recording
  const startRecording = useCallback(async () => {
    try {
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
        console.log(
          'Recording stopped, blob size:',
          blob.size,
          'type:',
          blob.type,
          'chunks:',
          chunks.length,
        );

        // Only process if this was a user-initiated stop (not an automatic short recording)
        const recordingDuration = Date.now() - recordingStartTimeRef.current;
        if (recordingDuration < 500) {
          console.log('Recording was too short, ignoring');
          return;
        }

        // Check if we have enough data
        if (blob.size < 1000) {
          console.log('Blob too small, ignoring');
          return;
        }

        if (!shouldProcessRef.current) {
          console.log('Recording canceled by user; skipping transcription');
          return;
        }

        setAudioBlob(blob);
        processAudioTranscription(blob);
      };

      mediaRecorder.onstart = () => {
        console.log('MediaRecorder started successfully');
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
      };

      mediaRecorderRef.current = mediaRecorder;
      recordingStartTimeRef.current = Date.now();
      // Start recording with a larger timeslice to ensure we get data
      mediaRecorder.start(1000); // Request data every 1 second
      setIsRecording(true);

      console.log('Recording started successfully, mediaRecorder state:', mediaRecorder.state);
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  }, []);

  // Stop audio recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      const recordingDuration = Date.now() - recordingStartTimeRef.current;

      // Check minimum recording duration
      if (recordingDuration < 500) {
        // Less than 500ms - don't process
        console.log('Recording too short, ignoring');

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
    // Reset flag back to default for next session
    shouldProcessRef.current = true;
  }, [stopRecording]);

  // Process audio transcription
  const processAudioTranscription = useCallback(
    async (blob: Blob) => {
      setIsTranscribing(true);

      try {
        console.log('Processing audio blob:', { size: blob.size, type: blob.type });

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
          const errorData = (await response.json()) as { error?: string };
          throw new Error(errorData.error || 'Transcription failed');
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
            console.log('Transcription completed successfully');
          }
        } else {
          throw new Error(result.error || 'Invalid transcription response');
        }
      } catch (error) {
        console.error('Transcription error:', error);
      } finally {
        setIsTranscribing(false);
        setAudioBlob(null);
      }
    },
    [setInput],
  );

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
            <div className="pointer-events-none absolute inset-x-0 top-0 z-10 px-3 pt-3">
              <div className="relative rounded-lg bg-black/30 p-2 backdrop-blur-sm">
                <AudioVisualizer audioStream={audioStreamRef.current} />
              </div>
            </div>
          )}

          <PromptInputTextarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="What question is sparking your curiosity?"
            className={isRecording ? 'pt-20' : ''}
          />

          <PromptInputToolbar className="border-border/80 border-t">
            <PromptInputTools>
              {/* Toolbar content varies by recording state */}
              {!isRecording ? (
                <>
                  {/* Audio Recording Button */}
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
                </>
              ) : null}
            </PromptInputTools>
          </PromptInputToolbar>

          {/* Submit button positioned absolute */}
          {/* Accept/Cancel controls shown only during recording */}
          {isRecording && (
            <div className="absolute bottom-1 right-12 flex items-center gap-1">
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-600 text-white hover:bg-emerald-700"
                onClick={stopRecording}
                title="Accept recording"
              >
                <Check className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-md bg-rose-600 text-white hover:bg-rose-700"
                onClick={cancelRecording}
                title="Cancel recording"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <PromptInputSubmit
            disabled={!input || isRecording || isTranscribing}
            status={status}
            className="absolute right-1 bottom-1 bg-white text-black hover:bg-gray-100 dark:bg-white dark:text-black dark:hover:bg-gray-100"
          />
        </PromptInput>
      </div>
    </div>
  );
}
