'use client';

import { useState } from 'react';
import { RefreshCcwIcon, Volume2, VolumeX } from 'lucide-react';
import { toast } from 'sonner';
import { TTS_MODELS, type AuraTTSSpeaker } from '@/constants';
import { Action } from '@/components/ai-elements/actions';

// Speaker button component for TTS functionality
function SpeakerButton({
  text,
  speaker = 'luna',
  model = '@cf/deepgram/aura-1',
}: {
  text: string;
  speaker?: AuraTTSSpeaker;
  model?: string;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [hasError, setHasError] = useState(false);

  // Create a simple beep as fallback if MP3 doesn't work
  const createBeepFallback = () => {
    console.log('TTS: Creating beep fallback');
    try {
      const audioContext = new (window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);

      setIsPlaying(true);
      setTimeout(() => {
        setIsPlaying(false);
        setHasError(false);
      }, 500);
    } catch (beepError) {
      console.error('TTS: Beep fallback failed:', beepError);
      setHasError(true);
    }
  };

  const handleSpeak = async () => {
    if (isPlaying && audioElement) {
      // Stop playing
      audioElement.pause();
      audioElement.currentTime = 0;
      setIsPlaying(false);
      return;
    }

    if (isLoading) return;

    setIsLoading(true);
    setHasError(false);

    try {
      const response = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text.trim(),
          model: model,
          speaker: model === TTS_MODELS.MELO_TTS ? 'EN' : speaker,
        }),
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
        const errorMessage = errorData.error || 'TTS failed';

        // Handle rate limit errors specially
        if (response.status === 429 && errorData.rateLimit) {
          const resetTime = new Date(errorData.rateLimit.resetTime).toLocaleTimeString();
          toast.error('Text-to-speech limit reached', {
            description: `${errorData.rateLimit.remaining} requests remaining. Resets at ${resetTime}`,
          });
        } else {
          toast.error('Text-to-speech failed', {
            description: errorMessage,
          });
        }

        throw new Error(errorMessage);
      }

      const data = (await response.json()) as {
        success: boolean;
        audio?: { base64: string; contentType: string };
        error?: string;
        metadata?: { note?: string };
      };

      if (data.audio?.base64) {
        console.log('TTS: Creating audio element with data URL');
        const dataUrl = `data:${data.audio.contentType};base64,${data.audio.base64}`;
        console.log('TTS: Data URL length:', dataUrl.length);

        // Create audio element from base64 data
        const audio = new Audio();
        audio.src = dataUrl;
        audio.preload = 'metadata';

        console.log('TTS: Audio src set to:', audio.src.substring(0, 100) + '...');

        audio.onended = () => {
          console.log('TTS: Audio playback ended');
          setIsPlaying(false);
          setHasError(false);
        };

        audio.onerror = (e) => {
          console.error('TTS: Audio playback failed:', e);
          console.error('TTS: Audio error code:', audio.error?.code);
          console.error('TTS: Audio error message:', audio.error?.message);
          console.error('TTS: Audio network state:', audio.networkState);
          console.error('TTS: Audio ready state:', audio.readyState);

          // Try beep fallback if MP3 fails
          console.log('TTS: MP3 failed, trying beep fallback');
          createBeepFallback();
        };

        audio.onloadedmetadata = () => {
          console.log('TTS: Audio metadata loaded, duration:', audio.duration);
        };

        audio.oncanplaythrough = () => {
          console.log('TTS: Audio can play through completely');
        };

        audio.oncanplay = () => {
          console.log('TTS: Audio can play');
        };

        // Add a load event to check if audio loads successfully
        audio.onload = () => {
          console.log('TTS: Audio loaded successfully');
        };

        // Try to load the audio
        audio.load();
        console.log('TTS: Called audio.load()');

        audio.onloadstart = () => {
          console.log('TTS: Audio load started');
        };

        audio.onloadeddata = () => {
          console.log('TTS: Audio data loaded');
        };

        setAudioElement(audio);

        // Small delay to ensure audio element is ready
        setTimeout(async () => {
          try {
            console.log('TTS: Attempting to play audio');
            // Check if audio is ready to play
            if (audio.readyState >= 2) {
              // HAVE_CURRENT_DATA or higher
              await audio.play();
              console.log('TTS: Audio playback started successfully');
              setIsPlaying(true);
              setHasError(false);
            } else {
              // Wait for audio to be ready
              audio.oncanplay = async () => {
                try {
                  await audio.play();
                  console.log('TTS: Audio playback started successfully (delayed)');
                  setIsPlaying(true);
                  setHasError(false);
                } catch (delayedPlayError) {
                  console.error('TTS: Delayed audio play failed:', delayedPlayError);
                  // Try beep fallback
                  createBeepFallback();
                }
              };

              // Timeout after 3 seconds - try beep fallback
              setTimeout(() => {
                if (!isPlaying) {
                  console.log('TTS: Audio failed to load within timeout, trying beep fallback');
                  createBeepFallback();
                }
              }, 3000);
            }
          } catch (playError) {
            console.error('TTS: Audio play failed:', playError);
            const error = playError as Error;
            console.error('TTS: Play error name:', error.name);
            console.error('TTS: Play error message:', error.message);

            // Try beep fallback for certain errors
            if (error.name === 'NotAllowedError' || error.name === 'NotSupportedError') {
              console.warn('TTS: Audio playback blocked or not supported, trying beep fallback');
              createBeepFallback();
            } else {
              setHasError(true);
            }
          }
        }, 100);
      } else {
        throw new Error('No audio data received');
      }
    } catch (error) {
      console.error('TTS error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown TTS error';

      // Don't show toast for user-interrupted playback
      if (!errorMessage.includes('interrupted') && !errorMessage.includes('aborted')) {
        toast.error('Text-to-speech failed', {
          description: errorMessage,
        });
      }

      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Action
      onClick={handleSpeak}
      tooltip={
        hasError
          ? 'Audio unavailable - check console for details'
          : isPlaying
            ? 'Stop speaking'
            : 'Speak text'
      }
      disabled={isLoading}
    >
      {isLoading ? (
        <RefreshCcwIcon className="size-4 animate-spin" />
      ) : hasError ? (
        <VolumeX className="size-4 text-red-500" />
      ) : isPlaying ? (
        <VolumeX className="size-4" />
      ) : (
        <Volume2 className="size-4" />
      )}
    </Action>
  );
}

export { SpeakerButton };
