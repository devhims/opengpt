"use client";

import { CLOUDFLARE_AI_MODELS } from '@/constants';
import { formatModelName } from '@/utils/models';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ModelSelectProps {
  value: string;
  onChange: (value: string) => void;
}

export function ModelSelect({ value, onChange }: ModelSelectProps) {
  return (
    <div>
      <label className="text-sm font-medium">Model</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="mt-1 w-full">
          <SelectValue placeholder="Choose model" />
        </SelectTrigger>
        <SelectContent className="max-h-72 w-[420px]">
          {CLOUDFLARE_AI_MODELS.imageGeneration.map((m) => (
            <SelectItem key={m} value={m} className="truncate">
              {formatModelName(m)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

