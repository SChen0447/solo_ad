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

const LINK_DB: Record<string, string> = {};

function generateId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function generateShareLink(canvas: HTMLCanvasElement): Promise<string> {
  const dataUrl = canvas.toDataURL('image/png');
  const id = generateId();
  LINK_DB[id] = dataUrl;

  await new Promise((r) => setTimeout(r, 300 + Math.random() * 200));

  return `https://card.sharing.app/s/${id}`;
}

export function getSharedCard(id: string): string | null {
  return LINK_DB[id] || null;
}
