import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CanvasComponent as CanvasComponentType,
  calculatePositions,
  calculateTotalHeight,
  GAP,
  ComponentType,
  getComponentMeta,
  generateId,
} from '../utils/layoutEngine';
import CanvasComponent from './CanvasComponent';

interface CanvasProps {
  components: CanvasComponentType[];
  containerWidth: number;
  onContainerResize: (width: number) => void;
  onRemoveComponent: (id: string) => void;
  onAddComponent: (type: ComponentType) => void;
}

const MIN_WIDTH = 200;
const MAX_WIDTH = 1200;

const Canvas: React.FC<CanvasProps> = ({
  components,
  containerWidth,
  onContainerResize,
  onRemoveComponent,
  onAddComponent,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const pendingWidthRef = useRef<number | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const positions = useMemo(
    () => calculatePositions(containerWidth - 24, components, GAP),
    [containerWidth, components]
  );

  const totalHeight = useMemo(() => calculateTotalHeight(positions, GAP), [positions]);

  const scheduleResize = useCallback((nextWidth: number) => {
    pendingWidthRef.current = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, nextWidth));
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      if (pendingWidthRef.current !== null) {
        onContainerResize(pendingWidthRef.current);
        pendingWidthRef.current = null;
      }
      rafRef.current = null;
    });
  }, [onContainerResize]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isDraggingRef.current = true;

    const startX = e.clientX;
    const startWidth = containerWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const deltaX = moveEvent.clientX - startX;
      const nextWidth = startWidth + deltaX;
      scheduleResize(nextWidth);
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const type = e.dataTransfer.getData('componentType') as ComponentType;
    if (type) {
      onAddComponent(type);
    }
  };

  const positionMap = useMemo(() => {
    const map = new Map<string, { x: number; y: number; width: number; height: number }>();
    for (const pos of positions) {
      map.set(pos.id, pos);
    }
    return map;
  }, [positions]);

  return (
    <div
      style={{
        flex: 1,
        background: '#ffffff',
        padding: 12,
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div
          style={{
            fontSize: 12,
            color: '#666',
            marginBottom: 6,
            fontWeight: 500,
          }}
        >
          容器宽度: {containerWidth}px
        </div>

        <div
          ref={containerRef}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          style={{
            position: 'relative',
            width: containerWidth,
            minHeight: 200,
            border: `2px dashed ${isDragOver ? '#4a90d9' : '#aaa'}`,
            padding: 12,
            background: isDragOver ? 'rgba(74, 144, 217, 0.05)' : '#fff',
            transition: 'border-color 0.2s, background 0.2s',
            borderRadius: 4,
          }}
        >
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: Math.max(totalHeight, 40),
            }}
          >
            <AnimatePresence mode="popLayout">
              {components.map((comp) => {
                const pos = positionMap.get(comp.id);
                if (!pos) return null;
                return (
                  <motion.div
                    key={comp.id}
                    style={{
                      position: 'absolute',
                      left: pos.x,
                      top: pos.y,
                    }}
                    animate={{ left: pos.x, top: pos.y }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                  >
                    <CanvasComponent
                      type={comp.type}
                      width={pos.width}
                      height={pos.height}
                      onRemove={() => onRemoveComponent(comp.id)}
                    />
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {components.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, y: [0, -8, 0] }}
                transition={{
                  opacity: { duration: 0.3 },
                  y: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
                }}
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  fontSize: 16,
                  color: '#b0b0b0',
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none',
                }}
              >
                拖拽组件到此处开始布局
              </motion.div>
            )}
          </div>

          <div
            onMouseDown={handleMouseDown}
            title="拖拽调整容器宽度"
            style={{
              position: 'absolute',
              right: -5,
              bottom: -5,
              width: 10,
              height: 10,
              background: '#4a90d9',
              cursor: 'nwse-resize',
              borderRadius: 2,
            }}
          />
        </div>
      </div>

      <div style={{ display: 'none' }}>
        {(() => {
          void getComponentMeta;
          void generateId;
          return null;
        })()}
      </div>
    </div>
  );
};

export default Canvas;
