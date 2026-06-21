import { useState, useEffect, useRef, useCallback } from 'react';
import type { Material, Annotation } from '../types';

const PRESET_COLORS = [
  '#FF0000',
  '#00FF00',
  '#0000FF',
  '#FFFF00',
  '#FF00FF',
];

interface Props {
  material: Material | null;
  annotations: Annotation[];
  currentUser: string;
  onSaveAnnotation: (x: number, y: number, color: string, text: string) => Promise<Annotation | null>;
}

export default function PixelPreview({ material, annotations, currentUser, onSaveAnnotation }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const [zoom, setZoom] = useState(2);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [startOffsetX, setStartOffsetX] = useState(0);
  const [startOffsetY, setStartOffsetY] = useState(0);

  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[4]);
  const [newAnnotation, setNewAnnotation] = useState<{ x: number; y: number } | null>(null);
  const [annotationText, setAnnotationText] = useState('');
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [flashAnnotationId, setFlashAnnotationId] = useState<string | null>(null);

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const image = imageRef.current;
    const container = containerRef.current;

    if (!canvas || !ctx || !image || !container) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.fillStyle = '#11111B';
    ctx.fillRect(0, 0, rect.width, rect.height);

    ctx.imageSmoothingEnabled = false;

    const drawX = Math.floor(rect.width / 2 + offsetX - (image.width * zoom) / 2);
    const drawY = Math.floor(rect.height / 2 + offsetY - (image.height * zoom) / 2);
    const drawW = image.width * zoom;
    const drawH = image.height * zoom;

    ctx.drawImage(image, drawX, drawY, drawW, drawH);

    annotations.forEach((ann) => {
      const ax = drawX + ann.x * zoom;
      const ay = drawY + ann.y * zoom;

      if (ax < -20 || ax > rect.width + 20 || ay < -20 || ay > rect.height + 20) return;

      const isFlashing = flashAnnotationId === ann.id;

      ctx.save();
      ctx.fillStyle = ann.color;
      ctx.strokeStyle = ann.color;
      ctx.lineWidth = 1;

      const crossSize = isFlashing ? 12 : 8;
      const halfCross = crossSize / 2;

      ctx.beginPath();
      ctx.moveTo(ax - halfCross, ay);
      ctx.lineTo(ax + halfCross, ay);
      ctx.moveTo(ax, ay - halfCross);
      ctx.lineTo(ax, ay + halfCross);
      ctx.stroke();

      if (ann.text) {
        const padding = 6;
        const textX = ax + 10;
        const textY = ay - 10;
        const authorText = `${ann.author}`;
        const displayText = ann.text;

        ctx.font = '11px sans-serif';
        const textWidth = Math.max(ctx.measureText(displayText).width, ctx.measureText(authorText).width) + padding * 2;
        const textHeight = 32;

        ctx.fillStyle = 'rgba(30, 30, 46, 0.95)';
        ctx.fillRect(textX, textY - textHeight + 4, textWidth, textHeight);

        ctx.strokeStyle = ann.color;
        ctx.lineWidth = 1;
        ctx.strokeRect(textX, textY - textHeight + 4, textWidth, textHeight);

        ctx.fillStyle = ann.color;
        ctx.font = 'bold 10px sans-serif';
        ctx.fillText(authorText, textX + padding, textY - textHeight + 16);

        ctx.fillStyle = '#CDD6F4';
        ctx.font = '11px sans-serif';
        ctx.fillText(displayText, textX + padding, textY - 2);

        ctx.beginPath();
        ctx.moveTo(ax + 4, ay - 4);
        ctx.lineTo(textX, textY - textHeight + 12);
        ctx.strokeStyle = ann.color;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      ctx.restore();
    });

    if (newAnnotation) {
      const ax = drawX + newAnnotation.x * zoom;
      const ay = drawY + newAnnotation.y * zoom;

      ctx.save();
      ctx.strokeStyle = selectedColor;
      ctx.lineWidth = 1;

      const crossSize = 8;
      const halfCross = crossSize / 2;

      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(ax - halfCross, ay);
      ctx.lineTo(ax + halfCross, ay);
      ctx.moveTo(ax, ay - halfCross);
      ctx.lineTo(ax, ay + halfCross);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.restore();
    }
  }, [zoom, offsetX, offsetY, annotations, newAnnotation, selectedColor, flashAnnotationId]);

  useEffect(() => {
    if (!material) {
      imageRef.current = null;
      return;
    }

    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      setZoom(2);
      setOffsetX(0);
      setOffsetY(0);
      setNewAnnotation(null);
      setAnnotationText('');
      setSelectedAnnotationId(null);
      renderCanvas();
    };
    img.src = material.data;
  }, [material?.id]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  useEffect(() => {
    const handleResize = () => renderCanvas();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [renderCanvas]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        setIsSpacePressed(true);
      }
      if (e.code === 'Escape') {
        setNewAnnotation(null);
        setAnnotationText('');
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
        setIsPanning(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const delta = e.deltaY > 0 ? -1 : 1;
    const newZoom = Math.max(1, Math.min(16, zoom + delta));
    setZoom(newZoom);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (newAnnotation) return;

    if (isSpacePressed) {
      setIsPanning(true);
      setStartX(e.clientX);
      setStartY(e.clientY);
      setStartOffsetX(offsetX);
      setStartOffsetY(offsetY);
    } else if (material && imageRef.current) {
      const canvas = canvasRef.current;
      const image = imageRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const canvasX = e.clientX - rect.left;
      const canvasY = e.clientY - rect.top;

      const centerX = rect.width / 2 + offsetX;
      const centerY = rect.height / 2 + offsetY;

      const pixelX = Math.floor((canvasX - centerX + (image.width * zoom) / 2) / zoom);
      const pixelY = Math.floor((canvasY - centerY + (image.height * zoom) / 2) / zoom);

      if (pixelX >= 0 && pixelX < image.width && pixelY >= 0 && pixelY < image.height) {
        setNewAnnotation({ x: pixelX, y: pixelY });
        setAnnotationText('');
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      setOffsetX(startOffsetX + dx);
      setOffsetY(startOffsetY + dy);
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleMouseLeave = () => {
    setIsPanning(false);
  };

  const handleSaveAnnotation = async () => {
    if (!newAnnotation || !annotationText.trim()) return;

    const result = await onSaveAnnotation(
      newAnnotation.x,
      newAnnotation.y,
      selectedColor,
      annotationText.trim()
    );

    if (result) {
      setNewAnnotation(null);
      setAnnotationText('');
    }
  };

  const handleCancelAnnotation = () => {
    setNewAnnotation(null);
    setAnnotationText('');
  };

  const handleAnnotationClick = (annotation: Annotation, index: number) => {
    if (!imageRef.current) return;

    setSelectedAnnotationId(annotation.id);

    const image = imageRef.current;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const targetOffsetX = -(annotation.x * zoom - image.width * zoom / 2);
    const targetOffsetY = -(annotation.y * zoom - image.height * zoom / 2);

    setOffsetX(targetOffsetX);
    setOffsetY(targetOffsetY);

    let flashCount = 0;
    const flashInterval = setInterval(() => {
      flashCount++;
      setFlashAnnotationId(flashCount % 2 === 0 ? null : annotation.id);
      if (flashCount >= 4) {
        clearInterval(flashInterval);
        setFlashAnnotationId(null);
      }
    }, 200);
  };

  const getInputPosition = () => {
    if (!newAnnotation || !imageRef.current || !canvasRef.current) return { left: 0, top: 0 };

    const image = imageRef.current;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    const centerX = rect.width / 2 + offsetX;
    const centerY = rect.height / 2 + offsetY;

    const screenX = centerX + (newAnnotation.x - image.width / 2) * zoom;
    const screenY = centerY + (newAnnotation.y - image.height / 2) * zoom;

    return {
      left: screenX + 12,
      top: screenY - 40,
    };
  };

  const inputPosition = getInputPosition();

  if (!material) {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#6C7086',
        fontSize: 14,
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🖼️</div>
        <div>请从左侧选择一个素材进行预览</div>
      </div>
    );
  }

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#1E1E2E',
    }}>
      <div style={{
        padding: '12px 20px',
        borderBottom: '1px solid #313244',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{
          fontSize: 15,
          fontWeight: 500,
          color: '#CDD6F4',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: '60%',
        }}>
          {material.name}
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          <span style={{ fontSize: 12, color: '#9399B2' }}>
            缩放: {zoom}x
          </span>
        </div>
      </div>

      <div style={{
        padding: '10px 20px',
        borderBottom: '1px solid #313244',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 12, color: '#9399B2' }}>标注颜色：</span>
        {PRESET_COLORS.map((color) => (
          <button
            key={color}
            onClick={() => setSelectedColor(color)}
            style={{
              width: 24,
              height: 24,
              borderRadius: 4,
              backgroundColor: color,
              border: selectedColor === color ? '2px solid #CDD6F4' : '2px solid transparent',
              cursor: 'pointer',
              transition: 'transform 0.15s',
              transform: selectedColor === color ? 'scale(1.15)' : 'scale(1)',
              boxShadow: selectedColor === color ? `0 0 8px ${color}` : 'none',
            }}
          />
        ))}
        <span style={{ fontSize: 11, color: '#6C7086', marginLeft: 'auto' }}>
          点击画布添加标注 · 空格+拖拽平移 · 滚轮缩放
        </span>
      </div>

      <div
        ref={containerRef}
        style={{
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
          cursor: newAnnotation ? 'crosshair' : isSpacePressed || isPanning ? 'grabbing' : 'default',
        }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        <canvas
          ref={canvasRef}
          style={{
            display: 'block',
            width: '100%',
            height: '100%',
          }}
        />

        {newAnnotation && (
          <div
            style={{
              position: 'absolute',
              left: Math.min(Math.max(inputPosition.left, 10), (containerRef.current?.getBoundingClientRect().width || 400) - 240),
              top: Math.min(Math.max(inputPosition.top, 10), (containerRef.current?.getBoundingClientRect().height || 300) - 80),
              backgroundColor: 'rgba(30, 30, 46, 0.98)',
              borderRadius: 8,
              padding: 12,
              boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
              border: `1px solid ${selectedColor}`,
              zIndex: 100,
              minWidth: 220,
            }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div style={{
              fontSize: 11,
              color: '#9399B2',
              marginBottom: 8,
            }}>
              位置: ({newAnnotation.x}, {newAnnotation.y})
            </div>
            <input
              type="text"
              value={annotationText}
              onChange={(e) => setAnnotationText(e.target.value)}
              placeholder="输入标注文字..."
              autoFocus
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: 6,
                backgroundColor: '#313244',
                border: '1px solid #45475A',
                color: '#CDD6F4',
                fontSize: 13,
                marginBottom: 10,
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSaveAnnotation();
                }
                if (e.key === 'Escape') {
                  handleCancelAnnotation();
                }
              }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleSaveAnnotation}
                disabled={!annotationText.trim()}
                style={{
                  flex: 1,
                  padding: '6px 12px',
                  borderRadius: 6,
                  backgroundColor: selectedColor,
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: annotationText.trim() ? 'pointer' : 'not-allowed',
                  opacity: annotationText.trim() ? 1 : 0.5,
                  transition: 'opacity 0.2s',
                }}
              >
                保存
              </button>
              <button
                onClick={handleCancelAnnotation}
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  backgroundColor: '#45475A',
                  color: '#CDD6F4',
                  fontSize: 12,
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#585B70';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#45475A';
                }}
              >
                取消
              </button>
            </div>
          </div>
        )}

        <div style={{
          position: 'absolute',
          bottom: 12,
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '4px 12px',
          borderRadius: 4,
          backgroundColor: 'rgba(0,0,0,0.6)',
          color: '#CDD6F4',
          fontSize: 12,
          pointerEvents: 'none',
        }}>
          {zoom}x
        </div>
      </div>

      <div style={{
        height: 200,
        borderTop: '1px solid #313244',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
      }}>
        <div style={{
          padding: '10px 20px',
          borderBottom: '1px solid #313244',
          fontSize: 13,
          fontWeight: 500,
          color: '#CDD6F4',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span>标注列表</span>
          <span style={{ fontSize: 11, color: '#9399B2' }}>
            共 {annotations.length} 个
          </span>
        </div>
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px 12px',
        }}>
          {annotations.length === 0 ? (
            <div style={{
              padding: 20,
              textAlign: 'center',
              color: '#6C7086',
              fontSize: 12,
            }}>
              暂无标注，点击画布添加第一个标注
            </div>
          ) : (
            annotations.map((ann, index) => {
              const isSelected = selectedAnnotationId === ann.id;
              const truncatedText = ann.text.length > 10 ? ann.text.slice(0, 10) + '...' : ann.text;

              return (
                <div
                  key={ann.id}
                  onClick={() => handleAnnotationClick(ann, index)}
                  style={{
                    height: 40,
                    borderRadius: 6,
                    backgroundColor: isSelected ? '#45475A' : '#313244',
                    padding: '0 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    cursor: 'pointer',
                    marginBottom: 6,
                    borderLeft: isSelected ? `3px solid ${ann.color}` : '3px solid transparent',
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = '#45475A';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = '#313244';
                    }
                  }}
                >
                  <div style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    backgroundColor: ann.color,
                    flexShrink: 0,
                  }} />
                  <span style={{
                    fontSize: 12,
                    color: '#CDD6F4',
                    fontWeight: 500,
                    minWidth: 52,
                  }}>
                    标注#{index + 1}
                  </span>
                  <span style={{
                    fontSize: 11,
                    color: '#9399B2',
                    minWidth: 60,
                  }}>
                    ({ann.x},{ann.y})
                  </span>
                  <span style={{
                    fontSize: 12,
                    color: '#A6ADC8',
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {truncatedText}
                  </span>
                  <span style={{
                    fontSize: 10,
                    color: '#6C7086',
                    flexShrink: 0,
                  }}>
                    {ann.author}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
