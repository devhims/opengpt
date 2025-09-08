"use client";

import { Button } from '@/components/ui/button';
import { useMemo } from 'react';

interface PreviewProps {
  base64?: string;
  mediaType?: string;
  isLoading?: boolean;
  error?: string;
}

export function Preview({ base64, mediaType, isLoading, error }: PreviewProps) {
  const dataUrl = useMemo(() => {
    if (!base64 || !mediaType) return undefined;
    return `data:${mediaType};base64,${base64}`;
  }, [base64, mediaType]);

  return (
    <div className="h-full w-full">
      <div className="rounded-lg border p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="font-medium">Preview</h3>
            <p className="text-muted-foreground text-xs">
              {isLoading
                ? 'Generating…'
                : dataUrl
                  ? `${mediaType?.replace('image/', '').toUpperCase()} • ${Math.round((base64!.length * 3) / 4 / 1024)} KB`
                  : 'No image yet'}
            </p>
          </div>
          {dataUrl && (
            <a href={dataUrl} download={`image-${Date.now()}.` + (mediaType?.includes('png') ? 'png' : 'jpg')}>
              <Button variant="outline" size="sm">
                Download
              </Button>
            </a>
          )}
        </div>

        <div className="bg-muted/30 relative aspect-square w-full overflow-hidden rounded">
          {isLoading && (
            <div className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">
              Generating image…
            </div>
          )}
          {!isLoading && dataUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={dataUrl} alt="Generated" className="h-full w-full object-contain" />
          )}
          {!isLoading && !dataUrl && (
            <div className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">Your image will appear here</div>
          )}
        </div>

        {error && (
          <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

