import React, { ReactNode, useEffect, useRef, useState } from 'react';
import './Masonry.css';

interface MasonryProps {
  children: ReactNode[];
  columnCount?: number;
  gap?: number;
}

const Masonry: React.FC<MasonryProps> = ({ children, gap = 20 }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(4);

  useEffect(() => {
    const updateColumns = () => {
      const width = window.innerWidth;
      if (width < 600) {
        setColumns(1);
      } else if (width < 992) {
        setColumns(2);
      } else if (width < 1200) {
        setColumns(3);
      } else {
        setColumns(4);
      }
    };

    updateColumns();
    window.addEventListener('resize', updateColumns);
    return () => window.removeEventListener('resize', updateColumns);
  }, []);

  const columnArrays: ReactNode[][] = Array.from({ length: columns }, () => []);
  const columnHeights: number[] = Array(columns).fill(0);

  React.Children.forEach(children, (child, index) => {
    const shortestColumn = columnHeights.indexOf(Math.min(...columnHeights));
    columnArrays[shortestColumn].push(child);
    columnHeights[shortestColumn] += 300 + (index % 3) * 40;
  });

  return (
    <div
      ref={containerRef}
      className="masonry-container"
      style={{ gap: `${gap}px` }}
    >
      {columnArrays.map((columnItems, columnIndex) => (
        <div key={columnIndex} className="masonry-column" style={{ gap: `${gap}px` }}>
          {columnItems}
        </div>
      ))}
    </div>
  );
};

export default Masonry;
