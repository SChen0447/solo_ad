import { forwardRef, useState, useCallback, useRef, useEffect } from 'react';
import { useDrop } from 'react-dnd';
import { LayoutComponent, Breakpoint, ComponentType } from '../types';

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  componentId: string;
}

interface ResizeState {
  isResizing: boolean;
  startY: number;
  startHeight: number;
  componentId: string;
}

interface DragState {
  isDragging: boolean;
  startX: number;
  startY: number;
  componentStartX: number;
  componentStartY: number;
  componentId: string;
}

interface DropIndicatorState {
  visible: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CanvasItemProps {
  component: LayoutComponent;
  isSelected: boolean;
  breakpoint: Breakpoint;
  onMouseDown: (e: React.MouseEvent, id: string) => void;
  onResizeStart: (e: React.MouseEvent, id: string) => void;
  onContextMenu: (e: React.MouseEvent, id: string) => void;
}

function CanvasItem({
  component,
  isSelected,
  breakpoint,
  onMouseDown,
  onResizeStart,
  onContextMenu,
}: CanvasItemProps) {
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!component.locked) {
        onMouseDown(e, component.id);
      }
    },
    [component.id, component.locked, onMouseDown]
  );

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!component.locked) {
        onResizeStart(e, component.id);
      }
    },
    [component.id, component.locked, onResizeStart]
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onContextMenu(e, component.id);
    },
    [component.id, onContextMenu]
  );

  const scale = breakpoint / 1200;
  const displayWidth = breakpoint === Breakpoint.MOBILE
    ? breakpoint - component.style.margin.left - component.style.margin.right
    : component.width * scale;

  const getComponentPattern = () => {
    switch (component.type) {
      case ComponentType.NAVBAR:
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '0 24px', height: '100%' }}>
            <div style={{ width: '80px', height: '24px', background: 'rgba(255,255,255,0.5)', borderRadius: '4px' }} />
            <div style={{ display: 'flex', gap: '12px', marginLeft: 'auto' }}>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} style={{ width: '60px', height: '16px', background: 'rgba(255,255,255,0.4)', borderRadius: '4px' }} />
              ))}
            </div>
          </div>
        );
      case ComponentType.CAROUSEL:
        return (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', position: 'relative' }}>
            <div style={{ fontSize: '48px', opacity: 0.5 }}>🖼️</div>
            <div style={{ position: 'absolute', bottom: '20px', display: 'flex', gap: '8px' }}>
              {[1, 2, 3].map((i) => (
                <div key={i} style={{ width: '10px', height: '10px', borderRadius: '50%', background: i === 1 ? '#4299e1' : 'rgba(255,255,255,0.6)' }} />
              ))}
            </div>
          </div>
        );
      case ComponentType.CARD_GRID:
        return (
          <div style={{ display: 'grid', gridTemplateColumns: breakpoint === Breakpoint.MOBILE ? '1fr' : 'repeat(3, 1fr)', gap: '16px', padding: '20px', height: '100%' }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.6)', borderRadius: '8px', padding: '16px' }}>
                <div style={{ width: '100%', height: '60%', background: 'rgba(255,255,255,0.8)', borderRadius: '4px', marginBottom: '12px' }} />
                <div style={{ width: '60%', height: '12px', background: 'rgba(255,255,255,0.7)', borderRadius: '4px', marginBottom: '8px' }} />
                <div style={{ width: '40%', height: '10px', background: 'rgba(255,255,255,0.5)', borderRadius: '4px' }} />
              </div>
            ))}
          </div>
        );
      case ComponentType.TWO_COLUMN:
        return (
          <div style={{ display: 'grid', gridTemplateColumns: breakpoint === Breakpoint.MOBILE ? '1fr' : '1fr 1fr', gap: '16px', padding: '20px', height: '100%' }}>
            <div style={{ background: 'rgba(255,255,255,0.6)', borderRadius: '8px' }} />
            <div style={{ background: 'rgba(255,255,255,0.4)', borderRadius: '8px' }} />
          </div>
        );
      case ComponentType.THREE_COLUMN:
        return (
          <div style={{ display: 'grid', gridTemplateColumns: breakpoint === Breakpoint.MOBILE ? '1fr' : 'repeat(3, 1fr)', gap: '16px', padding: '20px', height: '100%' }}>
            <div style={{ background: 'rgba(255,255,255,0.7)', borderRadius: '8px' }} />
            <div style={{ background: 'rgba(255,255,255,0.5)', borderRadius: '8px' }} />
            <div style={{ background: 'rgba(255,255,255,0.7)', borderRadius: '8px' }} />
          </div>
        );
      case ComponentType.FOOTER:
        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '16px' }}>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} style={{ width: '50px', height: '12px', background: 'rgba(255,255,255,0.5)', borderRadius: '4px' }} />
              ))}
            </div>
            <div style={{ width: '150px', height: '10px', background: 'rgba(255,255,255,0.4)', borderRadius: '4px' }} />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div
      onMouseDown={handleMouseDown}
      onContextMenu={handleContextMenu}
      style={{
        position: 'absolute',
        left: breakpoint === Breakpoint.MOBILE ? component.style.margin.left : component.x * scale,
        top: breakpoint === Breakpoint.MOBILE ? 'auto' : component.y,
        width: displayWidth,
        height: component.height,
        marginTop: breakpoint === Breakpoint.MOBILE ? '1rem' : component.style.margin.top,
        marginRight: component.style.margin.right,
        marginBottom: component.style.margin.bottom,
        marginLeft: breakpoint === Breakpoint.MOBILE ? 0 : component.style.margin.left,
        backgroundColor: component.style.backgroundColor,
        borderRadius: `${component.style.borderRadius}px`,
        zIndex: component.zIndex,
        cursor: component.locked ? 'default' : 'move',
        userSelect: 'none',
        animation: 'fadeSlideIn 0.3s ease-out',
        transition: breakpoint !== Breakpoint.MOBILE ? 'width 0.5s ease, left 0.5s ease, background-color 0.2s, border-radius 0.2s' : 'none',
        border: isSelected ? '2px solid #4299e1' : '1px solid rgba(0, 0, 0, 0.1)',
        boxShadow: isSelected ? '0 0 0 3px rgba(66, 153, 225, 0.3)' : 'none',
        overflow: 'hidden',
      }}
    >
      {component.locked && (
        <div
          style={{
            position: 'absolute',
            top: '8px',
            left: '8px',
            width: '20px',
            height: '20px',
            background: 'rgba(0, 0, 0, 0.6)',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            color: '#ffffff',
            zIndex: 10,
          }}
        >
          🔒
        </div>
      )}

      <div
        style={{
          position: 'absolute',
          top: '-24px',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '2px 12px',
          background: 'rgba(255, 255, 255, 0.9)',
          border: '1px solid #cbd5e0',
          borderRadius: '4px',
          fontSize: '11px',
          color: '#4a5568',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
        }}
      >
        {component.name}
      </div>

      <div style={{ width: '100%', height: '100%', position: 'relative' }}>
        {getComponentPattern()}
      </div>

      {isSelected && !component.locked && (
        <>
          {['nw', 'ne', 'sw', 'se', 'n', 's', 'w', 'e'].map((dir) => {
            const isCorner = ['nw', 'ne', 'sw', 'se'].includes(dir);
            const size = isCorner ? '10px' : '6px';
            const styles: React.CSSProperties = {
              position: 'absolute',
              width: size,
              height: size,
              background: '#ffffff',
              border: '2px solid #4299e1',
              borderRadius: isCorner ? '50%' : '2px',
              zIndex: 20,
            };

            if (dir === 'nw') Object.assign(styles, { top: '-5px', left: '-5px', cursor: 'nw-resize' });
            if (dir === 'ne') Object.assign(styles, { top: '-5px', right: '-5px', cursor: 'ne-resize' });
            if (dir === 'sw') Object.assign(styles, { bottom: '-5px', left: '-5px', cursor: 'sw-resize' });
            if (dir === 'se') Object.assign(styles, { bottom: '-5px', right: '-5px', cursor: 'se-resize' });
            if (dir === 'n') Object.assign(styles, { top: '-3px', left: '50%', transform: 'translateX(-50%)', cursor: 'n-resize' });
            if (dir === 's') Object.assign(styles, { bottom: '-3px', left: '50%', transform: 'translateX(-50%)', cursor: 's-resize' });
            if (dir === 'w') Object.assign(styles, { top: '50%', left: '-3px', transform: 'translateY(-50%)', cursor: 'w-resize' });
            if (dir === 'e') Object.assign(styles, { top: '50%', right: '-3px', transform: 'translateY(-50%)', cursor: 'e-resize' });

            return (
              <div
                key={dir}
                style={styles}
                onMouseDown={(e) => ['s', 'se', 'sw', 'n', 'ne', 'nw'].includes(dir) ? handleResizeStart(e) : undefined}
              />
            );
          })}
        </>
      )}
    </div>
  );
}

interface CanvasProps {
  components: LayoutComponent[];
  selectedId: string | null;
  breakpoint: Breakpoint;
  onDrop: (type: ComponentType, x: number, y: number) => void;
  onComponentMove: (id: string, x: number, y: number) => void;
  onComponentMoveEnd: () => void;
  onComponentResize: (id: string, width: number, height: number) => void;
  onComponentResizeEnd: () => void;
  onComponentSelect: (id: string | null) => void;
  onComponentDelete: (id: string) => void;
  onComponentDuplicate: (id: string) => void;
  onComponentBringToFront: (id: string) => void;
  onComponentSendToBack: (id: string) => void;
  onComponentLock: (id: string) => void;
}

const Canvas = forwardRef<HTMLDivElement, CanvasProps>(function Canvas(
  {
    components,
    selectedId,
    breakpoint,
    onDrop,
    onComponentMove,
    onComponentMoveEnd,
    onComponentResize,
    onComponentResizeEnd,
    onComponentSelect,
    onComponentDelete,
    onComponentDuplicate,
    onComponentBringToFront,
    onComponentSendToBack,
    onComponentLock,
  },
  ref
) {
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    componentId: '',
  });
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [resizeState, setResizeState] = useState<ResizeState | null>(null);
  const [dropIndicator, setDropIndicator] = useState<DropIndicatorState>({
    visible: false,
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  const snapToGrid = useCallback((value: number, gridSize: number = 10) => {
    return Math.round(value / gridSize) * gridSize;
  }, []);

  const [{ isOver }, drop] = useDrop(
    () => ({
      accept: 'LAYOUT_COMPONENT',
      hover: (item, monitor) => {
        const offset = monitor.getClientOffset();
        const canvasRect = canvasContainerRef.current?.getBoundingClientRect();
        if (!offset || !canvasRect) return;

        const x = offset.x - canvasRect.left;
        const y = offset.y - canvasRect.top;
        const scale = breakpoint / 1200;

        setDropIndicator({
          visible: true,
          x: snapToGrid(x),
          y: snapToGrid(y),
          width: 200 * scale,
          height: 100,
        });
      },
      drop: (item: { type: ComponentType }, monitor) => {
        const offset = monitor.getClientOffset();
        const canvasRect = canvasContainerRef.current?.getBoundingClientRect();
        if (!offset || !canvasRect) return;

        const x = offset.x - canvasRect.left - 100;
        const y = offset.y - canvasRect.top - 50;

        setDropIndicator({ visible: false, x: 0, y: 0, width: 0, height: 0 });
        onDrop(item.type, snapToGrid(x), snapToGrid(y));
      },
      collect: (monitor) => ({
        isOver: monitor.isOver(),
      }),
    }),
    [breakpoint, onDrop, snapToGrid]
  );

  useEffect(() => {
    setDropIndicator({ visible: false, x: 0, y: 0, width: 0, height: 0 });
  }, [isOver]);

  const handleComponentMouseDown = useCallback(
    (e: React.MouseEvent, id: string) => {
      const component = components.find((c) => c.id === id);
      if (!component || component.locked) return;

      e.preventDefault();
      onComponentSelect(id);

      setDragState({
        isDragging: true,
        startX: e.clientX,
        startY: e.clientY,
        componentStartX: component.x,
        componentStartY: component.y,
        componentId: id,
      });
    },
    [components, onComponentSelect]
  );

  const handleResizeStart = useCallback(
    (e: React.MouseEvent, id: string) => {
      const component = components.find((c) => c.id === id);
      if (!component || component.locked) return;

      e.preventDefault();
      e.stopPropagation();

      setResizeState({
        isResizing: true,
        startY: e.clientY,
        startHeight: component.height,
        componentId: id,
      });
    },
    [components]
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, id: string) => {
      onComponentSelect(id);
      setContextMenu({
        visible: true,
        x: e.clientX,
        y: e.clientY,
        componentId: id,
      });
    },
    [onComponentSelect]
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (dragState?.isDragging) {
        const scale = breakpoint / 1200;
        const deltaX = (e.clientX - dragState.startX) / scale;
        const deltaY = e.clientY - dragState.startY;
        const newX = snapToGrid(dragState.componentStartX + deltaX);
        const newY = snapToGrid(dragState.componentStartY + deltaY);
        onComponentMove(dragState.componentId, Math.max(0, newX), Math.max(0, newY));
      }

      if (resizeState?.isResizing) {
        const deltaY = e.clientY - resizeState.startY;
        const newHeight = Math.max(50, snapToGrid(resizeState.startHeight + deltaY));
        const component = components.find((c) => c.id === resizeState.componentId);
        if (component) {
          onComponentResize(resizeState.componentId, component.width, newHeight);
        }
      }
    };

    const handleMouseUp = () => {
      if (dragState?.isDragging) {
        setDragState(null);
        onComponentMoveEnd();
      }
      if (resizeState?.isResizing) {
        setResizeState(null);
        onComponentResizeEnd();
      }
    };

    if (dragState?.isDragging || resizeState?.isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, resizeState, breakpoint, snapToGrid, onComponentMove, onComponentMoveEnd, onComponentResize, onComponentResizeEnd, components]);

  useEffect(() => {
    const handleClick = () => {
      if (contextMenu.visible) {
        setContextMenu((prev) => ({ ...prev, visible: false }));
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [contextMenu.visible]);

  const handleCanvasClick = useCallback(() => {
    onComponentSelect(null);
  }, [onComponentSelect]);

  const setRefs = useCallback(
    (node: HTMLDivElement) => {
      drop(node);
      canvasContainerRef.current = node;
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    },
    [drop, ref]
  );

  const sortedComponents = [...components].sort((a, b) => a.zIndex - b.zIndex);

  const selectedComponent = components.find((c) => c.id === contextMenu.componentId);

  return (
    <div
      ref={setRefs}
      onClick={handleCanvasClick}
      style={{
        position: 'relative',
        width: breakpoint,
        minHeight: '800px',
        background: '#ffffff',
        borderRadius: '8px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        transition: 'width 0.5s ease',
        padding: breakpoint === Breakpoint.MOBILE ? '16px' : '0',
        display: breakpoint === Breakpoint.MOBILE ? 'flex' : 'block',
        flexDirection: breakpoint === Breakpoint.MOBILE ? 'column' : 'initial',
        overflow: 'hidden',
      }}
    >
      {dropIndicator.visible && (
        <div
          style={{
            position: 'absolute',
            left: dropIndicator.x,
            top: dropIndicator.y,
            width: dropIndicator.width,
            height: dropIndicator.height,
            border: '2px dashed #4299e1',
            background: 'rgba(66, 153, 225, 0.1)',
            borderRadius: '4px',
            pointerEvents: 'none',
            zIndex: 9999,
          }}
        />
      )}

      {sortedComponents.map((component) => (
        <CanvasItem
          key={component.id}
          component={component}
          isSelected={selectedId === component.id}
          breakpoint={breakpoint}
          onMouseDown={handleComponentMouseDown}
          onResizeStart={handleResizeStart}
          onContextMenu={handleContextMenu}
        />
      ))}

      {components.length === 0 && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            color: '#a0aec0',
            fontSize: '14px',
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
          <div>从左侧拖拽组件到这里开始创建布局</div>
        </div>
      )}

      {contextMenu.visible && (
        <div
          style={{
            position: 'fixed',
            left: contextMenu.x,
            top: contextMenu.y,
            background: 'linear-gradient(180deg, #6b7280 0%, #4b5563 100%)',
            borderRadius: '8px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3), 0 0 4px rgba(0, 0, 0, 0.2)',
            padding: '4px',
            zIndex: 10000,
            minWidth: '140px',
            border: '1px solid #374151',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              onComponentDelete(contextMenu.componentId);
              setContextMenu((prev) => ({ ...prev, visible: false }));
            }}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: 'none',
              background: 'transparent',
              color: '#ffffff',
              textAlign: 'left',
              cursor: 'pointer',
              fontSize: '13px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            🗑️ 删除
          </button>
          <button
            onClick={() => {
              onComponentDuplicate(contextMenu.componentId);
              setContextMenu((prev) => ({ ...prev, visible: false }));
            }}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: 'none',
              background: 'transparent',
              color: '#ffffff',
              textAlign: 'left',
              cursor: 'pointer',
              fontSize: '13px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            📋 复制
          </button>
          <div style={{ height: '1px', background: 'rgba(255,255,255,0.2)', margin: '4px 0' }} />
          <button
            onClick={() => {
              onComponentBringToFront(contextMenu.componentId);
              setContextMenu((prev) => ({ ...prev, visible: false }));
            }}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: 'none',
              background: 'transparent',
              color: '#ffffff',
              textAlign: 'left',
              cursor: 'pointer',
              fontSize: '13px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            ⬆️ 置顶
          </button>
          <button
            onClick={() => {
              onComponentSendToBack(contextMenu.componentId);
              setContextMenu((prev) => ({ ...prev, visible: false }));
            }}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: 'none',
              background: 'transparent',
              color: '#ffffff',
              textAlign: 'left',
              cursor: 'pointer',
              fontSize: '13px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            ⬇️ 置底
          </button>
          <div style={{ height: '1px', background: 'rgba(255,255,255,0.2)', margin: '4px 0' }} />
          <button
            onClick={() => {
              onComponentLock(contextMenu.componentId);
              setContextMenu((prev) => ({ ...prev, visible: false }));
            }}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: 'none',
              background: 'transparent',
              color: '#ffffff',
              textAlign: 'left',
              cursor: 'pointer',
              fontSize: '13px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            {selectedComponent?.locked ? '🔓 解锁' : '🔒 锁定'}
          </button>
        </div>
      )}

      <style>{`
        @keyframes fadeSlideIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
});

export default Canvas;
