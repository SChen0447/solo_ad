import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Layer,
  FilterParams,
  TextStyle,
  CollageData,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  CANVAS_BG,
  DEFAULT_FILTERS,
  DEFAULT_TEXT_STYLE,
  FONT_FAMILIES,
  generateId,
  buildFilterCSS,
} from './types';

interface CanvasProps {
  initialData?: CollageData | null;
  selectedLayerId: string | null;
  onSelectLayer: (id: string | null) => void;
  onLayersChange: (layers: Layer[]) => void;
  filters: FilterParams;
  onFiltersChange: (filters: FilterParams) => void;
  textStyle: TextStyle;
  onTextStyleChange: (style: TextStyle) => void;
  addImageMode: boolean;
  addTextMode: boolean;
  onModeReset: () => void;
}

interface AlignmentGuides {
  x: number | null;
  y: number | null;
}

const SNAP_THRESHOLD = 10;
const ROTATION_SNAP = 15;
const MIN_SCALE = 0.2;
const MAX_SCALE = 3;
const BOUNDARY_MARGIN = 30;

const Canvas: React.FC<CanvasProps> = ({
  initialData,
  selectedLayerId,
  onSelectLayer,
  onLayersChange,
  filters,
  onFiltersChange,
  textStyle,
  onTextStyleChange,
  addImageMode,
  addTextMode,
  onModeReset,
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [layers, setLayers] = useState<Layer[]>(initialData?.layers || []);
  const [dragging, setDragging] = useState<{
    layerId: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);
  const [rotating, setRotating] = useState<{
    layerId: string;
    centerX: number;
    centerY: number;
    startAngle: number;
    origRotation: number;
  } | null>(null);
  const [rotationAngleDisplay, setRotationAngleDisplay] = useState<{
    angle: number;
    layerId: string;
    key: number;
  } | null>(null);
  const [guides, setGuides] = useState<AlignmentGuides>({ x: null, y: null });
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    layerId: string;
  } | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [canvasScale, setCanvasScale] = useState(1);

  useEffect(() => {
    if (initialData?.layers) {
      setLayers(initialData.layers);
    }
  }, [initialData]);

  useEffect(() => {
    onLayersChange(layers);
  }, [layers, onLayersChange]);

  useEffect(() => {
    const updateScale = () => {
      const wrapper = canvasRef.current?.parentElement;
      if (!wrapper) return;
      const availableWidth = wrapper.clientWidth - 40;
      const scale = Math.min(1, availableWidth / CANVAS_WIDTH);
      setCanvasScale(window.innerWidth < 768 ? scale : 1);
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  const getNextZIndex = useCallback(() => {
    if (layers.length === 0) return 1;
    return Math.max(...layers.map((l) => l.zIndex)) + 1;
  }, [layers]);

  const addImageLayer = useCallback(
    (dataUrl: string, naturalWidth: number, naturalHeight: number) => {
      const maxW = CANVAS_WIDTH * 0.6;
      const maxH = CANVAS_HEIGHT * 0.6;
      const ratio = Math.min(maxW / naturalWidth, maxH / naturalHeight, 1);
      const w = naturalWidth * ratio;
      const h = naturalHeight * ratio;
      const newLayer: Layer = {
        id: generateId(),
        type: 'image',
        x: (CANVAS_WIDTH - w) / 2,
        y: (CANVAS_HEIGHT - h) / 2,
        width: w,
        height: h,
        rotation: 0,
        scale: 1,
        zIndex: getNextZIndex(),
        imageUrl: dataUrl,
        filters: { ...DEFAULT_FILTERS },
      };
      setLayers((prev) => [...prev, newLayer]);
      onSelectLayer(newLayer.id);
      if (addImageMode) onModeReset();
    },
    [getNextZIndex, onSelectLayer, addImageMode, onModeReset]
  );

  const addTextLayer = useCallback(() => {
    const w = 200;
    const h = 60;
    const newLayer: Layer = {
      id: generateId(),
      type: 'text',
      x: (CANVAS_WIDTH - w) / 2,
      y: (CANVAS_HEIGHT - h) / 2,
      width: w,
      height: h,
      rotation: 0,
      scale: 1,
      zIndex: getNextZIndex(),
      text: '双击编辑文字',
      textStyle: { ...textStyle },
    };
    setLayers((prev) => [...prev, newLayer]);
    onSelectLayer(newLayer.id);
    if (addTextMode) onModeReset();
  }, [getNextZIndex, onSelectLayer, addTextMode, onModeReset, textStyle]);

  useEffect(() => {
    if (addTextMode) {
      addTextLayer();
    }
  }, [addTextMode, addTextLayer]);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        const img = new Image();
        img.onload = () => {
          addImageLayer(dataUrl, img.naturalWidth, img.naturalHeight);
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    },
    [addImageLayer]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const files = Array.from(e.dataTransfer.files);
      files.forEach((f) => handleFile(f));
    },
    [handleFile]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleImageUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach((f) => handleFile(f));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getLayerAtPoint = (x: number, y: number): Layer | null => {
    const sorted = [...layers].sort((a, b) => b.zIndex - a.zIndex);
    for (const layer of sorted) {
      const cx = layer.x + (layer.width * layer.scale) / 2;
      const cy = layer.y + (layer.height * layer.scale) / 2;
      const dx = x - cx;
      const dy = y - cy;
      const angle = (-layer.rotation * Math.PI) / 180;
      const rx = dx * Math.cos(angle) - dy * Math.sin(angle);
      const ry = dx * Math.sin(angle) + dy * Math.cos(angle);
      if (
        Math.abs(rx) <= (layer.width * layer.scale) / 2 &&
        Math.abs(ry) <= (layer.height * layer.scale) / 2
      ) {
        return layer;
      }
    }
    return null;
  };

  const snapToGuides = (
    layer: Layer,
    newX: number,
    newY: number
  ): { x: number; y: number; gx: number | null; gy: number | null } => {
    let gx: number | null = null;
    let gy: number | null = null;
    const w = layer.width * layer.scale;
    const h = layer.height * layer.scale;
    const layerEdges = {
      left: newX,
      right: newX + w,
      top: newY,
      bottom: newY + h,
      centerX: newX + w / 2,
      centerY: newY + h / 2,
    };

    for (const other of layers) {
      if (other.id === layer.id) continue;
      const ow = other.width * other.scale;
      const oh = other.height * other.scale;
      const otherEdges = {
        left: other.x,
        right: other.x + ow,
        top: other.y,
        bottom: other.y + oh,
        centerX: other.x + ow / 2,
        centerY: other.y + oh / 2,
      };

      const pairs: Array<[keyof typeof layerEdges, keyof typeof otherEdges, 'x' | 'y']> = [
        ['left', 'left', 'x'],
        ['left', 'right', 'x'],
        ['left', 'centerX', 'x'],
        ['right', 'left', 'x'],
        ['right', 'right', 'x'],
        ['right', 'centerX', 'x'],
        ['centerX', 'left', 'x'],
        ['centerX', 'right', 'x'],
        ['centerX', 'centerX', 'x'],
        ['top', 'top', 'y'],
        ['top', 'bottom', 'y'],
        ['top', 'centerY', 'y'],
        ['bottom', 'top', 'y'],
        ['bottom', 'bottom', 'y'],
        ['bottom', 'centerY', 'y'],
        ['centerY', 'top', 'y'],
        ['centerY', 'bottom', 'y'],
        ['centerY', 'centerY', 'y'],
      ];

      for (const [le, oe, axis] of pairs) {
        const diff = layerEdges[le] - otherEdges[oe];
        if (Math.abs(diff) <= SNAP_THRESHOLD) {
          if (axis === 'x') {
            newX -= diff;
            gx = otherEdges[oe];
          } else {
            newY -= diff;
            gy = otherEdges[oe];
          }
          return { x: newX, y: newY, gx, gy };
        }
      }
    }
    return { x: newX, y: newY, gx: null, gy: null };
  };

  const constrainToCanvas = (layer: Layer, x: number, y: number): { x: number; y: number } => {
    const w = layer.width * layer.scale;
    const h = layer.height * layer.scale;
    const angle = Math.abs((layer.rotation % 360) * (Math.PI / 180));
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const halfW = w / 2;
    const halfH = h / 2;
    const bboxHalfW = halfW * cosA + halfH * sinA;
    const bboxHalfH = halfW * sinA + halfH * cosA;
    const cx = x + halfW;
    const cy = y + halfH;
    const minCx = BOUNDARY_MARGIN - bboxHalfW;
    const maxCx = CANVAS_WIDTH - BOUNDARY_MARGIN + bboxHalfW;
    const minCy = BOUNDARY_MARGIN - bboxHalfH;
    const maxCy = CANVAS_HEIGHT - BOUNDARY_MARGIN + bboxHalfH;
    const newCx = Math.max(minCx, Math.min(maxCx, cx));
    const newCy = Math.max(minCy, Math.min(maxCy, cy));
    return { x: newCx - halfW, y: newCy - halfH };
  };

  const handleMouseDown = (e: React.MouseEvent, layerId: string) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const layer = layers.find((l) => l.id === layerId);
    if (!layer) return;
    if (editingTextId === layerId) return;

    const rect = canvasRef.current!.getBoundingClientRect();
    const scaleFactor = rect.width / CANVAS_WIDTH;
    const x = (e.clientX - rect.left) / scaleFactor;
    const y = (e.clientY - rect.top) / scaleFactor;

    const cx = layer.x + (layer.width * layer.scale) / 2;
    const cy = layer.y + (layer.height * layer.scale) / 2;
    const handleX = layer.x + layer.width * layer.scale;
    const handleY = layer.y + layer.height * layer.scale;
    const dx = x - handleX;
    const dy = y - handleY;
    const distToHandle = Math.sqrt(dx * dx + dy * dy);

    if (distToHandle < 20) {
      const startAngle = Math.atan2(y - cy, x - cx);
      setRotating({
        layerId,
        centerX: cx,
        centerY: cy,
        startAngle,
        origRotation: layer.rotation,
      });
    } else {
      onSelectLayer(layerId);
      setDragging({
        layerId,
        startX: x,
        startY: y,
        origX: layer.x,
        origY: layer.y,
      });
    }
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const scaleFactor = rect.width / CANVAS_WIDTH;
      const x = (e.clientX - rect.left) / scaleFactor;
      const y = (e.clientY - rect.top) / scaleFactor;

      if (dragging) {
        const deltaX = x - dragging.startX;
        const deltaY = y - dragging.startY;
        setLayers((prev) =>
          prev.map((l) => {
            if (l.id !== dragging.layerId) return l;
            let newX = dragging.origX + deltaX;
            let newY = dragging.origY + deltaY;
            const { x: sx, y: sy, gx, gy } = snapToGuides(l, newX, newY);
            newX = sx;
            newY = sy;
            const constrained = constrainToCanvas(l, newX, newY);
            newX = constrained.x;
            newY = constrained.y;
            setGuides({ x: gx, y: gy });
            return { ...l, x: newX, y: newY };
          })
        );
      }

      if (rotating) {
        const currentAngle = Math.atan2(y - rotating.centerY, x - rotating.centerX);
        let deltaDeg = ((currentAngle - rotating.startAngle) * 180) / Math.PI;
        let newAngle = rotating.origRotation + deltaDeg;
        const snapped = Math.round(newAngle / ROTATION_SNAP) * ROTATION_SNAP;
        if (Math.abs(newAngle - snapped) <= 2) {
          newAngle = snapped;
        }
        const displayKey = Date.now();
        setRotationAngleDisplay({
          angle: Math.round(newAngle),
          layerId: rotating.layerId,
          key: displayKey,
        });
        setTimeout(() => {
          setRotationAngleDisplay((cur) => (cur && cur.key === displayKey ? null : cur));
        }, 1000);

        setLayers((prev) =>
          prev.map((l) => (l.id === rotating.layerId ? { ...l, rotation: newAngle } : l))
        );
      }
    },
    [dragging, rotating]
  );

  const handleMouseUp = useCallback(() => {
    if (dragging || rotating) {
      setDragging(null);
      setRotating(null);
      setGuides({ x: null, y: null });
    }
  }, [dragging, rotating]);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const handleWheel = (e: React.WheelEvent, layerId: string) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    setLayers((prev) =>
      prev.map((l) => {
        if (l.id !== layerId) return l;
        const delta = e.deltaY < 0 ? 0.1 : -0.1;
        let newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, l.scale + delta));
        return { ...l, scale: newScale };
      })
    );
  };

  useEffect(() => {
    const layer = layers.find((l) => l.id === selectedLayerId);
    if (!layer || layer.type !== 'image') return;
    if (JSON.stringify(layer.filters) !== JSON.stringify(filters)) {
      onFiltersChange(layer.filters || { ...DEFAULT_FILTERS });
    }
  }, [selectedLayerId]);

  useEffect(() => {
    if (!selectedLayerId) return;
    setLayers((prev) =>
      prev.map((l) => {
        if (l.id !== selectedLayerId) return l;
        if (l.type === 'image') {
          return { ...l, filters };
        }
        return l;
      })
    );
  }, [filters, selectedLayerId]);

  const handleContextMenu = (e: React.MouseEvent, layerId: string) => {
    e.preventDefault();
    e.stopPropagation();
    onSelectLayer(layerId);
    const rect = canvasRef.current!.getBoundingClientRect();
    setContextMenu({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      layerId,
    });
  };

  const closeContextMenu = () => setContextMenu(null);

  useEffect(() => {
    const click = () => closeContextMenu();
    window.addEventListener('click', click);
    return () => window.removeEventListener('click', click);
  }, []);

  const duplicateLayer = (layerId: string) => {
    setLayers((prev) => {
      const l = prev.find((x) => x.id === layerId);
      if (!l) return prev;
      const copy: Layer = {
        ...l,
        id: generateId(),
        x: l.x + 20,
        y: l.y + 20,
        zIndex: getNextZIndex(),
        filters: l.filters ? { ...l.filters } : undefined,
        textStyle: l.textStyle ? { ...l.textStyle } : undefined,
      };
      return [...prev, copy];
    });
    closeContextMenu();
  };

  const deleteLayer = (layerId: string) => {
    setLayers((prev) => prev.filter((l) => l.id !== layerId));
    if (selectedLayerId === layerId) onSelectLayer(null);
    closeContextMenu();
  };

  const bringToFront = (layerId: string) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === layerId ? { ...l, zIndex: getNextZIndex() } : l))
    );
    closeContextMenu();
  };

  const sendToBack = (layerId: string) => {
    setLayers((prev) => {
      const minZ = Math.min(...prev.map((l) => l.zIndex));
      return prev.map((l) => (l.id === layerId ? { ...l, zIndex: minZ - 1 } : l));
    });
    closeContextMenu();
  };

  const handleCanvasClick = () => {
    onSelectLayer(null);
    setEditingTextId(null);
  };

  const handleTextDoubleClick = (e: React.MouseEvent, layerId: string) => {
    e.stopPropagation();
    setEditingTextId(layerId);
  };

  const handleTextInputChange = (layerId: string, value: string) => {
    setLayers((prev) =>
      prev.map((l) => {
        if (l.id !== layerId) return l;
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        const style = l.textStyle!;
        ctx.font = `${style.fontWeight} ${style.fontStyle} ${style.fontSize}px ${style.fontFamily}`;
        const metrics = ctx.measureText(value || ' ');
        const newW = Math.max(60, metrics.width + 20);
        const newH = style.fontSize * 1.5 + 10;
        return { ...l, text: value, width: newW, height: newH };
      })
    );
  };

  useEffect(() => {
    if (!selectedLayerId) return;
    setLayers((prev) =>
      prev.map((l) => {
        if (l.id !== selectedLayerId || l.type !== 'text') return l;
        return { ...l, textStyle: { ...textStyle } };
      })
    );
  }, [textStyle, selectedLayerId]);

  useEffect(() => {
    const layer = layers.find((l) => l.id === selectedLayerId);
    if (layer?.type === 'text' && layer.textStyle) {
      onTextStyleChange(layer.textStyle);
    }
  }, [selectedLayerId]);

  const renderLayer = (layer: Layer) => {
    const isSelected = selectedLayerId === layer.id;
    const isDragging = dragging?.layerId === layer.id;
    const isRotating = rotating?.layerId === layer.id;
    const isActive = isDragging || isRotating;
    const w = layer.width * layer.scale;
    const h = layer.height * layer.scale;
    const dragScale = isActive ? 1.05 : 1;
    const transform = `translate(${layer.x}px, ${layer.y}px) rotate(${layer.rotation}deg) scale(${dragScale})`;
    const transformOrigin = 'center center';

    const boxShadow = isActive
      ? '0 12px 40px rgba(0, 0, 0, 0.35), 0 4px 12px rgba(59, 130, 246, 0.25)'
      : isSelected
      ? '0 4px 16px rgba(0, 0, 0, 0.2)'
      : '0 2px 8px rgba(0, 0, 0, 0.1)';

    const transition = isActive ? 'none' : 'box-shadow 0.2s ease, transform 0.2s ease';

    return (
      <div
        key={layer.id}
        className="layer"
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: w,
          height: h,
          transform,
          transformOrigin,
          zIndex: isActive ? 9999 : layer.zIndex,
          cursor: editingTextId === layer.id ? 'text' : 'move',
          outline: isSelected ? '2px solid #3B82F6' : 'none',
          userSelect: 'none',
          boxShadow: layer.type === 'image' ? boxShadow : 'none',
          borderRadius: layer.type === 'image' ? 2 : 0,
          transition,
          willChange: isActive ? 'transform' : 'auto',
        }}
        onMouseDown={(e) => handleMouseDown(e, layer.id)}
        onWheel={(e) => handleWheel(e, layer.id)}
        onContextMenu={(e) => handleContextMenu(e, layer.id)}
        onDoubleClick={layer.type === 'text' ? (e) => handleTextDoubleClick(e, layer.id) : undefined}
      >
        {layer.type === 'image' && layer.imageUrl && (
          <img
            src={layer.imageUrl}
            alt=""
            draggable={false}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              pointerEvents: 'none',
              filter: layer.filters ? buildFilterCSS(layer.filters) : 'none',
            }}
          />
        )}
        {layer.type === 'text' && (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor:
                layer.textStyle && layer.textStyle.backgroundColor !== 'transparent'
                  ? `${layer.textStyle.backgroundColor}${Math.round(
                      (layer.textStyle.backgroundOpacity || 0) * 255
                    )
                      .toString(16)
                      .padStart(2, '0')}`
                  : 'transparent',
              padding: '5px 10px',
              boxSizing: 'border-box',
            }}
          >
            {editingTextId === layer.id ? (
              <input
                autoFocus
                value={layer.text || ''}
                onChange={(e) => handleTextInputChange(layer.id, e.target.value)}
                onBlur={() => setEditingTextId(null)}
                onKeyDown={(e) => e.stopPropagation()}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  textAlign: 'center',
                  fontFamily: layer.textStyle?.fontFamily,
                  fontSize: `${layer.textStyle?.fontSize}px`,
                  color: layer.textStyle?.color,
                  fontWeight: layer.textStyle?.fontWeight,
                  fontStyle: layer.textStyle?.fontStyle,
                  textDecoration: layer.textStyle?.textDecoration,
                  padding: 0,
                }}
              />
            ) : (
              <span
                style={{
                  fontFamily: layer.textStyle?.fontFamily,
                  fontSize: `${layer.textStyle?.fontSize}px`,
                  color: layer.textStyle?.color,
                  fontWeight: layer.textStyle?.fontWeight,
                  fontStyle: layer.textStyle?.fontStyle,
                  textDecoration: layer.textStyle?.textDecoration,
                  lineHeight: 1.2,
                  pointerEvents: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                {layer.text}
              </span>
            )}
          </div>
        )}
        {isSelected && (
          <div
            className="rotate-handle"
            style={{
              position: 'absolute',
              right: -12,
              bottom: -12,
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: '#3B82F6',
              border: '2px solid white',
              cursor: 'grab',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              transition: 'transform 0.2s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.2)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
              <path d="M21 3v5h-5" />
            </svg>
          </div>
        )}
        {rotationAngleDisplay && rotationAngleDisplay.layerId === layer.id && isSelected && (
          <div
            key={rotationAngleDisplay.key}
            style={{
              position: 'absolute',
              left: '50%',
              top: -30,
              transform: 'translateX(-50%)',
              background: 'rgba(59, 130, 246, 0.9)',
              color: 'white',
              padding: '2px 8px',
              borderRadius: 4,
              fontSize: 12,
              fontFamily: 'monospace',
              pointerEvents: 'none',
              animation: 'fadeOut 1s forwards',
            }}
          >
            {rotationAngleDisplay.angle}°
          </div>
        )}
      </div>
    );
  };

  const gridLines = [];
  for (let gx = 50; gx < CANVAS_WIDTH; gx += 50) {
    gridLines.push(
      <div
        key={`gv-${gx}`}
        style={{
          position: 'absolute',
          left: gx,
          top: 0,
          width: 0.5,
          height: CANVAS_HEIGHT,
          background: 'rgba(224, 224, 224, 0.15)',
          pointerEvents: 'none',
        }}
      />
    );
  }
  for (let gy = 50; gy < CANVAS_HEIGHT; gy += 50) {
    gridLines.push(
      <div
        key={`gh-${gy}`}
        style={{
          position: 'absolute',
          left: 0,
          top: gy,
          width: CANVAS_WIDTH,
          height: 0.5,
          background: 'rgba(224, 224, 224, 0.15)',
          pointerEvents: 'none',
        }}
      />
    );
  }

  return (
    <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
      {addImageMode && (
        <div
          onClick={handleImageUploadClick}
          style={{
            position: 'absolute',
            inset: 0,
            border: '3px dashed #3B82F6',
            borderRadius: 8,
            background: 'rgba(59, 130, 246, 0.1)',
            zIndex: 100,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
            color: '#3B82F6',
            pointerEvents: 'auto',
          }}
        >
          点击上传图片 或 拖拽图片到此处
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      <div
        ref={canvasRef}
        onClick={handleCanvasClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        style={{
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
          background: CANVAS_BG,
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          borderRadius: 4,
          transform: `scale(${canvasScale})`,
          transformOrigin: 'top center',
        }}
      >
        {gridLines}
        {layers.map(renderLayer)}
        {guides.x !== null && (
          <div
            style={{
              position: 'absolute',
              left: guides.x,
              top: 0,
              width: 1,
              height: CANVAS_HEIGHT,
              background: '#3B82F6',
              pointerEvents: 'none',
              zIndex: 10000,
            }}
          />
        )}
        {guides.y !== null && (
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: guides.y,
              width: CANVAS_WIDTH,
              height: 1,
              background: '#3B82F6',
              pointerEvents: 'none',
              zIndex: 10000,
            }}
          />
        )}
      </div>
      {contextMenu && (
        <div
          style={{
            position: 'absolute',
            left: contextMenu.x,
            top: contextMenu.y,
            background: '#2D2D44',
            border: '1px solid #3B82F6',
            borderRadius: 8,
            padding: 4,
            zIndex: 100000,
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
            minWidth: 120,
          }}
        >
          {[
            { label: '复制', action: () => duplicateLayer(contextMenu.layerId) },
            { label: '删除', action: () => deleteLayer(contextMenu.layerId), danger: true },
            { label: '置顶', action: () => bringToFront(contextMenu.layerId) },
            { label: '置底', action: () => sendToBack(contextMenu.layerId) },
          ].map((item) => (
            <div
              key={item.label}
              onClick={(e) => {
                e.stopPropagation();
                item.action();
              }}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                borderRadius: 4,
                fontSize: 13,
                color: item.danger ? '#EF4444' : '#E0E0E0',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)';
                e.currentTarget.style.filter = 'brightness(1.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.filter = 'brightness(1)';
              }}
            >
              {item.label}
            </div>
          ))}
        </div>
      )}
      <style>{`
        @keyframes fadeOut {
          0% { opacity: 1; }
          80% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default Canvas;
