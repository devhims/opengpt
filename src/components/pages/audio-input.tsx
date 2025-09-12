'use client';

import { useState, useRef } from 'react';
import { UploadIcon, FileAudioIcon, SettingsIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import type { AudioUploadParams } from '@/types';

interface AudioInputProps {
  audioParams: AudioUploadParams;
  onParamsChange: (patch: Partial<AudioUploadParams>) => void;
  onSubmit: (e: React.FormEvent) => void;
  isTranscribing: boolean;
}

const SUPPORTED_FORMATS = [
  'audio/mpeg', // MP3
  'audio/wav', // WAV
  'audio/wave', // WAV (alternative)
  'audio/mp4', // MP4 audio
  'audio/m4a', // M4A
  'audio/aac', // AAC
  'audio/ogg', // OGG
  'audio/webm', // WebM audio
  'audio/flac', // FLAC
];

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

export function AudioInput({
  audioParams,
  onParamsChange,
  onSubmit,
  isTranscribing,
}: AudioInputProps) {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileSelect = (file: File) => {
    // Validate file type
    if (!SUPPORTED_FORMATS.includes(file.type)) {
      toast.error('Unsupported file format', {
        description: 'Please upload MP3, WAV, MP4, M4A, AAC, OGG, WebM, or FLAC files',
      });
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File too large', {
        description: 'Please upload files smaller than 25MB',
      });
      return;
    }

    onParamsChange({ file });
    toast.success('File selected', {
      description: `${file.name} (${(file.size / (1024 * 1024)).toFixed(1)}MB)`,
    });
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveFile = () => {
    onParamsChange({ file: null });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40">
      <div className="pointer-events-auto mx-auto max-w-4xl px-4 pb-2">
        <div className="bg-background/95 space-y-2 rounded-lg border p-3 shadow-lg backdrop-blur-sm">
          {/* File Upload Area */}
          <div
            className={`relative rounded-lg border-2 border-dashed transition-colors ${
              dragActive
                ? 'border-primary bg-primary/5'
                : audioParams.file
                  ? 'border-green-500 bg-green-50 dark:bg-green-950/20'
                  : 'border-muted-foreground/25 hover:border-muted-foreground/50'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center justify-center p-4 text-center">
              {audioParams.file ? (
                <div className="flex w-full flex-col items-center space-y-2">
                  <FileAudioIcon className="h-6 w-6 text-green-600" />
                  <div className="space-y-0.5">
                    <p className="max-w-xs truncate text-sm font-medium text-green-700 dark:text-green-400">
                      {audioParams.file.name}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {formatFileSize(audioParams.file.size)} • {audioParams.file.type}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRemoveFile}
                    className="h-7 text-xs"
                  >
                    Remove File
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <UploadIcon className="text-muted-foreground mx-auto h-6 w-6" />
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">Drop audio file here</p>
                    <p className="text-muted-foreground text-xs">or click to browse (max 25MB)</p>
                    <p className="text-muted-foreground text-xs">
                      MP3, WAV, MP4, M4A, AAC, OGG, WebM, FLAC
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleButtonClick}
                    className="h-8 cursor-pointer text-sm"
                  >
                    Choose File
                  </Button>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept={SUPPORTED_FORMATS.join(',')}
              onChange={handleFileInputChange}
              className="hidden"
            />
          </div>

          {/* Settings and Submit */}
          <div className="flex items-center justify-between gap-2">
            {/* Settings Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 gap-1 text-xs">
                  <SettingsIcon className="h-3 w-3" />
                  Settings
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[min(240px,calc(100vw-2rem))]">
                <div className="grid grid-cols-1 gap-2 px-2 py-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium">Detect Language</label>
                    <input
                      type="checkbox"
                      checked={audioParams.detectLanguage ?? false}
                      onChange={(e) => onParamsChange({ detectLanguage: e.target.checked })}
                      className="border-input h-3 w-3 rounded border"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium">Add Punctuation</label>
                    <input
                      type="checkbox"
                      checked={audioParams.punctuate ?? true}
                      onChange={(e) => onParamsChange({ punctuate: e.target.checked })}
                      className="border-input h-3 w-3 rounded border"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium">Smart Formatting</label>
                    <input
                      type="checkbox"
                      checked={audioParams.smartFormat ?? true}
                      onChange={(e) => onParamsChange({ smartFormat: e.target.checked })}
                      className="border-input h-3 w-3 rounded border"
                    />
                  </div>
                </div>
                <DropdownMenuSeparator />
                <div className="px-2 py-1">
                  <p className="text-muted-foreground text-xs leading-tight">
                    Language detection, punctuation and formatting improve transcript readability.
                  </p>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Submit Button */}
            <Button
              onClick={onSubmit}
              disabled={!audioParams.file || isTranscribing}
              className="h-7 gap-1 text-xs"
            >
              {isTranscribing ? (
                <>
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Transcribing...
                </>
              ) : (
                <>
                  <FileAudioIcon className="h-3 w-3" />
                  Transcribe
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
