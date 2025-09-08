"use client";

import { CLOUDFLARE_AI_MODELS } from '@/constants';
import { formatModelName } from '@/utils/models';

interface MultiModelSelectProps {
  values: string[];
  onChange: (values: string[]) => void;
}

export function MultiModelSelect({ values, onChange }: MultiModelSelectProps) {
  const toggle = (model: string) => {
    if (values.includes(model)) onChange(values.filter((m) => m !== model));
    else onChange([...values, model]);
  };

  return (
    <div>
      <label className="text-sm font-medium">Models</label>
      <div className="bg-background mt-2 grid grid-cols-1 gap-2 rounded-md border p-3 md:grid-cols-2">
        {CLOUDFLARE_AI_MODELS.imageGeneration.map((m) => (
          <label key={m} className="flex cursor-pointer items-center gap-2 truncate">
            <input
              type="checkbox"
              checked={values.includes(m)}
              onChange={() => toggle(m)}
              className="accent-foreground"
            />
            <span className="truncate text-sm">{formatModelName(m)}</span>
          </label>
        ))}
      </div>
      <div className="text-muted-foreground mt-1 text-xs">
        Select one or more models to compare results side by side.
      </div>
    </div>
  );
}

