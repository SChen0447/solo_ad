import { eventBus } from '../eventBus';
import type { SectionData, ContourPolygon } from '../cutModule/main';
import type { Annotation } from '../annotationModule/main';
import { saveAs } from 'file-saver';

let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let currentSectionData: SectionData | null = null;
let currentAnnotations: Annotation[] = [];
let hoveredAnnotationId: string | null = null;
let scale = 1;
let offsetX = 0;
let offsetY = 0;
let padding = 30;

function init() {
  canvas = document.getElementById('section-canvas') as HTMLCanvasElement;
  const container = document.getElementById('section-container') as HTMLElement;

  const resizeCanvas = () => {
    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    ctx = canvas.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    redraw();
  };

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  eventBus.on('sectionDataUpdated', (data: SectionData) => {
    currentSectionData = data;
    computeTransform();
    redraw();
  });

  eventBus.on('annotationsUpdated', (annotations: Annotation[]) => {
    currentAnnotations = annotations;
    redraw();
  });

  eventBus.on('annotationHover', (id: string | null) => {
    hoveredAnnotationId = id;
    redraw();
  });

  eventBus.on('exportRequested', () => {
    exportPNG();
  });

  const exportBtn = document.getElementById('export-btn') as HTMLButtonElement;
  exportBtn.addEventListener('click', () => {
    eventBus.emit('exportRequested');
  });
}

function computeTransform() {
  if (!currentSectionData) return;

  const container = document.getElementById('section-container') as HTMLElement;
  const rect = container.getBoundingClientRect();
  const viewW = rect.width;
  const viewH = rect.height;

  const { bounds } = currentSectionData;
  const dataW = bounds.maxX - bounds.minX;
  const dataH = bounds.maxY - bounds.minY;

  scale = Math.min(
    (viewW - padding * 2) / dataW,
    (viewH - padding * 2) / dataH
  );
  scale = Math.max(scale, 0.1);

  const drawW = dataW * scale;
  const drawH = dataH * scale;
  offsetX = (viewW - drawW) / 2 - bounds.minX * scale;
  offsetY = (viewH - drawH) / 2 - bounds.minY * scale;
}

function worldToScreen(x: number, y: number): { x: number; y: number } {
  return {
    x: x * scale + offsetX,
    y: y * scale + offsetY
  };
}

function screenToWorld(x: number, y: number): { x: number; y: number } {
  return {
    x: (x - offsetX) / scale,
    y: (y - offsetY) / scale
  };
}

function redraw() {
  if (!ctx) return;

  const container = document.getElementById('section-container') as HTMLElement;
  const rect = container.getBoundingClientRect();
  ctx.clearRect(0, 0, rect.width, rect.height);

  ctx.fillStyle = '#fafafa';
  ctx.fillRect(0, 0, rect.width, rect.height);

  if (currentSectionData) {
    drawSection();
  }

  drawAnnotations();
}

function drawSection() {
  if (!currentSectionData || !ctx) return;

  const wallPolys = currentSectionData.polygons.filter(p => p.type === 'wall' && !p.isOpening);
  const openingPolys = currentSectionData.polygons.filter(p => p.isOpening);
  const stairPolys = currentSectionData.polygons.filter(p => p.type === 'stair');

  ctx.save();
  ctx.fillStyle = '#ecf0f1';
  ctx.strokeStyle = '#2c3e50';
  ctx.lineWidth = 2;

  wallPolys.forEach(poly => {
    drawPolygon(poly, true, true);
  });

  ctx.fillStyle = '#ffffff';
  openingPolys.forEach(poly => {
    drawPolygon(poly, true, true);
  });

  ctx.fillStyle = '#d5dbdb';
  ctx.strokeStyle = '#7f8c8d';
  ctx.lineWidth = 1.5;
  stairPolys.forEach(poly => {
    drawPolygon(poly, true, true);
  });

  ctx.fillStyle = '#2c3e50';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const heightText = `高度: ${currentSectionData.cutHeight.toFixed(1)}`;
  ctx.fillText(heightText, rectCenter().x, 15);

  ctx.restore();
}

function drawPolygon(poly: ContourPolygon, fill: boolean, stroke: boolean) {
  if (!ctx || poly.points.length < 3) return;
  ctx.beginPath();
  const first = worldToScreen(poly.points[0].x, poly.points[0].y);
  ctx.moveTo(first.x, first.y);
  for (let i = 1; i < poly.points.length; i++) {
    const pt = worldToScreen(poly.points[i].x, poly.points[i].y);
    ctx.lineTo(pt.x, pt.y);
  }
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

function rectCenter(): { x: number; y: number } {
  const container = document.getElementById('section-container') as HTMLElement;
  const rect = container.getBoundingClientRect();
  return { x: rect.width / 2, y: rect.height / 2 };
}

function drawAnnotations() {
  if (!ctx) return;

  ctx.save();
  currentAnnotations.forEach(anno => {
    const screen = worldToScreen(anno.x, anno.y);
    const isHovered = hoveredAnnotationId === anno.id;

    const labelX = screen.x + 15;
    const labelY = screen.y - 10;

    ctx.beginPath();
    ctx.moveTo(screen.x, screen.y);
    ctx.lineTo(labelX, labelY);
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(screen.x, screen.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#e74c3c';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = isHovered ? 'bold 15.4px sans-serif' : '14px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    const textMetrics = ctx.measureText(anno.text);
    const textW = textMetrics.width + 12;
    const textH = 22;

    if (isHovered) {
      ctx.fillStyle = '#fef9e7';
      ctx.fillRect(labelX - 4, labelY - textH / 2, textW, textH);
    }

    ctx.fillStyle = '#2c3e50';
    ctx.fillText(anno.text, labelX + 2, labelY);
  });
  ctx.restore();
}

async function exportPNG() {
  const exportWidth = 1920;
  const exportHeight = 1080;

  const offscreen = document.createElement('canvas');
  offscreen.width = exportWidth;
  offscreen.height = exportHeight;
  const offCtx = offscreen.getContext('2d')!;

  offCtx.fillStyle = '#ffffff';
  offCtx.fillRect(0, 0, exportWidth, exportHeight);

  if (currentSectionData) {
    const prevCtx = ctx;
    const prevCanvas = canvas;

    const { bounds } = currentSectionData;
    const dataW = bounds.maxX - bounds.minX;
    const dataH = bounds.maxY - bounds.minY;
    const expPadding = 80;

    const expScale = Math.min(
      (exportWidth - expPadding * 2) / dataW,
      (exportHeight - expPadding * 2 - 60) / dataH
    );
    const drawW = dataW * expScale;
    const drawH = dataH * expScale;
    const expOffsetX = (exportWidth - drawW) / 2 - bounds.minX * expScale;
    const expOffsetY = (exportHeight - drawH - 60) / 2 - bounds.minY * expScale;

    const oldScale = scale;
    const oldOffsetX = offsetX;
    const oldOffsetY = offsetY;
    scale = expScale;
    offsetX = expOffsetX;
    offsetY = expOffsetY;

    ctx = offCtx;
    canvas = offscreen;

    drawSection();
    drawAnnotations();

    offCtx.fillStyle = '#2c3e50';
    offCtx.font = 'bold 24px sans-serif';
    offCtx.textAlign = 'center';
    offCtx.fillText(`建筑剖面图 - 切割高度 ${currentSectionData.cutHeight.toFixed(1)}`, exportWidth / 2, 40);

    offCtx.font = '14px sans-serif';
    offCtx.fillStyle = '#7f8c8d';
    offCtx.fillText(`标注数量: ${currentAnnotations.length}`, exportWidth / 2, exportHeight - 20);

    ctx = prevCtx;
    canvas = prevCanvas;
    scale = oldScale;
    offsetX = oldOffsetX;
    offsetY = oldOffsetY;
  }

  offscreen.toBlob((blob) => {
    if (blob) {
      saveAs(blob, `section_${Date.now()}.png`);
      fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timestamp: Date.now(),
          annotations: currentAnnotations.length,
          cutHeight: currentSectionData?.cutHeight
        })
      }).catch(() => {});
    }
  }, 'image/png');
}

function getCanvasClickPos(event: MouseEvent): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
}

function getAnnotationAt(x: number, y: number): Annotation | null {
  for (let i = currentAnnotations.length - 1; i >= 0; i--) {
    const anno = currentAnnotations[i];
    const screen = worldToScreen(anno.x, anno.y);
    const dx = x - screen.x;
    const dy = y - screen.y;
    if (Math.sqrt(dx * dx + dy * dy) <= 10) {
      return anno;
    }
  }
  return null;
}

init();

export { getCanvasClickPos, screenToWorld, getAnnotationAt, worldToScreen };
