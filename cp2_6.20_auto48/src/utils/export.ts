import type { CardElementUnion, BackgroundType } from '@/types';
import { CanvasRenderer } from '@/core/CanvasRenderer';

export function exportToPNG(canvas: HTMLCanvasElement): void {
  const dataUrl = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.download = `greeting-card-${Date.now()}.png`;
  link.href = dataUrl;
  link.click();
}

export function renderToCanvas(
  canvas: HTMLCanvasElement,
  elements: CardElementUnion[],
  background: string,
  backgroundType: BackgroundType
): void {
  const renderer = new CanvasRenderer(canvas);
  renderer.render(elements, background, backgroundType, null);
}

export async function generateShortLink(cardData: string): Promise<string> {
  await new Promise((resolve) => setTimeout(resolve, 800));
  const hash = btoa(cardData).slice(0, 8).replace(/[+/=]/g, '');
  return `https://card.share/${hash}`;
}

export function serializeCardState(
  elements: CardElementUnion[],
  background: string,
  backgroundType: BackgroundType
): string {
  return JSON.stringify({ elements, background, backgroundType });
}
