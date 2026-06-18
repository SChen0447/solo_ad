export interface ImageProcessResult {
  thumbnail: string;
  original: string;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];
const MAX_SIZE = 5 * 1024 * 1024;

export function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: '仅支持 JPG/JPEG 和 PNG 格式的图片' };
  }
  if (file.size > MAX_SIZE) {
    return { valid: false, error: '图片大小不能超过 5MB' };
  }
  return { valid: true };
}

export async function processImageFile(file: File): Promise<ImageProcessResult> {
  const validation = validateImageFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const original = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ thumbnail: original, original });
          return;
        }

        const targetSize = 200;
        const scale = Math.min(targetSize / img.width, targetSize / img.height);
        const newWidth = Math.round(img.width * scale);
        const newHeight = Math.round(img.height * scale);

        canvas.width = newWidth;
        canvas.height = newHeight;

        ctx.drawImage(img, 0, 0, newWidth, newHeight);
        const thumbnail = canvas.toDataURL('image/png');

        resolve({ thumbnail, original });
      };
      img.onerror = () => reject(new Error('图片加载失败'));
      img.src = original;
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsDataURL(file);
  });
}

export async function canvasToBase64(canvas: HTMLElement, width: number = 1200): Promise<string> {
  const { toPng } = await import('html-to-image');
  const scale = width / canvas.clientWidth;
  const dataUrl = await toPng(canvas, {
    quality: 0.95,
    pixelRatio: scale,
    cacheBust: true,
  });
  return dataUrl;
}

export function base64ToBlob(base64: string): Blob {
  const parts = base64.split(',');
  const mimeMatch = parts[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/png';
  const binary = atob(parts[1]);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i);
  }
  return new Blob([array], { type: mime });
}
