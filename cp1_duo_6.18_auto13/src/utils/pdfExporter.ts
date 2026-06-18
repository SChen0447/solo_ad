import { jsPDF } from 'jspdf';
import type { ColorBlindType } from './colorBlindMatrices';
import { COLOR_BLIND_LABELS } from './colorBlindMatrices';
import type { ContrastMetrics } from './contrastCalculator';

export async function exportPdfReport(
  originalCanvas: HTMLCanvasElement | null,
  simulatedCanvas: HTMLCanvasElement | null,
  heatmapCanvas: HTMLCanvasElement | null,
  colorBlindType: ColorBlindType,
  metrics: ContrastMetrics | null
): Promise<void> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(20);
  doc.text('Accessibility Contrast Report', pageWidth / 2, 20, { align: 'center' });

  doc.setFontSize(12);
  doc.text(`Color Blind Type: ${COLOR_BLIND_LABELS[colorBlindType]}`, 14, 35);
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 43);

  doc.setFontSize(14);
  doc.text('Metrics', 14, 58);
  doc.setFontSize(11);

  if (metrics) {
    doc.text(`Average DeltaE: ${metrics.avgDeltaE.toFixed(2)}`, 20, 68);
    doc.text(`WCAG Contrast Diff: ${metrics.wcagContrastDiff.toFixed(2)}`, 20, 76);
    doc.text(`Diff Regions Count: ${metrics.diffRegions.length}`, 20, 84);
  } else {
    doc.text('No metrics available', 20, 68);
  }

  let yOffset = 95;

  if (originalCanvas) {
    doc.setFontSize(14);
    doc.text('Original Image', 14, yOffset);
    yOffset += 5;
    try {
      const imgData = originalCanvas.toDataURL('image/jpeg', 0.7);
      const imgW = pageWidth - 28;
      const imgH = imgW * 0.5;
      doc.addImage(imgData, 'JPEG', 14, yOffset, imgW, imgH);
      yOffset += imgH + 10;
    } catch {
      doc.text('Original image export failed', 20, yOffset);
      yOffset += 10;
    }
  }

  if (simulatedCanvas) {
    doc.setFontSize(14);
    doc.text(`Simulated (${COLOR_BLIND_LABELS[colorBlindType]})`, 14, yOffset);
    yOffset += 5;
    try {
      const imgData = simulatedCanvas.toDataURL('image/jpeg', 0.7);
      const imgW = pageWidth - 28;
      const imgH = imgW * 0.5;
      if (yOffset + imgH > doc.internal.pageSize.getHeight() - 20) {
        doc.addPage();
        yOffset = 20;
      }
      doc.addImage(imgData, 'JPEG', 14, yOffset, imgW, imgH);
      yOffset += imgH + 10;
    } catch {
      doc.text('Simulated image export failed', 20, yOffset);
      yOffset += 10;
    }
  }

  if (heatmapCanvas) {
    doc.setFontSize(14);
    doc.text('Difference Heatmap', 14, yOffset);
    yOffset += 5;
    try {
      const imgData = heatmapCanvas.toDataURL('image/jpeg', 0.7);
      const imgW = pageWidth - 28;
      const imgH = imgW * 0.5;
      if (yOffset + imgH > doc.internal.pageSize.getHeight() - 20) {
        doc.addPage();
        yOffset = 20;
      }
      doc.addImage(imgData, 'JPEG', 14, yOffset, imgW, imgH);
    } catch {
      doc.text('Heatmap export failed', 20, yOffset);
    }
  }

  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  const link = window.document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.download = `accessibility-report-${colorBlindType}.pdf`;
  window.document.body.appendChild(link);
  link.click();
  window.document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
