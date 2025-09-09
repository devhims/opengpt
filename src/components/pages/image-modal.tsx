'use client';

import { useEffect } from 'react';
import { XIcon, CopyIcon, CheckIcon, DownloadIcon } from 'lucide-react';
import { Image } from '@/components/ai-elements/image';
import type { GeneratedImage } from '@/types';

interface ImageModalProps {
  image: GeneratedImage;
  isOpen: boolean;
  onClose: () => void;
  onCopy: (text: string, messageId: string) => void;
  onDownload: (image: GeneratedImage) => void;
  copiedStates: Map<string, boolean>;
}

export function ImageModal({
  image,
  isOpen,
  onClose,
  onCopy,
  onDownload,
  copiedStates,
}: ImageModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="relative max-h-[90vh] max-w-[90vw]">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 cursor-pointer rounded-full bg-black/50 p-2 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
        >
          <XIcon className="size-5" />
        </button>

        {/* Action buttons overlay */}
        <div className="absolute right-4 bottom-4 z-10 flex gap-2">
          <button
            onClick={() => onCopy(image.prompt, image.id)}
            className="cursor-pointer rounded-full bg-black/50 p-2 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
          >
            {copiedStates.get(image.id) ? (
              <CheckIcon className="size-4" />
            ) : (
              <CopyIcon className="size-4" />
            )}
          </button>
          <button
            onClick={() => onDownload(image)}
            className="cursor-pointer rounded-full bg-black/50 p-2 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
          >
            <DownloadIcon className="size-4" />
          </button>
        </div>

        {/* Image */}
        <Image
          base64={image.base64}
          uint8Array={new Uint8Array(image.uint8Array)}
          mediaType={image.mediaType}
          alt={`Generated: ${image.prompt}`}
          className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
        />

        {/* Prompt text */}
        <div className="absolute right-0 bottom-0 left-0 rounded-b-lg bg-gradient-to-t from-black/80 to-transparent p-4">
          <p className="text-sm text-white">{image.prompt}</p>
        </div>
      </div>
    </div>
  );
}
