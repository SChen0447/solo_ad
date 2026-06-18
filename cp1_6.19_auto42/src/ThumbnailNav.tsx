import { useEffect, useRef } from 'react';
import { useCanvasStore } from './store';

const THUMB_SIZE = 200;

export function ThumbnailNav() {
  const thumbRef = useRef<HTMLCanvasElement>(null);
  const { viewport, elements, setViewport } = useCanvasStore();

  useEffect(() => {
    const canvas = thumbRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = THUMB_SIZE * dpr;
    canvas.height = THUMB_SIZE * dpr;
    canvas.style.width = THUMB_SIZE + 'px';
    canvas.style.height = THUMB_SIZE + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, THUMB_SIZE, THUMB_SIZE);

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    elements.forEach((el) => {
      if (el.type === 'stroke') {
        el.points.forEach((p) => {
          if (p.x < minX) minX = p.x;
          if (p.x > maxX) maxX = p.x;
          if (p.y < minY) minY = p.y;
          if (p.y > maxY) maxY = p.y;
        });
      } else if (el.type === 'sticky' || el.type === 'image') {
        if (el.x < minX) minX = el.x;
        if (el.x + el.width > maxX) maxX = el.x + el.width;
        if (el.y < minY) minY = el.y;
        if (el.y + el.height > maxY) maxY = el.y + el.height;
      }
    });

    if (elements.length === 0 || !isFinite(minX)) {
      minX = -500;
      minY = -500;
      maxX = 500;
      maxY = 500;
    }

    const pad = 100;
    minX -= pad;
    minY -= pad;
    maxX += pad;
    maxY += pad;

    const worldW = maxX - minX;
    const worldH = maxY - minY;
    const scale = Math.min(THUMB_SIZE / worldW, THUMB_SIZE / worldH);
    const offsetX = (THUMB_SIZE - worldW * scale) / 2;
    const offsetY = (THUMB_SIZE - worldH * scale) / 2;

    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);
    ctx.translate(-minX, -minY);

    elements.forEach((el) => {
      if (el.type === 'stroke') {
        ctx.strokeStyle = el.color;
        ctx.lineWidth = Math.max(0.5, el.thickness * 0.3);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        if (el.points.length >= 2) {
          ctx.beginPath();
          ctx.moveTo(el.points[0].x, el.points[0].y);
          for (let i = 1; i < el.points.length; i++) {
            ctx.lineTo(el.points[i].x, el.points[i].y);
          }
          ctx.stroke();
        }
      } else if (el.type === 'sticky') {
        ctx.fillStyle = '#fff9c4';
        ctx.fillRect(el.x, el.y, el.width, el.height);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(el.x, el.y, el.width, el.height);
      } else if (el.type === 'image') {
        ctx.fillStyle = '#cccccc';
        ctx.fillRect(el.x, el.y, el.width, el.height);
      }
    });

    ctx.restore();

    const vw = window.innerWidth;
    const vh = window.innerHeight - 60;

    ctx.strokeStyle = '#007bff';
    ctx.lineWidth = 2;
    ctx.strokeRect(
      Math.max(0, offsetX - viewport.offsetX * scale),
      Math.max(0, offsetY - viewport.offsetY * scale),
      vw * scale,
      vh * scale
    );
  }, [elements, viewport]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = thumbRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const tx = e.clientX - rect.left;
    const ty = e.clientY - rect.top;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    elements.forEach((el) => {
      if (el.type === 'stroke') {
        el.points.forEach((p) => {
          if (p.x < minX) minX = p.x;
          if (p.x > maxX) maxX = p.x;
          if (p.y < minY) minY = p.y;
          if (p.y > maxY) maxY = p.y;
        });
      } else if (el.type === 'sticky' || el.type === 'image') {
        if (el.x < minX) minX = el.x;
        if (el.x + el.width > maxX) maxX = el.x + el.width;
        if (el.y < minY) minY = el.y;
        if (el.y + el.height > maxY) maxY = el.y + el.height;
      }
    });

    if (!isFinite(minX)) {
      minX = -500; minY = -500; maxX = 500; maxY = 500;
    }
    const pad = 100;
    minX -= pad; minY -= pad; maxX += pad; maxY += pad;

    const worldW = maxX - minX;
    const worldH = maxY - minY;
    const scale = Math.min(THUMB_SIZE / worldW, THUMB_SIZE / worldH);
    const offsetX = (THUMB_SIZE - worldW * scale) / 2;
    const offsetY = (THUMB_SIZE - worldH * scale) / 2;

    const worldCenterX = minX + (tx - offsetX) / scale;
    const worldCenterY = minY + (ty - offsetY) / scale;

    const vw = window.innerWidth;
    const vh = window.innerHeight - 60;

    setViewport({
      offsetX: vw / 2 - worldCenterX * viewport.scale,
      offsetY: vh / 2 - worldCenterY * viewport.scale,
    });
  };

  return (
    <div className="thumbnail-nav">
      <canvas
        ref={thumbRef}
        onClick={handleClick}
        style={{ cursor: 'pointer' }}
      />
    </div>
  );
}
