export interface LoadedImage {
  imageData: ImageData;
  imageElement: HTMLImageElement;
  canvas: HTMLCanvasElement;
  originalWidth: number;
  originalHeight: number;
}

const MAX_ANALYSIS_SIZE = 800;

export function loadImage(file: File): Promise<LoadedImage> {
  return new Promise((resolve, reject) => {
    if (!file.type.match(/image\/(jpeg|png|webp)/)) {
      reject(new Error('仅支持 JPG、PNG、WebP 格式的图片'));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      reject(new Error('图片大小不能超过 5MB'));
      return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('无法获取 Canvas 上下文'));
          return;
        }

        let width = img.naturalWidth;
        let height = img.naturalHeight;

        if (width > MAX_ANALYSIS_SIZE || height > MAX_ANALYSIS_SIZE) {
          const ratio = Math.min(MAX_ANALYSIS_SIZE / width, MAX_ANALYSIS_SIZE / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        const imageData = ctx.getImageData(0, 0, width, height);

        resolve({
          imageData,
          imageElement: img,
          canvas,
          originalWidth: img.naturalWidth,
          originalHeight: img.naturalHeight
        });
      };

      img.onerror = () => {
        reject(new Error('图片加载失败'));
      };

      img.src = dataUrl;
    };

    reader.onerror = () => {
      reject(new Error('文件读取失败'));
    };

    reader.readAsDataURL(file);
  });
}

export function getPixelAt(
  canvas: HTMLCanvasElement,
  x: number,
  y: number
): { r: number; g: number; b: number } | null {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  try {
    const imageData = ctx.getImageData(x, y, 1, 1);
    const data = imageData.data;
    return { r: data[0], g: data[1], b: data[2] };
  } catch {
    return null;
  }
}
