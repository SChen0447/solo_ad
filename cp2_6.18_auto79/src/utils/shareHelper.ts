import { base64ToBlob } from './imageHelper';

export const copyLink = async (): Promise<boolean> => {
  try {
    const url = window.location.href;
    await navigator.clipboard.writeText(url);
    return true;
  } catch (error) {
    console.error('Failed to copy link:', error);
    return false;
  }
};

export const copyImage = async (imageBase64: string): Promise<boolean> => {
  try {
    const blob = base64ToBlob(imageBase64);
    const clipboardItem = new ClipboardItem({
      [blob.type]: blob
    });
    await navigator.clipboard.write([clipboardItem]);
    return true;
  } catch (error) {
    console.error('Failed to copy image:', error);
    try {
      const textArea = document.createElement('textarea');
      textArea.value = imageBase64;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return true;
    } catch (fallbackError) {
      console.error('Fallback copy also failed:', fallbackError);
      return false;
    }
  }
};

export const downloadImage = async (
  imageBase64: string,
  filename: string = 'puzzle-collage.png'
): Promise<boolean> => {
  try {
    const { saveAs } = await import('file-saver');
    const blob = base64ToBlob(imageBase64);
    saveAs(blob, filename);
    return true;
  } catch (error) {
    console.error('Failed to download image:', error);
    return false;
  }
};
