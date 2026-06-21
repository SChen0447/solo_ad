import React, { useRef, useState, useCallback, useEffect } from 'react';
import { CanvasElement, PaperSize, PAPER_SIZES, GuideLine, TextStyle } from '../types';

interface CanvasAreaProps {
  elements: CanvasElement[];
  selectedIds: string[];
  paperSize: PaperSize;
  showGrid: boolean;
  guidelines: GuideLine[];
  onSelectElement: (id: string, additive: boolean) => void;
  onClearSelection: () => void;
  onUpdateElement: (id: string, updates: Partial<CanvasElement>) => void;
  onUpdateElements: (updates: { id: string; changes: Partial<CanvasElement> }[]) => void;
  onAddGuideline: (g: GuideLine) => void;
  onRemoveGuideline: (id: string) => void;
  onUpdateGuideline: (id: string, position: number) => void;
  canvasRef: React.RefObject<HTMLDivElement>;
}

type DragMode =
  | { type: 'none' }
  | { type: 'move'; startX: number; startY: number; originals: { id: string; x: number; y: number }[] }
  | { type: 'resize'; id: string; startX: number; startY: number; origW: number; origH: number }
  | { type: 'ruler-h' }
  | { type: 'ruler-v' }
  | { type: 'guideline'; id: string; orientation: 'horizontal' | 'vertical' };

const SNAP_DISTANCE = 5;
const RULER_SIZE = 24;

export const CanvasArea: React.FC<CanvasAreaProps> = ({
  elements,
  selectedIds,
  paperSize,
  showGrid,
  guidelines,
  onSelectElement,
  onClearSelection,
  onUpdateElement,
  onUpdateElements,
  onAddGuideline,
  onRemoveGuideline,
  onUpdateGuideline,
  canvasRef,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragMode, setDragMode] = useState<DragMode>({ type: 'none' });
  const [rotationDisplay, setRotationDisplay] = useState<{ id: string; angle: number; key: number } | null>(null);
  const rotationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rotationKeyRef = useRef(0);
  const paper = PAPER_SIZES[paperSize];
  const elementsRef = useRef(elements);
  elementsRef.current = elements;
  const selectedIdsRef = useRef(selectedIds);
  selectedIdsRef.current = selectedIds;

  const showRotation = useCallback((id: string, angle: number) => {
    rotationKeyRef.current += 1;
    setRotationDisplay({ id, angle, key: rotationKeyRef.current });
    if (rotationTimerRef.current) {
      clearTimeout(rotationTimerRef.current);
    }
    rotationTimerRef.current = setTimeout(() => {
      setRotationDisplay(null);
    }, 500);
  }, []);

  const getRelativePos = useCallback(
    (clientX: number, clientY: number) => {
      const el = canvasRef.current;
      if (!el) return { x: 0, y: 0 };
      const rect = el.getBoundingClientRect();
      return { x: clientX - rect.left, y: clientY - rect.top };
    },
    [canvasRef]
  );

  const snapToGuidelines = useCallback(
    (x: number, y: number, w: number, h: number) => {
      let nx = x;
      let ny = y;
      for (const g of guidelines) {
        if (g.orientation === 'vertical') {
          if (Math.abs(x - g.position) < SNAP_DISTANCE) nx = g.position;
          else if (Math.abs(x + w - g.position) < SNAP_DISTANCE) nx = g.position - w;
          else if (Math.abs(x + w / 2 - g.position) < SNAP_DISTANCE) nx = g.position - w / 2;
        } else {
          if (Math.abs(y - g.position) < SNAP_DISTANCE) ny = g.position;
          else if (Math.abs(y + h - g.position) < SNAP_DISTANCE) ny = g.position - h;
          else if (Math.abs(y + h / 2 - g.position) < SNAP_DISTANCE) ny = g.position - h / 2;
        }
      }
      return { x: nx, y: ny };
    },
    [guidelines]
  );

  const handleElementMouseDown = useCallback(
    (e: React.MouseEvent, el: CanvasElement) => {
      e.stopPropagation();
      const additive = e.shiftKey;
      const isAlreadySelected = selectedIds.includes(el.id);

      let effectiveIds: string[];
      if (additive) {
        if (isAlreadySelected) {
          effectiveIds = selectedIds.filter((id) => id !== el.id);
        } else {
          effectiveIds = [...selectedIds, el.id];
        }
        onSelectElement(el.id, true);
      } else {
        if (isAlreadySelected) {
          effectiveIds = selectedIds;
        } else {
          effectiveIds = [el.id];
          onSelectElement(el.id, false);
        }
      }

      if (effectiveIds.length === 0) {
        setDragMode({ type: 'none' });
        return;
      }

      const pos = getRelativePos(e.clientX, e.clientY);
      const originals = elements
        .filter((e2) => effectiveIds.includes(e2.id))
        .map((e2) => ({ id: e2.id, x: e2.x, y: e2.y }));

      setDragMode({ type: 'move', startX: pos.x, startY: pos.y, originals });
    },
    [selectedIds, onSelectElement, getRelativePos, elements]
  );

  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent, el: CanvasElement) => {
      e.stopPropagation();
      e.preventDefault();
      const pos = getRelativePos(e.clientX, e.clientY);
      setDragMode({
        type: 'resize',
        id: el.id,
        startX: pos.x,
        startY: pos.y,
        origW: el.width,
        origH: el.height,
      });
    },
    [getRelativePos]
  );

  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target === e.currentTarget || target.dataset.canvasBg === 'true') {
        onClearSelection();
      }
    },
    [onClearSelection]
  );

  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;

    const handleWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      const ids = selectedIdsRef.current;
      if (ids.length === 0) return;
      const delta = e.deltaY > 0 ? 15 : -15;
      const els = elementsRef.current;
      const updates: { id: string; changes: Partial<CanvasElement> }[] = [];
      for (const id of ids) {
        const el = els.find((x) => x.id === id);
        if (el) {
          const newRot = ((el.rotation + delta) % 360 + 360) % 360;
          updates.push({ id, changes: { rotation: newRot } });
          showRotation(id, newRot);
        }
      }
      if (updates.length > 0) {
        onUpdateElements(updates);
      }
    };

    canvasEl.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvasEl.removeEventListener('wheel', handleWheel);
  }, [canvasRef, onUpdateElements, showRotation]);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (dragMode.type === 'move') {
        const pos = getRelativePos(e.clientX, e.clientY);
        const dx = pos.x - dragMode.startX;
        const dy = pos.y - dragMode.startY;
        const updates: { id: string; changes: Partial<CanvasElement> }[] = [];
        for (const orig of dragMode.originals) {
          const el = elements.find((x) => x.id === orig.id);
          if (!el) continue;
          let nx = orig.x + dx;
          let ny = orig.y + dy;
          const snapped = snapToGuidelines(nx, ny, el.width, el.height);
          nx = Math.max(0, Math.min(paper.width - el.width, Math.round(snapped.x)));
          ny = Math.max(0, Math.min(paper.height - el.height, Math.round(snapped.y)));
          updates.push({ id: orig.id, changes: { x: nx, y: ny } });
        }
        onUpdateElements(updates);
      } else if (dragMode.type === 'resize') {
        const pos = getRelativePos(e.clientX, e.clientY);
        const dx = pos.x - dragMode.startX;
        const dy = pos.y - dragMode.startY;
        const newW = Math.max(20, Math.round(dragMode.origW + dx));
        const newH = Math.max(20, Math.round(dragMode.origH + dy));
        onUpdateElement(dragMode.id, { width: newW, height: newH });
      } else if (dragMode.type === 'ruler-h') {
        const pos = getRelativePos(e.clientX, e.clientY);
        if (pos.y > 0 && pos.y < paper.height) {
          const id = 'gh' + Date.now();
          onAddGuideline({ id, orientation: 'horizontal', position: Math.round(pos.y) });
          setDragMode({ type: 'guideline', id, orientation: 'horizontal' });
        }
      } else if (dragMode.type === 'ruler-v') {
        const pos = getRelativePos(e.clientX, e.clientY);
        if (pos.x > 0 && pos.x < paper.width) {
          const id = 'gv' + Date.now();
          onAddGuideline({ id, orientation: 'vertical', position: Math.round(pos.x) });
          setDragMode({ type: 'guideline', id, orientation: 'vertical' });
        }
      } else if (dragMode.type === 'guideline') {
        const pos = getRelativePos(e.clientX, e.clientY);
        const newPos =
          dragMode.orientation === 'horizontal'
            ? Math.max(0, Math.min(paper.height, Math.round(pos.y)))
            : Math.max(0, Math.min(paper.width, Math.round(pos.x)));
        onUpdateGuideline(dragMode.id, newPos);
      }
    },
    [dragMode, getRelativePos, elements, onUpdateElements, onUpdateElement, onAddGuideline, onUpdateGuideline, snapToGuidelines, paper]
  );

  const handleMouseUp = useCallback(
    (e: MouseEvent) => {
      if (dragMode.type === 'guideline') {
        const pos = getRelativePos(e.clientX, e.clientY);
        const newPos = dragMode.orientation === 'horizontal' ? pos.y : pos.x;
        if (newPos < -10 || newPos > (dragMode.orientation === 'horizontal' ? paper.height + 10 : paper.width + 10)) {
          onRemoveGuideline(dragMode.id);
        }
      }
      setDragMode({ type: 'none' });
    },
    [dragMode, getRelativePos, onRemoveGuideline, paper]
  );

  useEffect(() => {
    if (dragMode.type !== 'none') {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragMode, handleMouseMove, handleMouseUp]);

  const renderRulerTicks = (length: number, isHorizontal: boolean) => {
    const ticks: React.ReactNode[] = [];
    for (let i = 0; i <= length; i += 10) {
      const isMajor = i % 50 === 0;
      const size = isMajor ? 10 : 5;
      const color = isMajor ? '#9CA3AF' : '#D1D5DB';
      ticks.push(
        <div
          key={i}
          style={{
            position: 'absolute',
            ...(isHorizontal
              ? { left: i, top: isMajor ? 4 : 11, width: 1, height: size, background: color }
              : { top: i, left: isMajor ? 4 : 11, height: 1, width: size, background: color }),
          }}
        />
      );
      if (isMajor && i > 0) {
        ticks.push(
          <div
            key={'l' + i}
            style={{
              position: 'absolute',
              fontSize: 9,
              color: '#6B7280',
              lineHeight: '10px',
              ...(isHorizontal
                ? { left: i + 2, top: 1 }
                : { top: i + 2, left: 1, writingMode: 'vertical-rl' as const, transform: 'rotate(180deg)' }),
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          >
            {i}
          </div>
        );
      }
    }
    return ticks;
  };

  const renderElement = (el: CanvasElement) => {
    const isSelected = selectedIds.includes(el.id);
    const style: React.CSSProperties = {
      position: 'absolute',
      left: el.x,
      top: el.y,
      width: el.width,
      height: el.height,
      transform: `rotate(${el.rotation}deg)`,
      backgroundColor: el.type !== 'line' ? el.style.backgroundColor || 'transparent' : 'transparent',
      borderWidth: el.style.borderWidth,
      borderColor: el.style.borderColor,
      borderStyle: el.type === 'line' ? 'none' : el.style.borderStyle,
      borderRadius: el.style.borderRadius,
      boxSizing: 'border-box',
      cursor: 'move',
      transition: 'box-shadow 0.2s, border-color 0.2s',
      boxShadow: isSelected ? '0 0 0 2px #3B82F6' : undefined,
      overflow: el.type === 'text' || el.type === 'date' ? 'hidden' : 'visible',
    };

    if (el.type === 'line') {
      const lineColor = el.style.borderColor;
      if (el.style.borderStyle === 'dashed') {
        style.backgroundImage = `repeating-linear-gradient(to right, ${lineColor} 0 10px, transparent 10px 16px)`;
      } else if (el.style.borderStyle === 'dotted') {
        style.backgroundImage = `repeating-linear-gradient(to right, ${lineColor} 0 3px, transparent 3px 7px)`;
      } else {
        style.backgroundImage = `linear-gradient(to right, ${lineColor}, ${lineColor})`;
      }
      style.backgroundSize = `100% ${Math.max(el.height, 2)}px`;
      style.backgroundPosition = 'center';
      style.backgroundRepeat = 'no-repeat';
    }

    return (
      <div key={el.id} style={style} onMouseDown={(e) => handleElementMouseDown(e, el)}>
        {(el.type === 'text' || el.type === 'date') && (
          <div
            style={{
              padding: '4px 8px',
              fontSize: (el.style as TextStyle).fontSize,
              color: (el.style as TextStyle).fontColor,
              letterSpacing: (el.style as TextStyle).letterSpacing,
              lineHeight: 1.4,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              userSelect: 'none',
              pointerEvents: 'none',
            }}
          >
            {(el.style as TextStyle).content}
          </div>
        )}
        {isSelected && (
          <>
            <div
              onMouseDown={(e) => handleResizeMouseDown(e, el)}
              style={{
                position: 'absolute',
                right: -6,
                bottom: -6,
                width: 12,
                height: 12,
                background: '#3B82F6',
                border: '2px solid #fff',
                borderRadius: 2,
                cursor: 'nwse-resize',
                boxSizing: 'border-box',
                zIndex: 10,
              }}
            />
            {rotationDisplay?.id === el.id && (
              <div
                key={rotationDisplay.key}
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  background: 'rgba(59, 130, 246, 0.9)',
                  color: '#fff',
                  padding: '4px 10px',
                  borderRadius: 4,
                  fontSize: 12,
                  fontWeight: 600,
                  pointerEvents: 'none',
                  opacity: 0,
                  animation: 'rotationFadeOut 0.5s ease-out forwards',
                  whiteSpace: 'nowrap',
                  zIndex: 20,
                }}
              >
                {rotationDisplay.angle}°
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        position: 'relative',
        overflow: 'auto',
        background: '#F9FAFB',
        padding: 40,
      }}
    >
      <style>{`
        @keyframes rotationFadeOut {
          0%, 60% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <div
          style={{
            position: 'absolute',
            left: RULER_SIZE,
            top: 0,
            width: paper.width,
            height: RULER_SIZE,
            background: '#F9FAFB',
            borderBottom: '1px solid #E5E7EB',
            borderRight: '1px solid #E5E7EB',
            cursor: 'ns-resize',
            overflow: 'hidden',
            userSelect: 'none',
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            setDragMode({ type: 'ruler-h' });
          }}
        >
          {renderRulerTicks(paper.width, true)}
        </div>
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: RULER_SIZE,
            width: RULER_SIZE,
            height: paper.height,
            background: '#F9FAFB',
            borderRight: '1px solid #E5E7EB',
            borderBottom: '1px solid #E5E7EB',
            cursor: 'ew-resize',
            overflow: 'hidden',
            userSelect: 'none',
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            setDragMode({ type: 'ruler-v' });
          }}
        >
          {renderRulerTicks(paper.height, false)}
        </div>
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: RULER_SIZE,
            height: RULER_SIZE,
            background: '#F9FAFB',
            borderRight: '1px solid #E5E7EB',
            borderBottom: '1px solid #E5E7EB',
          }}
        />
        <div
          ref={canvasRef}
          data-canvas-bg="true"
          style={{
            position: 'relative',
            marginLeft: RULER_SIZE,
            marginTop: RULER_SIZE,
            width: paper.width,
            height: paper.height,
            background: '#FFFFFF',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            overflow: 'hidden',
          }}
          onMouseDown={handleCanvasMouseDown}
        >
          {showGrid && (
            <div
              data-canvas-bg="true"
              style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                backgroundImage:
                  'linear-gradient(to right, #E5E7EB 0.5px, transparent 0.5px), linear-gradient(to bottom, #E5E7EB 0.5px, transparent 0.5px)',
                backgroundSize: '20px 20px',
              }}
            />
          )}
          {guidelines.map((g) => (
            <div
              key={g.id}
              style={{
                position: 'absolute',
                ...(g.orientation === 'horizontal'
                  ? { left: 0, right: 0, top: g.position, height: 1, borderTop: '1px dashed #3B82F6' }
                  : { top: 0, bottom: 0, left: g.position, width: 1, borderLeft: '1px dashed #3B82F6' }),
                cursor: g.orientation === 'horizontal' ? 'ns-resize' : 'ew-resize',
                zIndex: 5,
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                setDragMode({ type: 'guideline', id: g.id, orientation: g.orientation });
              }}
              onDoubleClick={() => onRemoveGuideline(g.id)}
            />
          ))}
          {elements.map(renderElement)}
        </div>
      </div>
    </div>
  );
};
