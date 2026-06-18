import { base64ToBlob } from './imageHelper';

export async function copyLinkToClipboard(link: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(link);
      return true;
    }
    const textArea = document.createElement('textarea');
    textArea.value = link;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      return true;
    } finally {
      textArea.remove();
    }
  } catch (error) {
    console.error('复制链接失败:', error);
    return false;
  }
}

export async function copyImageToClipboard(imageBase64: string): Promise<boolean> {
  try {
    const blob = base64ToBlob(imageBase64);
    if (navigator.clipboard && window.ClipboardItem) {
      const item = new ClipboardItem({
        [blob.type]: blob,
      });
      await navigator.clipboard.write([item]);
      return true;
    }
    return false;
  } catch (error) {
    console.error('复制图片失败:', error);
    return false;
  }
}

export function generateShareLink(): string {
  const id = Math.random().toString(36).substring(2, 10);
  return `${window.location.origin}${window.location.pathname}?share=${id}`;
}
