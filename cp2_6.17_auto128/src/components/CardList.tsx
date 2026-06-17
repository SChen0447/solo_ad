import React, { useRef, useEffect, useState } from 'react';
import { ExcerptCard } from './ExcerptCard';
import type { Excerpt } from '../types';

interface CardListProps {
  excerpts: Excerpt[];
  emptyMessage?: string;
}

export function CardList({ excerpts, emptyMessage = '暂无摘录' }: CardListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [columnCount, setColumnCount] = useState(3);

  useEffect(() => {
    const updateColumnCount = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const cardWidth = 320;
        const gap = 20;
        const columns = Math.max(1, Math.floor((containerWidth + gap) / (cardWidth + gap)));
        setColumnCount(Math.min(columns, 4));
      }
    };

    updateColumnCount();
    window.addEventListener('resize', updateColumnCount);
    return () => window.removeEventListener('resize', updateColumnCount);
  }, []);

  const columns: Excerpt[][] = Array.from({ length: columnCount }, () => []);
  const columnHeights = new Array(columnCount).fill(0);

  excerpts.forEach(excerpt => {
    let shortestColumn = 0;
    let shortestHeight = columnHeights[0];

    for (let i = 1; i < columnCount; i++) {
      if (columnHeights[i] < shortestHeight) {
        shortestHeight = columnHeights[i];
        shortestColumn = i;
      }
    }

    columns[shortestColumn].push(excerpt);
    const estimatedHeight = excerpt.type === 'image' ? 350 : excerpt.type === 'video' ? 200 : 180 + (excerpt.content.length / 30) * 16;
    columnHeights[shortestColumn] += estimatedHeight + 20;
  });

  if (excerpts.length === 0) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 20px',
        color: '#9ca3af',
      }}>
        <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="40" cy="36" r="20" stroke="#d1d5db" strokeWidth="3" />
          <line x1="54" y1="50" x2="68" y2="64" stroke="#d1d5db" strokeWidth="3" strokeLinecap="round" />
        </svg>
        <p style={{ marginTop: '16px', fontSize: '14px' }}>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <div style={{
        display: 'flex',
        gap: '20px',
        alignItems: 'flex-start',
      }}>
        {columns.map((column, colIndex) => (
          <div
            key={colIndex}
            style={{
              flex: 1,
              minWidth: '320px',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {column.map(excerpt => (
              <ExcerptCard key={excerpt.id} excerpt={excerpt} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
