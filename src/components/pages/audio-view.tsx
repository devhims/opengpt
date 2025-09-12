'use client';

import { useState } from 'react';
import { CopyIcon, CheckIcon, FileAudioIcon, ClockIcon, GlobeIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Loader } from '@/components/ai-elements/loader';
import type { TranscriptionResult } from '@/types';

interface AudioViewProps {
  transcriptionResults: TranscriptionResult[];
  isTranscribing: boolean;
  copiedStates: Map<string, boolean>;
  onCopy: (text: string, messageId: string) => void;
}

export function AudioView({
  transcriptionResults,
  isTranscribing,
  copiedStates,
  onCopy,
}: AudioViewProps) {
  const [expandedTranscripts, setExpandedTranscripts] = useState<Set<string>>(new Set());

  const handleCopyTranscript = (text: string, resultId: string) => {
    onCopy(text, resultId);
  };

  const toggleExpanded = (resultId: string) => {
    setExpandedTranscripts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(resultId)) {
        newSet.delete(resultId);
      } else {
        newSet.add(resultId);
      }
      return newSet;
    });
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number | undefined) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    if (isNaN(bytes)) return 'Unknown size';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatTimestamp = (timestamp: string | undefined) => {
    if (!timestamp) return 'Unknown time';
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return 'Invalid date';
      return date.toLocaleString();
    } catch {
      return 'Invalid date';
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className={`ml-4 flex-1 space-y-4 overflow-y-auto py-4 pb-28 ${transcriptionResults.length === 0 && !isTranscribing ? 'flex min-h-full flex-col justify-center' : ''}`}
      >
        <div className="mx-auto w-full max-w-4xl px-4 sm:px-6">
          {transcriptionResults.length === 0 && !isTranscribing && (
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="relative">
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-purple-600/20 via-blue-600/20 to-cyan-600/20 blur-lg"></div>
                <div className="border-border/50 from-background via-background/80 to-muted/20 relative w-full max-w-[600px] min-w-[280px] rounded-xl border bg-gradient-to-br p-6 text-center shadow-lg backdrop-blur-sm sm:min-w-[480px] sm:p-8">
                  <div className="mb-3 text-3xl sm:mb-4 sm:text-4xl">🎵</div>
                  <h3 className="text-foreground mb-1 text-base font-semibold sm:text-lg">
                    Ready to transcribe
                  </h3>
                  <h4 className="text-muted-foreground text-sm leading-relaxed">
                    Upload audio files and get accurate transcripts
                  </h4>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-6">
            {transcriptionResults.map((result) => (
              <div key={result.id} className="space-y-4">
                {/* Header with file info */}
                <div className="bg-card flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-center gap-3">
                    <FileAudioIcon className="h-5 w-5 text-blue-600" />
                    <div>
                      <h3 className="font-medium">{result.fileName || 'Unknown file'}</h3>
                      <div className="text-muted-foreground flex items-center gap-4 text-sm">
                        <span>{formatFileSize(result.fileSize)}</span>
                        <span>{result.contentType || 'Unknown type'}</span>
                        {result.language && result.language !== 'unknown' && (
                          <div className="flex items-center gap-1">
                            <GlobeIcon className="h-3 w-3" />
                            {result.language.toUpperCase()}
                          </div>
                        )}
                        {result.duration && (
                          <div className="flex items-center gap-1">
                            <ClockIcon className="h-3 w-3" />
                            {formatDuration(result.duration)}
                          </div>
                        )}
                        {typeof result.confidence === 'number' && !isNaN(result.confidence) && (
                          <span className="text-green-600">
                            {(result.confidence * 100).toFixed(1)}% confidence
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-muted-foreground text-xs">
                    {formatTimestamp(result.processedAt)}
                  </div>
                </div>

                {/* Transcription */}
                <div className="bg-card rounded-lg border">
                  <div className="border-b p-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Transcription</h4>
                      <button
                        onClick={() => handleCopyTranscript(result.transcript, result.id)}
                        className="gap-2"
                      >
                        {copiedStates.get(result.id) ? (
                          <CheckIcon className="h-4 w-4 text-green-600" />
                        ) : (
                          <CopyIcon className="h-4 w-4" />
                        )}
                        {/* {copiedStates.get(result.id) ? 'Copied!' : 'Copy'} */}
                      </button>
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {result.transcript}
                    </p>
                  </div>
                </div>

                {/* Word-level details */}
                {result.words && Array.isArray(result.words) && result.words.length > 0 && (
                  <Collapsible
                    open={expandedTranscripts.has(result.id)}
                    onOpenChange={() => toggleExpanded(result.id)}
                  >
                    <CollapsibleTrigger asChild>
                      <Button variant="outline" className="w-full justify-between">
                        Word Details ({result.words.length} words)
                        <span className="text-xs">
                          {expandedTranscripts.has(result.id) ? 'Hide' : 'Show'}
                        </span>
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2">
                      <div className="bg-muted/30 rounded-lg border p-4">
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          {result.words.map((word, index) => (
                            <div
                              key={index}
                              className="bg-card flex items-center justify-between rounded border p-2 text-xs"
                            >
                              <span className="font-medium">
                                {word.punctuated_word || word.word || 'Unknown'}
                              </span>
                              <div className="text-muted-foreground flex items-center gap-2">
                                <span>
                                  {typeof word.start === 'number' ? word.start.toFixed(1) : '0.0'}s
                                </span>
                                <span className="text-green-600">
                                  {typeof word.confidence === 'number' && !isNaN(word.confidence)
                                    ? (word.confidence * 100).toFixed(0)
                                    : '0'}
                                  %
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </div>
            ))}

            {/* Loading state */}
            {isTranscribing && (
              <div className="space-y-4">
                <div className="bg-card flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-5 w-5 rounded" />
                    <div>
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="mt-1 h-3 w-24" />
                    </div>
                  </div>
                  <Skeleton className="h-3 w-16" />
                </div>
                <div className="bg-card flex items-center justify-center rounded-lg border p-8">
                  <div className="flex flex-col items-center gap-3">
                    <Loader />
                    <p className="text-muted-foreground text-sm">Transcribing audio...</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
