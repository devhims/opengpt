'use client';

import { CopyIcon, CheckIcon, DownloadIcon } from 'lucide-react';
import { Image } from '@/components/ai-elements/image';
import { Loader } from '@/components/ai-elements/loader';
import { Skeleton } from '@/components/ui/skeleton';
import type { ImageGenerationResponse } from '@/app/api/image/route';

interface ImageViewProps {
  generatedImages: Array<ImageGenerationResponse & { id: string; prompt: string }>;
  isGeneratingImage: boolean;
  copiedStates: Map<string, boolean>;
  onCopy: (text: string, messageId: string) => void;
  onDownload: (image: ImageGenerationResponse & { id: string; prompt: string }) => void;
}

export function ImageView({
  generatedImages,
  isGeneratingImage,
  copiedStates,
  onCopy,
  onDownload,
}: ImageViewProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto w-full max-w-4xl">
          {generatedImages.length === 0 && !isGeneratingImage && (
            <div className="text-muted-foreground mt-8 rounded-xl border border-dashed p-6 text-center text-sm">
              Describe an image and I&apos;ll generate it for you. Try: &quot;A futuristic cityscape
              at sunset&quot;
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {generatedImages.map((image) => (
              <div key={image.id} className="space-y-3">
                <div className="group relative">
                  {image.base64 ? (
                    <>
                      <Image
                        base64={image.base64}
                        uint8Array={new Uint8Array(image.uint8Array)}
                        mediaType={image.mediaType}
                        alt={`Generated: ${image.prompt}`}
                        className="aspect-square w-full rounded-lg border object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          onClick={() => onCopy(image.prompt, image.id)}
                          className="rounded-full bg-white/10 p-2 backdrop-blur-sm transition-colors hover:bg-white/20"
                        >
                          {copiedStates.get(image.id) ? (
                            <CheckIcon className="size-4 text-white" />
                          ) : (
                            <CopyIcon className="size-4 text-white" />
                          )}
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
                  {image.base64 && (
                    <button
                      onClick={() => onDownload(image)}
                      className="bg-background hover:bg-accent flex items-center justify-center rounded-md border p-2 text-sm transition-colors"
                      title="Download image"
                    >
                      <DownloadIcon className="size-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
