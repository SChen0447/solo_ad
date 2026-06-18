export async function copyLink(): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      const permission = await checkClipboardPermission();
      if (permission === 'denied') {
        throw new Error('Clipboard permission denied');
      }
      const url = window.location.href;
      await navigator.clipboard.writeText(url);
      return true;
    }
    throw new Error('Clipboard API not available');
  } catch {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = window.location.href;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      textArea.style.top = '-9999px';
      textArea.setAttribute('readonly', '');
      document.body.appendChild(textArea);
      textArea.select();
      textArea.setSelectionRange(0, textArea.value.length);
      const success = document.execCommand('copy');
      document.body.removeChild(textArea);
      return success;
    } catch {
      return false;
    }
  }
}

async function checkClipboardPermission(): Promise<PermissionState | 'unknown'> {
  try {
    if (navigator.permissions && navigator.permissions.query) {
      const result = await navigator.permissions.query({
        name: 'clipboard-write' as PermissionName
      });
      return result.state;
    }
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

export async function copyImage(imageBase64: string): Promise<boolean> {
  try {
    const blob = base64ToBlob(imageBase64);
    if (!blob) return false;

    const permission = await checkClipboardPermission();
    if (permission === 'denied') {
      return await fallbackCopyImage(imageBase64);
    }

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
      } catch (err) {
        const e = err as Error & { name?: string };
        if (e.name === 'NotAllowedError' || e.name === 'SecurityError') {
          return await fallbackCopyImage(imageBase64);
        }
        return await fallbackExecCopyImage(imageBase64) || await fallbackCopyImage(imageBase64);
      }
    }

    return await fallbackExecCopyImage(imageBase64) || await fallbackCopyImage(imageBase64);
  } catch {
    return false;
  }
}

async function fallbackExecCopyImage(imageBase64: string): Promise<boolean> {
  try {
    const img = await loadImage(imageBase64);
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;
    ctx.drawImage(img, 0, 0);

    const range = document.createRange();
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '-9999px';
    container.style.opacity = '0';
    container.style.pointerEvents = 'none';
    container.appendChild(canvas);
    document.body.appendChild(container);

    range.selectNodeContents(container);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    let success = false;
    try {
      success = document.execCommand('copy');
    } catch {
      success = false;
    }

    selection?.removeAllRanges();
    document.body.removeChild(container);
    return success;
  } catch {
    return false;
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function fallbackCopyImage(imageBase64: string): Promise<boolean> {
  try {
    const link = document.createElement('a');
    link.href = imageBase64;
    link.download = `puzzle-collage-${Date.now()}.png`;
    link.style.position = 'fixed';
    link.style.left = '-9999px';
    link.style.top = '-9999px';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => document.body.removeChild(link), 500);
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
