import { useEffect, useRef, useState, useCallback } from 'react';
import { fabric } from 'fabric';
import type { Annotation } from '../types';

interface ImageAnnotatorProps {
  imageUrl: string;
  imageIndex: number;
  existingAnnotations?: Annotation[];
  readonly?: boolean;
  onAnnotationsChange?: (annotations: Annotation[]) => void;
  onAnnotationClick?: (annotationId: string) => void;
}

const generateId = () =>
  'ann_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export default function ImageAnnotator({
  imageUrl,
  imageIndex,
  existingAnnotations = [],
  readonly = false,
  onAnnotationsChange,
  onAnnotationClick,
}: ImageAnnotatorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const imgRef = useRef<fabric.Image | null>(null);
  const [activeTool, setActiveTool] = useState<'rectangle' | 'arrow' | null>(
    null
  );
  const [annotations, setAnnotations] = useState<Annotation[]>(
    existingAnnotations.filter((a) => a.imageIndex === imageIndex)
  );
  const isDrawingRef = useRef(false);
  const startPointRef = useRef<{ x: number; y: number } | null>(null);
  const currentObjectRef = useRef<fabric.Object | null>(null);

  const redrawAnnotations = useCallback(
    (anns: Annotation[], canvas: fabric.Canvas) => {
      const objects = canvas.getObjects().filter((o) => o.data?.isAnnotation);
      objects.forEach((o) => canvas.remove(o));

      anns.forEach((ann) => {
        if (ann.type === 'rectangle' && ann.width && ann.height) {
          const rect = new fabric.Rect({
            left: ann.x,
            top: ann.y,
            width: ann.width,
            height: ann.height,
            fill: 'rgba(24, 144, 255, 0.25)',
            stroke: '#ffffff',
            strokeWidth: 2,
            selectable: !readonly,
            hasControls: !readonly,
            hasBorders: true,
            shadow: new fabric.Shadow({
              color: 'rgba(0,0,0,0.3)',
              blur: 8,
            }),
          });
          rect.set('data', { isAnnotation: true, annotationId: ann.id });
          canvas.add(rect);
        } else if (ann.type === 'arrow' && ann.endX !== undefined && ann.endY !== undefined) {
          const line = new fabric.Line([ann.x, ann.y, ann.endX, ann.endY], {
            stroke: '#f5222d',
            strokeWidth: 3,
            selectable: !readonly,
            hasControls: !readonly,
            hasBorders: true,
            strokeLineCap: 'round',
          });
          line.set('data', { isAnnotation: true, annotationId: ann.id });
          canvas.add(line);

          const angle = Math.atan2(ann.endY - ann.y, ann.endX - ann.x);
          const headLen = 15;
          const triangle = new fabric.Polygon(
            [
              { x: ann.endX, y: ann.endY },
              {
                x: ann.endX - headLen * Math.cos(angle - Math.PI / 6),
                y: ann.endY - headLen * Math.sin(angle - Math.PI / 6),
              },
              {
                x: ann.endX - headLen * Math.cos(angle + Math.PI / 6),
                y: ann.endY - headLen * Math.sin(angle + Math.PI / 6),
              },
            ],
            {
              fill: '#f5222d',
              selectable: false,
              evented: false,
            }
          );
          triangle.set('data', { isAnnotation: true, annotationId: ann.id });
          canvas.add(triangle);
        }
      });
      canvas.renderAll();
    },
    [readonly]
  );

  const exportAnnotationsFromCanvas = useCallback(
    (canvas: fabric.Canvas): Annotation[] => {
      const result: Annotation[] = [];
      const processed = new Set<string>();

      canvas.getObjects().forEach((obj) => {
        const data = obj.data as { isAnnotation?: boolean; annotationId?: string };
        if (!data?.isAnnotation || !data.annotationId) return;
        if (processed.has(data.annotationId)) return;
        processed.add(data.annotationId);

        if (obj.type === 'rect') {
          const rect = obj as fabric.Rect;
          result.push({
            id: data.annotationId,
            type: 'rectangle',
            imageIndex,
            x: rect.left || 0,
            y: rect.top || 0,
            width: rect.width || 0,
            height: rect.height || 0,
          });
        } else if (obj.type === 'line') {
          const line = obj as fabric.Line;
          result.push({
            id: data.annotationId,
            type: 'arrow',
            imageIndex,
            x: line.x1 || 0,
            y: line.y1 || 0,
            endX: line.x2 || 0,
            endY: line.y2 || 0,
          });
        }
      });
      return result;
    },
    [imageIndex]
  );

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: 720,
      height: 540,
      selection: !readonly,
      renderOnAddRemove: true,
      fireRightClick: true,
      stopContextMenu: true,
    });
    fabricRef.current = canvas;

    fabric.Image.fromURL(
      imageUrl,
      (img) => {
        if (!img) return;
        const scale = Math.min(720 / (img.width || 1), 540 / (img.height || 1));
        img.set({
          left: 0,
          top: 0,
          scaleX: scale,
          scaleY: scale,
          selectable: false,
          evented: false,
        });
        imgRef.current = img;
        canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas));

        const currentImgAnns = annotations.filter((a) => a.imageIndex === imageIndex);
        if (currentImgAnns.length > 0) {
          redrawAnnotations(currentImgAnns, canvas);
        }
      },
      { crossOrigin: 'anonymous' }
    );

    canvas.on('mouse:down', (opt) => {
      if (readonly) {
        if (opt.target?.data?.isAnnotation && opt.target.data.annotationId) {
          onAnnotationClick?.(opt.target.data.annotationId);
        }
        return;
      }
      if (!activeTool || !opt.pointer) return;

      const target = opt.target;
      if (target && target.data?.isAnnotation) {
        canvas.setActiveObject(target);
        return;
      }

      isDrawingRef.current = true;
      startPointRef.current = { x: opt.pointer.x, y: opt.pointer.y };

      if (activeTool === 'rectangle') {
        const rect = new fabric.Rect({
          left: opt.pointer.x,
          top: opt.pointer.y,
          width: 0,
          height: 0,
          fill: 'rgba(24, 144, 255, 0.25)',
          stroke: '#ffffff',
          strokeWidth: 2,
          selectable: true,
          hasControls: true,
        });
        rect.set('data', { isAnnotation: true, annotationId: generateId() });
        canvas.add(rect);
        currentObjectRef.current = rect;
      } else if (activeTool === 'arrow') {
        const line = new fabric.Line(
          [opt.pointer.x, opt.pointer.y, opt.pointer.x, opt.pointer.y],
          {
            stroke: '#f5222d',
            strokeWidth: 3,
            strokeLineCap: 'round',
          }
        );
        line.set('data', { isAnnotation: true, annotationId: generateId() });
        canvas.add(line);
        currentObjectRef.current = line;
      }
    });

    canvas.on('mouse:move', (opt) => {
      if (!isDrawingRef.current || !opt.pointer || !startPointRef.current) return;

      if (activeTool === 'rectangle' && currentObjectRef.current?.type === 'rect') {
        const rect = currentObjectRef.current as fabric.Rect;
        const startX = startPointRef.current.x;
        const startY = startPointRef.current.y;
        const curX = opt.pointer.x;
        const curY = opt.pointer.y;

        rect.set({
          left: Math.min(startX, curX),
          top: Math.min(startY, curY),
          width: Math.abs(curX - startX),
          height: Math.abs(curY - startY),
        });
        canvas.renderAll();
      } else if (activeTool === 'arrow' && currentObjectRef.current?.type === 'line') {
        const line = currentObjectRef.current as fabric.Line;
        line.set({
          x2: opt.pointer.x,
          y2: opt.pointer.y,
        });
        canvas.renderAll();
      }
    });

    canvas.on('mouse:up', () => {
      if (!isDrawingRef.current || !currentObjectRef.current) {
        isDrawingRef.current = false;
        return;
      }

      const obj = currentObjectRef.current;
      const data = obj.data as { annotationId: string };

      let valid = false;
      if (obj.type === 'rect') {
        const rect = obj as fabric.Rect;
        valid = (rect.width || 0) > 10 && (rect.height || 0) > 10;
        if (!valid) {
          canvas.remove(obj);
        }
      } else if (obj.type === 'line') {
        const line = obj as fabric.Line;
        const dx = (line.x2 || 0) - (line.x1 || 0);
        const dy = (line.y2 || 0) - (line.y1 || 0);
        valid = Math.sqrt(dx * dx + dy * dy) > 15;
        if (!valid) {
          canvas.remove(obj);
        }
      }

      isDrawingRef.current = false;
      currentObjectRef.current = null;
      startPointRef.current = null;

      if (valid) {
        const exported = exportAnnotationsFromCanvas(canvas);
        setAnnotations(exported);
        onAnnotationsChange?.(exported);

        if (obj.type === 'arrow' && data.annotationId) {
          const line = obj as fabric.Line;
          const angle = Math.atan2(
            (line.y2 || 0) - (line.y1 || 0),
            (line.x2 || 0) - (line.x1 || 0)
          );
          const headLen = 15;
          const triangle = new fabric.Polygon(
            [
              { x: line.x2 || 0, y: line.y2 || 0 },
              {
                x: (line.x2 || 0) - headLen * Math.cos(angle - Math.PI / 6),
                y: (line.y2 || 0) - headLen * Math.sin(angle - Math.PI / 6),
              },
              {
                x: (line.x2 || 0) - headLen * Math.cos(angle + Math.PI / 6),
                y: (line.y2 || 0) - headLen * Math.sin(angle + Math.PI / 6),
              },
            ],
            {
              fill: '#f5222d',
              selectable: false,
              evented: false,
            }
          );
          triangle.set('data', { isAnnotation: true, annotationId: data.annotationId });
          canvas.add(triangle);
        }
      }
      canvas.renderAll();
    });

    canvas.on('object:modified', () => {
      const exported = exportAnnotationsFromCanvas(canvas);
      setAnnotations(exported);
      onAnnotationsChange?.(exported);
    });

    canvas.on('selection:created', (opt) => {
      opt.selected?.forEach((o) => {
        if (o.data?.isAnnotation) {
          o.set('shadow', new fabric.Shadow({ color: 'rgba(0,0,0,0.5)', blur: 15 }));
          canvas.renderAll();
        }
      });
    });

    canvas.on('selection:cleared', () => {
      canvas.getObjects().forEach((o) => {
        if (o.data?.isAnnotation) {
          o.set('shadow', new fabric.Shadow({ color: 'rgba(0,0,0,0.3)', blur: 8 }));
        }
      });
      canvas.renderAll();
    });

    return () => {
      canvas.dispose();
      fabricRef.current = null;
    };
  }, [imageUrl, readonly, activeTool, annotations, imageIndex, redrawAnnotations, exportAnnotationsFromCanvas, onAnnotationClick]);

  useEffect(() => {
    if (!fabricRef.current) return;
    const currentImgAnns = existingAnnotations.filter((a) => a.imageIndex === imageIndex);
    setAnnotations(currentImgAnns);
    redrawAnnotations(currentImgAnns, fabricRef.current);
  }, [existingAnnotations, imageIndex, redrawAnnotations]);

  const handleDeleteSelected = () => {
    if (!fabricRef.current || readonly) return;
    const active = fabricRef.current.getActiveObject();
    if (!active || !active.data?.isAnnotation) return;
    const annId = active.data.annotationId as string;

    fabricRef.current.getObjects().forEach((o) => {
      if (o.data?.annotationId === annId) {
        fabricRef.current?.remove(o);
      }
    });
    fabricRef.current.discardActiveObject();

    const exported = exportAnnotationsFromCanvas(fabricRef.current);
    setAnnotations(exported);
    onAnnotationsChange?.(exported);
    fabricRef.current.renderAll();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {!readonly && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveTool(activeTool === 'rectangle' ? null : 'rectangle')}
            style={{
              padding: '8px 16px',
              backgroundColor: activeTool === 'rectangle' ? '#1890ff' : '#fff',
              color: activeTool === 'rectangle' ? '#fff' : '#333',
              border: '1px solid #1890ff',
              borderRadius: 4,
              fontSize: 14,
            }}
          >
            矩形标注
          </button>
          <button
            onClick={() => setActiveTool(activeTool === 'arrow' ? null : 'arrow')}
            style={{
              padding: '8px 16px',
              backgroundColor: activeTool === 'arrow' ? '#1890ff' : '#fff',
              color: activeTool === 'arrow' ? '#fff' : '#333',
              border: '1px solid #1890ff',
              borderRadius: 4,
              fontSize: 14,
            }}
          >
            箭头标注
          </button>
          <button
            onClick={handleDeleteSelected}
            style={{
              padding: '8px 16px',
              backgroundColor: '#fff',
              color: '#f5222d',
              border: '1px solid #f5222d',
              borderRadius: 4,
              fontSize: 14,
            }}
          >
            删除选中
          </button>
          {activeTool && (
            <span style={{ fontSize: 13, color: '#1890ff', alignSelf: 'center' }}>
              在图片上拖拽绘制{activeTool === 'rectangle' ? '矩形' : '箭头'}
            </span>
          )}
        </div>
      )}
      <div
        style={{
          border: '1px solid #e8e8e8',
          borderRadius: 4,
          overflow: 'hidden',
          background: '#fafafa',
          display: 'inline-block',
        }}
      >
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
