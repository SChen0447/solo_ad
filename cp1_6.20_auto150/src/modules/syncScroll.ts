export interface SyncScrollOptions {
  minZoom?: number;
  maxZoom?: number;
  zoomStep?: number;
  onZoomChange?: (zoom: number) => void;
}

export function syncScroll(
  refA: React.RefObject<HTMLElement>,
  refB: React.RefObject<HTMLElement>,
  options: SyncScrollOptions = {}
) {
  const {
    minZoom = 0.5,
    maxZoom = 2,
    zoomStep = 0.1,
    onZoomChange,
  } = options;

  let zoom = 1;
  let isScrolling = false;
  let rafId: number | null = null;
  let activeSource: 'A' | 'B' | null = null;

  const getZoom = () => zoom;

  const setZoom = (newZoom: number) => {
    const clamped = Math.max(minZoom, Math.min(maxZoom, newZoom));
    if (clamped !== zoom) {
      zoom = clamped;
      applyZoom();
      onZoomChange?.(zoom);
    }
  };

  const applyZoom = () => {
    if (refA.current) {
      const imgA = refA.current.querySelector('img');
      if (imgA) imgA.style.transform = `scale(${zoom})`;
    }
    if (refB.current) {
      const imgB = refB.current.querySelector('img');
      if (imgB) imgB.style.transform = `scale(${zoom})`;
    }
  };

  const syncScrollPosition = (source: React.RefObject<HTMLElement>, target: React.RefObject<HTMLElement>) => {
    if (isScrolling || !source.current || !target.current) return;
    isScrolling = true;

    if (rafId !== null) cancelAnimationFrame(rafId);

    rafId = requestAnimationFrame(() => {
      if (!source.current || !target.current) {
        isScrolling = false;
        return;
      }

      const scrollPercentage = source.current.scrollTop / (source.current.scrollHeight - source.current.clientHeight);
      const targetScrollTop = scrollPercentage * (target.current.scrollHeight - target.current.clientHeight);
      target.current.scrollTop = targetScrollTop;
      isScrolling = false;
    });
  };

  const handleScrollA = () => {
    if (activeSource && activeSource !== 'A') return;
    activeSource = 'A';
    syncScrollPosition(refA, refB);
    setTimeout(() => { activeSource = null; }, 50);
  };

  const handleScrollB = () => {
    if (activeSource && activeSource !== 'B') return;
    activeSource = 'B';
    syncScrollPosition(refB, refA);
    setTimeout(() => { activeSource = null; }, 50);
  };

  const handleWheel = (e: WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -zoomStep : zoomStep;
      setZoom(zoom + delta);
    }
  };

  const attach = () => {
    if (refA.current) {
      refA.current.addEventListener('scroll', handleScrollA, { passive: true });
      refA.current.addEventListener('wheel', handleWheel, { passive: false });
    }
    if (refB.current) {
      refB.current.addEventListener('scroll', handleScrollB, { passive: true });
      refB.current.addEventListener('wheel', handleWheel, { passive: false });
    }
    applyZoom();
  };

  const detach = () => {
    if (rafId !== null) cancelAnimationFrame(rafId);
    if (refA.current) {
      refA.current.removeEventListener('scroll', handleScrollA);
      refA.current.removeEventListener('wheel', handleWheel);
    }
    if (refB.current) {
      refB.current.removeEventListener('scroll', handleScrollB);
      refB.current.removeEventListener('wheel', handleWheel);
    }
  };

  return { attach, detach, getZoom, setZoom };
}
