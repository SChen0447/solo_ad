import { useRef, useEffect, useState, useCallback } from 'react';
import type { Template, PosterElement, TextElement, ImageElement, TextStyle } from '../types';
import './Editor.css';

interface EditorProps {
  template: Template;
  elements: PosterElement[];
  onUpdateElement: (elementId: string, updates: Partial<PosterElement>) => void;
  onImageUpload: (elementId: string, src: string) => void;
}

type DragMode = null | 'resize' | 'rotate' | 'move';

interface DragState {
  mode: DragMode;
  elementId: string;
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
  startRotation: number;
  startScale: number;
  startElX: number;
  startElY: number;
  centerX: number;
  centerY: number;
  handle?: string;
}

export default function Editor({ template, elements, onUpdateElement, onImageUpload }: EditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [rotationAngle, setRotationAngle] = useState(0);
  const [showTextToolbar, setShowTextToolbar] = useState(false);
  const [fadeKey, setFadeKey] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingImageId = useRef<string | null>(null);
  const loadedImages = useRef<Record<string, HTMLImageElement>>({});

  useEffect(() => {
    setFadeKey((k) => k + 1);
  }, [template.id]);

  useEffect(() => {
    const updateScale = () => {
      if (!containerRef.current) return;
      const container = containerRef.current;
      const padding = 60;
      const availW = container.clientWidth - padding * 2;
      const availH = container.clientHeight - padding * 2;
      const s = Math.min(availW / template.canvasWidth, availH / template.canvasHeight, 1);
      setScale(s > 0 ? s : 0.5);
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [template.canvasWidth, template.canvasHeight]);

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = template.canvasWidth;
    canvas.height = template.canvasHeight;

    drawBackground(ctx, template);
    drawButtonAndTagBackgrounds(ctx, elements);

    elements.forEach((el) => {
      if (el.type === 'image') {
        drawImageElement(ctx, el as ImageElement);
      } else {
        drawTextElement(ctx, el as TextElement);
      }
    });

    if (selectedId && !editingId) {
      const el = elements.find((e) => e.id === selectedId);
      if (el) {
        drawSelectionHandles(ctx, el);
      }
    }
  }, [template, elements, selectedId, editingId]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas, scale]);

  const drawBackground = (ctx: CanvasRenderingContext2D, t: Template) => {
    const bg = t.background;
    if (bg.type === 'solid') {
      ctx.fillStyle = bg.color1;
      ctx.fillRect(0, 0, t.canvasWidth, t.canvasHeight);
    } else {
      const angle = ((bg.angle || 0) * Math.PI) / 180;
      const x1 = t.canvasWidth / 2 - Math.cos(angle) * t.canvasWidth;
      const y1 = t.canvasHeight / 2 - Math.sin(angle) * t.canvasHeight;
      const x2 = t.canvasWidth / 2 + Math.cos(angle) * t.canvasWidth;
      const y2 = t.canvasHeight / 2 + Math.sin(angle) * t.canvasHeight;
      const g = ctx.createLinearGradient(x1, y1, x2, y2);
      g.addColorStop(0, bg.color1);
      g.addColorStop(1, bg.color2 || bg.color1);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, t.canvasWidth, t.canvasHeight);
    }

    ctx.save();
    ctx.globalAlpha = 0.03;
    ctx.fillStyle = '#000';
    ctx.shadowColor = 'rgba(0,0,0,0.1)';
    ctx.shadowBlur = 50;
    ctx.fillRect(20, 20, t.canvasWidth - 40, t.canvasHeight - 40);
    ctx.restore();
  };

  const drawButtonAndTagBackgrounds = (ctx: CanvasRenderingContext2D, els: PosterElement[]) => {
    els.forEach((el) => {
      if (el.type === 'text') {
        if (el.name === '按钮文字') {
          const gradient = ctx.createLinearGradient(el.x, el.y, el.x, el.y + el.height);
          gradient.addColorStop(0, '#667eea');
          gradient.addColorStop(1, '#764ba2');
          ctx.fillStyle = gradient;
          const r = 12;
          ctx.beginPath();
          ctx.moveTo(el.x + r, el.y);
          ctx.lineTo(el.x + el.width - r, el.y);
          ctx.quadraticCurveTo(el.x + el.width, el.y, el.x + el.width, el.y + r);
          ctx.lineTo(el.x + el.width, el.y + el.height - r);
          ctx.quadraticCurveTo(el.x + el.width, el.y + el.height, el.x + el.width - r, el.y + el.height);
          ctx.lineTo(el.x + r, el.y + el.height);
          ctx.quadraticCurveTo(el.x, el.y + el.height, el.x, el.y + el.height - r);
          ctx.lineTo(el.x, el.y + r);
          ctx.quadraticCurveTo(el.x, el.y, el.x + r, el.y);
          ctx.closePath();
          ctx.fill();
        } else if (el.name === '标签') {
          ctx.fillStyle = '#E74C3C';
          const r = 8;
          ctx.beginPath();
          ctx.moveTo(el.x + r, el.y);
          ctx.lineTo(el.x + el.width - r, el.y);
          ctx.quadraticCurveTo(el.x + el.width, el.y, el.x + el.width, el.y + r);
          ctx.lineTo(el.x + el.width, el.y + el.height - r);
          ctx.quadraticCurveTo(el.x + el.width, el.y + el.height, el.x + el.width - r, el.y + el.height);
          ctx.lineTo(el.x + r, el.y + el.height);
          ctx.quadraticCurveTo(el.x, el.y + el.height, el.x, el.y + el.height - r);
          ctx.lineTo(el.x, el.y + r);
          ctx.quadraticCurveTo(el.x, el.y, el.x + r, el.y);
          ctx.closePath();
          ctx.fill();
        }
      }
    });
  };

  const drawTextElement = (ctx: CanvasRenderingContext2D, el: TextElement) => {
    const { x, y, width, height, content, style } = el;
    const fontWeight = style.fontWeight === 'normal' ? '400' : style.fontWeight;
    ctx.font = `${fontWeight} ${style.fontSize}px ${style.fontFamily}`;
    ctx.textBaseline = 'middle';

    const lineHeight = style.fontSize * 1.2;
    const lines = wrapText(ctx, content, width);
    const totalHeight = lines.length * lineHeight;
    const startY = y + height / 2 - totalHeight / 2 + lineHeight / 2;

    if (style.stroke) {
      ctx.strokeStyle = style.strokeColor;
      ctx.lineWidth = style.strokeWidth;
      ctx.lineJoin = 'round';
    }

    lines.forEach((line, i) => {
      let tx = x;
      if (style.textAlign === 'center') {
        ctx.textAlign = 'center';
        tx = x + width / 2;
      } else if (style.textAlign === 'right') {
        ctx.textAlign = 'right';
        tx = x + width;
      } else {
        ctx.textAlign = 'left';
      }
      const ty = startY + i * lineHeight;
      if (style.stroke) ctx.strokeText(line, tx, ty);
      ctx.fillStyle = style.color;
      ctx.fillText(line, tx, ty);
    });
  };

  const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
    const chars = text.split('');
    const lines: string[] = [];
    let cur = '';
    for (let i = 0; i < chars.length; i++) {
      const test = cur + chars[i];
      if (ctx.measureText(test).width > maxWidth && cur !== '') {
        lines.push(cur);
        cur = chars[i];
      } else {
        cur = test;
      }
    }
    if (cur) lines.push(cur);
    return lines.length ? lines : [''];
  };

  const drawImageElement = (ctx: CanvasRenderingContext2D, el: ImageElement) => {
    if (!el.src) {
      ctx.fillStyle = 'rgba(200, 200, 200, 0.25)';
      ctx.fillRect(el.x, el.y, el.width, el.height);
      ctx.setLineDash([12, 6]);
      ctx.strokeStyle = 'rgba(150, 150, 150, 0.6)';
      ctx.lineWidth = 2;
      ctx.strokeRect(el.x, el.y, el.width, el.height);
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(120, 120, 120, 0.8)';
      ctx.font = '20px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('点击上传图片', el.x + el.width / 2, el.y + el.height / 2);
      return;
    }

    const cached = loadedImages.current[el.id];
    if (!cached || cached.src !== el.src) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        loadedImages.current[el.id] = img;
        renderCanvas();
      };
      img.src = el.src;
      loadedImages.current[el.id] = { ...img, width: el.width, height: el.height } as HTMLImageElement;
      return;
    }

    const img = cached;
    if (!img.complete || img.naturalWidth === 0) return;

    ctx.save();
    const cx = el.x + el.width / 2;
    const cy = el.y + el.height / 2;
    ctx.translate(cx, cy);
    ctx.rotate((el.rotation * Math.PI) / 180);
    ctx.scale(el.scale, el.scale);

    const imgRatio = img.naturalWidth / img.naturalHeight;
    const targetRatio = el.width / el.height;
    let dw = el.width;
    let dh = el.height;
    let ox = -el.width / 2;
    let oy = -el.height / 2;

    if (imgRatio > targetRatio) {
      dh = el.height;
      dw = dh * imgRatio;
      ox = -dw / 2;
    } else {
      dw = el.width;
      dh = dw / imgRatio;
      oy = -dh / 2;
    }

    ctx.beginPath();
    ctx.rect(-el.width / 2, -el.height / 2, el.width, el.height);
    ctx.clip();
    ctx.drawImage(img, ox, oy, dw, dh);
    ctx.restore();
  };

  const drawSelectionHandles = (ctx: CanvasRenderingContext2D, el: PosterElement) => {
    const handleSize = 10;
    const pad = 4;

    ctx.save();
    if (el.type === 'image' && el.rotation) {
      const cx = el.x + el.width / 2;
      const cy = el.y + el.height / 2;
      ctx.translate(cx, cy);
      ctx.rotate((el.rotation * Math.PI) / 180);
      ctx.translate(-cx, -cy);
    }

    ctx.strokeStyle = '#4A90D9';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(el.x - pad, el.y - pad, el.width + pad * 2, el.height + pad * 2);
    ctx.setLineDash([]);

    const points = [
      { x: el.x - pad, y: el.y - pad, cursor: 'nw' },
      { x: el.x + el.width / 2, y: el.y - pad, cursor: 'n' },
      { x: el.x + el.width + pad, y: el.y - pad, cursor: 'ne' },
      { x: el.x - pad, y: el.y + el.height / 2, cursor: 'w' },
      { x: el.x + el.width + pad, y: el.y + el.height / 2, cursor: 'e' },
      { x: el.x - pad, y: el.y + el.height + pad, cursor: 'sw' },
      { x: el.x + el.width / 2, y: el.y + el.height + pad, cursor: 's' },
      { x: el.x + el.width + pad, y: el.y + el.height + pad, cursor: 'se' },
    ];

    ctx.fillStyle = '#4A90D9';
    points.forEach((p) => {
      ctx.fillRect(p.x - handleSize / 2, p.y - handleSize / 2, handleSize, handleSize);
    });

    if (el.type === 'image') {
      const cy = el.y - pad - 30;
      const cx = el.x + el.width / 2;
      ctx.strokeStyle = '#4A90D9';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx, el.y - pad);
      ctx.lineTo(cx, cy);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, 8, 0, Math.PI * 2);
      ctx.fillStyle = '#4A90D9';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.restore();
  };

  const getCanvasCoords = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    return { x, y };
  };

  const hitTest = (x: number, y: number): { id: string; handle?: string } | null => {
    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i];
      const pad = 4;
      const hs = 10;
      const bx = el.x - pad - hs / 2;
      const by = el.y - pad - hs / 2;
      const bw = el.width + pad * 2 + hs;
      const bh = el.height + pad * 2 + hs;

      if (el.type === 'image' && el.rotation) {
        const cx = el.x + el.width / 2;
        const cy = el.y + el.height / 2;
        const angle = -(el.rotation * Math.PI) / 180;
        const dx = x - cx;
        const dy = y - cy;
        const nx = cx + dx * Math.cos(angle) - dy * Math.sin(angle);
        const ny = cy + dx * Math.sin(angle) + dy * Math.cos(angle);
        if (nx >= bx && nx <= bx + bw && ny >= by && ny <= by + bh) {
          return detectHandle(nx, ny, el, pad, hs);
        }
      } else {
        if (x >= bx && x <= bx + bw && y >= by && y <= by + bh) {
          return detectHandle(x, y, el, pad, hs);
        }
      }
    }
    return null;
  };

  const detectHandle = (x: number, y: number, el: PosterElement, pad: number, hs: number): { id: string; handle?: string } => {
    const left = el.x - pad;
    const top = el.y - pad;
    const right = el.x + el.width + pad;
    const bottom = el.y + el.height + pad;
    const midX = el.x + el.width / 2;
    const midY = el.y + el.height / 2;

    const handleCenters: { handle: string; cx: number; cy: number }[] = [
      { handle: 'nw', cx: left, cy: top },
      { handle: 'n', cx: midX, cy: top },
      { handle: 'ne', cx: right, cy: top },
      { handle: 'w', cx: left, cy: midY },
      { handle: 'e', cx: right, cy: midY },
      { handle: 'sw', cx: left, cy: bottom },
      { handle: 's', cx: midX, cy: bottom },
      { handle: 'se', cx: right, cy: bottom },
    ];

    for (const h of handleCenters) {
      if (Math.abs(x - h.cx) <= hs && Math.abs(y - h.cy) <= hs) {
        return { id: el.id, handle: h.handle };
      }
    }

    if (el.type === 'image') {
      const rotCx = midX;
      const rotCy = top - 30;
      if (Math.abs(x - rotCx) <= 12 && Math.abs(y - rotCy) <= 12) {
        return { id: el.id, handle: 'rotate' };
      }
    }

    return { id: el.id };
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (editingId) return;
    const { x, y } = getCanvasCoords(e);
    const hit = hitTest(x, y);

    if (!hit) {
      setSelectedId(null);
      setShowTextToolbar(false);
      return;
    }

    setSelectedId(hit.id);
    const el = elements.find((elem) => elem.id === hit.id);
    if (!el) return;

    if (el.type === 'text') {
      setShowTextToolbar(true);
    }

    if (hit.handle === 'rotate' && el.type === 'image') {
      const cx = el.x + el.width / 2;
      const cy = el.y + el.height / 2;
      setDragState({
        mode: 'rotate',
        elementId: el.id,
        startX: x,
        startY: y,
        startWidth: el.width,
        startHeight: el.height,
        startRotation: el.rotation,
        startScale: (el as ImageElement).scale,
        startElX: el.x,
        startElY: el.y,
        centerX: cx,
        centerY: cy,
      });
      e.preventDefault();
      return;
    }

    if (hit.handle && hit.handle !== 'rotate' && el.type === 'image') {
      setDragState({
        mode: 'resize',
        elementId: el.id,
        startX: x,
        startY: y,
        startWidth: el.width,
        startHeight: el.height,
        startRotation: (el as ImageElement).rotation,
        startScale: (el as ImageElement).scale,
        startElX: el.x,
        startElY: el.y,
        centerX: 0,
        centerY: 0,
        handle: hit.handle,
      });
      e.preventDefault();
      return;
    }

    if (el.type === 'image') {
      setDragState({
        mode: 'move',
        elementId: el.id,
        startX: x,
        startY: y,
        startWidth: el.width,
        startHeight: el.height,
        startRotation: (el as ImageElement).rotation,
        startScale: (el as ImageElement).scale,
        startElX: el.x,
        startElY: el.y,
        centerX: 0,
        centerY: 0,
      });
    }
    e.preventDefault();
  };

  const handleCanvasMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragState || !canvasRef.current) return;
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (canvas.width / rect.width);
      const y = (e.clientY - rect.top) * (canvas.height / rect.height);

      const el = elements.find((elem) => elem.id === dragState.elementId);
      if (!el || el.type !== 'image') return;

      if (dragState.mode === 'rotate') {
        const startAngle = Math.atan2(dragState.startY - dragState.centerY, dragState.startX - dragState.centerX);
        const currentAngle = Math.atan2(y - dragState.centerY, x - dragState.centerX);
        let angleDiff = ((currentAngle - startAngle) * 180) / Math.PI;
        let newRotation = dragState.startRotation + angleDiff;

        if (e.shiftKey) {
          newRotation = Math.round(newRotation / 15) * 15;
        }
        newRotation = ((newRotation % 360) + 360) % 360;
        setRotationAngle(newRotation);
        onUpdateElement(el.id, { rotation: newRotation } as Partial<PosterElement>);
      } else if (dragState.mode === 'resize') {
        const handle = dragState.handle || 'se';
        const dx = x - dragState.startX;
        const dy = y - dragState.startY;

        let newScale = dragState.startScale;

        if (handle === 'se' || handle === 'nw') {
          const scaleX = (dragState.startWidth + dx * (handle === 'nw' ? -1 : 1)) / dragState.startWidth;
          const scaleY = (dragState.startHeight + dy * (handle === 'nw' ? -1 : 1)) / dragState.startHeight;
          newScale = Math.max(0.3, Math.min(3, Math.min(scaleX, scaleY)));
        } else if (handle === 'ne' || handle === 'sw') {
          const scaleX = (dragState.startWidth + dx * (handle === 'sw' ? -1 : 1)) / dragState.startWidth;
          const scaleY = (dragState.startHeight + dy * (handle === 'ne' ? -1 : 1)) / dragState.startHeight;
          newScale = Math.max(0.3, Math.min(3, Math.min(scaleX, scaleY)));
        } else if (handle === 'n' || handle === 's') {
          const scaleY = (dragState.startHeight + dy * (handle === 'n' ? -1 : 1)) / dragState.startHeight;
          newScale = Math.max(0.3, Math.min(3, scaleY));
        } else if (handle === 'e' || handle === 'w') {
          const scaleX = (dragState.startWidth + dx * (handle === 'w' ? -1 : 1)) / dragState.startWidth;
          newScale = Math.max(0.3, Math.min(3, scaleX));
        }

        onUpdateElement(el.id, { scale: newScale } as Partial<PosterElement>);
      } else if (dragState.mode === 'move') {
        const dx = x - dragState.startX;
        const dy = y - dragState.startY;
        const minX = -el.width * 0.2;
        const maxX = template.canvasWidth - el.width * 0.8;
        const minY = -el.height * 0.2;
        const maxY = template.canvasHeight - el.height * 0.8;
        const newX = Math.max(minX, Math.min(maxX, dragState.startElX + dx));
        const newY = Math.max(minY, Math.min(maxY, dragState.startElY + dy));
        onUpdateElement(el.id, { x: newX, y: newY });
      }
    },
    [dragState, elements, template.canvasWidth, template.canvasHeight, onUpdateElement]
  );

  const handleCanvasMouseUp = useCallback(() => {
    setDragState(null);
    setTimeout(() => setRotationAngle(0), 800);
  }, []);

  useEffect(() => {
    if (dragState) {
      window.addEventListener('mousemove', handleCanvasMouseMove);
      window.addEventListener('mouseup', handleCanvasMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleCanvasMouseMove);
        window.removeEventListener('mouseup', handleCanvasMouseUp);
      };
    }
  }, [dragState, handleCanvasMouseMove, handleCanvasMouseUp]);

  const handleCanvasDoubleClick = (e: React.MouseEvent) => {
    const { x, y } = getCanvasCoords(e);
    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i];
      if (x >= el.x && x <= el.x + el.width && y >= el.y && y <= el.y + el.height) {
        if (el.type === 'text') {
          setEditingId(el.id);
          setEditValue((el as TextElement).content);
          setSelectedId(el.id);
          setShowTextToolbar(true);
        } else if (el.type === 'image' && !(el as ImageElement).src) {
          pendingImageId.current = el.id;
          fileInputRef.current?.click();
        }
        return;
      }
    }
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (editingId) return;
    const { x, y } = getCanvasCoords(e);
    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i];
      if (x >= el.x && x <= el.x + el.width && y >= el.y && y <= el.y + el.height) {
        if (el.type === 'image' && !(el as ImageElement).src) {
          pendingImageId.current = el.id;
          fileInputRef.current?.click();
          return;
        }
        setSelectedId(el.id);
        setShowTextToolbar(el.type === 'text');
        return;
      }
    }
    setSelectedId(null);
    setShowTextToolbar(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !pendingImageId.current) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      onImageUpload(pendingImageId.current!, src);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
    pendingImageId.current = null;
  };

  const handleEditBlur = () => {
    if (editingId) {
      onUpdateElement(editingId, { content: editValue } as Partial<PosterElement>);
      setEditingId(null);
    }
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleEditBlur();
    } else if (e.key === 'Escape') {
      setEditingId(null);
    }
  };

  const handleStyleChange = <K extends keyof TextStyle>(key: K, value: TextStyle[K]) => {
    if (!selectedId) return;
    const el = elements.find((e) => e.id === selectedId);
    if (!el || el.type !== 'text') return;
    onUpdateElement(selectedId, {
      style: { ...el.style, [key]: value },
    } as Partial<PosterElement>);
  };

  const selectedEl = selectedId ? elements.find((e) => e.id === selectedId) : null;
  const selectedText = selectedEl?.type === 'text' ? selectedEl : null;

  const editingEl = editingId ? (elements.find((e) => e.id === editingId) as TextElement | undefined) : null;

  return (
    <div className="editor-wrapper" ref={containerRef}>
      <div
        key={fadeKey}
        className="canvas-frame fade-in"
        style={{
          width: template.canvasWidth * scale,
          height: template.canvasHeight * scale,
          transform: dragState?.mode === 'rotate' ? `rotate(${rotationAngle}deg)` : undefined,
        }}
      >
        <canvas
          ref={canvasRef}
          className="poster-canvas"
          style={{
            width: template.canvasWidth * scale,
            height: template.canvasHeight * scale,
          }}
          onMouseDown={handleCanvasMouseDown}
          onClick={handleCanvasClick}
          onDoubleClick={handleCanvasDoubleClick}
        />

        {editingEl && (
          <div
            className="text-editor-overlay"
            style={{
              left: editingEl.x * scale,
              top: editingEl.y * scale,
              width: editingEl.width * scale,
              height: editingEl.height * scale,
            }}
          >
            <textarea
              className="text-editor-input"
              autoFocus
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleEditBlur}
              onKeyDown={handleEditKeyDown}
              style={{
                fontSize: editingEl.style.fontSize * scale,
                fontFamily: editingEl.style.fontFamily,
                fontWeight: editingEl.style.fontWeight,
                color: editingEl.style.color,
                textAlign: editingEl.style.textAlign,
                lineHeight: 1.2,
                WebkitTextStroke: editingEl.style.stroke
                  ? `${editingEl.style.strokeWidth}px ${editingEl.style.strokeColor}`
                  : undefined,
              }}
            />
          </div>
        )}

        {selectedEl?.type === 'image' && dragState?.mode === 'rotate' && (
          <div className="angle-indicator">{Math.round((selectedEl as ImageElement).rotation)}°</div>
        )}
      </div>

      <input type="file" ref={fileInputRef} accept="image/jpeg,image/png" onChange={handleFileChange} style={{ display: 'none' }} />

      {showTextToolbar && selectedText && (
        <div className="text-toolbar">
          <div className="toolbar-group">
            <label>字号</label>
            <input
              type="range"
              min="12"
              max="120"
              value={selectedText.style.fontSize}
              onChange={(e) => handleStyleChange('fontSize', Number(e.target.value))}
              className="slider-input"
            />
            <span className="value-label">{selectedText.style.fontSize}px</span>
          </div>
          <div className="toolbar-group">
            <label>颜色</label>
            <input
              type="color"
              value={selectedText.style.color}
              onChange={(e) => handleStyleChange('color', e.target.value)}
              className="color-input"
            />
          </div>
          <div className="toolbar-group">
            <label>对齐</label>
            <div className="align-buttons">
              {(['left', 'center', 'right'] as const).map((a) => (
                <button
                  key={a}
                  className={`align-btn ${selectedText.style.textAlign === a ? 'active' : ''}`}
                  onClick={() => handleStyleChange('textAlign', a)}
                >
                  {a === 'left' ? '⟸' : a === 'center' ? '≡' : '⟹'}
                </button>
              ))}
            </div>
          </div>
          <div className="toolbar-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={selectedText.style.stroke}
                onChange={(e) => handleStyleChange('stroke', e.target.checked)}
              />
              描边
            </label>
            {selectedText.style.stroke && (
              <input
                type="color"
                value={selectedText.style.strokeColor}
                onChange={(e) => handleStyleChange('strokeColor', e.target.value)}
                className="color-input small"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
