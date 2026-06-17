import { saveAs } from 'file-saver';
import type { OverflowElement } from './analyzer';

export interface ExportReportData {
  exportedAt: string;
  breakpoints: {
    viewportWidth: number;
    overflowElements: OverflowElement[];
    totalOverflow: number;
  }[];
  fontScale: number;
  lineHeightScale: number;
  containerPadding: number;
  htmlCode: string;
  cssCode: string;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawPagePreview(
  ctx: CanvasRenderingContext2D,
  overflowElements: OverflowElement[],
  viewportWidth: number,
  previewX: number,
  previewY: number,
  previewWidth: number,
  previewHeight: number
) {
  const scale = previewWidth / viewportWidth;
  const viewportHeight = viewportWidth * 0.7;

  ctx.fillStyle = '#ffffff';
  roundRect(ctx, previewX, previewY, previewWidth, previewHeight, 8);
  ctx.fill();
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.save();
  ctx.beginPath();
  roundRect(ctx, previewX, previewY, previewWidth, previewHeight, 8);
  ctx.clip();

  const contentScale = previewWidth / viewportWidth;
  const contentY = previewY + 20 * contentScale;

  ctx.fillStyle = '#4a6fa5';
  roundRect(
    ctx,
    previewX + 20 * contentScale,
    contentY,
    (viewportWidth - 40) * contentScale,
    60 * contentScale,
    6 * contentScale
  );
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fillRect(
    previewX + 40 * contentScale,
    contentY + 20 * contentScale,
    120 * contentScale,
    10 * contentScale
  );

  const heroY = contentY + 90 * contentScale;
  const gradient = ctx.createLinearGradient(
    previewX + 20 * contentScale,
    heroY,
    previewX + (viewportWidth - 20) * contentScale,
    heroY + 80 * contentScale
  );
  gradient.addColorStop(0, '#667eea');
  gradient.addColorStop(1, '#764ba2');
  ctx.fillStyle = gradient;
  roundRect(
    ctx,
    previewX + 20 * contentScale,
    heroY,
    (viewportWidth - 40) * contentScale,
    80 * contentScale,
    8 * contentScale
  );
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillRect(
    previewX + 40 * contentScale,
    heroY + 20 * contentScale,
    180 * contentScale,
    8 * contentScale
  );
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillRect(
    previewX + 40 * contentScale,
    heroY + 36 * contentScale,
    300 * contentScale,
    6 * contentScale
  );
  ctx.fillStyle = '#f97316';
  roundRect(
    ctx,
    previewX + 40 * contentScale,
    heroY + 50 * contentScale,
    60 * contentScale,
    18 * contentScale,
    4 * contentScale
  );
  ctx.fill();

  const gridY = heroY + 110 * contentScale;
  const cardWidth = (viewportWidth - 60) / 3;
  const cardHeight = 70 * contentScale;
  for (let i = 0; i < 3; i++) {
    const cardX = previewX + (20 + i * (cardWidth + 10)) * contentScale;
    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    roundRect(ctx, cardX, gridY, cardWidth * contentScale, cardHeight, 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#4a6fa5';
    ctx.fillRect(cardX + 10 * contentScale, gridY + 10 * contentScale, 60 * contentScale, 8);
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(cardX + 10 * contentScale, gridY + 26 * contentScale, 80 * contentScale, 5);
    ctx.fillRect(cardX + 10 * contentScale, gridY + 36 * contentScale, 70 * contentScale, 5);
  }

  const boxY = gridY + cardHeight + 20 * contentScale;
  ctx.fillStyle = '#fef3c7';
  roundRect(
    ctx,
    previewX + 20 * contentScale,
    boxY,
    (viewportWidth - 40) * contentScale,
    40 * contentScale,
    6
  );
  ctx.fill();
  ctx.fillStyle = '#92400e';
  ctx.font = `${12 * contentScale}px Arial`;
  ctx.fillText(
    '固定宽度盒子 - 可能在小屏溢出',
    previewX + 35 * contentScale,
    boxY + 24 * contentScale
  );

  overflowElements.forEach((el) => {
    const hasHorizontal = el.overflowX > 0.5;
    const hasVertical = el.overflowY > 0.5;

    const baseLeft = previewX + el.offsetLeft * contentScale;
    const baseTop = previewY + el.offsetTop * contentScale;
    const elWidth = el.actualWidth * contentScale;
    const elHeight = el.actualHeight * contentScale;

    if (hasHorizontal) {
      const overlayX = previewX + (el.offsetLeft + el.parentWidth) * contentScale;
      const overlayWidth = el.overflowX * contentScale;
      ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
      ctx.fillRect(overlayX, baseTop, overlayWidth, elHeight);

      ctx.fillStyle = 'rgba(239, 68, 68, 0.6)';
      ctx.fillRect(overlayX, baseTop + elHeight / 2 - 14, 60, 28);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px Arial';
      ctx.fillText(`→ ${el.overflowX.toFixed(1)}px`, overlayX + 6, baseTop + elHeight / 2 + 4);
    }

    if (hasVertical) {
      const overlayY = previewY + (el.offsetTop + el.parentHeight) * contentScale;
      const overlayHeight = el.overflowY * contentScale;
      ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
      ctx.fillRect(baseLeft, overlayY, elWidth, overlayHeight);
    }
  });

  ctx.restore();

  ctx.fillStyle = '#334155';
  ctx.font = 'bold 14px Arial';
  ctx.fillText(`${viewportWidth}px 视口预览`, previewX, previewY + previewHeight + 24);
}

function drawReportList(
  ctx: CanvasRenderingContext2D,
  overflowElements: OverflowElement[],
  x: number,
  y: number,
  width: number,
  maxHeight: number
) {
  ctx.fillStyle = '#ffffff';
  roundRect(ctx, x, y, width, maxHeight, 8);
  ctx.fill();
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#475569';
  ctx.font = 'bold 16px Arial';
  ctx.fillText('📋 溢出元素详情', x + 20, y + 32);

  const countBadgeX = x + width - 70;
  ctx.fillStyle = overflowElements.length > 0 ? '#fef2f2' : '#f0fdf4';
  roundRect(ctx, countBadgeX, y + 14, 50, 24, 12);
  ctx.fill();
  ctx.fillStyle = overflowElements.length > 0 ? '#dc2626' : '#16a34a';
  ctx.font = 'bold 13px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(`${overflowElements.length}`, countBadgeX + 25, y + 31);
  ctx.textAlign = 'left';

  if (overflowElements.length === 0) {
    ctx.fillStyle = '#16a34a';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('✅ 未检测到溢出问题', x + width / 2, y + maxHeight / 2);
    ctx.fillStyle = '#64748b';
    ctx.font = '14px Arial';
    ctx.fillText('布局在此视口下表现良好', x + width / 2, y + maxHeight / 2 + 30);
    ctx.textAlign = 'left';
    return;
  }

  const itemHeight = 95;
  const padding = 16;
  const startY = y + 56;
  const visibleCount = Math.min(Math.floor((maxHeight - 70) / itemHeight), overflowElements.length);

  for (let i = 0; i < visibleCount; i++) {
    const el = overflowElements[i];
    const itemY = startY + i * itemHeight;

    ctx.fillStyle = '#fff5f5';
    roundRect(ctx, x + 16, itemY, width - 32, itemHeight - 8, 6);
    ctx.fill();

    ctx.fillStyle = '#ef4444';
    ctx.fillRect(x + 16, itemY, 4, itemHeight - 8);

    ctx.fillStyle = '#b91c1c';
    ctx.font = 'bold 13px monospace';
    const selectorText = el.selector.length > 50 ? el.selector.substring(0, 47) + '...' : el.selector;
    ctx.fillText(selectorText, x + 28, itemY + 22);

    const dirBadgeW = el.overflowDirection === 'horizontal' ? 80 : el.overflowDirection === 'vertical' ? 70 : 100;
    ctx.fillStyle = '#f97316';
    roundRect(ctx, x + width - 32 - dirBadgeW, itemY + 12, dirBadgeW, 20, 4);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(el.overflowDirection.toUpperCase(), x + width - 32 - dirBadgeW / 2, itemY + 26);
    ctx.textAlign = 'left';

    ctx.fillStyle = '#64748b';
    ctx.font = '12px Arial';
    ctx.fillText(
      `实际: ${el.actualWidth}×${el.actualHeight}px  |  父容器: ${el.parentWidth}×${el.parentHeight}px`,
      x + 28,
      itemY + 44
    );

    ctx.fillStyle = '#dc2626';
    ctx.font = 'bold 12px Arial';
    const overflowText =
      `溢出: ${el.overflowX > 0 ? `X=${el.overflowX.toFixed(1)}px` : ''}` +
      `${el.overflowX > 0 && el.overflowY > 0 ? ', ' : ''}` +
      `${el.overflowY > 0 ? `Y=${el.overflowY.toFixed(1)}px` : ''}`;
    ctx.fillText(overflowText, x + 28, itemY + 62);

    if (el.suggestions.length > 0) {
      ctx.fillStyle = '#065f46';
      ctx.font = '11px Arial';
      const sugText = '💡 ' + el.suggestions[0];
      ctx.fillText(sugText.substring(0, 55), x + 28, itemY + 80);
    }
  }

  if (overflowElements.length > visibleCount) {
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(
      `... 还有 ${overflowElements.length - visibleCount} 个溢出元素`,
      x + width / 2,
      y + maxHeight - 16
    );
    ctx.textAlign = 'left';
  }
}

export async function exportAsPNG(
  _iframe: HTMLIFrameElement,
  overflowElements: OverflowElement[],
  viewportWidth: number,
  filename: string = 'layout-overflow-report.png'
): Promise<void> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas context not available');
  }

  const targetWidth = 1920;
  const targetHeight = 1080;
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, targetWidth, targetHeight);

  ctx.fillStyle = '#4a6fa5';
  ctx.fillRect(0, 0, targetWidth, 90);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 32px system-ui, Arial, sans-serif';
  ctx.fillText('📐 布局溢出诊断报告', 40, 58);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.font = '16px system-ui, Arial, sans-serif';
  ctx.fillText(`Layout Overflow Diagnostic Report`, 40, 82);

  const now = new Date();
  const dateStr = now.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.font = '14px system-ui, Arial, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`导出时间: ${dateStr}`, targetWidth - 40, 58);
  ctx.fillText(`视口宽度: ${viewportWidth}px`, targetWidth - 40, 82);
  ctx.textAlign = 'left';

  const statsY = 120;
  const statWidth = 200;
  const statHeight = 70;
  const stats = [
    { label: '视口宽度', value: `${viewportWidth}px`, color: '#4a6fa5' },
    { label: '溢出元素', value: `${overflowElements.length}`, color: overflowElements.length > 0 ? '#ef4444' : '#10b981' },
    { label: '横向溢出', value: `${overflowElements.filter((e) => e.overflowX > 0.5).length}`, color: '#f97316' },
    { label: '纵向溢出', value: `${overflowElements.filter((e) => e.overflowY > 0.5).length}`, color: '#8b5cf6' },
  ];
  stats.forEach((stat, i) => {
    const x = 40 + i * (statWidth + 20);
    ctx.fillStyle = '#ffffff';
    roundRect(ctx, x, statsY, statWidth, statHeight, 10);
    ctx.fill();
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = stat.color;
    ctx.font = 'bold 28px system-ui, Arial, sans-serif';
    ctx.fillText(stat.value, x + 20, statsY + 42);

    ctx.fillStyle = '#64748b';
    ctx.font = '13px system-ui, Arial, sans-serif';
    ctx.fillText(stat.label, x + 20, statsY + 60);
  });

  const previewWidth = 900;
  const previewHeight = (viewportWidth * 0.7 * 900) / viewportWidth;
  const previewX = 40;
  const previewY = 210;

  ctx.fillStyle = '#ffffff';
  roundRect(ctx, previewX - 10, previewY - 10, previewWidth + 20, previewHeight + 60, 12);
  ctx.fill();
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.stroke();

  drawPagePreview(
    ctx,
    overflowElements,
    viewportWidth,
    previewX,
    previewY,
    previewWidth,
    previewHeight
  );

  const legendY = previewY + previewHeight + 30;
  ctx.fillStyle = '#64748b';
  ctx.font = '12px Arial';
  ctx.fillText('图例:', previewX, legendY);

  ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
  ctx.fillRect(previewX + 50, legendY - 10, 20, 14);
  ctx.fillStyle = '#475569';
  ctx.fillText('溢出区域（红色半透明蒙版）', previewX + 80, legendY);

  ctx.fillStyle = 'rgba(239, 68, 68, 0.6)';
  ctx.fillRect(previewX + 260, legendY - 10, 20, 14);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 10px Arial';
  ctx.fillText('→ Xpx', previewX + 264, legendY + 2);
  ctx.fillStyle = '#475569';
  ctx.font = '12px Arial';
  ctx.fillText('溢出像素值标签', previewX + 300, legendY);

  const reportX = previewX + previewWidth + 40;
  const reportY = 210;
  const reportWidth = targetWidth - reportX - 40;
  const reportHeight = targetHeight - reportY - 40;

  drawReportList(ctx, overflowElements, reportX, reportY, reportWidth, reportHeight);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '12px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(
    `Layout Diagnostic Tool | Responsive Overflow Analyzer`,
    targetWidth / 2,
    targetHeight - 20
  );
  ctx.textAlign = 'left';

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        saveAs(blob, filename);
        resolve();
      } else {
        reject(new Error('Failed to generate PNG blob'));
      }
    }, 'image/png');
  });
}

export async function exportAsJSON(
  reportData: ExportReportData,
  filename: string = 'layout-overflow-report.json'
): Promise<void> {
  const json = JSON.stringify(reportData, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
  saveAs(blob, filename);
}
