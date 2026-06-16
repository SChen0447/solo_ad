import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useDrag, useDrop, DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import type { Annotation, ChartConfig, StudentScore } from '@/types';
import { ChartCard } from './ChartCard';
import { GRID_GAP } from '@/types';

interface ChartGridProps {
  data: StudentScore[];
  charts: ChartConfig[];
  annotations: Annotation[];
  onLayoutChange: (charts: ChartConfig[]) => void;
  onAddAnnotation: (annotation: Omit<Annotation, 'id'>) => void;
  onUpdateAnnotation: (id: string, updates: Partial<Annotation>) => void;
  onDeleteAnnotation: (id: string) => void;
  onDeleteChart: (id: string) => void;
}

const DRAG_ITEM_TYPE = 'CHART_CARD';

interface DragItem {
  chartId: string;
}

interface ColHeights {
  [col: number]: number;
}

const getColCount = (containerWidth: number): number => {
  if (containerWidth >= 1600) return 3;
  if (containerWidth >= 1024) return 2;
  return 1;
};

const computeLayout = (
  charts: ChartConfig[],
  colCount: number,
  rowHeight: number,
  gap: number
): {
  positions: Map<string, { left: number; top: number; width: number; height: number }>;
  totalHeight: number;
} => {
  const positions = new Map();
  const colWidths: ColHeights = {};
  for (let i = 0; i < colCount; i++) colWidths[i] = 0;

  const sorted = [...charts].sort((a, b) => a.y - b.y || a.x - b.x);

  for (const chart of sorted) {
    let col = chart.x;
    if (col >= colCount) col = colCount - 1;
    if (col < 0) col = 0;

    const cardWidth = chart.width;
    const cardHeight = chart.height;

    let targetCol = col;
    let minHeight = Infinity;
    for (let i = 0; i <= colCount - cardWidth; i++) {
      let maxH = 0;
      for (let j = i; j < i + cardWidth; j++) {
        if (colWidths[j] > maxH) maxH = colWidths[j];
      }
      if (maxH < minHeight || (maxH === minHeight && i === col)) {
        minHeight = maxH;
        targetCol = i;
      }
    }

    if (targetCol + cardWidth > colCount) {
      targetCol = Math.max(0, colCount - cardWidth);
      minHeight = 0;
      for (let j = targetCol; j < targetCol + cardWidth; j++) {
        if (colWidths[j] > minHeight) minHeight = colWidths[j];
      }
    }

    const colUnitWidth = 100 / colCount;
    const left = targetCol * colUnitWidth;
    const top = minHeight;
    const width = cardWidth * colUnitWidth;
    const height = cardHeight * rowHeight + (cardHeight - 1) * gap;

    positions.set(chart.id, { left, top, width, height });

    for (let j = targetCol; j < targetCol + cardWidth; j++) {
      colWidths[j] = top + height + gap;
    }
  }

  const totalHeight = Math.max(0, ...Object.values(colWidths)) + 24;
  return { positions, totalHeight };
};

interface DraggableCardProps {
  config: ChartConfig;
  data: StudentScore[];
  annotations: Annotation[];
  style: React.CSSProperties;
  onMove: (id: string, newX: number, newY: number) => void;
  onResize: (id: string, newWidth: number, newHeight: number) => void;
  onAddAnnotation: (annotation: Omit<Annotation, 'id'>) => void;
  onUpdateAnnotation: (id: string, updates: Partial<Annotation>) => void;
  onDeleteAnnotation: (id: string) => void;
  onDeleteChart: (id: string) => void;
  colCount: number;
  rowHeight: number;
}

const DraggableCard: React.FC<DraggableCardProps> = ({
  config,
  data,
  annotations,
  style,
  onMove,
  onResize,
  onAddAnnotation,
  onUpdateAnnotation,
  onDeleteAnnotation,
  onDeleteChart,
  colCount,
  rowHeight,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = useState(false);
  const resizeStart = useRef({
    x: 0,
    y: 0,
    w: config.width,
    h: config.height,
  });

  const [{ isDragging }, drag] = useDrag<DragItem, unknown, { isDragging: boolean }>({
    type: DRAG_ITEM_TYPE,
    item: { chartId: config.id },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop<DragItem>({
    accept: DRAG_ITEM_TYPE,
    hover: (item) => {
      if (item.chartId === config.id) return;
      onMove(item.chartId, config.x, config.y);
    },
  });

  drag(drop(cardRef));

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsResizing(true);
      resizeStart.current = {
        x: e.clientX,
        y: e.clientY,
        w: config.width,
        h: config.height,
      };
    },
    [config.width, config.height]
  );

  useEffect(() => {
    if (!isResizing) return;

    let rafId: number;
    let lastW = config.width;
    let lastH = config.height;

    const handleMouseMove = (e: MouseEvent) => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const deltaX = e.clientX - resizeStart.current.x;
        const deltaY = e.clientY - resizeStart.current.y;

        if (!cardRef.current) return;
        const rect = cardRef.current.getBoundingClientRect();
        const unitW = rect.width / config.width;
        const unitH = rowHeight + GRID_GAP;

        const newW = Math.max(
          1,
          Math.min(colCount, Math.round(resizeStart.current.w + deltaX / unitW))
        );
        const newH = Math.max(
          1,
          Math.min(6, Math.round(resizeStart.current.h + deltaY / unitH))
        );

        if (newW !== lastW || newH !== lastH) {
          lastW = newW;
          lastH = newH;
          onResize(config.id, newW, newH);
        }
      });
    };

    const handleMouseUp = () => {
      cancelAnimationFrame(rafId);
      setIsResizing(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, config.width, config.height, config.id, colCount, rowHeight, onResize]);

  return (
    <div
      ref={cardRef}
      className="chart-grid-item"
      style={{
        ...style,
        position: 'absolute',
        opacity: isDragging ? 0.4 : 1,
        zIndex: isDragging || isResizing ? 50 : 'auto',
      }}
    >
      <ChartCard
        config={config}
        data={data}
        annotations={annotations}
        onAddAnnotation={onAddAnnotation}
        onUpdateAnnotation={onUpdateAnnotation}
        onDeleteAnnotation={onDeleteAnnotation}
        onDelete={() => onDeleteChart(config.id)}
        isDragging={isDragging}
      />
      {!isDragging && (
        <div
          className="resize-handle"
          onMouseDown={handleResizeStart}
          style={{
            position: 'absolute',
            right: 0,
            bottom: 0,
            zIndex: 60,
            opacity: 1,
          }}
        />
      )}
    </div>
  );
};

export const ChartGrid: React.FC<ChartGridProps> = ({
  data,
  charts,
  annotations,
  onLayoutChange,
  onAddAnnotation,
  onUpdateAnnotation,
  onDeleteAnnotation,
  onDeleteChart,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(1200);
  const rowHeight = 180;

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };
    updateWidth();
    const ro = new ResizeObserver(updateWidth);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const colCount = useMemo(() => getColCount(containerWidth), [containerWidth]);

  const { positions, totalHeight } = useMemo(() => {
    return computeLayout(charts, colCount, rowHeight, GRID_GAP);
  }, [charts, colCount]);

  const handleMove = useCallback(
    (id: string, newX: number, newY: number) => {
      const updated = charts.map((c) =>
        c.id === id ? { ...c, x: newX, y: newY } : c
      );
      const dragIdx = updated.findIndex((c) => c.id === id);
      const targetIdx = updated.findIndex(
        (c) => c.x === newX && c.y === newY && c.id !== id
      );
      if (targetIdx !== -1 && dragIdx !== -1) {
        const target = updated[targetIdx];
        updated[targetIdx] = { ...target, x: updated[dragIdx].x, y: updated[dragIdx].y };
        updated[dragIdx] = { ...updated[dragIdx], x: newX, y: newY };
      }
      onLayoutChange(updated);
    },
    [charts, onLayoutChange]
  );

  const handleResize = useCallback(
    (id: string, newWidth: number, newHeight: number) => {
      const updated = charts.map((c) =>
        c.id === id ? { ...c, width: newWidth, height: newHeight } : c
      );
      onLayoutChange(updated);
    },
    [charts, onLayoutChange]
  );

  if (charts.length === 0) {
    return (
      <div
        ref={containerRef}
        style={{
          width: '100%',
          minHeight: 400,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#6B7280',
          fontSize: 16,
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
          <div style={{ color: '#A0A0B8', marginBottom: 8, fontSize: 18 }}>
            暂无图表
          </div>
          <div style={{ fontSize: 14 }}>
            请先上传成绩数据，系统将自动生成分析图表
          </div>
        </div>
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div
        ref={containerRef}
        style={{
          position: 'relative',
          width: '100%',
          minHeight: totalHeight,
          padding: GRID_GAP,
        }}
      >
        <div
          style={{
            position: 'relative',
            width: `calc(100% - ${GRID_GAP * 2}px)`,
            height: totalHeight,
            margin: `0 ${GRID_GAP}px`,
          }}
        >
          {charts.map((chart) => {
            const pos = positions.get(chart.id);
            if (!pos) return null;
            return (
              <DraggableCard
                key={chart.id}
                config={chart}
                data={data}
                annotations={annotations}
                style={{
                  left: `calc(${pos.left}% + ${GRID_GAP / 2}px)`,
                  top: pos.top,
                  width: `calc(${pos.width}% - ${GRID_GAP}px)`,
                  height: pos.height,
                }}
                onMove={handleMove}
                onResize={handleResize}
                onAddAnnotation={onAddAnnotation}
                onUpdateAnnotation={onUpdateAnnotation}
                onDeleteAnnotation={onDeleteAnnotation}
                onDeleteChart={onDeleteChart}
                colCount={colCount}
                rowHeight={rowHeight}
              />
            );
          })}
        </div>
      </div>
    </DndProvider>
  );
};

export default ChartGrid;
