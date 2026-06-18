import { useEffect, useRef, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useStore } from '../store';
import type { Annotation, AnnotationType } from '../types';

interface Props {
  imageUrl: string;
  annotations: Annotation[];
  designId: string;
}

type Tool = 'select' | 'circle' | 'arrow';

interface AnimatingAnnotation {
  id: string;
  startTime: number;
  type: 'fadein' | 'delete';
}

export default function AnnotationCanvas({ imageUrl, annotations, designId }: Props) {
  const { selectedAnnotationId, selectAnnotation, createAnnotation, updateAnnotation, removeAnnotation } = useStore();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [imageLoaded, setImageLoaded] = useState(false);
  const [scale, setScale] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);

  const isDrawingRef = useRef(false);
  const isDraggingRef = useRef(false);
  const currentToolRef = useRef<Tool>('select');
  const drawStartRef = useRef<{ x: number; y: number } | null>(null);
  const drawEndRef = useRef<{ x: number; y: number } | null>(null);
  const dragOffsetRef = useRef<{ dx: number; dy: number } | null>(null);
  const animatingRef = useRef<Map<string, AnimatingAnnotation>>(new Map());
  const rafIdRef = useRef<number | null>(null);
  const ctrlPressedRef = useRef(false);

  const addFadeIn = useCallback((id: string) => {
    animatingRef.current.set(id, { id, startTime: performance.now(), type: 'fadein' });
  }, []);

  const addDeleteAnim = useCallback((id: string) => {
    animatingRef.current.set(id, { id, startTime: performance.now(), type: 'delete' });
  }, []);

  const clampToImageBounds = useCallback((x: number, y: number) => {
    if (!imageRef.current) return { x, y };
    const img = imageRef.current;
    const maxX = img.width * scale;
    const maxY = img.height * scale;
    return {
      x: Math.max(0, Math.min(x, maxX)),
      y: Math.max(0, Math.min(y, maxY))
    };
  }, [scale]);

  const screenToImage = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left - offsetX) / scale;
    const y = (clientY - rect.top - offsetY) / scale;
    return clampToImageBounds(x, y);
  }, [scale, offsetX, offsetY, clampToImageBounds]);

  const imageToScreen = useCallback((imgX: number, imgY: number) => {
    return {
      x: imgX * scale + offsetX,
      y: imgY * scale + offsetY
    };
  }, [scale, offsetX, offsetY]);

  const findAnnotationAtPoint = useCallback((imgX: number, imgY: number): Annotation | null => {
    for (let i = annotations.length - 1; i >= 0; i--) {
      const a = annotations[i];
      if (a.type === 'circle') {
        const r = a.radius || 20;
        const dist = Math.sqrt((imgX - a.x) ** 2 + (imgY - a.y) ** 2);
        if (dist <= r) return a;
      } else if (a.type === 'arrow') {
        const endX = a.endX || a.x;
        const endY = a.endY || a.y;
        const distToStart = Math.sqrt((imgX - a.x) ** 2 + (imgY - a.y) ** 2);
        const distToEnd = Math.sqrt((imgX - endX) ** 2 + (imgY - endY) ** 2);
        const lineLen = Math.sqrt((endX - a.x) ** 2 + (endY - a.y) ** 2);
        if (lineLen > 0) {
          const t = Math.max(0, Math.min(1, ((imgX - a.x) * (endX - a.x) + (imgY - a.y) * (endY - a.y)) / (lineLen * lineLen)));
          const projX = a.x + t * (endX - a.x);
          const projY = a.y + t * (endY - a.y);
          const distToLine = Math.sqrt((imgX - projX) ** 2 + (imgY - projY) ** 2);
          if (distToLine <= 8 || distToStart <= 10 || distToEnd <= 12) return a;
        }
      }
    }
    return null;
  }, [annotations]);

  const handleImageLoad = useCallback(() => {
    if (!imageRef.current || !canvasRef.current || !overlayCanvasRef.current || !containerRef.current) return;
    const img = imageRef.current;
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const overlay = overlayCanvasRef.current;

    const maxWidth = container.clientWidth;
    const maxHeight = container.clientHeight;
    let newScale = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
    if (newScale > 1) newScale = 1;

    const displayWidth = img.width * newScale;
    const displayHeight = img.height * newScale;
    const newOffsetX = (maxWidth - displayWidth) / 2;
    const newOffsetY = (maxHeight - displayHeight) / 2;

    canvas.width = maxWidth;
    canvas.height = maxHeight;
    overlay.width = maxWidth;
    overlay.height = maxHeight;

    setScale(newScale);
    setOffsetX(newOffsetX);
    setOffsetY(newOffsetY);
    setImageLoaded(true);
  }, []);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageRef.current = img;
      handleImageLoad();
    };
    img.src = imageUrl;
    return () => {
      imageRef.current = null;
    };
  }, [imageUrl, handleImageLoad]);

  useEffect(() => {
    const handleResize = () => {
      if (imageRef.current) {
        handleImageLoad();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleImageLoad]);

  const renderStaticLayer = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageRef.current) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#1A202C';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const img = imageRef.current;
    ctx.save();
    ctx.drawImage(img, offsetX, offsetY, img.width * scale, img.height * scale);
    ctx.restore();
  }, [scale, offsetX, offsetY]);

  const renderOverlayLayer = useCallback((time?: number) => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const now = time || performance.now();
    const animating = animatingRef.current;
    const toRemove: string[] = [];

    animating.forEach((anim) => {
      const elapsed = now - anim.startTime;
      if (anim.type === 'fadein' && elapsed >= 300) {
        toRemove.push(anim.id);
      }
      if (anim.type === 'delete' && elapsed >= 200) {
        toRemove.push(anim.id);
      }
    });
    toRemove.forEach((id) => animating.delete(id));

    annotations.forEach((a) => {
      let opacity = 1;
      let scaleAnim = 1;
      const anim = animating.get(a.id);
      if (anim) {
        const elapsed = now - anim.startTime;
        if (anim.type === 'fadein') {
          opacity = Math.min(1, elapsed / 300);
          scaleAnim = 0.8 + 0.2 * (elapsed / 300);
        } else if (anim.type === 'delete') {
          opacity = Math.max(0, 1 - elapsed / 200);
          scaleAnim = Math.max(0, 1 - elapsed / 200);
        }
      }

      ctx.save();
      ctx.globalAlpha = opacity;
      const isSelected = a.id === selectedAnnotationId;
      const screenPos = imageToScreen(a.x, a.y);

      if (a.type === 'circle') {
        const r = (a.radius || 20) * scale * scaleAnim;
        ctx.beginPath();
        ctx.arc(screenPos.x, screenPos.y, r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(66, 153, 225, 0.15)';
        ctx.fill();
        ctx.lineWidth = isSelected ? 3 : 2;
        ctx.strokeStyle = isSelected ? '#D69E2E' : '#4299E1';
        ctx.stroke();

        if (a.comments.length > 0) {
          const bubbleX = screenPos.x + r - 8;
          const bubbleY = screenPos.y - r + 4;
          ctx.beginPath();
          ctx.arc(bubbleX, bubbleY, 12, 0, Math.PI * 2);
          ctx.fillStyle = '#E53E3E';
          ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 10px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(a.comments.length), bubbleX, bubbleY);
        }
      } else if (a.type === 'arrow') {
        const endScreen = imageToScreen(a.endX || a.x, a.endY || a.y);
        const dx = endScreen.x - screenPos.x;
        const dy = endScreen.y - screenPos.y;
        const angle = Math.atan2(dy, dx);
        const len = Math.sqrt(dx * dx + dy * dy);
        ctx.beginPath();
        ctx.moveTo(screenPos.x, screenPos.y);
        ctx.lineTo(endScreen.x, endScreen.y);
        ctx.lineWidth = isSelected ? 3 : 2;
        ctx.strokeStyle = isSelected ? '#D69E2E' : '#4299E1';
        ctx.lineCap = 'round';
        ctx.stroke();

        const arrowLen = 12 * scaleAnim;
        ctx.beginPath();
        ctx.moveTo(endScreen.x, endScreen.y);
        ctx.lineTo(
          endScreen.x - arrowLen * Math.cos(angle - Math.PI / 6),
          endScreen.y - arrowLen * Math.sin(angle - Math.PI / 6)
        );
        ctx.moveTo(endScreen.x, endScreen.y);
        ctx.lineTo(
          endScreen.x - arrowLen * Math.cos(angle + Math.PI / 6),
          endScreen.y - arrowLen * Math.sin(angle + Math.PI / 6)
        );
        ctx.lineWidth = isSelected ? 3 : 2;
        ctx.strokeStyle = isSelected ? '#D69E2E' : '#4299E1';
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(screenPos.x, screenPos.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = isSelected ? '#D69E2E' : '#4299E1';
        ctx.fill();

        if (a.comments.length > 0) {
          const bubbleX = endScreen.x + 8;
          const bubbleY = endScreen.y - 8;
          ctx.beginPath();
          ctx.arc(bubbleX, bubbleY, 12, 0, Math.PI * 2);
          ctx.fillStyle = '#E53E3E';
          ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 10px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(a.comments.length), bubbleX, bubbleY);
        }
      }
      ctx.restore();
    });

    if (isDrawingRef.current && drawStartRef.current && drawEndRef.current) {
      const start = imageToScreen(drawStartRef.current.x, drawStartRef.current.y);
      const end = imageToScreen(drawEndRef.current.x, drawEndRef.current.y);
      ctx.save();
      ctx.globalAlpha = 0.7;
      ctx.strokeStyle = currentToolRef.current === 'circle' ? '#4299E1' : '#38A169';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      if (currentToolRef.current === 'circle') {
        const r = Math.sqrt((end.x - start.x) ** 2 + (end.y - start.y) ** 2);
        ctx.beginPath();
        ctx.arc(start.x, start.y, r, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
      }
      ctx.restore();
    }

    if (cursorPos && imageRef.current) {
      const screenC = imageToScreen(cursorPos.x, cursorPos.y);
      const img = imageRef.current;
      const maxS = { x: img.width * scale + offsetX, y: img.height * scale + offsetY };
      if (screenC.x >= offsetX && screenC.x <= maxS.x && screenC.y >= offsetY && screenC.y <= maxS.y) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(screenC.x, offsetY);
        ctx.lineTo(screenC.x, maxS.y);
        ctx.moveTo(offsetX, screenC.y);
        ctx.lineTo(maxS.x, screenC.y);
        ctx.stroke();
        ctx.restore();
      }
    }

    if (animating.size > 0 || isDrawingRef.current) {
      rafIdRef.current = requestAnimationFrame(renderOverlayLayer);
    }
  }, [annotations, selectedAnnotationId, imageToScreen, scale, offsetX, offsetY, cursorPos]);

  useEffect(() => {
    if (!imageLoaded) return;
    renderStaticLayer();
    rafIdRef.current = requestAnimationFrame(renderOverlayLayer);
    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [imageLoaded, renderStaticLayer, renderOverlayLayer]);

  useEffect(() => {
    if (!rafIdRef.current) {
      rafIdRef.current = requestAnimationFrame(renderOverlayLayer);
    }
  }, [annotations, selectedAnnotationId, renderOverlayLayer]);

  const handleMouseDown = async (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;
    const imgPos = screenToImage(e.clientX, e.clientY);
    drawStartRef.current = imgPos;
    drawEndRef.current = imgPos;

    if (e.ctrlKey || e.metaKey) {
      isDrawingRef.current = true;
      currentToolRef.current = 'arrow';
      selectAnnotation(null);
    } else {
      const hit = findAnnotationAtPoint(imgPos.x, imgPos.y);
      if (hit) {
        isDraggingRef.current = true;
        dragOffsetRef.current = { dx: imgPos.x - hit.x, dy: imgPos.y - hit.y };
        selectAnnotation(hit.id);
      } else {
        isDrawingRef.current = true;
        currentToolRef.current = 'circle';
        selectAnnotation(null);
      }
    }
    if (!rafIdRef.current) {
      rafIdRef.current = requestAnimationFrame(renderOverlayLayer);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const imgPos = screenToImage(e.clientX, e.clientY);
    setCursorPos(imgPos);
    if (isDrawingRef.current) {
      drawEndRef.current = imgPos;
    } else if (isDraggingRef.current && selectedAnnotationId && dragOffsetRef.current) {
      const annotation = annotations.find(a => a.id === selectedAnnotationId);
      if (annotation) {
        const newX = imgPos.x - dragOffsetRef.current.dx;
        const newY = imgPos.y - dragOffsetRef.current.dy;
        const clamped = clampToImageBounds(newX, newY);
        if (annotation.type === 'circle') {
          updateAnnotation(designId, annotation.id, { x: clamped.x, y: clamped.y });
        } else if (annotation.type === 'arrow') {
          const dx = (annotation.endX || annotation.x) - annotation.x;
          const dy = (annotation.endY || annotation.y) - annotation.y;
          updateAnnotation(designId, annotation.id, {
            x: clamped.x,
            y: clamped.y,
            endX: clamped.x + dx,
            endY: clamped.y + dy
          });
        }
      }
    }
  };

  const handleMouseUp = async () => {
    if (isDrawingRef.current && drawStartRef.current && drawEndRef.current) {
      const start = drawStartRef.current;
      const end = drawEndRef.current;
      const tool = currentToolRef.current;

      if (tool === 'circle') {
        const radius = Math.sqrt((end.x - start.x) ** 2 + (end.y - start.y) ** 2) / scale;
        const clampedRadius = Math.max(10, Math.min(radius, 100));
        const created = await createAnnotation(designId, {
          type: 'circle',
          x: start.x,
          y: start.y,
          radius: clampedRadius
        });
        if (created) {
          addFadeIn(created.id);
          toast.success('圆形标注已创建');
          selectAnnotation(created.id);
        }
      } else if (tool === 'arrow') {
        const dist = Math.sqrt((end.x - start.x) ** 2 + (end.y - start.y) ** 2);
        if (dist > 10) {
          const created = await createAnnotation(designId, {
            type: 'arrow',
            x: start.x,
            y: start.y,
            endX: end.x,
            endY: end.y
          });
          if (created) {
            addFadeIn(created.id);
            toast.success('箭头标注已创建');
            selectAnnotation(created.id);
          }
        }
      }
    }
    isDrawingRef.current = false;
    isDraggingRef.current = false;
    drawStartRef.current = null;
    drawEndRef.current = null;
    dragOffsetRef.current = null;
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const imgPos = screenToImage(e.clientX, e.clientY);
    const hit = findAnnotationAtPoint(imgPos.x, imgPos.y);
    if (hit) {
      selectAnnotation(hit.id);
      toast('双击选中了标注，请在右侧面板中添加评论');
    }
  };

  const handleMouseLeave = () => {
    setCursorPos(null);
    if (!isDrawingRef.current && !isDraggingRef.current) {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    }
  };

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (e.key === 'Control') {
        ctrlPressedRef.current = true;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedAnnotationId) {
          e.preventDefault();
          addDeleteAnim(selectedAnnotationId);
          setTimeout(async () => {
            await removeAnnotation(designId, selectedAnnotationId);
            toast.success('标注已删除');
          }, 200);
        }
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Control') {
        ctrlPressedRef.current = false;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [selectedAnnotationId, designId, removeAnnotation, addDeleteAnim]);

  return (
    <div ref={containerRef} className="canvas-wrapper">
      <canvas
        ref={canvasRef}
        className="base-canvas"
      />
      <canvas
        ref={overlayCanvasRef}
        className="overlay-canvas"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onDoubleClick={handleDoubleClick}
      />
      {!imageLoaded && (
        <div className="canvas-loading">
          <div className="spinner" />
          <p>加载设计稿中...</p>
        </div>
      )}
      <div className="canvas-hint">
        <span>🖱️ 拖拽创建圆形标注</span>
        <span>Ctrl + 拖拽创建箭头标注</span>
        <span>Delete 删除选中标注</span>
      </div>
    </div>
  );
}
