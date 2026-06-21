import { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { useAppContext } from '../frontend/context/AppContext';
import PetCard from '../frontend/components/PetCard';
import type { Pet } from '../../shared/types';

const CARD_WIDTH = 260;
const CARD_GAP = 16;
const CARD_HEIGHT_EST = 340;
const BUFFER = 3;

function getColumnCount(containerWidth: number): number {
  if (containerWidth < CARD_WIDTH + CARD_GAP) return 1;
  return Math.floor((containerWidth + CARD_GAP) / (CARD_WIDTH + CARD_GAP));
}

export default function Home() {
  const { pets, loading, selectPet } = useAppContext();
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
        setContainerHeight(entry.contentRect.height);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop);
    }
  }, []);

  const colCount = useMemo(() => getColumnCount(containerWidth), [containerWidth]);

  const columns = useMemo(() => {
    const cols: Pet[][] = Array.from({ length: colCount }, () => []);
    pets.forEach((pet, i) => {
      cols[i % colCount].push(pet);
    });
    return cols;
  }, [pets, colCount]);

  const totalHeight = useMemo(() => {
    if (colCount === 0) return 0;
    const maxColLen = Math.max(...columns.map((c) => c.length), 0);
    return maxColLen * (CARD_HEIGHT_EST + CARD_GAP) + CARD_GAP;
  }, [columns, colCount]);

  const startIdx = useMemo(() => Math.max(0, Math.floor(scrollTop / (CARD_HEIGHT_EST + CARD_GAP)) - BUFFER), [scrollTop]);

  const endIdx = useMemo(() => {
    const visibleCount = Math.ceil(containerHeight / (CARD_HEIGHT_EST + CARD_GAP)) + BUFFER * 2;
    const maxColLen = Math.max(...columns.map((c) => c.length), 0);
    return Math.min(maxColLen, startIdx + visibleCount);
  }, [scrollTop, containerHeight, columns, startIdx]);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      style={{
        height: 'calc(100vh - 64px)',
        overflowY: 'auto',
        overflowX: 'hidden',
        position: 'relative',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
          <div style={{ textAlign: 'center', color: '#999' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                border: '3px solid #F0F2F5',
                borderTopColor: '#F58F29',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
                margin: '0 auto 12px',
              }}
            />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            加载中...
          </div>
        </div>
      ) : pets.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#999' }}>
          暂无宠物信息
        </div>
      ) : (
        <div
          style={{
            position: 'relative',
            height: `${totalHeight}px`,
            width: `${colCount * (CARD_WIDTH + CARD_GAP) - CARD_GAP}px`,
            margin: '0 auto',
            maxWidth: '100%',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
            }}
          >
            {columns.map((col, colIdx) => (
              <div
                key={colIdx}
                style={{
                  position: 'absolute',
                  left: `${colIdx * (CARD_WIDTH + CARD_GAP)}px`,
                  top: 0,
                  width: `${CARD_WIDTH}px`,
                }}
              >
                {col.map((pet, rowIdx) => {
                  if (rowIdx < startIdx || rowIdx > endIdx) {
                    return (
                      <div
                        key={pet.id}
                        style={{
                          width: '260px',
                          height: `${CARD_HEIGHT_EST}px`,
                          marginBottom: '16px',
                        }}
                      />
                    );
                  }
                  return (
                    <PetCard key={pet.id} pet={pet} onSelect={selectPet} />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
