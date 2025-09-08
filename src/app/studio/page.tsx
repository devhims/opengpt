import type { Metadata } from 'next';
import { ImageStudio } from '@/components/image-studio/Studio';

export const metadata: Metadata = {
  title: 'Image Generation Studio',
  description: 'Generate images with Cloudflare Workers AI models and fine-tune parameters.',
};

export default function Page() {
  return <ImageStudio />;
}

