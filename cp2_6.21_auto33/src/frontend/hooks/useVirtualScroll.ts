import { useState, useEffect, useRef, useCallback } from 'react';

interface VirtualScrollOptions {
  itemCount: number;
  itemHeight: number;
  columns: number;
  overscan?: number;
}

interface VirtualScrollResult {
  containerRef: React.RefObject<HTMLDivElement>;
  visibleItems: number[];
  offsetY: number;
  totalHeight: number;
  containerStyle: React.CSSProperties;
  contentStyle: React.CSSProperties;
}

export function useVirtualScroll({
  itemCount,
  itemHeight,
  columns,
  overscan = 3
}: VirtualScrollOptions): VirtualScrollResult {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const rafIdRef = useRef<number | null>(null);
  const lastScrollTopRef = useRef(0);

  const updateScrollTop = useCallback((newScrollTop: number) => {
    if (rafIdRef.current !== null) return;
    lastScrollTopRef.current = newScrollTop;
    rafIdRef.current = requestAnimationFrame(() => {
      setScrollTop(lastScrollTopRef.current);
      rafIdRef.current = null;
    });
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleScroll = () => {
      updateScrollTop(el.scrollTop);
    };

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });

    setContainerHeight(el.clientHeight);
    el.addEventListener('scroll', handleScroll, { passive: true });
    resizeObserver.observe(el);

    return () => {
      el.removeEventListener('scroll', handleScroll);
      resizeObserver.disconnect();
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [updateScrollTop]);

  const rowCount = Math.ceil(itemCount / columns);
  const rowHeight = itemHeight;
  const totalHeight = rowCount * rowHeight;

  const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const endRow = Math.min(
    rowCount,
    Math.ceil((scrollTop + containerHeight) / rowHeight) + overscan
  );

  const visibleItems: number[] = [];
  for (let row = startRow; row < endRow; row++) {
    for (let col = 0; col < columns; col++) {
      const idx = row * columns + col;
      if (idx < itemCount) {
        visibleItems.push(idx);
      }
    }
  }

  const offsetY = startRow * rowHeight;

  return {
    containerRef,
    visibleItems,
    offsetY,
    totalHeight,
    containerStyle: {
      overflowY: 'auto',
      position: 'relative' as const,
      willChange: 'transform'
    },
    contentStyle: {
      position: 'relative' as const,
      height: totalHeight,
    }
  };
}
