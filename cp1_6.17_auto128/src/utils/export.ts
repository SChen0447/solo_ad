import html2canvas from 'html2canvas';

export async function exportCanvasAsPNG(
  element: HTMLElement,
  width: number = 1920,
  height: number = 1080
): Promise<void> {
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const timeStr = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
  const filename = `prototype-${dateStr}-${timeStr}.png`;

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    width: element.offsetWidth,
    height: element.offsetHeight,
  });

  const targetCanvas = document.createElement('canvas');
  targetCanvas.width = width;
  targetCanvas.height = height;
  const ctx = targetCanvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  const scale = Math.min(width / canvas.width, height / canvas.height);
  const scaledWidth = canvas.width * scale;
  const scaledHeight = canvas.height * scale;
  const x = (width - scaledWidth) / 2;
  const y = (height - scaledHeight) / 2;

  ctx.drawImage(canvas, x, y, scaledWidth, scaledHeight);

  const link = document.createElement('a');
  link.download = filename;
  link.href = targetCanvas.toDataURL('image/png');
  link.click();
}

export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
