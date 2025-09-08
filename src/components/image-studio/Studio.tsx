'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { IMAGE_MODEL_SCHEMAS, getOptimalParams, type ImageModelId } from '@/schemas/image-models';
import { ModelSelect } from './ModelSelect';
import { ParamControls, type ParamState } from './ParamControls';
import { Preview } from './Preview';
import { MultiModelSelect } from './MultiModelSelect';

const DEFAULT_MODEL: ImageModelId = '@cf/black-forest-labs/flux-1-schnell';

export function ImageStudio() {
  const [model, setModel] = useState<ImageModelId>(DEFAULT_MODEL);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedModels, setSelectedModels] = useState<ImageModelId[]>([DEFAULT_MODEL]);
  const [params, setParams] = useState<ParamState>(() => ({ prompt: '' }));
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [base64, setBase64] = useState<string | undefined>();
  const [mediaType, setMediaType] = useState<string | undefined>();
  const [comparisons, setComparisons] = useState<Array<{
    model: ImageModelId;
    base64?: string;
    mediaType?: string;
    error?: string;
  }> | null>(null);

  const schema = IMAGE_MODEL_SCHEMAS[model];

  // Reset to model defaults when model changes
  const resetToDefaults = useCallback(() => {
    const defaults = getOptimalParams(model, { prompt: params.prompt ?? '' });
    setParams((prev) => ({ ...defaults, prompt: prev.prompt ?? '' }));
  }, [model, params.prompt]);

  useEffect(() => {
    resetToDefaults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model]);

  const stepKey = useMemo(() => {
    if (schema.paramRanges && 'num_steps' in schema.paramRanges) return 'num_steps';
    return 'steps';
  }, [schema]);

  const handleChangeParams = (patch: Partial<ParamState>) => {
    setParams((prev) => ({ ...prev, ...patch }));
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(undefined);
    setBase64(undefined);
    setMediaType(undefined);

    try {
      const buildPayload = (m: ImageModelId): Record<string, any> => {
        const s = IMAGE_MODEL_SCHEMAS[m];
        const perModelStepKey =
          s.paramRanges && 'num_steps' in s.paramRanges ? 'num_steps' : 'steps';
        const payload: Record<string, any> = { model: m, prompt: params.prompt };
        const include = new Set<string>([
          'prompt',
          'seed',
          perModelStepKey,
          'width',
          'height',
          'guidance',
          'negative_prompt',
          'strength',
          'image_b64',
          'image',
          'mask_b64',
          'mask',
        ]);
        // Map generic step value to the per-model key if needed
        const candidateSteps = (params as any)[perModelStepKey] ?? (params as any)[stepKey];
        if (candidateSteps != null) payload[perModelStepKey] = candidateSteps;
        for (const [k, v] of Object.entries(params)) {
          if (include.has(k) && k !== 'prompt' && v !== undefined && k !== perModelStepKey) {
            payload[k] = v;
          }
        }
        // Remove unsupported fields based on capabilities
        // Input image is required for both img2img and inpainting models
        if (
          !(s.capabilities as any).includes('img2img') &&
          !(s.capabilities as any).includes('inpainting')
        ) {
          delete payload.image_b64;
          delete payload.image;
        }
        // Strength is typically relevant for img2img and inpainting models; keep if present in ranges
        if (
          !(s.capabilities as any).includes('img2img') &&
          !(s.capabilities as any).includes('inpainting')
        ) {
          delete payload.strength;
        }
        if (!(s.capabilities as any).includes('inpainting')) {
          delete payload.mask;
          delete payload.mask_b64;
        }
        return payload;
      };

      if (!compareMode) {
        const res = await fetch('/api/image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(buildPayload(model)),
        });
        if (!res.ok) {
          const err = (await res
            .json()
            .catch((): { error: string } => ({ error: 'Unknown error' }))) as { error: string };
          throw new Error(err.error || `Request failed with ${res.status}`);
        }
        const data: { base64: string; mediaType: string } = await res.json();
        setBase64(data.base64);
        setMediaType(data.mediaType);
        setComparisons(null);
      } else {
        // Multi-model compare
        const unique = Array.from(new Set(selectedModels));
        const results = await Promise.allSettled(
          unique.map(async (m) => {
            const res = await fetch('/api/image', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(buildPayload(m)),
            });
            if (!res.ok) {
              const err = (await res
                .json()
                .catch((): { error: string } => ({ error: 'Unknown error' }))) as { error: string };
              throw new Error(err.error || `Request failed for ${m} with ${res.status}`);
            }
            const data: { base64: string; mediaType: string } = await res.json();
            return { model: m, ...data };
          }),
        );
        const mapped = results.map((r) =>
          r.status === 'fulfilled'
            ? {
                model: r.value.model as ImageModelId,
                base64: r.value.base64,
                mediaType: r.value.mediaType,
              }
            : { model: '' as ImageModelId, error: (r as any).reason?.message || 'Failed' },
        );
        setComparisons(mapped as any);
        const firstOk = mapped.find((m) => m.base64);
        if (firstOk) {
          setBase64(firstOk.base64);
          setMediaType(firstOk.mediaType);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Image Generation Studio</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Describe your image, choose a model, and fine-tune parameters for the best results.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Controls */}
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            {!compareMode ? (
              <ModelSelect
                value={model}
                onChange={(m) => {
                  setModel(m as ImageModelId);
                  setSelectedModels([m as ImageModelId]);
                }}
              />
            ) : (
              <MultiModelSelect
                values={selectedModels}
                onChange={(arr) => setSelectedModels(arr as ImageModelId[])}
              />
            )}
            <div className="mt-6 flex items-center gap-2">
              <input
                id="compare-toggle"
                type="checkbox"
                checked={compareMode}
                onChange={(e) => setCompareMode(e.target.checked)}
              />
              <label htmlFor="compare-toggle" className="text-sm">
                Compare multiple models
              </label>
            </div>
          </div>
          <div className="rounded-lg border p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="font-medium">Parameters</h3>
                <p className="text-muted-foreground text-xs">
                  {schema.name} • {schema.provider}
                </p>
              </div>
              <div className="text-muted-foreground text-xs">
                {(schema.capabilities as any).join(', ')}
              </div>
            </div>

            <ParamControls
              model={model}
              params={params}
              onChange={handleChangeParams}
              onReset={resetToDefaults}
              onGenerate={handleGenerate}
              isGenerating={isGenerating}
              hasImg2Img={
                compareMode
                  ? selectedModels.some((m) =>
                      (IMAGE_MODEL_SCHEMAS[m].capabilities as any).includes('img2img'),
                    )
                  : undefined
              }
              hasInpainting={
                compareMode
                  ? selectedModels.some((m) =>
                      (IMAGE_MODEL_SCHEMAS[m].capabilities as any).includes('inpainting'),
                    )
                  : undefined
              }
            />
          </div>
        </div>

        {/* Preview */}
        {!compareMode ? (
          <Preview base64={base64} mediaType={mediaType} isLoading={isGenerating} error={error} />
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Comparisons</h3>
              <div className="text-muted-foreground text-xs">{selectedModels.length} selected</div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {comparisons && comparisons.length > 0 ? (
                comparisons.map((c, i) => (
                  <div key={c.model || i} className="rounded-lg border p-3">
                    <div className="text-muted-foreground mb-2 text-xs">
                      {c.model || 'Unknown model'}
                    </div>
                    {c.error ? (
                      <div className="rounded bg-red-50 p-3 text-sm text-red-700">{c.error}</div>
                    ) : (
                      <Preview base64={c.base64} mediaType={c.mediaType} />
                    )}
                  </div>
                ))
              ) : (
                <div className="text-muted-foreground rounded-lg border p-4 text-sm">
                  Generate to see side-by-side results here.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
