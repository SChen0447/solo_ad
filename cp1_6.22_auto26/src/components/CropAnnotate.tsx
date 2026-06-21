import React, { useState, useRef, useEffect, useCallback } from 'react';
import { saveAs } from 'file-saver';
import { AnnotationTool, AnnotationElement, CropRegion } from '../types';

interface CropAnnotateProps {
  imageDataUrl: string | null;
  cropRegion: CropRegion | null;
  onClose: () => void;
}

const CropAnnotate: React.FC<CropAnnotateProps> = ({ imageDataUrl, cropRegion, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<AnnotationTool>('pen');
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);
  const [annotations, setAnnotations] = useState<AnnotationElement[]>([]);
  const [penColor, setPenColor] = useState('#00d2ff');
  const [penSize, setPenSize] = useState(3);
  const [highlighterColor, setHighlighterColor] = useState('rgba(255, 235, 59, 0.5)');
  const [highlighterSize, setHighlighterSize] = useState(16);
  const [arrowColor, setArrowColor] = useState('#ff4757');
  const [arrowSize, setArrowSize] = useState(4);
  const [textColor, setTextColor] = useState('#ffffff');
  const [fontFamily, setFontFamily] = useState('Arial');
  const [fontSize, setFontSize] = useState(16);
  const [bold, setBold] = useState(false);
  const [italic, setItalic] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isAddingText, setIsAddingText] = useState(false);
  const [textPosition, setTextPosition] = useState({ x: 0, y: 0 });
  const [tempText, setTempText] = useState('');
  const textInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (imageDataUrl && cropRegion) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = cropRegion.width;
        canvas.height = cropRegion.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const scaleX = img.width / (cropRegion.width * 1);
          const scaleY = img.height / (cropRegion.height * 1);
          ctx.drawImage(
            img,
            cropRegion.x * scaleX,
            cropRegion.y * scaleY,
            cropRegion.width * scaleX,
            cropRegion.height * scaleY,
            0,
            0,
            cropRegion.width,
            cropRegion.height
          );
          const croppedDataUrl = canvas.toDataURL('image/png');
          setCroppedImage(croppedDataUrl);
          setAnnotations([]);
        }
      };
      img.src = imageDataUrl;
    }
  }, [imageDataUrl, cropRegion]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !croppedImage) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      redrawAnnotations(ctx);
    };
    img.src = croppedImage;
  }, [croppedImage, annotations]);

  const redrawAnnotations = useCallback((ctx: CanvasRenderingContext2D) => {
    annotations.forEach((ann) => {
      ctx.save();
      switch (ann.type) {
        case 'pen':
          if (ann.points && ann.points.length > 1) {
            ctx.strokeStyle = ann.color || '#00d2ff';
            ctx.lineWidth = ann.size || 3;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(ann.points[0].x, ann.points[0].y);
            for (let i = 1; i < ann.points.length; i++) {
              ctx.lineTo(ann.points[i].x, ann.points[i].y);
            }
            ctx.stroke();
          }
          break;
        case 'highlighter':
          if (ann.points && ann.points.length > 1) {
            ctx.strokeStyle = ann.color || 'rgba(255, 235, 59, 0.5)';
            ctx.lineWidth = ann.size || 16;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.globalCompositeOperation = 'source-over';
            ctx.beginPath();
            ctx.moveTo(ann.points[0].x, ann.points[0].y);
            for (let i = 1; i < ann.points.length; i++) {
              ctx.lineTo(ann.points[i].x, ann.points[i].y);
            }
            ctx.stroke();
          }
          break;
        case 'arrow':
          if (ann.points && ann.points.length >= 2) {
            const start = ann.points[0];
            const end = ann.points[ann.points.length - 1];
            ctx.strokeStyle = ann.color || '#ff4757';
            ctx.fillStyle = ann.color || '#ff4757';
            ctx.lineWidth = ann.size || 4;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            ctx.beginPath();
            ctx.moveTo(start.x, start.y);
            ctx.lineTo(end.x, end.y);
            ctx.stroke();

            const angle = Math.atan2(end.y - start.y, end.x - start.x);
            const headLength = 15;
            ctx.beginPath();
            ctx.moveTo(end.x, end.y);
            ctx.lineTo(
              end.x - headLength * Math.cos(angle - Math.PI / 6),
              end.y - headLength * Math.sin(angle - Math.PI / 6)
            );
            ctx.lineTo(
              end.x - headLength * Math.cos(angle + Math.PI / 6),
              end.y - headLength * Math.sin(angle + Math.PI / 6)
            );
            ctx.closePath();
            ctx.fill();
          }
          break;
        case 'text':
          if (ann.text) {
            ctx.fillStyle = ann.color || '#ffffff';
            const fontStyle = `${ann.italic ? 'italic ' : ''}${ann.bold ? 'bold ' : ''}${ann.fontSize || 16}px ${ann.fontFamily || 'Arial'}`;
            ctx.font = fontStyle;
            ctx.fillText(ann.text, ann.x, ann.y);
          }
          break;
      }
      ctx.restore();
    });
  }, [annotations]);

  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool === 'text') {
      const pos = getCanvasCoordinates(e);
      setTextPosition(pos);
      setIsAddingText(true);
      setTempText('');
      setTimeout(() => textInputRef.current?.focus(), 0);
      return;
    }

    setIsDrawing(true);
    const pos = getCanvasCoordinates(e);
    setCurrentPath([pos]);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || activeTool === 'text') return;

    const pos = getCanvasCoordinates(e);
    setCurrentPath((prev) => [...prev, pos]);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      redrawAnnotations(ctx);

      if (currentPath.length > 0) {
        ctx.save();
        if (activeTool === 'pen') {
          ctx.strokeStyle = penColor;
          ctx.lineWidth = penSize;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.beginPath();
          ctx.moveTo(currentPath[0].x, currentPath[0].y);
          for (let i = 1; i < currentPath.length; i++) {
            ctx.lineTo(currentPath[i].x, currentPath[i].y);
          }
          ctx.stroke();
        } else if (activeTool === 'highlighter') {
          ctx.strokeStyle = highlighterColor;
          ctx.lineWidth = highlighterSize;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.beginPath();
          ctx.moveTo(currentPath[0].x, currentPath[0].y);
          for (let i = 1; i < currentPath.length; i++) {
            ctx.lineTo(currentPath[i].x, currentPath[i].y);
          }
          ctx.stroke();
        } else if (activeTool === 'arrow') {
          const start = currentPath[0];
          const end = pos;
          ctx.strokeStyle = arrowColor;
          ctx.fillStyle = arrowColor;
          ctx.lineWidth = arrowSize;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(start.x, start.y);
          ctx.lineTo(end.x, end.y);
          ctx.stroke();

          const angle = Math.atan2(end.y - start.y, end.x - start.x);
          const headLength = 15;
          ctx.beginPath();
          ctx.moveTo(end.x, end.y);
          ctx.lineTo(
            end.x - headLength * Math.cos(angle - Math.PI / 6),
            end.y - headLength * Math.sin(angle - Math.PI / 6)
          );
          ctx.lineTo(
            end.x - headLength * Math.cos(angle + Math.PI / 6),
            end.y - headLength * Math.sin(angle + Math.PI / 6)
          );
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }
    };
    img.src = croppedImage!;
  };

  const handleMouseUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    if (activeTool !== 'text' && currentPath.length > 1) {
      const newAnnotation: AnnotationElement = {
        id: `ann-${Date.now()}`,
        type: activeTool,
        x: currentPath[0].x,
        y: currentPath[0].y,
        color:
          activeTool === 'pen'
            ? penColor
            : activeTool === 'highlighter'
            ? highlighterColor
            : arrowColor,
        size:
          activeTool === 'pen'
            ? penSize
            : activeTool === 'highlighter'
            ? highlighterSize
            : arrowSize,
        points: currentPath,
      };
      setAnnotations((prev) => [...prev, newAnnotation]);
    }
    setCurrentPath([]);
  };

  const handleTextSubmit = () => {
    if (tempText.trim()) {
      const newAnnotation: AnnotationElement = {
        id: `ann-${Date.now()}`,
        type: 'text',
        x: textPosition.x,
        y: textPosition.y,
        color: textColor,
        text: tempText,
        fontFamily,
        fontSize,
        bold,
        italic,
      };
      setAnnotations((prev) => [...prev, newAnnotation]);
    }
    setIsAddingText(false);
    setTempText('');
  };

  const undoLast = () => {
    setAnnotations((prev) => prev.slice(0, -1));
  };

  const clearAll = () => {
    setAnnotations([]);
  };

  const exportImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, exportCanvas.width, exportCanvas.height);
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0);
      redrawAnnotations(ctx);

      const dataUrl = exportCanvas.toDataURL('image/png');
      setPreviewImage(dataUrl);
      setShowPreview(true);

      setTimeout(() => {
        saveAs(dataUrl, `annotated-${Date.now()}.png`);
      }, 800);
    };
    img.src = croppedImage!;
  };

  const tools: { id: AnnotationTool; icon: string; label: string }[] = [
    { id: 'pen', icon: '✏️', label: '圆珠笔' },
    { id: 'highlighter', icon: '🖍️', label: '荧光笔' },
    { id: 'arrow', icon: '➡️', label: '箭头' },
    { id: 'text', icon: '📝', label: '文字' },
  ];

  const fontFamilies = ['Arial', 'Times New Roman', 'Courier New', 'Georgia', 'Verdana'];

  if (!croppedImage) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner} />
        <span style={styles.loadingText}>正在处理图片...</span>
      </div>
    );
  }

  return (
    <div style={styles.container} ref={containerRef}>
      <style>{`
        .tool-btn:hover {
          box-shadow: 0 0 15px rgba(0, 210, 255, 0.5) !important;
          transform: translateY(-1px);
        }
        .tool-btn.active {
          background: linear-gradient(135deg, #00d2ff, #3a7bd5) !important;
          color: #fff !important;
          box-shadow: 0 0 20px rgba(0, 210, 255, 0.6) !important;
          border-color: transparent !important;
        }
        .export-btn:hover {
          box-shadow: 0 0 25px rgba(181, 55, 242, 0.7) !important;
          transform: translateY(-2px);
        }
        .action-btn:hover {
          box-shadow: 0 0 15px rgba(0, 210, 255, 0.4) !important;
        }
        .preview-overlay {
          animation: fadeIn 0.3s ease-out;
        }
        .preview-image {
          animation: zoomIn 0.5s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes zoomIn {
          from { 
            opacity: 0; 
            transform: scale(0.8);
          }
          to { 
            opacity: 1; 
            transform: scale(1);
          }
        }
        .toolbar-glow {
          box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.3), 0 0 30px rgba(181, 55, 242, 0.2);
        }
      `}</style>

      <div style={styles.header}>
        <h3 style={styles.title}>✂️ 裁剪标注</h3>
        <button onClick={onClose} style={styles.closeBtn}>
          ×
        </button>
      </div>

      <div style={styles.canvasContainer}>
        <canvas
          ref={canvasRef}
          style={styles.canvas}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
        {isAddingText && (
          <input
            ref={textInputRef}
            type="text"
            value={tempText}
            onChange={(e) => setTempText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleTextSubmit();
              if (e.key === 'Escape') setIsAddingText(false);
            }}
            onBlur={handleTextSubmit}
            style={{
              ...styles.textInput,
              left: `${(textPosition.x / (canvasRef.current?.width || 1)) * 100}%`,
              top: `${(textPosition.y / (canvasRef.current?.height || 1)) * 100}%`,
              color: textColor,
              fontFamily,
              fontSize: `${fontSize}px`,
              fontWeight: bold ? 'bold' : 'normal',
              fontStyle: italic ? 'italic' : 'normal',
            }}
            autoFocus
          />
        )}
      </div>

      <div style={styles.toolbar} className="toolbar-glow">
        <div style={styles.toolSection}>
          <span style={styles.sectionLabel}>工具</span>
          <div style={styles.toolButtons}>
            {tools.map((tool) => (
              <button
                key={tool.id}
                onClick={() => setActiveTool(tool.id)}
                style={{
                  ...styles.toolBtn,
                  ...(activeTool === tool.id ? styles.toolBtnActive : {}),
                }}
                className={`tool-btn ${activeTool === tool.id ? 'active' : ''}`}
                title={tool.label}
              >
                <span style={styles.toolIcon}>{tool.icon}</span>
              </button>
            ))}
          </div>
        </div>

        <div style={styles.divider} />

        {activeTool === 'pen' && (
          <div style={styles.toolSection}>
            <span style={styles.sectionLabel}>颜色</span>
            <input
              type="color"
              value={penColor}
              onChange={(e) => setPenColor(e.target.value)}
              style={styles.colorPicker}
            />
            <span style={styles.sectionLabel}>粗细</span>
            <input
              type="range"
              min="1"
              max="20"
              value={penSize}
              onChange={(e) => setPenSize(Number(e.target.value))}
              style={styles.slider}
            />
            <span style={styles.valueLabel}>{penSize}px</span>
          </div>
        )}

        {activeTool === 'highlighter' && (
          <div style={styles.toolSection}>
            <span style={styles.sectionLabel}>颜色</span>
            <input
              type="color"
              value="#ffeb3b"
              onChange={(e) => {
                const r = parseInt(e.target.value.slice(1, 3), 16);
                const g = parseInt(e.target.value.slice(3, 5), 16);
                const b = parseInt(e.target.value.slice(5, 7), 16);
                setHighlighterColor(`rgba(${r}, ${g}, ${b}, 0.5)`);
              }}
              style={styles.colorPicker}
            />
            <span style={styles.sectionLabel}>粗细</span>
            <input
              type="range"
              min="5"
              max="40"
              value={highlighterSize}
              onChange={(e) => setHighlighterSize(Number(e.target.value))}
              style={styles.slider}
            />
            <span style={styles.valueLabel}>{highlighterSize}px</span>
          </div>
        )}

        {activeTool === 'arrow' && (
          <div style={styles.toolSection}>
            <span style={styles.sectionLabel}>颜色</span>
            <input
              type="color"
              value={arrowColor}
              onChange={(e) => setArrowColor(e.target.value)}
              style={styles.colorPicker}
            />
            <span style={styles.sectionLabel}>粗细</span>
            <input
              type="range"
              min="2"
              max="10"
              value={arrowSize}
              onChange={(e) => setArrowSize(Number(e.target.value))}
              style={styles.slider}
            />
            <span style={styles.valueLabel}>{arrowSize}px</span>
          </div>
        )}

        {activeTool === 'text' && (
          <div style={styles.toolSection}>
            <span style={styles.sectionLabel}>字体</span>
            <select
              value={fontFamily}
              onChange={(e) => setFontFamily(e.target.value)}
              style={styles.select}
            >
              {fontFamilies.map((f) => (
                <option key={f} value={f} style={{ fontFamily: f }}>
                  {f}
                </option>
              ))}
            </select>
            <span style={styles.sectionLabel}>字号</span>
            <input
              type="number"
              min="8"
              max="72"
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              style={styles.numberInput}
            />
            <button
              onClick={() => setBold(!bold)}
              style={{
                ...styles.formatBtn,
                ...(bold ? styles.formatBtnActive : {}),
              }}
            >
              <strong>B</strong>
            </button>
            <button
              onClick={() => setItalic(!italic)}
              style={{
                ...styles.formatBtn,
                ...(italic ? styles.formatBtnActive : {}),
              }}
            >
              <em>I</em>
            </button>
            <span style={styles.sectionLabel}>颜色</span>
            <input
              type="color"
              value={textColor}
              onChange={(e) => setTextColor(e.target.value)}
              style={styles.colorPicker}
            />
          </div>
        )}

        <div style={styles.divider} />

        <div style={styles.toolSection}>
          <button onClick={undoLast} style={styles.actionBtn} className="action-btn" disabled={annotations.length === 0}>
            ↩️ 撤销
          </button>
          <button onClick={clearAll} style={styles.actionBtn} className="action-btn" disabled={annotations.length === 0}>
            🗑️ 清除
          </button>
        </div>

        <div style={styles.toolSection}>
          <button onClick={exportImage} style={styles.exportBtn} className="export-btn">
            💾 导出 PNG
          </button>
        </div>
      </div>

      {showPreview && previewImage && (
        <div style={styles.previewOverlay} className="preview-overlay">
          <div style={styles.previewContainer} className="preview-image">
            <img src={previewImage} alt="Preview" style={styles.previewImage} />
            <div style={styles.previewLabel}>✅ 已开始下载</div>
            <button
              onClick={() => {
                setShowPreview(false);
              }}
              style={styles.previewClose}
            >
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    background: '#1a1b2e',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    background: '#1a1b2e',
  },
  loadingSpinner: {
    width: '40px',
    height: '40px',
    border: '3px solid #3a3b5c',
    borderTopColor: '#00d2ff',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '16px',
  },
  loadingText: {
    color: '#8b8ca8',
    fontSize: '14px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    background: '#252640',
    borderBottom: '1px solid #3a3b5c',
  },
  title: {
    color: '#fff',
    fontSize: '16px',
    fontWeight: 600,
    margin: 0,
  },
  closeBtn: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    background: 'rgba(255, 255, 255, 0.1)',
    border: 'none',
    color: '#fff',
    fontSize: '20px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  canvasContainer: {
    flex: 1,
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'auto',
    padding: '20px',
    background: 'repeating-conic-gradient(#1a1b2e 0% 25%, #252640 0% 50%) 50% / 20px 20px',
  },
  canvas: {
    maxWidth: '100%',
    maxHeight: '100%',
    background: 'transparent',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5), 0 0 0 2px #b537f2',
    borderRadius: '8px',
    cursor: 'crosshair',
  },
  textInput: {
    position: 'absolute',
    background: 'rgba(37, 38, 64, 0.95)',
    border: '2px solid #00d2ff',
    borderRadius: '6px',
    padding: '6px 10px',
    outline: 'none',
    minWidth: '100px',
    boxShadow: '0 0 20px rgba(0, 210, 255, 0.5)',
    backdropFilter: 'blur(10px)',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '14px 20px',
    background: '#252640',
    borderTop: '1px solid #3a3b5c',
    flexWrap: 'wrap',
  },
  toolSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  sectionLabel: {
    color: '#8b8ca8',
    fontSize: '12px',
    fontWeight: 500,
  },
  toolButtons: {
    display: 'flex',
    gap: '6px',
  },
  toolBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '40px',
    height: '40px',
    background: '#1a1b2e',
    border: '1px solid #3a3b5c',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  toolBtnActive: {
    background: 'linear-gradient(135deg, #00d2ff, #3a7bd5)',
    borderColor: 'transparent',
  },
  toolIcon: {
    fontSize: '18px',
  },
  divider: {
    width: '1px',
    height: '40px',
    background: '#3a3b5c',
  },
  colorPicker: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    border: '2px solid #3a3b5c',
    cursor: 'pointer',
    padding: '2px',
    background: '#1a1b2e',
  },
  slider: {
    width: '100px',
    cursor: 'pointer',
  },
  valueLabel: {
    color: '#00d2ff',
    fontSize: '12px',
    fontWeight: 600,
    minWidth: '35px',
  },
  select: {
    padding: '8px 12px',
    background: '#1a1b2e',
    border: '1px solid #3a3b5c',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '13px',
    outline: 'none',
    cursor: 'pointer',
  },
  numberInput: {
    width: '60px',
    padding: '8px 10px',
    background: '#1a1b2e',
    border: '1px solid #3a3b5c',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '13px',
    outline: 'none',
  },
  formatBtn: {
    width: '36px',
    height: '36px',
    background: '#1a1b2e',
    border: '1px solid #3a3b5c',
    borderRadius: '8px',
    color: '#8b8ca8',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  formatBtnActive: {
    background: 'linear-gradient(135deg, #00d2ff, #3a7bd5)',
    color: '#fff',
    borderColor: 'transparent',
  },
  actionBtn: {
    padding: '8px 14px',
    background: '#1a1b2e',
    border: '1px solid #3a3b5c',
    borderRadius: '8px',
    color: '#8b8ca8',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  exportBtn: {
    padding: '10px 20px',
    background: 'linear-gradient(135deg, #b537f2, #7b2ff7)',
    border: 'none',
    borderRadius: '10px',
    color: '#fff',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  previewOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.9)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    backdropFilter: 'blur(8px)',
  },
  previewContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
    maxWidth: '90vw',
    maxHeight: '90vh',
  },
  previewImage: {
    maxWidth: '100%',
    maxHeight: '70vh',
    borderRadius: '12px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8), 0 0 40px rgba(181, 55, 242, 0.4)',
  },
  previewLabel: {
    color: '#00d2ff',
    fontSize: '14px',
    fontWeight: 600,
  },
  previewClose: {
    padding: '10px 30px',
    background: 'linear-gradient(135deg, #00d2ff, #3a7bd5)',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
};

export default CropAnnotate;
