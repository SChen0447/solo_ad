import type { Annotation, ImageData } from '../types';

export function generateReportHtml(
  imageA: ImageData,
  imageB: ImageData,
  annotations: Annotation[]
): string {
  const annotationsA = annotations.filter(a => a.target === 'A');
  const annotationsB = annotations.filter(a => a.target === 'B');

  const renderAnnotations = (list: Annotation[], target: string) => {
    if (list.length === 0) return '<p style="color:#888;">暂无注释</p>';
    return list.map((a, idx) => `
      <div style="padding:12px;margin-bottom:10px;background:#f8f9fa;border-left:4px solid #3a86ff;border-radius:4px;">
        <strong style="color:#1d3557;">注释 ${idx + 1} (${target})</strong>
        <p style="margin:8px 0 4px;color:#333;line-height:1.5;">${a.text || '（空）'}</p>
        <small style="color:#666;">坐标: (${Math.round(a.x)}, ${Math.round(a.y)})</small>
      </div>
    `).join('');
  };

  const renderAnnotationMarkers = (list: Annotation[]) => {
    return list.map(a => `
      <div style="position:absolute;left:${a.x}px;top:${a.y}px;transform:translate(-50%,-50%);">
        <div style="width:20px;height:20px;background:#3a86ff;border:2px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>
      </div>
    `).join('');
  };

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>布局方案对比报告</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #fafafa;
      margin: 0;
      padding: 40px 20px;
      color: #1d3557;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { text-align: center; color: #1d3557; margin-bottom: 40px; font-size: 28px; }
    .section { background: #fff; padding: 24px; border-radius: 8px; margin-bottom: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
    .section-title { font-size: 20px; color: #1d3557; margin-bottom: 16px; padding-bottom: 10px; border-bottom: 2px solid #a8dadc; }
    .compare-row { display: flex; gap: 20px; }
    .compare-col { flex: 1; }
    .compare-col h3 { margin-bottom: 12px; color: #457b9d; }
    .thumb-wrap { position: relative; display: inline-block; border: 1px solid #e0e0e0; border-radius: 4px; overflow: hidden; }
    .thumb-wrap img { display: block; width: 400px; height: auto; }
    .annotated-wrap { position: relative; display: inline-block; border: 1px solid #e0e0e0; border-radius: 4px; overflow: hidden; }
    .annotated-wrap img { display: block; max-width: 100%; height: auto; }
    .orig-link { display: inline-block; margin-top: 10px; color: #3a86ff; text-decoration: none; font-weight: 500; }
    .orig-link:hover { text-decoration: underline; }
    .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #888; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>布局方案对比报告</h1>

    <div class="section">
      <div class="section-title">缩略图对比</div>
      <div class="compare-row">
        <div class="compare-col">
          <h3>${imageA.title}</h3>
          <div class="thumb-wrap">
            <img src="${imageA.url}" alt="${imageA.title}">
          </div>
          <div style="margin-top:8px;font-size:14px;color:#666;">
            尺寸: ${imageA.width} × ${imageA.height}px
          </div>
          <a class="orig-link" href="${imageA.url}" target="_blank">查看原图 →</a>
        </div>
        <div class="compare-col">
          <h3>${imageB.title}</h3>
          <div class="thumb-wrap">
            <img src="${imageB.url}" alt="${imageB.title}">
          </div>
          <div style="margin-top:8px;font-size:14px;color:#666;">
            尺寸: ${imageB.width} × ${imageB.height}px
          </div>
          <a class="orig-link" href="${imageB.url}" target="_blank">查看原图 →</a>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">方案A - 带注释标注</div>
      <div class="annotated-wrap">
        <img src="${imageA.url}" alt="${imageA.title}">
        ${renderAnnotationMarkers(annotationsA)}
      </div>
    </div>

    <div class="section">
      <div class="section-title">方案B - 带注释标注</div>
      <div class="annotated-wrap">
        <img src="${imageB.url}" alt="${imageB.title}">
        ${renderAnnotationMarkers(annotationsB)}
      </div>
    </div>

    <div class="section">
      <div class="section-title">注释详情列表</div>
      ${renderAnnotations(annotationsA, '方案A')}
      ${renderAnnotations(annotationsB, '方案B')}
    </div>

    <div class="footer">
      报告生成时间: ${new Date().toLocaleString('zh-CN')}
    </div>
  </div>
</body>
</html>`;
}

export function downloadReport(
  imageA: ImageData,
  imageB: ImageData,
  annotations: Annotation[],
  filename: string = 'layout-compare-report.html'
): void {
  const html = generateReportHtml(imageA, imageB, annotations);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
