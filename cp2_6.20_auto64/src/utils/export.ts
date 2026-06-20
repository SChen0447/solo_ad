import { TextElement, DecorationElement, BackgroundConfig, CardTemplate } from '../types';
import { templates } from '../data/templates';

export function exportAsPNG(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to export canvas as PNG'));
          }
        },
        'image/png',
        1.0
      );
    } catch (e) {
      reject(e);
    }
  });
}

export async function downloadPNG(canvas: HTMLCanvasElement, filename = 'greeting-card.png'): Promise<void> {
  const blob = await exportAsPNG(canvas);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

interface CardState {
  templateId: string;
  texts: TextElement[];
  decorations: DecorationElement[];
  background: BackgroundConfig;
}

const LINK_DB: Record<string, CardState> = {};

function generateId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function encodeCardState(state: CardState): string {
  const json = JSON.stringify(state);
  const utf8 = unescape(encodeURIComponent(json));
  let b64 = '';
  for (let i = 0; i < utf8.length; i++) {
    b64 += String.fromCharCode(utf8.charCodeAt(i));
  }
  return typeof window !== 'undefined' ? btoa(b64) : Buffer.from(b64).toString('base64');
}

export function decodeCardState(encoded: string): CardState | null {
  try {
    const b64 = typeof window !== 'undefined' ? atob(encoded) : Buffer.from(encoded, 'base64').toString('binary');
    let utf8 = '';
    for (let i = 0; i < b64.length; i++) {
      utf8 += '%' + ('00' + b64.charCodeAt(i).toString(16)).slice(-2);
    }
    const json = decodeURIComponent(utf8);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export async function generateShareLink(canvas: HTMLCanvasElement): Promise<string> {
  const dataUrl = canvas.toDataURL('image/png');
  const id = generateId();
  (LINK_DB as Record<string, string>)[id] = dataUrl;
  await new Promise((r) => setTimeout(r, 300 + Math.random() * 200));
  return `https://card.sharing.app/s/${id}`;
}

export async function generateShortLink(
  templateId: string,
  texts: TextElement[],
  decorations: DecorationElement[],
  background: BackgroundConfig
): Promise<string> {
  const state: CardState = {
    templateId,
    texts: texts.map((t) => ({ ...t })),
    decorations: decorations.map((d) => ({ ...d })),
    background: { ...background },
  };

  const encoded = encodeCardState(state);
  const shortId = generateId();

  LINK_DB[shortId] = state;

  await new Promise((r) => setTimeout(r, 200 + Math.random() * 300));

  return `https://card.sharing.app/c/${shortId}#${encoded}`;
}

export function getSharedCard(id: string): CardState | string | null {
  return LINK_DB[id] || null;
}

export function resolveCardFromState(state: CardState): {
  template: CardTemplate | undefined;
  texts: TextElement[];
  decorations: DecorationElement[];
  background: BackgroundConfig;
} {
  const template = templates.find((t) => t.id === state.templateId);
  return {
    template,
    texts: state.texts,
    decorations: state.decorations,
    background: state.background,
  };
}
