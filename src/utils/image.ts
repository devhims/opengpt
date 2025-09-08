import type { ImageGenerationResponse } from '@/app/api/image/route';

/**
 * Download generated image
 */
export async function downloadImage(
  image: ImageGenerationResponse & { id: string; prompt: string },
): Promise<void> {
  try {
    // Convert base64 to blob
    const response = await fetch(`data:${image.mediaType};base64,${image.base64}`);
    const blob = await response.blob();

    // Create download link
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ai-generated-${image.id}.jpg`;

    // Trigger download
    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to download image:', error);
  }
}

/**
 * Generate image via API
 */
export async function generateImage(
  prompt: string,
  model: string,
  steps: number = 4,
): Promise<ImageGenerationResponse> {
  const response = await fetch('/api/image', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      model,
      steps,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to generate image');
  }

  return response.json();
}
