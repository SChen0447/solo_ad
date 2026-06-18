export interface ImageProcessResult {
  thumbnail: string;
  original: string;
}

export const validateFile = (file: File): boolean => {
  const validTypes = ['image/jpeg', 'image/png'];
  const maxSize = 5 * 1024 * 1024;
  
  if (!validTypes.includes(file.type)) {
    return false;
  }
  if (file.size > maxSize) {
    return false;
  }
  return true;
};

export const generateThumbnail = (
  file: File,
  maxSize: number = 200
): Promise<ImageProcessResult> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const original = e.target?.result as string;
      const img = new Image();
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }
        
        let width = img.width;
        let height = img.height;
        
        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        
        const thumbnail = canvas.toDataURL('image/png');
        resolve({ thumbnail, original });
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
      
      img.src = original;
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsDataURL(file);
  });
};

export const canvasToBase64 = (
  canvas: HTMLElement,
  width: number = 1200
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const scale = width / canvas.offsetWidth;
    
    const htmlToImage = import('html-to-image');
    htmlToImage
      .then((module) => {
        return module.toPng(canvas, {
          pixelRatio: scale,
          cacheBust: true,
          backgroundColor: undefined
        });
      })
      .then((dataUrl) => resolve(dataUrl))
      .catch((error) => reject(error));
  });
};

export const base64ToBlob = (base64: string): Blob => {
  const parts = base64.split(',');
  const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/png';
  const binary = atob(parts[1]);
  const array = [];
  
  for (let i = 0; i < binary.length; i++) {
    array.push(binary.charCodeAt(i));
  }
  
  return new Blob([new Uint8Array(array)], { type: mime });
};
