export async function copyLink(): Promise<boolean> {
  try {
    const url = window.location.href;
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = window.location.href;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return true;
    } catch {
      return false;
    }
  }
}

export async function copyImage(imageBase64: string): Promise<boolean> {
  try {
    const blob = base64ToBlob(imageBase64);
    if (!blob) return false;

    if (navigator.clipboard && typeof window.ClipboardItem !== 'undefined') {
      try {
        const pngBlob = blob.type === 'image/png'
          ? blob
          : await convertToPng(imageBase64);

        await navigator.clipboard.write([
          new ClipboardItem({
            [pngBlob.type]: pngBlob
          })
        ]);
        return true;
      } catch {
        return await fallbackCopyImage(imageBase64);
      }
    }

    return await fallbackCopyImage(imageBase64);
  } catch {
    return false;
  }
}

async function fallbackCopyImage(imageBase64: string): Promise<boolean> {
  try {
    const link = document.createElement('a');
    link.href = imageBase64;
    link.download = `puzzle-collage-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return true;
  } catch {
    return false;
  }
}

async function convertToPng(dataUrl: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('无法创建 canvas'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('转换 PNG 失败'));
        }
      }, 'image/png');
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

export function base64ToBlob(base64: string): Blob | null {
  try {
    const parts = base64.split(',');
    const mimeMatch = parts[0].match(/:(.*?);/);
    if (!mimeMatch) return null;
    const mime = mimeMatch[1];
    const binary = atob(parts[1]);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type: mime });
  } catch {
    return null;
  }
}
