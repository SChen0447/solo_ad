import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Canvas, IText, Rect, Circle, FabricObject, util } from 'fabric';
import { useEditorStore } from '../../store/useEditorStore';
import type { CanvasApi, SelectedObjectProps, FabricObjectWithProps } from '../../types/types';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 1131;
const PRIMARY_COLOR = '#4a90d9';
const MIN_SIZE = 20;

interface FabricCanvasProps {
  onCanvasReady?: (api: CanvasApi) => void;
  onStateChange?: () => void;
  onSelectionChange?: (obj: FabricObjectWithProps | null) => void;
}

export const FabricCanvas = forwardRef<CanvasApi, FabricCanvasProps>((
  { onCanvasReady, onStateChange, onSelectionChange },
  ref
) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<Canvas | null>(null);
  const gridCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const { setIsTemplateApplying } = useEditorStore();

  const drawGrid = useCallback(() => {
    if (!gridCanvasRef.current) return;

    const canvas = gridCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gridSize = 20;
    const scale = 1;

    const scaledGridSize = gridSize * scale;
    const offsetX = (canvas.width - CANVAS_WIDTH) / 2;
    const offsetY = (canvas.height - CANVAS_HEIGHT) / 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#f0f4f8';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.beginPath();
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 0.5;

    for (let x = offsetX; x <= offsetX + CANVAS_WIDTH; x += scaledGridSize) {
      ctx.moveTo(x, offsetY);
      ctx.lineTo(x, offsetY + CANVAS_HEIGHT);
    }

    for (let y = offsetY; y <= offsetY + CANVAS_HEIGHT; y += scaledGridSize) {
      ctx.moveTo(offsetX, y);
      ctx.lineTo(offsetX + CANVAS_WIDTH, y);
    }

    ctx.stroke();
  }, []);

  const getObjectProps = useCallback((obj: FabricObject): SelectedObjectProps => {
    return {
      left: obj.left || 0,
      top: obj.top || 0,
      width: (obj.width || 0) * (obj.scaleX || 1),
      height: (obj.height || 0) * (obj.scaleY || 1),
      scaleX: obj.scaleX || 1,
      scaleY: obj.scaleY || 1,
      angle: obj.angle || 0,
      fill: obj.fill as string || null,
      stroke: obj.stroke as string || null,
      strokeWidth: obj.strokeWidth || 0,
      type: obj.type || '',
      text: (obj as IText).text,
      fontFamily: (obj as IText).fontFamily,
      fontSize: (obj as IText).fontSize,
      fontWeight: (obj as IText).fontWeight as string,
      fontStyle: (obj as IText).fontStyle as string,
      underline: (obj as IText).underline,
      textAlign: (obj as IText).textAlign,
      rx: (obj as Rect).rx,
      ry: (obj as Rect).ry,
      radius: (obj as Circle).radius,
    };
  }, []);

  const handleSelection = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const activeObj = canvas.getActiveObject();
    if (activeObj && !activeObj.isType('activeSelection')) {
      const props = getObjectProps(activeObj);
      onSelectionChange?.(activeObj as FabricObjectWithProps);
      useEditorStore.getState().setSelectedObject(activeObj as FabricObjectWithProps);
    } else {
      onSelectionChange?.(null);
      useEditorStore.getState().setSelectedObject(null);
    }
  }, [getObjectProps, onSelectionChange]);

  const handleModified = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const activeObj = canvas.getActiveObject();
    if (activeObj) {
      if (activeObj.scaleX && activeObj.width) {
        const newWidth = activeObj.width * activeObj.scaleX;
        if (newWidth < MIN_SIZE) {
          activeObj.scaleX = MIN_SIZE / activeObj.width;
        }
      }
      if (activeObj.scaleY && activeObj.height) {
        const newHeight = activeObj.height * activeObj.scaleY;
        if (newHeight < MIN_SIZE) {
          activeObj.scaleY = MIN_SIZE / activeObj.height;
        }
      }
    }

    onStateChange?.();
    handleSelection();
  }, [onStateChange, handleSelection]);

  const initCanvas = useCallback(() => {
    if (!canvasRef.current) return;

    const canvas = new Canvas(canvasRef.current, {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      backgroundColor: '#ffffff',
      preserveObjectStacking: true,
      selection: true,
      fireRightClick: true,
      stopContextMenu: true,
    });

    fabricCanvasRef.current = canvas;

    canvas.on('object:modified', handleModified);
    canvas.on('object:added', () => onStateChange?.());
    canvas.on('object:removed', () => onStateChange?.());
    canvas.on('selection:created', handleSelection);
    canvas.on('selection:updated', handleSelection);
    canvas.on('selection:cleared', handleSelection);

    const gridCanvas = document.createElement('canvas');
    gridCanvas.width = window.innerWidth;
    gridCanvas.height = window.innerHeight;
    gridCanvasRef.current = gridCanvas;

    canvas.on('before:render', () => {
      if (canvas.backgroundImage) {
        canvas.backgroundColor = 'transparent';
      }
    });

    const api: CanvasApi = {
      addText: () => {
        const text = new IText('双击编辑文字', {
          left: CANVAS_WIDTH / 2 - 60,
          top: CANVAS_HEIGHT / 2,
          fontFamily: 'Arial',
          fontSize: 24,
          fill: '#000000',
          fontWeight: 'normal',
          fontStyle: 'normal',
          underline: false,
          textAlign: 'left',
          cornerSize: 8,
          cornerStyle: 'square',
          transparentCorners: false,
          cornerColor: PRIMARY_COLOR,
          borderColor: PRIMARY_COLOR,
          borderScaleFactor: 2,
          minScaleLimit: MIN_SIZE / 100,
        });
        canvas.add(text);
        canvas.setActiveObject(text);
        canvas.requestRenderAll();
        onStateChange?.();
      },

      addRect: () => {
        const rect = new Rect({
          left: CANVAS_WIDTH / 2 - 50,
          top: CANVAS_HEIGHT / 2 - 50,
          width: 100,
          height: 100,
          fill: PRIMARY_COLOR,
          stroke: null,
          strokeWidth: 0,
          rx: 0,
          ry: 0,
          cornerSize: 8,
          cornerStyle: 'square',
          transparentCorners: false,
          cornerColor: PRIMARY_COLOR,
          borderColor: PRIMARY_COLOR,
          borderScaleFactor: 2,
          minScaleLimit: MIN_SIZE / 100,
        });
        canvas.add(rect);
        canvas.setActiveObject(rect);
        canvas.requestRenderAll();
        onStateChange?.();
      },

      addCircle: () => {
        const circle = new Circle({
          left: CANVAS_WIDTH / 2 - 50,
          top: CANVAS_HEIGHT / 2 - 50,
          radius: 50,
          fill: PRIMARY_COLOR,
          stroke: null,
          strokeWidth: 0,
          cornerSize: 8,
          cornerStyle: 'square',
          transparentCorners: false,
          cornerColor: PRIMARY_COLOR,
          borderColor: PRIMARY_COLOR,
          borderScaleFactor: 2,
          minScaleLimit: MIN_SIZE / 100,
        });
        canvas.add(circle);
        canvas.setActiveObject(circle);
        canvas.requestRenderAll();
        onStateChange?.();
      },

      deleteSelected: () => {
        const activeObj = canvas.getActiveObject();
        if (activeObj) {
          canvas.remove(activeObj);
          canvas.requestRenderAll();
          onStateChange?.();
        }
      },

      getSelectedObject: () => {
        const activeObj = canvas.getActiveObject();
        return activeObj ? activeObj as FabricObjectWithProps : null;
      },

      updateObject: (props: Partial<SelectedObjectProps>) => {
        const activeObj = canvas.getActiveObject();
        if (!activeObj) return;

        if (props.left !== undefined) activeObj.set('left', props.left);
        if (props.top !== undefined) activeObj.set('top', props.top);
        if (props.fill !== undefined) activeObj.set('fill', props.fill);
        if (props.stroke !== undefined) activeObj.set('stroke', props.stroke);
        if (props.strokeWidth !== undefined) activeObj.set('strokeWidth', props.strokeWidth);
        if (props.angle !== undefined) activeObj.set('angle', props.angle);

        if (activeObj.type === 'i-text' || activeObj.type === 'text') {
          const textObj = activeObj as IText;
          if (props.text !== undefined) textObj.set('text', props.text);
          if (props.fontFamily !== undefined) textObj.set('fontFamily', props.fontFamily);
          if (props.fontSize !== undefined) textObj.set('fontSize', props.fontSize);
          if (props.fontWeight !== undefined) textObj.set('fontWeight', props.fontWeight);
          if (props.fontStyle !== undefined) textObj.set('fontStyle', props.fontStyle);
          if (props.underline !== undefined) textObj.set('underline', props.underline);
          if (props.textAlign !== undefined) textObj.set('textAlign', props.textAlign);
        }

        if (activeObj.type === 'rect') {
          const rectObj = activeObj as Rect;
          if (props.rx !== undefined) rectObj.set('rx', props.rx);
          if (props.ry !== undefined) rectObj.set('ry', props.ry);
        }

        if (props.width !== undefined && activeObj.width) {
          activeObj.set('scaleX', props.width / activeObj.width);
        }
        if (props.height !== undefined && activeObj.height) {
          activeObj.set('scaleY', props.height / activeObj.height);
        }

        canvas.requestRenderAll();
      },

      toDataURL: () => {
        return canvas.toDataURL({
          format: 'png',
          quality: 1,
          multiplier: 1,
        });
      },

      loadFromJSON: async (data: any) => {
        return new Promise((resolve) => {
          canvas.loadFromJSON(data, () => {
            canvas.requestRenderAll();
            onStateChange?.();
            resolve();
          });
        });
      },

      clear: () => {
        canvas.clear();
        canvas.backgroundColor = '#ffffff';
        canvas.requestRenderAll();
        onStateChange?.();
      },

      getCanvasJSON: () => {
        return canvas.toJSON();
      },

      getFabricCanvas: () => {
        return canvas;
      },

      setBackground: (color: string) => {
        canvas.backgroundColor = color;
        canvas.requestRenderAll();
      },
    };

    onCanvasReady?.(api);
    useEditorStore.getState().setCanvasApi(api);

    const container = canvasRef.current.parentElement;
    if (container) {
      drawGrid();
      container.style.backgroundImage = `url(${gridCanvas.toDataURL()})`;
      container.style.backgroundRepeat = 'no-repeat';
      container.style.backgroundPosition = 'center';
    }

    return api;
  }, [drawGrid, handleModified, handleSelection, onCanvasReady, onStateChange]);

  useImperativeHandle(ref, () => {
    return fabricCanvasRef.current ? {
      addText: () => {},
      addRect: () => {},
      addCircle: () => {},
      deleteSelected: () => {},
      getSelectedObject: () => null,
      updateObject: () => {},
      toDataURL: () => '',
      loadFromJSON: async () => {},
      clear: () => {},
      getCanvasJSON: () => ({}),
      getFabricCanvas: () => fabricCanvasRef.current,
      setBackground: () => {},
    } as CanvasApi : {} as CanvasApi;
  });

  useEffect(() => {
    const api = initCanvas();

    const handleResize = () => {
      if (gridCanvasRef.current) {
        gridCanvasRef.current.width = window.innerWidth;
        gridCanvasRef.current.height = window.innerHeight;
        drawGrid();
        const container = canvasRef.current?.parentElement;
        if (container && gridCanvasRef.current) {
          container.style.backgroundImage = `url(${gridCanvasRef.current.toDataURL()})`;
        }
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
      }
    };
  }, [initCanvas, drawGrid]);

  const applyTemplate = useCallback(async (templateData: any) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    setIsTemplateApplying(true);

    const wrapper = document.querySelector('.canvas-wrapper');
    if (wrapper) {
      wrapper.classList.add('template-applying');
    }

    try {
      const objects = templateData.objects || [];
      const background = templateData.background || '#ffffff';

      canvas.clear();
      canvas.backgroundColor = background;

      const deserializedObjects: FabricObject[] = [];

      for (const objData of objects) {
        let obj: FabricObject | null = null;

        if (objData.type === 'text' || objData.type === 'i-text') {
          obj = new IText(objData.text || '', {
            ...objData,
            cornerSize: 8,
            cornerStyle: 'square',
            transparentCorners: false,
            cornerColor: PRIMARY_COLOR,
            borderColor: PRIMARY_COLOR,
            borderScaleFactor: 2,
            minScaleLimit: MIN_SIZE / 100,
          });
        } else if (objData.type === 'rect') {
          obj = new Rect({
            ...objData,
            cornerSize: 8,
            cornerStyle: 'square',
            transparentCorners: false,
            cornerColor: PRIMARY_COLOR,
            borderColor: PRIMARY_COLOR,
            borderScaleFactor: 2,
            minScaleLimit: MIN_SIZE / 100,
          });
        } else if (objData.type === 'circle') {
          obj = new Circle({
            ...objData,
            cornerSize: 8,
            cornerStyle: 'square',
            transparentCorners: false,
            cornerColor: PRIMARY_COLOR,
            borderColor: PRIMARY_COLOR,
            borderScaleFactor: 2,
            minScaleLimit: MIN_SIZE / 100,
          });
        }

        if (obj) {
          deserializedObjects.push(obj);
        }
      }

      for (const obj of deserializedObjects) {
        canvas.add(obj);
      }

      canvas.requestRenderAll();
      onStateChange?.();
    } finally {
      setTimeout(() => {
        setIsTemplateApplying(false);
        if (wrapper) {
          wrapper.classList.remove('template-applying');
        }
      }, 500);
    }
  }, [onStateChange, setIsTemplateApplying]);

  useEffect(() => {
    (window as any).applyTemplate = applyTemplate;
  }, [applyTemplate]);

  return (
    <div
      className="canvas-wrapper relative flex items-center justify-center w-full h-full overflow-auto"
      style={{ backgroundColor: '#f0f4f8' }}
    >
      <canvas ref={canvasRef} className="shadow-2xl" />

      <style>{`
        .canvas-wrapper.template-applying canvas {
          animation: templateApply 0.5s ease-out;
        }

        @keyframes templateApply {
          0% {
            opacity: 0;
            transform: scale(0.8);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
});

FabricCanvas.displayName = 'FabricCanvas';
