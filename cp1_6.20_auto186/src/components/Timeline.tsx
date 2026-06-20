import { useRef, useEffect, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause } from 'lucide-react';
import type { ImageItem } from '../types';

interface TimelineProps {
  images: ImageItem[];
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
}

const NODE_SPACING = 80;
const NODE_SIZE = 20;
const SCROLL_SYNC_DELAY = 300;

export default function Timeline({
  images,
  selectedIndex,
  onSelectIndex,
  isPlaying,
  onTogglePlay,
}: TimelineProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);
  const scrollTimeoutRef = useRef<number | null>(null);
  const lastScrollIndex = useRef(selectedIndex);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!scrollContainerRef.current) return;
    e.preventDefault();
    const container = scrollContainerRef.current;
    container.scrollLeft += e.deltaY;
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!scrollContainerRef.current) return;
    isDragging.current = true;
    startX.current = e.pageX - scrollContainerRef.current.offsetLeft;
    scrollLeft.current = scrollContainerRef.current.scrollLeft;
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current || !scrollContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const walk = x - startX.current;
    scrollContainerRef.current.scrollLeft = scrollLeft.current - walk;
  }, []);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const handleMouseLeave = useCallback(() => {
    isDragging.current = false;
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!scrollContainerRef.current) return;
    startX.current = e.touches[0].pageX - scrollContainerRef.current.offsetLeft;
    scrollLeft.current = scrollContainerRef.current.scrollLeft;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!scrollContainerRef.current) return;
    const x = e.touches[0].pageX - scrollContainerRef.current.offsetLeft;
    const walk = x - startX.current;
    scrollContainerRef.current.scrollLeft = scrollLeft.current - walk;
  }, []);

  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current || images.length === 0) return;

    if (scrollTimeoutRef.current) {
      cancelAnimationFrame(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = requestAnimationFrame(() => {
      const container = scrollContainerRef.current;
      if (!container) return;

      const centerX = container.scrollLeft + container.clientWidth / 2;
      const index = Math.round((centerX - NODE_SIZE / 2) / NODE_SPACING);
      const clampedIndex = Math.max(0, Math.min(images.length - 1, index));

      if (clampedIndex !== lastScrollIndex.current) {
        lastScrollIndex.current = clampedIndex;
        onSelectIndex(clampedIndex);
      }
    });
  }, [images.length, onSelectIndex]);

  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        cancelAnimationFrame(scrollTimeoutRef.current);
      }
    };
  }, []);

  const handleNodeClick = (index: number) => {
    onSelectIndex(index);
  };

  const totalWidth = images.length > 0 ? (images.length - 1) * NODE_SPACING + NODE_SIZE + 80 : 0;

  return (
    <div className="timeline-container">
      <div className="timeline-header">
        <button
          className="play-button"
          onClick={onTogglePlay}
          disabled={images.length === 0}
        >
          {isPlaying ? <Pause size={18} /> : <Play size={18} />}
          <span>{isPlaying ? '暂停' : '自动播放'}</span>
        </button>
      </div>

      <div
        ref={scrollContainerRef}
        className="timeline-scroll"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onScroll={handleScroll}
      >
        <div className="timeline-track" style={{ width: `${totalWidth}px` }}>
          {images.length > 1 && (
            <div className="timeline-line" />
          )}
          {images.map((image, index) => (
            <div
              key={image.id}
              className="timeline-node-wrapper"
              style={{ left: `${index * NODE_SPACING + 40}px` }}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <motion.div
                className={`timeline-node ${index === selectedIndex ? 'active' : ''}`}
                onClick={() => handleNodeClick(index)}
                animate={{
                  scale: index === selectedIndex && isPlaying ? [1, 1.2, 1] : 1,
                }}
                transition={{
                  duration: 0.2,
                  ease: 'easeInOut',
                }}
              />
              <AnimatePresence>
                {hoveredIndex === index && (
                  <motion.div
                    className="node-tooltip"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    transition={{ duration: 0.2 }}
                  >
                    {image.stepName}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
