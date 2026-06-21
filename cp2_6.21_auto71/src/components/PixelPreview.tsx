import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { MaterialDetail, Annotation } from '../App';

interface Props {
  material: MaterialDetail | null;
  onAddAnnotation: (x: number, y: number, text: string) => void;
}

interface FloatingInput {
  visible: boolean;
  x: number;
  y: number;
  pixelX: number;
  pixelY: number;
}

const PixelPreview: React.FC<Props> = ({ material, onAddAnnotation }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [zoom, setZoom] = useState<number>(2);
  const [offsetX, setOffsetX] = useState<number>(0);
  const [offsetY, setOffsetY] = useState<number>(0);
  const [isSpaceDown, setIsSpaceDown] = useState<boolean>(false);
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [floatingInput, setFloatingInput] = useState<FloatingInput>({
    visible: false,
    x: 0,
    y: 0,
    pixelX: 0,
    pixelY: 0
  });
  const [inputValue, setInputValue] = useState<string>('');
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [flashAnnotationId, setFlashAnnotationId] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);

  const zoomRef = useRef<number>(2);
  const offsetXRef = useRef<number>(0);
  const offsetYRef = useRef<number>(0);
  const flashRef = useRef<string | null>(null);

  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { offsetXRef.current = offsetX; }, [offsetX]);
  useEffect(() => { offsetYRef.current = offsetY; }, [offsetY]);
  useEffect(() => { flashRef.current = flashAnnotationId; }, [flashAnnotationId]);

  useEffect(() => {
    if (!material) {
      setImageLoaded(false);
      imgRef.current = null;
      return;
    }
  }, [material]);

  const loadImage = useCallback(() => {
    if (!material) return;
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setImageLoaded(true);
      const canvas = canvasRef.current;
      if (canvas && containerRef.current) {
        const containerW = containerRef.current.clientWidth;
        const containerH = containerRef.current.clientHeight - 32;
        const scale = 2;
        const centeredOffsetX = (containerW - img.width * scale) / 2;
        const centeredOffsetY = (containerH - img.height * scale) / 2;
        setOffsetX(centeredOffsetX);
        setOffsetY(centeredOffsetY);
        offsetXRef.current = centeredOffsetX;
        offsetYRef.current = centeredOffsetY;
      }
    };
    img.src = material.dataUrl;
  }, [material]);

  useEffect(() => {
    loadImage();
  }, [loadImage]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !containerRef.current) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const container = containerRef.current;
    const dpr = window.devicePixelRatio || 1;
    const displayW = container.clientWidth;
    const displayH = container.clientHeight - 32;

    canvas.width = displayW * dpr;
    canvas.height = displayH * dpr;
    canvas.style.width = `${displayW}px`;
    canvas.style.height = `${displayH}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.imageSmoothingEnabled = false;

    ctx.fillStyle = '#11111B';
    ctx.fillRect(0, 0, displayW, displayH);

    const img = imgRef.current;
    const currentZoom = zoomRef.current;
    const currentOffsetX = offsetXRef.current;
    const currentOffsetY = offsetYRef.current;

    if (img) {
      ctx.drawImage(
        img,
        0, 0, img.width, img.height,
        currentOffsetX, currentOffsetY,
        img.width * currentZoom, img.height * currentZoom
      );

      if (material) {
        const annotations = material.annotations;
        for (let i = 0; i < annotations.length; i++) {
          const ann = annotations[i];
          const ax = currentOffsetX + ann.x * currentZoom;
          const ay = currentOffsetY + ann.y * currentZoom;
          const isFlashing = flashRef.current === ann.id;
          const crossSize = 8;
          const halfCross = crossSize / 2;

          ctx.save();
          if (isFlashing) {
            ctx.shadowColor = '#FF00FF';
            ctx.shadowBlur = 12;
          }
          ctx.strokeStyle = '#FF00FF';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(ax - halfCross, ay);
          ctx.lineTo(ax + halfCross, ay);
          ctx.moveTo(ax, ay - halfCross);
          ctx.lineTo(ax, ay + halfCross);
          ctx.stroke();

          ctx.fillStyle = '#FF00FF';
          ctx.beginPath();
          ctx.arc(ax, ay, 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          if (ann.text) {
            ctx.font = `${Math.max(10, currentZoom * 2)}px -apple-system, sans-serif`;
            const metrics = ctx.measureText(ann.text);
            const padding = 4;
            const bubbleX = ax + 6;
            const bubbleY = ay - 12;
            const bubbleW = metrics.width + padding * 2;
            const bubbleH = Math.max(10, currentZoom * 2) + padding;

            ctx.fillStyle = 'rgba(255, 0, 255, 0.85)';
            ctx.beginPath();
            const radius = 3;
            ctx.roundRect(bubbleX, bubbleY - bubbleH, bubbleW, bubbleH, radius);
            ctx.fill();

            ctx.fillStyle = '#fff';
            ctx.textBaseline = 'middle';
            ctx.fillText(ann.text, bubbleX + padding, bubbleY - bubbleH / 2);
          }
        }
      }
    }
  }, [material]);

  useEffect(() => {
    let rafId: number;
    const loop = () => {
      draw();
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [draw]);

  useEffect(() => {
    const handleResize = () => draw();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [draw]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.code === 'Space') {
      e.preventDefault();
      setIsSpaceDown(true);
    }
  }, []);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (e.code === 'Space') {
      setIsSpaceDown(false);
      setIsPanning(false);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!imgRef.current) return;
    e.preventDefault();
    const delta = e.deltaY < 0 ? 1 : -1;
    setZoom(prev => {
      const next = Math.max(1, Math.min(16, prev + delta));
      zoomRef.current = next;
      return next;
    });
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (isSpaceDown) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - offsetXRef.current, y: e.clientY - offsetYRef.current });
    }
  }, [isSpaceDown]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      const newX = e.clientX - panStart.x;
      const newY = e.clientY - panStart.y;
      setOffsetX(newX);
      setOffsetY(newY);
      offsetXRef.current = newX;
      offsetYRef.current = newY;
    }
  }, [isPanning, panStart]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (!imgRef.current || !canvasRef.current || !material) return;
    if (isPanning || isSpaceDown) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const currentZoom = zoomRef.current;
    const currentOffsetX = offsetXRef.current;
    const currentOffsetY = offsetYRef.current;

    const pixelX = Math.floor((clickX - currentOffsetX) / currentZoom;
    const pixelY = Math.floor((clickY - currentOffsetY) / currentZoom;

    const img = imgRef.current;
    if (pixelX < 0 || pixelX >= img.width || pixelY < 0 || pixelY >= img.height) {
      return;
    }

    setFloatingInput({
      visible: true,
      x: clickX,
      y: clickY,
      pixelX,
      pixelY
    });
    setInputValue('');
  }, [material, isPanning, isSpaceDown]);

  const handleInputSubmit = useCallback(() => {
    if (!floatingInput.visible) return;
    const text = inputValue.trim();
    if (!text) return;
    onAddAnnotation(floatingInput.pixelX, floatingInput.pixelY, text);
    setFloatingInput({ visible: false, x: 0, y: 0, pixelX: 0, pixelY: 0 });
    setInputValue('');
  }, [floatingInput, inputValue, onAddAnnotation]);

  const handleInputCancel = useCallback(() => {
    setFloatingInput({ visible: false, x: 0, y: 0, pixelX: 0, pixelY: 0 });
    setInputValue('');
  }, []);

  const handleAnnotationClick = useCallback((ann: Annotation) => {
    if (!imgRef.current || !containerRef.current) return;
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const containerW = container.clientWidth;
    const containerH = container.clientHeight - 32;
    const currentZoom = zoomRef.current;

    const centeredX = containerW / 2 - ann.x * currentZoom;
    const centeredY = containerH / 2 - ann.y * currentZoom;

    setOffsetX(centeredX);
    setOffsetY(centeredY);
    offsetXRef.current = centeredX;
    offsetYRef.current = centeredY;

    setSelectedAnnotationId(ann.id);

    let count = 0;
    const flash = () => {
      setFlashAnnotationId(ann.id);
      flashRef.current = ann.id;
      setTimeout(() => {
        setFlashAnnotationId(null);
        flashRef.current = null;
        count++;
        if (count < 2) {
          setTimeout(flash, 200);
        }
      }, 200);
    };
    flash();
  }, []);

  if (!material) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#1E1E2E',
          color: '#6C7086',
          fontSize: '14px'
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>🎨</div>
          <p>选择左侧素材开始预览</p>
          <p style={{ fontSize: '12px', marginTop: '8px', color: '#45475A }}>
            滚轮缩放 · 空格拖拽 · 点击标注
          </p>
        </div>
      </div>
    );
  }

  const truncate = (text: string, max: number) =>
    text.length > max ? text.slice(0, max) + '…' : text;

  return (
    <div
      style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: '#181825',
      overflow: 'hidden'
    }}
    >
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid #313244',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#CDD6F4' }}>
            {material.name}
          </h2>
          <p style={{ fontSize: '11px', color: '#6C7086', marginTop: '2px' }}>
            {material.type} · {material.size > 1024
              ? `${(material.size / 1024).toFixed(1)} KB`
              : `${material.size} B`} · {imageLoaded && imgRef.current
                ? `${imgRef.current.width}x${imgRef.current.height}px`
                : ''}
          </p>
        </div>
        <div
          style={{ display: 'flex', gap: '8px', alignItems: 'center' }}
        >
          <span style={{ fontSize: '11px', color: '#6C7086' }}>
            滚轮缩放 · 空格拖拽 · 点击标注
          </span>
        </div>
      </div>

      <div
        ref={containerRef}
        style={{
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
          background: '#11111B',
          cursor: isSpaceDown ? (isPanning ? 'grabbing' : 'grab') : 'crosshair'
        }}
      >
        <canvas
          ref={canvasRef}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={handleCanvasClick}
          style={{
            display: 'block',
            imageRendering: 'pixelated'
          }}
        />

        <div
          style={{
            position: 'absolute',
            bottom: '8px',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '4px 12px',
            background: 'rgba(30, 30, 46, 0.85)',
            borderRadius: '4px',
            fontSize: '12px',
            color: '#CDD6F4',
            fontWeight: 600,
            pointerEvents: 'none'
          }}
        >
          {zoom}x
        </div>

        {floatingInput.visible && (
          <div
            style={{
              position: 'absolute',
              left: floatingInput.x + 12,
              top: floatingInput.y + 12,
              background: '#1E1E2E',
              borderRadius: '6px',
              padding: '8px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
              border: '1px solid #45475A',
              zIndex: 100,
              display: 'flex',
              gap: '6px',
              alignItems: 'center'
            }}
          >
            <input
              autoFocus
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleInputSubmit();
                if (e.key === 'Escape') handleInputCancel();
              }}
              placeholder="输入备注..."
              style={{
                width: '180px',
                padding: '6px 10px',
                background: '#313244',
                border: '1px solid #45475A',
                borderRadius: '4px',
                color: '#CDD6F4',
                fontSize: '12px',
                outline: 'none',
                transition: 'border-color 0.2s ease'
              }}
              onFocus={(e) => {
                (e.target as HTMLInputElement).style.borderColor = '#A78BFA';
              }}
              onBlur={(e) => {
                (e.target as HTMLInputElement).style.borderColor = '#45475A';
              }}
            />
            <button
              onClick={handleInputSubmit}
              style={{
              padding: '6px 12px',
              background: '#A78BFA',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: 'pointer',
              fontWeight: 600,
              transition: 'background 0.2s ease'
            }}
            >
              保存
            </button>
            <button
              onClick={handleInputCancel}
              style={{
              padding: '6px 10px',
              background: '#45475A',
              color: '#CDD6F4',
              border: 'none',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'background 0.2s ease'
            }}
            >
              取消
            </button>
          </div>
        )}
      </div>

      <div
        style={{
          borderTop: '1px solid #313244',
          padding: '12px 20px',
          maxHeight: '200px',
          overflowY: 'auto',
          background: '#1E1E2E'
        }}
      >
        <div
          style={{
            fontSize: '12px',
            color: '#6C7086',
            marginBottom: '8px',
            fontWeight: 600
          }}
        >
            标注列表 ({material.annotations.length})
          </div>
          {material.annotations.length === 0 ? (
            <div
              style={{
                fontSize: '12px',
                color: '#45475A',
                padding: '12px 0',
                textAlign: 'center'
              }}
            >
              暂无标注，点击图片添加标注
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {material.annotations.map((ann, idx) => {
                const isSelected = selectedAnnotationId === ann.id;
                return (
                  <div
                    key={ann.id}
                    onClick={() => handleAnnotationClick(ann)}
                    style={{
                    height: '40px',
                    borderRadius: '6px',
                    background: '#313244',
                    padding: '0 14px',
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'pointer',
                    fontSize: '12px',
                    color: '#CDD6F4',
                    borderLeft: isSelected ? '3px solid #A78BFA' : '3px solid transparent',
                    transition: 'background 0.2s ease, border-left-color 0.2s ease'
                  }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        (e.currentTarget as HTMLDivElement).style.background = '#45475A';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        (e.currentTarget as HTMLDivElement).style.background = '#313244';
                      }
                    }}
                  >
                    <span style={{ color: '#FF00FF', marginRight: '8px', fontWeight: 700 }}>
                      标注#{idx + 1}
                    </span>
                    <span style={{ color: '#6C7086', marginRight: '8px' }}>
                      位置({ann.x}, {ann.y})
                    </span>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {truncate(ann.text, 10)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
    </div>
  );
};

export default PixelPreview;
