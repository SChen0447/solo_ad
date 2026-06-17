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

export async function exportAsPNG(
  iframe: HTMLIFrameElement,
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

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, targetWidth, targetHeight);

  try {
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (iframeDoc) {
      const htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
        body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
        .header { background: #4a6fa5; color: white; padding: 20px; font-size: 24px; font-weight: bold; }
        .info { padding: 15px 20px; background: #f5f5f5; border-bottom: 2px solid #ddd; font-size: 14px; color: #333; }
        .overflow-list { padding: 20px; }
        .overflow-item { background: #fff5f5; border-left: 4px solid #ef4444; padding: 15px; margin-bottom: 12px; border-radius: 4px; }
        .selector { font-family: monospace; font-size: 14px; color: #b91c1c; font-weight: bold; margin-bottom: 8px; }
        .detail { font-size: 12px; color: #666; margin: 4px 0; }
        .suggestions { margin-top: 10px; padding-left: 20px; }
        .suggestions li { font-size: 12px; color: #065f46; margin: 4px 0; }
        .badge { display: inline-block; background: #ef4444; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; margin-right: 8px; }
      </style></head><body>
        <div class="header">布局溢出诊断报告 - ${viewportWidth}px</div>
        <div class="info">
          <strong>视口宽度:</strong> ${viewportWidth}px &nbsp;|&nbsp;
          <strong>溢出元素数量:</strong> ${overflowElements.length} &nbsp;|&nbsp;
          <strong>导出时间:</strong> ${new Date().toLocaleString('zh-CN')}
        </div>
        <div class="overflow-list">
          ${overflowElements.length === 0 
            ? '<p style="color: #16a34a; padding: 20px; text-align: center;">✅ 未检测到溢出问题</p>'
            : overflowElements.map((el) => `
              <div class="overflow-item">
                <span class="badge">${el.overflowDirection}</span>
                <div class="selector">${el.selector}</div>
                <div class="detail">实际尺寸: ${el.actualWidth}px × ${el.actualHeight}px</div>
                <div class="detail">父容器尺寸: ${el.parentWidth}px × ${el.parentHeight}px</div>
                <div class="detail">溢出: X=${el.overflowX}px, Y=${el.overflowY}px</div>
                <ul class="suggestions">
                  ${el.suggestions.map((s) => `<li>${s}</li>`).join('')}
                </ul>
              </div>
            `).join('')}
        </div>
      </body></html>`;

      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, targetWidth, targetHeight);
      
      ctx.fillStyle = '#4a6fa5';
      ctx.fillRect(0, 0, targetWidth, 80);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 32px Arial';
      ctx.fillText(`布局溢出诊断报告 - ${viewportWidth}px 视口`, 40, 52);
      
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(0, 80, targetWidth, 60);
      ctx.fillStyle = '#334155';
      ctx.font = '16px Arial';
      ctx.fillText(
        `视口宽度: ${viewportWidth}px  |  溢出元素: ${overflowElements.length} 个  |  导出时间: ${new Date().toLocaleString('zh-CN')}`,
        40,
        117
      );

      let y = 170;
      if (overflowElements.length === 0) {
        ctx.fillStyle = '#16a34a';
        ctx.font = 'bold 24px Arial';
        ctx.fillText('✅ 未检测到溢出问题', targetWidth / 2 - 140, targetHeight / 2);
      } else {
        overflowElements.slice(0, 8).forEach((el, idx) => {
          const itemHeight = 110;
          const itemTop = y + idx * itemHeight;
          
          if (itemTop + itemHeight > targetHeight - 40) return;

          ctx.fillStyle = '#fff5f5';
          ctx.fillRect(40, itemTop, targetWidth - 80, itemHeight - 10);
          
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(40, itemTop, 6, itemHeight - 10);
          
          ctx.fillStyle = '#b91c1c';
          ctx.font = 'bold 16px monospace';
          ctx.fillText(el.selector, 60, itemTop + 28);
          
          ctx.fillStyle = '#f97316';
          ctx.font = 'bold 12px Arial';
          ctx.fillText(el.overflowDirection.toUpperCase(), 60, itemTop + 48);
          
          ctx.fillStyle = '#64748b';
          ctx.font = '13px Arial';
          ctx.fillText(
            `实际: ${el.actualWidth}×${el.actualHeight}px | 父容器: ${el.parentWidth}×${el.parentHeight}px | 溢出: X=${el.overflowX}px, Y=${el.overflowY}px`,
            60,
            itemTop + 70
          );

          if (el.suggestions.length > 0) {
            ctx.fillStyle = '#065f46';
            ctx.font = '12px Arial';
            const suggestionText = `建议: ${el.suggestions[0]}`;
            ctx.fillText(suggestionText.substring(0, 120), 60, itemTop + 92);
          }
        });
      }

      const blob = canvas.toBlob((b) => {
        if (b) {
          saveAs(b, filename);
        }
      }, 'image/png');
    }
  } catch (error) {
    console.error('PNG export error:', error);
    throw error;
  }
}

export async function exportAsJSON(
  reportData: ExportReportData,
  filename: string = 'layout-overflow-report.json'
): Promise<void> {
  const json = JSON.stringify(reportData, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
  saveAs(blob, filename);
}
