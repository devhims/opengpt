"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';

interface MaskDrawerProps {
  imageDataUrl?: string; // underlying image preview (optional)
  width: number;
  height: number;
  brushSize?: number;
  onBrushSizeChange?: (size: number) => void;
  onMaskChange: (mask: number[] | undefined) => void; // 0..255 array or undefined when cleared
}

export function MaskDrawer({ imageDataUrl, width, height, brushSize = 40, onBrushSizeChange, onMaskChange }: MaskDrawerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [internalBrush, setInternalBrush] = useState(brushSize);

  useEffect(() => setInternalBrush(brushSize), [brushSize]);

  // Initialize canvas background to black (no mask)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // If an image is provided, draw it as a background in a separate <img> behind; mask canvas remains black/white
  }, [width, height, imageDataUrl]);

  const handlePointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(x, y, internalBrush / 2, 0, Math.PI * 2);
    ctx.fill();
  };

  const exportMask = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    // Convert RGBA to single channel mask (use red channel)
    const mask: number[] = new Array((data.length / 4) | 0);
    for (let i = 0, j = 0; i < data.length; i += 4, j++) {
      mask[j] = data[i]; // red channel (0..255)
    }
    onMaskChange(mask);
  };

  const clearMask = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    onMaskChange(undefined);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">Mask (draw)</div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Brush</span>
            <input
              type="range"
              min={5}
              max={128}
              step={1}
              value={internalBrush}
              onChange={(e) => {
                const v = Number(e.target.value);
                setInternalBrush(v);
                onBrushSizeChange?.(v);
              }}
            />
            <span>{internalBrush}px</span>
          </div>
          <Button variant="outline" size="sm" onClick={clearMask}>
            Clear
          </Button>
          <Button size="sm" onClick={exportMask}>
            Use mask
          </Button>
        </div>
      </div>

      <div
        className="relative w-full overflow-hidden rounded border"
        style={{ aspectRatio: `${width}/${height}` }}
      >
        {imageDataUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            ref={imgRef}
            src={imageDataUrl}
            alt="Base"
            className="absolute inset-0 h-full w-full object-contain"
          />
        )}
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="absolute inset-0 h-full w-full touch-none cursor-crosshair opacity-70"
          onPointerDown={(e) => {
            setIsDrawing(true);
            (e.currentTarget as HTMLCanvasElement).setPointerCapture(e.pointerId);
            handlePointer(e);
          }}
          onPointerMove={(e) => {
            if (isDrawing) handlePointer(e);
          }}
          onPointerUp={(e) => {
            setIsDrawing(false);
            (e.currentTarget as HTMLCanvasElement).releasePointerCapture(e.pointerId);
          }}
          onPointerLeave={() => setIsDrawing(false)}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        White = inpaint/fill, black = keep original. Click "Use mask" to apply.
      </p>
    </div>
  );
}

