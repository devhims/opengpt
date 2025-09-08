'use client';

import { useEffect, useMemo, useState } from 'react';
import { IMAGE_MODEL_SCHEMAS, type ImageModelId } from '@/schemas/image-models';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { MaskDrawer } from './MaskDrawer';

export type ParamState = Record<string, any> & {
  prompt: string;
  image_b64?: string;
  mask_b64?: string;
};

interface ParamControlsProps {
  model: ImageModelId;
  params: ParamState;
  onChange: (patch: Partial<ParamState>) => void;
  onReset: () => void;
  onGenerate: () => void;
  isGenerating: boolean;
  // capability flags (for multi-model mode unions)
  hasImg2Img?: boolean;
  hasInpainting?: boolean;
}

export function ParamControls({
  model,
  params,
  onChange,
  onReset,
  onGenerate,
  isGenerating,
  hasImg2Img,
  hasInpainting,
}: ParamControlsProps) {
  const schema = IMAGE_MODEL_SCHEMAS[model];

  const stepKey = useMemo(() => {
    if (schema.paramRanges && 'num_steps' in schema.paramRanges) return 'num_steps';
    return 'steps';
  }, [schema]);

  const hasGuidance = Boolean((schema.paramRanges as any)?.guidance);
  const hasDims = Boolean(
    (schema.paramRanges as any)?.width || (schema.paramRanges as any)?.height,
  );
  const hasNegative = Boolean(
    (schema.paramRanges as any)?.negative_prompt ||
      (schema.defaultParams as any).negative_prompt !== undefined,
  );
  const showImg2Img = hasImg2Img ?? (schema.capabilities as any)?.includes?.('img2img') ?? false;
  const showInpainting =
    hasInpainting ?? (schema.capabilities as any)?.includes?.('inpainting') ?? false;
  const hasStrength = Boolean((schema.paramRanges as any)?.strength);
  const imgDataUrl = params.image_b64 ? `data:image/*;base64,${params.image_b64}` : undefined;
  const [imageSize, setImageSize] = useState<{ w: number; h: number } | null>(null);

  // When an image is provided, detect its natural size for mask canvas
  useEffect(() => {
    if (!imgDataUrl) {
      setImageSize(null);
      return;
    }
    const img = new Image();
    img.onload = () => setImageSize({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => setImageSize(null);
    img.src = imgDataUrl;
  }, [imgDataUrl]);

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">Prompt</label>
        <Textarea
          value={params.prompt}
          onChange={(e) => onChange({ prompt: e.target.value })}
          placeholder="Describe the image you want to generate..."
          className="mt-1"
        />
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <div className="space-y-1">
          <label className="text-sm font-medium">
            {stepKey === 'num_steps' ? 'Steps' : 'Steps'}
          </label>
          <input
            type="range"
            min={(schema.paramRanges as any)?.[stepKey]?.min ?? 1}
            max={(schema.paramRanges as any)?.[stepKey]?.max ?? 50}
            value={
              params[stepKey] ??
              (schema.defaultParams as any)[stepKey] ??
              (schema.defaultParams as any).steps ??
              4
            }
            onChange={(e) => onChange({ [stepKey]: Number(e.target.value) })}
            className="w-full"
          />
          <div className="text-muted-foreground text-xs">
            {params[stepKey] ??
              (schema.defaultParams as any)[stepKey] ??
              (schema.defaultParams as any).steps}
          </div>
        </div>

        {hasGuidance && (
          <div className="space-y-1">
            <label className="text-sm font-medium">Guidance</label>
            <input
              type="range"
              step={0.1}
              min={(schema.paramRanges as any)?.guidance?.min ?? 0}
              max={(schema.paramRanges as any)?.guidance?.max ?? 15}
              value={params.guidance ?? (schema.defaultParams as any).guidance ?? 7.5}
              onChange={(e) => onChange({ guidance: Number(e.target.value) })}
              className="w-full"
            />
            <div className="text-muted-foreground text-xs">
              {(params.guidance ?? (schema.defaultParams as any).guidance ?? 7.5).toFixed(1)}
            </div>
          </div>
        )}

        <div className="space-y-1">
          <label className="text-sm font-medium">Seed</label>
          <input
            type="number"
            placeholder="Random"
            value={params.seed ?? ''}
            onChange={(e) =>
              onChange({ seed: e.target.value ? Number(e.target.value) : undefined })
            }
            className="bg-background w-full rounded-md border px-3 py-2"
          />
        </div>
      </div>

      {hasStrength && (
        <div className="space-y-1">
          <label className="text-sm font-medium">Strength (img2img)</label>
          <input
            type="range"
            step={0.05}
            min={(schema.paramRanges as any)?.strength?.min ?? 0}
            max={(schema.paramRanges as any)?.strength?.max ?? 1}
            value={params.strength ?? (schema.defaultParams as any).strength ?? 1}
            onChange={(e) => onChange({ strength: Number(e.target.value) })}
            className="w-full"
          />
          <div className="text-muted-foreground text-xs">
            {(params.strength ?? (schema.defaultParams as any).strength ?? 1).toFixed(2)}
          </div>
        </div>
      )}

      {(showImg2Img || showInpainting) && (
        <div className="grid grid-cols-1 gap-4">
          {(showImg2Img || showInpainting) && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Input Image (img2img/inpainting)</label>
              <div className="grid grid-cols-[1fr_auto_auto] items-center gap-3">
                <input
                  type="file"
                  accept="image/*"
                  className="bg-background block w-full rounded-md border px-3 py-2 text-sm"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return onChange({ image_b64: undefined });
                    const reader = new FileReader();
                    reader.onload = () => {
                      const result = String(reader.result || '');
                      const b64 = result.replace(/^data:image\/[a-zA-Z]+;base64,/, '');
                      onChange({ image_b64: b64 });
                    };
                    reader.readAsDataURL(file);
                  }}
                />
                {imgDataUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imgDataUrl}
                    alt="Input"
                    className="h-16 w-16 rounded border object-cover"
                  />
                )}
                {imgDataUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onChange({ image_b64: undefined })}
                  >
                    Remove
                  </Button>
                )}
              </div>
              <div className="text-muted-foreground text-xs">
                Optional. Uses image_b64 for Workers AI.
              </div>
            </div>
          )}

          {showInpainting && (
            <MaskDrawer
              imageDataUrl={imgDataUrl}
              width={imageSize?.w ?? params.width ?? (schema.defaultParams as any).width ?? 1024}
              height={imageSize?.h ?? params.height ?? (schema.defaultParams as any).height ?? 1024}
              onMaskChange={(mask) => onChange({ mask })}
            />
          )}
        </div>
      )}

      {hasDims && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Width</label>
            <input
              type="number"
              className="bg-background mt-1 w-full rounded-md border px-3 py-2"
              value={params.width ?? (schema.defaultParams as any).width ?? 1024}
              min={(schema.paramRanges as any)?.width?.min ?? 256}
              max={(schema.paramRanges as any)?.width?.max ?? 2048}
              step={64}
              onChange={(e) => onChange({ width: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Height</label>
            <input
              type="number"
              className="bg-background mt-1 w-full rounded-md border px-3 py-2"
              value={params.height ?? (schema.defaultParams as any).height ?? 1024}
              min={(schema.paramRanges as any)?.height?.min ?? 256}
              max={(schema.paramRanges as any)?.height?.max ?? 2048}
              step={64}
              onChange={(e) => onChange({ height: Number(e.target.value) })}
            />
          </div>
        </div>
      )}

      {hasNegative && (
        <div>
          <label className="text-sm font-medium">Negative Prompt</label>
          <Textarea
            className="mt-1"
            value={params.negative_prompt ?? (schema.defaultParams as any).negative_prompt ?? ''}
            onChange={(e) => onChange({ negative_prompt: e.target.value })}
            placeholder="What to avoid: low quality, artifacts, text, ..."
          />
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={onReset} disabled={isGenerating}>
          Reset to defaults
        </Button>
        <Button onClick={onGenerate} disabled={isGenerating || !params.prompt.trim()}>
          {isGenerating ? 'Generating…' : 'Generate'}
        </Button>
      </div>
    </div>
  );
}
