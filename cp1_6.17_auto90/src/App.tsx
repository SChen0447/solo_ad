import { useEffect, useRef, useState, useCallback } from 'react';
import axios from 'axios';
import jsPDF from 'jspdf';
import { LayerManager } from './LayerManager';
import {
  CanvasRenderer,
  FADE_IN_DURATION,
  PULSE_DURATION,
  SHRINK_OUT_DURATION,
  MIN_SCALE,
  MAX_SCALE,
} from './CanvasRenderer';
import type { Annotation, DrawingState, Rect } from './types';
import { formatDate, isPointInRect, normalizeRect, throttle } from './utils';

interface CommentInputState {
  visible: boolean;
  x: number;
  y: number;
  rect: Rect;
  value: string;
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<CanvasRenderer | null>(null);
  const layerManagerRef = useRef<LayerManager | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageName, setImageName] = useState('');
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [currentScale, setCurrentScale] = useState(1);
  const [commentInput, setCommentInput] = useState<CommentInputState>({
    visible: false,
    x: 0,
    y: 0,
    rect: { x: 0, y: 0, width: 0, height: 0 },
    value: '',
  });
  const [isExporting, setIsExporting] = useState(false);
  const [ctrlPressed, setCtrlPressed] = useState(false);

  const isDraggingRef = useRef(false);
  const isDrawingRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  const drawingStartRef = useRef({ x: 0, y: 0 });
  const imageRef = useRef<HTMLImageElement | null>(null);

  const updateScaleDisplay = useCallback(() => {
    if (rendererRef.current) {
      setCurrentScale(rendererRef.current.getScale());
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const renderer = new CanvasRenderer(canvas);
    rendererRef.current = renderer;

    const layerManager = new LayerManager();
    layerManagerRef.current = layerManager;

    const unsubscribe = layerManager.subscribe((anns) => {
      setAnnotations(anns);
      renderer.setAnnotations(anns);
    });

    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect();
      renderer.resize(rect.width, rect.height);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const scaleInterval = setInterval(updateScaleDisplay, 100);

    return () => {
      unsubscribe();
      window.removeEventListener('resize', resizeCanvas);
      clearInterval(scaleInterval);
      renderer.cleanup();
    };
  }, [updateScaleDisplay]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Control') {
        setCtrlPressed(true);
      }
      if (e.key === 'Escape' && commentInput.visible) {
        setCommentInput((prev) => ({ ...prev, visible: false }));
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Control') {
        setCtrlPressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [commentInput.visible]);

  const loadImage = useCallback((file: File) => {
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      setImageName(file.name);
      setImageLoaded(true);

      if (layerManagerRef.current) {
        layerManagerRef.current.clearAll();
      }

      if (rendererRef.current) {
        rendererRef.current.setImage(img);
      }
    };
    img.onerror = () => {
      console.error('Failed to load image');
    };
    img.src = URL.createObjectURL(file);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      loadImage(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      loadImage(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const getCanvasCoords = (e: React.MouseEvent | React.WheelEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!imageLoaded || !rendererRef.current || !layerManagerRef.current) return;

    const { x, y } = getCanvasCoords(e);

    if (ctrlPressed || e.button === 2) {
      const renderer = rendererRef.current;
      const viewState = renderer.getViewState();
      const canvas = canvasRef.current!;
      const container = containerRef.current!;
      const rect = container.getBoundingClientRect();

      const hitAnnotation = layerManagerRef.current.findAnnotationAtPoint(
        x,
        y,
        viewState,
        rect.width,
        rect.height,
        imageDimensions.width,
        imageDimensions.height,
        4
      );

      if (hitAnnotation) {
        const deleteBtnRect = renderer.getDeleteButtonRect(hitAnnotation);
        if (deleteBtnRect && isPointInRect(x, y, deleteBtnRect)) {
          renderer.addAnimationState({
            id: hitAnnotation.id,
            type: 'shrinkOut',
            startTime: performance.now(),
            duration: SHRINK_OUT_DURATION,
          });
          setTimeout(() => {
            layerManagerRef.current?.removeAnnotation(hitAnnotation.id);
            renderer.removeAnimationState(hitAnnotation.id);
          }, SHRINK_OUT_DURATION);
          return;
        }
      }

      isDrawingRef.current = true;
      drawingStartRef.current = { x, y };
      renderer.setDrawingState({
        isDrawing: true,
        startX: x,
        startY: y,
        currentX: x,
        currentY: y,
      });
      return;
    }

    const renderer = rendererRef.current;
    const container = containerRef.current!;
    const rect = container.getBoundingClientRect();
    const viewState = renderer.getViewState();

    const hitAnnotation = layerManagerRef.current.findAnnotationAtPoint(
      x,
      y,
      viewState,
      rect.width,
      rect.height,
      imageDimensions.width,
      imageDimensions.height,
      4
    );

    if (hitAnnotation) {
      const deleteBtnRect = renderer.getDeleteButtonRect(hitAnnotation);
      if (deleteBtnRect && isPointInRect(x, y, deleteBtnRect)) {
        renderer.addAnimationState({
          id: hitAnnotation.id,
          type: 'shrinkOut',
          startTime: performance.now(),
          duration: SHRINK_OUT_DURATION,
        });
        setTimeout(() => {
          layerManagerRef.current?.removeAnnotation(hitAnnotation.id);
          renderer.removeAnimationState(hitAnnotation.id);
        }, SHRINK_OUT_DURATION);
        return;
      }
    }

    isDraggingRef.current = true;
    lastMousePosRef.current = { x, y };
  };

  const throttledPan = useCallback(
    throttle((dx: number, dy: number) => {
      rendererRef.current?.pan(dx, dy);
    }, 16),
    []
  );

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!imageLoaded || !rendererRef.current || !layerManagerRef.current) return;

    const { x, y } = getCanvasCoords(e);

    if (isDrawingRef.current) {
      rendererRef.current.setDrawingState({
        isDrawing: true,
        startX: drawingStartRef.current.x,
        startY: drawingStartRef.current.y,
        currentX: x,
        currentY: y,
      });
      return;
    }

    if (isDraggingRef.current) {
      const dx = x - lastMousePosRef.current.x;
      const dy = y - lastMousePosRef.current.y;
      lastMousePosRef.current = { x, y };
      throttledPan(dx, dy);
      return;
    }

    const renderer = rendererRef.current;
    const container = containerRef.current!;
    const rect = container.getBoundingClientRect();
    const viewState = renderer.getViewState();

    const hitAnnotation = layerManagerRef.current.findAnnotationAtPoint(
      x,
      y,
      viewState,
      rect.width,
      rect.height,
      imageDimensions.width,
      imageDimensions.height,
      4
    );

    renderer.setHoveringAnnotation(hitAnnotation?.id || null);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    const { x, y } = getCanvasCoords(e);

    if (isDrawingRef.current) {
      isDrawingRef.current = false;
      if (rendererRef.current) {
        const rect = normalizeRect(
          drawingStartRef.current.x,
          drawingStartRef.current.y,
          x,
          y
        );

        const minSize = 5;
        if (rect.width >= minSize && rect.height >= minSize) {
          setCommentInput({
            visible: true,
            x: rect.x,
            y: rect.y,
            rect,
            value: '',
          });
        }

        rendererRef.current.setDrawingState({ isDrawing: false });
      }
      return;
    }

    isDraggingRef.current = false;
  };

  const handleMouseLeave = () => {
    isDraggingRef.current = false;
    if (isDrawingRef.current && rendererRef.current) {
      isDrawingRef.current = false;
      rendererRef.current.setDrawingState({ isDrawing: false });
    }
    if (rendererRef.current) {
      rendererRef.current.setHoveringAnnotation(null);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (!imageLoaded || !rendererRef.current) return;
    e.preventDefault();

    const { x, y } = getCanvasCoords(e);
    const zoomFactor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    rendererRef.current.zoomAt(x, y, zoomFactor, true);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  const handleCommentSubmit = () => {
    if (!rendererRef.current || !layerManagerRef.current || !commentInput.visible) return;

    const container = containerRef.current!;
    const rect = container.getBoundingClientRect();
    const viewState = rendererRef.current.getViewState();

    const annotation = layerManagerRef.current.addAnnotationFromCanvasRect(
      commentInput.rect,
      commentInput.value.trim() || '未命名标注',
      viewState,
      rect.width,
      rect.height,
      imageDimensions.width,
      imageDimensions.height
    );

    rendererRef.current.addAnimationState({
      id: annotation.id,
      type: 'fadeIn',
      startTime: performance.now(),
      duration: FADE_IN_DURATION,
    });

    setTimeout(() => {
      rendererRef.current?.addAnimationState({
        id: annotation.id,
        type: 'pulse',
        startTime: performance.now(),
        duration: PULSE_DURATION,
      });
    }, FADE_IN_DURATION);

    setTimeout(() => {
      rendererRef.current?.removeAnimationState(annotation.id);
    }, FADE_IN_DURATION + PULSE_DURATION);

    setCommentInput((prev) => ({ ...prev, visible: false, value: '' }));
  };

  const handleCommentCancel = () => {
    setCommentInput((prev) => ({ ...prev, visible: false, value: '' }));
  };

  const triggerExport = useCallback(async () => {
    if (!imageLoaded || !layerManagerRef.current || !rendererRef.current || !imageRef.current) {
      return;
    }

    setIsExporting(true);
    try {
      const container = containerRef.current!;
      const rect = container.getBoundingClientRect();
      const viewState = rendererRef.current.getViewState();

      const exportData = layerManagerRef.current.getExportData(
        imageName,
        viewState,
        rect.width,
        rect.height,
        imageDimensions.width,
        imageDimensions.height
      );

      const jsonPayload = JSON.stringify(exportData);

      try {
        const response = await axios.post('/api/export-pdf', exportData, {
          responseType: 'blob',
          timeout: 30000,
        });

        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `annotations_${Date.now()}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch (apiError) {
        console.log('后端API不可用，使用前端生成PDF作为回退方案');
        await generatePDFClientSide(exportData);
      }
    } catch (error) {
      console.error('导出PDF失败:', error);
      alert('导出PDF失败，请稍后重试');
    } finally {
      setIsExporting(false);
    }
  }, [imageLoaded, imageName, imageDimensions]);

  const generatePDFClientSide = async (exportData: typeof import('./types').ExportData) => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;

    doc.setFillColor(26, 26, 46);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    doc.setTextColor(212, 175, 55);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Image Annotation Report', pageWidth / 2, margin + 5, { align: 'center' });

    doc.setFontSize(11);
    doc.setTextColor(200, 200, 200);
    doc.setFont('helvetica', 'normal');
    doc.text(`File: ${exportData.imageName}`, margin, margin + 18);
    doc.text(`Exported: ${formatDate(exportData.exportedAt)}`, margin, margin + 25);
    doc.text(
      `Dimensions: ${imageDimensions.width} x ${imageDimensions.height} px`,
      margin,
      margin + 32
    );
    doc.text(
      `Zoom Level: ${exportData.zoomLevel.toFixed(2)}x`,
      margin,
      margin + 39
    );
    doc.text(
      `View Center: (${(exportData.viewCenterX_ratio * 100).toFixed(1)}%, ${(
        exportData.viewCenterY_ratio * 100
      ).toFixed(1)}%)`,
      margin,
      margin + 46
    );
    doc.text(
      `Total Annotations: ${exportData.annotations.length}`,
      margin,
      margin + 53
    );

    const imgData = await getImageDataURL();
    if (imgData) {
      const thumbMaxWidth = pageWidth - margin * 2;
      const thumbMaxHeight = 80;
      const imgAspect = imageDimensions.width / imageDimensions.height;
      let thumbWidth = thumbMaxWidth;
      let thumbHeight = thumbWidth / imgAspect;
      if (thumbHeight > thumbMaxHeight) {
        thumbHeight = thumbMaxHeight;
        thumbWidth = thumbHeight * imgAspect;
      }
      const thumbX = (pageWidth - thumbWidth) / 2;
      const thumbY = margin + 60;

      doc.setDrawColor(212, 175, 55);
      doc.setLineWidth(0.5);
      doc.rect(thumbX - 1, thumbY - 1, thumbWidth + 2, thumbHeight + 2);

      try {
        doc.addImage(imgData, 'JPEG', thumbX, thumbY, thumbWidth, thumbHeight);
      } catch {
        doc.addImage(imgData, 'PNG', thumbX, thumbY, thumbWidth, thumbHeight);
      }
    }

    if (exportData.annotations.length > 0) {
      let yOffset = margin + 160;
      const contentWidth = pageWidth - margin * 2;

      doc.setFillColor(212, 175, 55);
      doc.rect(margin, yOffset - 8, contentWidth, 0.3, 'F');

      doc.setTextColor(212, 175, 55);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Annotations', margin, yOffset);
      yOffset += 10;

      const anns = exportData.annotations.sort((a, b) => a.createdAt - b.createdAt);

      for (let i = 0; i < anns.length; i++) {
        if (yOffset > pageHeight - 40) {
          doc.addPage();
          doc.setFillColor(26, 26, 46);
          doc.rect(0, 0, pageWidth, pageHeight, 'F');
          yOffset = margin + 10;
        }

        const ann = anns[i];
        const idx = i + 1;

        doc.setDrawColor(212, 175, 55);
        doc.setFillColor(35, 35, 60);
        doc.roundedRect(margin, yOffset, contentWidth, 0, 2, 2, 'F');

        doc.setTextColor(212, 175, 55);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`#${idx}`, margin + 3, yOffset + 7);

        doc.setTextColor(220, 220, 220);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(
          `Position: (${(ann.x_ratio * 100).toFixed(1)}%, ${(ann.y_ratio * 100).toFixed(1)}%)`,
          margin + 20,
          yOffset + 7
        );
        doc.text(
          `Size: ${(ann.width_ratio * 100).toFixed(1)}% x ${(ann.height_ratio * 100).toFixed(1)}%`,
          margin + 20,
          yOffset + 12
        );

        const commentLines = doc.splitTextToSize(ann.comment || '(No comment)', contentWidth - 8);
        doc.setTextColor(240, 240, 240);
        doc.setFontSize(10);
        yOffset += 18;
        for (const line of commentLines) {
          if (yOffset > pageHeight - 15) {
            doc.addPage();
            doc.setFillColor(26, 26, 46);
            doc.rect(0, 0, pageWidth, pageHeight, 'F');
            yOffset = margin + 5;
          }
          doc.text(line, margin + 4, yOffset);
          yOffset += 5;
        }

        doc.setTextColor(128, 128, 128);
        doc.setFontSize(8);
        doc.text(formatDate(ann.createdAt), margin + 3, yOffset + 2);
        yOffset += 10;
      }
    } else {
      const yOffset = margin + 170;
      doc.setTextColor(180, 180, 180);
      doc.setFontSize(12);
      doc.text('No annotations found.', pageWidth / 2, yOffset, { align: 'center' });
    }

    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `annotations_${Date.now()}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getImageDataURL = (): Promise<string | null> => {
    return new Promise((resolve) => {
      if (!imageRef.current) {
        resolve(null);
        return;
      }
      try {
        const canvas = document.createElement('canvas');
        const maxWidth = 800;
        const scale = Math.min(1, maxWidth / imageDimensions.width);
        canvas.width = Math.floor(imageDimensions.width * scale);
        canvas.height = Math.floor(imageDimensions.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(imageRef.current, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      } catch {
        resolve(null);
      }
    });
  };

  const handleFitToScreen = () => {
    rendererRef.current?.fitToScreen();
  };

  const handleZoomIn = () => {
    if (!rendererRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    rendererRef.current.zoomAt(rect.width / 2, rect.height / 2, 1.3, true);
  };

  const handleZoomOut = () => {
    if (!rendererRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    rendererRef.current.zoomAt(rect.width / 2, rect.height / 2, 1 / 1.3, true);
  };

  const handleClearAll = () => {
    if (annotations.length === 0) return;
    if (confirm('确定要清除所有标注吗？此操作不可撤销。')) {
      layerManagerRef.current?.clearAll();
    }
  };

  const handleScaleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val) && rendererRef.current) {
      rendererRef.current.setScale(val / 100, true);
    }
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: '#1a1a2e',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <header
        style={{
          height: 56,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          background: 'rgba(26, 26, 46, 0.75)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(212, 175, 55, 0.2)',
          zIndex: 100,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'linear-gradient(135deg, #d4af37 0%, #b8941f 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              color: '#1a1a2e',
              fontSize: 16,
              boxShadow: '0 2px 8px rgba(212, 175, 55, 0.4)',
            }}
          >
            M
          </div>
          <h1
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: '#d4af37',
              letterSpacing: 0.5,
            }}
          >
            图片标注工具
          </h1>
          {imageLoaded && (
            <span
              style={{
                fontSize: 12,
                color: 'rgba(255, 255, 255, 0.5)',
                marginLeft: 12,
                padding: '4px 10px',
                background: 'rgba(255, 255, 255, 0.06)',
                borderRadius: 12,
              }}
            >
              {imageName} · {imageDimensions.width}×{imageDimensions.height}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ToolButton onClick={handleZoomOut} disabled={!imageLoaded} title="缩小">
            <span style={{ fontSize: 16 }}>−</span>
          </ToolButton>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '0 10px',
              height: 34,
              minWidth: 80,
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: 8,
              border: '1px solid rgba(212, 175, 55, 0.2)',
            }}
          >
            <input
              type="number"
              value={Math.round(currentScale * 100)}
              onChange={handleScaleInput}
              min={MIN_SCALE * 100}
              max={MAX_SCALE * 100}
              step={10}
              disabled={!imageLoaded}
              style={{
                width: 50,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#d4af37',
                fontSize: 13,
                fontWeight: 500,
                textAlign: 'center',
              }}
            />
            <span style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: 12 }}>%</span>
          </div>
          <ToolButton onClick={handleZoomIn} disabled={!imageLoaded} title="放大">
            <span style={{ fontSize: 16 }}>+</span>
          </ToolButton>
          <Divider />
          <ToolButton onClick={handleFitToScreen} disabled={!imageLoaded} title="适应屏幕">
            <span style={{ fontSize: 14 }}>⤢</span>
          </ToolButton>
          <Divider />
          <ToolButton onClick={() => fileInputRef.current?.click()} title="上传图片" primary>
            <span style={{ fontSize: 14, marginRight: 6 }}>📁</span>
            <span style={{ fontSize: 13 }}>加载图片</span>
          </ToolButton>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
        </div>
      </header>

      <main
        ref={containerRef}
        style={{
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
          minHeight: 0,
          cursor: imageLoaded ? (ctrlPressed ? 'crosshair' : 'grab') : 'default',
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onWheel={handleWheel}
          onContextMenu={handleContextMenu}
          style={{
            display: 'block',
            width: '100%',
            height: '100%',
            cursor: imageLoaded ? (ctrlPressed ? 'crosshair' : 'grab') : 'default',
          }}
        />

        {!imageLoaded && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 24,
            }}
          >
            <div
              style={{
                width: 120,
                height: 120,
                borderRadius: 24,
                background: 'rgba(212, 175, 55, 0.08)',
                border: '2px dashed rgba(212, 175, 55, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 48,
              }}
            >
              🖼️
            </div>
            <div style={{ textAlign: 'center' }}>
              <h2
                style={{
                  fontSize: 22,
                  color: '#d4af37',
                  fontWeight: 600,
                  marginBottom: 10,
                }}
              >
                拖放图片到此处，或点击顶部加载图片按钮
              </h2>
              <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: 14, lineHeight: 1.8 }}>
                支持 JPG、PNG、WEBP、TIFF 等格式
                <br />
                建议使用高分辨率图片以获得最佳标注效果
              </p>
            </div>
            <div
              style={{
                display: 'flex',
                gap: 12,
                marginTop: 12,
                padding: 16,
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: 12,
                border: '1px solid rgba(255, 255, 255, 0.06)',
              }}
            >
              <ShortcutBadge label="滚轮缩放" keys={['⿳']} />
              <ShortcutBadge label="拖拽平移" keys={['拖拽']} />
              <ShortcutBadge label="绘制标注" keys={['Ctrl', '+', '拖拽']} />
              <ShortcutBadge label="右键绘制" keys={['右键拖拽']} />
            </div>
          </div>
        )}

        {commentInput.visible && (
          <div
            style={{
              position: 'absolute',
              left: commentInput.x,
              top: commentInput.y - 140,
              minWidth: 280,
              background: 'rgba(26, 26, 46, 0.97)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(212, 175, 55, 0.4)',
              borderRadius: 12,
              padding: 14,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(212, 175, 55, 0.1)',
              zIndex: 200,
              animation: 'fadeIn 0.2s ease-out',
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: '#d4af37',
                marginBottom: 10,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>📝</span>
              <span>添加文字注释</span>
            </div>
            <textarea
              autoFocus
              value={commentInput.value}
              onChange={(e) =>
                setCommentInput((prev) => ({ ...prev, value: e.target.value }))
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  handleCommentSubmit();
                }
                if (e.key === 'Escape') {
                  handleCommentCancel();
                }
              }}
              placeholder="在此输入注释内容...&#10;支持换行（Ctrl+Enter提交）"
              rows={3}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(212, 175, 55, 0.25)',
                borderRadius: 8,
                color: '#fff',
                fontSize: 13,
                lineHeight: 1.6,
                resize: 'vertical',
                minHeight: 72,
                outline: 'none',
                fontFamily: 'inherit',
              }}
            />
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 8,
                marginTop: 12,
              }}
            >
              <button
                onClick={handleCommentCancel}
                style={{
                  padding: '7px 16px',
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 6,
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontSize: 13,
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    'rgba(255, 255, 255, 0.12)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    'rgba(255, 255, 255, 0.06)';
                }}
              >
                取消
              </button>
              <button
                onClick={handleCommentSubmit}
                style={{
                  padding: '7px 16px',
                  background: 'linear-gradient(135deg, #d4af37 0%, #b8941f 100%)',
                  border: 'none',
                  borderRadius: 6,
                  color: '#1a1a2e',
                  fontSize: 13,
                  fontWeight: 600,
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 8px rgba(212, 175, 55, 0.3)',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)';
                  (e.currentTarget as HTMLButtonElement).style.boxShadow =
                    '0 4px 16px rgba(212, 175, 55, 0.5)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
                  (e.currentTarget as HTMLButtonElement).style.boxShadow =
                    '0 2px 8px rgba(212, 175, 55, 0.3)';
                }}
              >
                确认 (Ctrl+Enter)
              </button>
            </div>
          </div>
        )}
      </main>

      <footer
        style={{
          height: 56,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          background: 'rgba(26, 26, 46, 0.75)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderTop: '1px solid rgba(212, 175, 55, 0.2)',
          zIndex: 100,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 14px',
              background: 'rgba(212, 175, 55, 0.1)',
              borderRadius: 20,
              border: '1px solid rgba(212, 175, 55, 0.25)',
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: '#d4af37',
                color: '#1a1a2e',
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {annotations.length}
            </span>
            <span style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: 13 }}>
              标注总数
            </span>
          </div>

          {ctrlPressed && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '5px 12px',
                background: 'rgba(212, 175, 55, 0.15)',
                borderRadius: 6,
                border: '1px solid rgba(212, 175, 55, 0.4)',
                color: '#d4af37',
                fontSize: 12,
                fontWeight: 500,
              }}
            >
              <span>✏️</span>
              <span>标注模式：按住拖拽绘制标注框</span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ToolButton
            onClick={handleClearAll}
            disabled={annotations.length === 0}
            title="清除所有标注"
            danger
          >
            <span style={{ fontSize: 14, marginRight: 6 }}>🗑️</span>
            <span style={{ fontSize: 13 }}>清除全部</span>
          </ToolButton>
          <Divider />
          <button
            onClick={triggerExport}
            disabled={!imageLoaded || isExporting}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '9px 22px',
              background:
                !imageLoaded || isExporting
                  ? 'rgba(255, 255, 255, 0.06)'
                  : 'linear-gradient(135deg, #d4af37 0%, #c9a227 50%, #b8941f 100%)',
              border:
                !imageLoaded || isExporting
                  ? '1px solid rgba(255, 255, 255, 0.1)'
                  : '1px solid rgba(212, 175, 55, 0.6)',
              borderRadius: 8,
              color: !imageLoaded || isExporting ? 'rgba(255, 255, 255, 0.35)' : '#1a1a2e',
              fontSize: 14,
              fontWeight: 600,
              transition: 'all 0.2s ease',
              boxShadow:
                !imageLoaded || isExporting ? 'none' : '0 4px 14px rgba(212, 175, 55, 0.35)',
              cursor: !imageLoaded || isExporting ? 'not-allowed' : 'pointer',
            }}
            onMouseEnter={(e) => {
              if (!imageLoaded || isExporting) return;
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow =
                '0 6px 20px rgba(212, 175, 55, 0.55), 0 0 0 1px rgba(212, 175, 55, 0.3)';
            }}
            onMouseLeave={(e) => {
              if (!imageLoaded || isExporting) return;
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow =
                '0 4px 14px rgba(212, 175, 55, 0.35)';
            }}
          >
            <span style={{ fontSize: 15 }}>
              {isExporting ? '⏳' : '📄'}
            </span>
            <span>{isExporting ? '正在生成...' : '导出报告'}</span>
          </button>
        </div>
      </footer>
    </div>
  );
}

function ToolButton({
  children,
  onClick,
  disabled,
  title,
  primary,
  danger,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
  primary?: boolean;
  danger?: boolean;
}) {
  const getBg = () => {
    if (disabled) return 'rgba(255, 255, 255, 0.04)';
    if (primary) return 'rgba(212, 175, 55, 0.15)';
    if (danger) return 'rgba(220, 53, 69, 0.1)';
    return 'rgba(255, 255, 255, 0.05)';
  };
  const getBorder = () => {
    if (disabled) return '1px solid rgba(255, 255, 255, 0.08)';
    if (primary) return '1px solid rgba(212, 175, 55, 0.35)';
    if (danger) return '1px solid rgba(220, 53, 69, 0.3)';
    return '1px solid rgba(255, 255, 255, 0.1)';
  };
  const getColor = () => {
    if (disabled) return 'rgba(255, 255, 255, 0.3)';
    if (primary) return '#d4af37';
    if (danger) return '#e57373';
    return 'rgba(255, 255, 255, 0.85)';
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: 34,
        minWidth: 34,
        padding: '0 12px',
        background: getBg(),
        border: getBorder(),
        borderRadius: 8,
        color: getColor(),
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.18s ease',
        fontWeight: primary ? 500 : 400,
      }}
      onMouseEnter={(e) => {
        if (disabled) return;
        const btn = e.currentTarget as HTMLButtonElement;
        btn.style.transform = 'scale(1.06)';
        if (primary) {
          btn.style.background = 'rgba(212, 175, 55, 0.25)';
          btn.style.border = '1px solid rgba(212, 175, 55, 0.55)';
          btn.style.boxShadow = '0 0 0 1px rgba(212, 175, 55, 0.25), 0 2px 12px rgba(212, 175, 55, 0.3)';
        } else if (danger) {
          btn.style.background = 'rgba(220, 53, 69, 0.2)';
          btn.style.border = '1px solid rgba(220, 53, 69, 0.5)';
          btn.style.boxShadow = '0 2px 12px rgba(220, 53, 69, 0.25)';
        } else {
          btn.style.background = 'rgba(255, 255, 255, 0.12)';
          btn.style.border = '1px solid rgba(255, 255, 255, 0.2)';
          btn.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.2)';
        }
      }}
      onMouseLeave={(e) => {
        const btn = e.currentTarget as HTMLButtonElement;
        btn.style.transform = 'scale(1)';
        btn.style.background = getBg();
        btn.style.border = getBorder();
        btn.style.boxShadow = 'none';
      }}
    >
      {children}
    </button>
  );
}

function Divider() {
  return (
    <div
      style={{
        width: 1,
        height: 24,
        background: 'rgba(255, 255, 255, 0.08)',
      }}
    />
  );
}

function ShortcutBadge({
  label,
  keys,
}: {
  label: string;
  keys: string[];
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 12px',
        background: 'rgba(255, 255, 255, 0.04)',
        borderRadius: 8,
      }}
    >
      <div style={{ display: 'flex', gap: 3 }}>
        {keys.map((key, i) => (
          <span
            key={i}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '3px 8px',
              minWidth: 28,
              height: 22,
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(212, 175, 55, 0.2)',
              borderRadius: 5,
              color: '#d4af37',
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            {key}
          </span>
        ))}
      </div>
      <span style={{ color: 'rgba(255, 255, 255, 0.55)', fontSize: 12 }}>{label}</span>
    </div>
  );
}
