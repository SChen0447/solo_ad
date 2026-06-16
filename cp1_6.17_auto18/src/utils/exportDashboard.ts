import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const getTimestamp = (): string => {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  );
};

const TARGET_WIDTH = 1920;
const TARGET_HEIGHT = 1080;

interface ExportOptions {
  filename?: string;
  scale?: number;
}

export const exportToPNG = async (
  element: HTMLElement,
  options: ExportOptions = {}
): Promise<void> => {
  const timestamp = getTimestamp();
  const filename = options.filename || `成绩分析仪表板_${timestamp}.png`;
  const scale = options.scale ?? 2;

  try {
    const canvas = await html2canvas(element, {
      scale,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#1E1E2E',
      logging: false,
      width: element.scrollWidth,
      height: element.scrollHeight,
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
    });

    const targetCanvas = document.createElement('canvas');
    targetCanvas.width = TARGET_WIDTH;
    targetCanvas.height = TARGET_HEIGHT;
    const ctx = targetCanvas.getContext('2d');

    if (!ctx) throw new Error('无法创建Canvas上下文');

    ctx.fillStyle = '#1E1E2E';
    ctx.fillRect(0, 0, TARGET_WIDTH, TARGET_HEIGHT);

    const srcRatio = canvas.width / canvas.height;
    const targetRatio = TARGET_WIDTH / TARGET_HEIGHT;

    let drawWidth = TARGET_WIDTH;
    let drawHeight = TARGET_HEIGHT;
    let offsetX = 0;
    let offsetY = 0;

    if (srcRatio > targetRatio) {
      drawHeight = TARGET_WIDTH / srcRatio;
      offsetY = (TARGET_HEIGHT - drawHeight) / 2;
    } else {
      drawWidth = TARGET_HEIGHT * srcRatio;
      offsetX = (TARGET_WIDTH - drawWidth) / 2;
    }

    ctx.drawImage(canvas, offsetX, offsetY, drawWidth, drawHeight);

    const link = document.createElement('a');
    link.download = filename;
    link.href = targetCanvas.toDataURL('image/png');
    link.click();
  } catch (error) {
    console.error('导出PNG失败:', error);
    throw error;
  }
};

export const exportToPDF = async (
  element: HTMLElement,
  options: ExportOptions = {}
): Promise<void> => {
  const timestamp = getTimestamp();
  const filename = options.filename || `成绩分析仪表板_${timestamp}.pdf`;
  const scale = options.scale ?? 2;

  try {
    const canvas = await html2canvas(element, {
      scale,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#1E1E2E',
      logging: false,
      width: element.scrollWidth,
      height: element.scrollHeight,
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
    });

    const imgData = canvas.toDataURL('image/png');

    const pdf = new jsPDF({
      orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
      unit: 'px',
      format: [TARGET_WIDTH, TARGET_HEIGHT],
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    const srcRatio = canvas.width / canvas.height;
    const pdfRatio = pdfWidth / pdfHeight;

    let drawWidth = pdfWidth;
    let drawHeight = pdfHeight;
    let offsetX = 0;
    let offsetY = 0;

    if (srcRatio > pdfRatio) {
      drawHeight = pdfWidth / srcRatio;
      offsetY = (pdfHeight - drawHeight) / 2;
    } else {
      drawWidth = pdfHeight * srcRatio;
      offsetX = (pdfWidth - drawWidth) / 2;
    }

    pdf.addImage(imgData, 'PNG', offsetX, offsetY, drawWidth, drawHeight);
    pdf.save(filename);
  } catch (error) {
    console.error('导出PDF失败:', error);
    throw error;
  }
};

export const exportDashboard = {
  toPNG: exportToPNG,
  toPDF: exportToPDF,
};

export default exportDashboard;
