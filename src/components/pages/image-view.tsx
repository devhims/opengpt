'use client';

import { useState } from 'react';
import { CopyIcon, CheckIcon, DownloadIcon } from 'lucide-react';
import { Image } from '@/components/ai-elements/image';
import { Loader } from '@/components/ai-elements/loader';
import { Skeleton } from '@/components/ui/skeleton';
import { ImageModal } from './image-modal';
import type { GeneratedImage } from '@/types';

interface ImageViewProps {
  generatedImages: GeneratedImage[];
  isGeneratingImage: boolean;
  copiedStates: Map<string, boolean>;
  onCopy: (text: string, messageId: string) => void;
  onDownload: (image: GeneratedImage) => void;
}

export function ImageView({
  generatedImages,
  isGeneratingImage,
  copiedStates,
  onCopy,
  onDownload,
}: ImageViewProps) {
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);

  const handleImageClick = (image: GeneratedImage) => {
    if (image.base64) {
      setSelectedImage(image);
    }
  };

  const handleCloseModal = () => {
    setSelectedImage(null);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className={`flex-1 space-y-4 overflow-y-auto py-4 pb-28 ${generatedImages.length === 0 && !isGeneratingImage ? 'flex min-h-full flex-col justify-center' : ''}`}
      >
        <div className="mx-auto w-full max-w-4xl px-4 sm:px-6">
          {generatedImages.length === 0 && !isGeneratingImage && (
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="relative">
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-emerald-600/20 via-teal-600/20 to-cyan-600/20 blur-lg"></div>
                <div className="border-border/50 from-background via-background/80 to-muted/20 relative w-full max-w-[600px] min-w-[280px] rounded-xl border bg-gradient-to-br p-6 text-center shadow-lg backdrop-blur-sm sm:min-w-[480px] sm:p-8">
                  <div className="mb-3 text-3xl sm:mb-4 sm:text-4xl">🎨</div>
                  <h3 className="text-foreground mb-1 text-base font-semibold sm:text-lg">
                    Ready to create
                  </h3>
                  <h4 className="text-muted-foreground text-sm leading-relaxed">
                    Turn your imagination into art
                  </h4>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {generatedImages.map((image) => (
              <div key={image.id} className="space-y-3">
                <div
                  className="group relative cursor-pointer"
                  onClick={() => handleImageClick(image)}
                >
                  {image.base64 ? (
                    <>
                      <div>
                        <Image
                          base64={image.base64}
                          uint8Array={new Uint8Array(image.uint8Array)}
                          mediaType={image.mediaType}
                          alt={`Generated: ${image.prompt}`}
                          className="aspect-square w-full rounded-lg border object-cover transition-transform group-hover:scale-[1.02]"
                        />
                      </div>
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-2 rounded-lg bg-black/50 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onCopy(image.prompt, image.id);
                          }}
                          className="pointer-events-auto cursor-pointer rounded-full bg-white/10 p-2 backdrop-blur-sm transition-colors hover:bg-white/20"
                        >
                          {copiedStates.get(image.id) ? (
                            <CheckIcon className="size-4 text-white" />
                          ) : (
                            <CopyIcon className="size-4 text-white" />
                          )}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDownload(image);
                          }}
                          className="pointer-events-auto cursor-pointer rounded-full bg-white/10 p-2 backdrop-blur-sm transition-colors hover:bg-white/20"
                        >
                          <DownloadIcon className="size-4 text-white" />
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <Skeleton className="aspect-square w-full rounded-lg" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Loader />
                      </div>
                    </>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-muted-foreground line-clamp-2 flex-1 text-sm">
                    {image.prompt}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <ImageModal
          image={selectedImage}
          isOpen={!!selectedImage}
          onClose={handleCloseModal}
          onCopy={onCopy}
          onDownload={onDownload}
          copiedStates={copiedStates}
        />
      )}
    </div>
  );
}
