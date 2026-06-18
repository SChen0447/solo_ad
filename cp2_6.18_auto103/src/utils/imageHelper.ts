export interface ProcessedImage {
  thumbnail: string;
  original: string;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/jpg'];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: '仅支持 JPG 和 PNG 格式的图片' };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: '图片大小不能超过 5MB' };
  }
  return { valid: true };
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function generateThumbnail(dataUrl: string, size: number = 200): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = Math.min(size / img.width, size / img.height);
      const width = Math.round(img.width * scale);
      const height = Math.round(img.height * scale);
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('无法创建 canvas 上下文'));
        return;
      }
      const offsetX = (size - width) / 2;
      const offsetY = (size - height) / 2;
      ctx.drawImage(img, offsetX, offsetY, width, height);
      resolve(canvas.toDataURL('image/png', 0.9));
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

export async function processImage(file: File): Promise<ProcessedImage> {
  const validation = validateImageFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }
  const original = await readFileAsDataURL(file);
  const thumbnail = await generateThumbnail(original, 200);
  return { thumbnail, original };
}

export function canvasToBase64(element: HTMLElement, backgroundColor: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const scale = 2;
    const width = 1200;
    const rect = element.getBoundingClientRect();
    const aspectRatio = rect.height / rect.width;
    const height = Math.round(width * aspectRatio);
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('无法创建 canvas 上下文'));
      return;
    }
    ctx.scale(scale, scale);
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);
    resolve('');
  });
}
