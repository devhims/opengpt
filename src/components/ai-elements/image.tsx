import { cn } from '@/lib/utils';
import type { Experimental_GeneratedImage } from 'ai';

export type ImageProps = Experimental_GeneratedImage & {
  className?: string;
  alt?: string;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const Image = ({ base64, uint8Array: _unused, mediaType, ...props }: ImageProps) => (
  <img
    {...props}
    alt={props.alt}
    className={cn('h-auto max-w-full overflow-hidden rounded-md', props.className)}
    src={`data:${mediaType};base64,${base64}`}
  />
);
