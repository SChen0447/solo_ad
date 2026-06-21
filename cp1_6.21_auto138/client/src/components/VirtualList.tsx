import { ReactNode } from 'react';
import './VirtualList.css';

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  height: number;
  renderItem: (item: T, index: number) => ReactNode;
  overscan?: number;
}

export default function VirtualList<T>({
  items,
  itemHeight,
  height,
  renderItem,
  overscan = 5,
}: VirtualListProps<T>) {
  const totalHeight = items.length * itemHeight;
  const scrollTop = 0;

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const visibleCount = Math.ceil(height / itemHeight) + overscan * 2;
  const endIndex = Math.min(items.length, startIndex + visibleCount);

  const visibleItems = items.slice(startIndex, endIndex);
  const offsetY = startIndex * itemHeight;

  return (
    <div
      className="virtual-list"
      style={{ height, overflowY: 'auto' }}
      onScroll={(e) => {
        const target = e.currentTarget;
        const scroll = target.scrollTop;
        const start = Math.max(0, Math.floor(scroll / itemHeight) - overscan);
        const end = Math.min(items.length, start + Math.ceil(height / itemHeight) + overscan * 2);
        const offset = start * itemHeight;
        target.querySelector<HTMLDivElement>('.virtual-list-phantom')!.style.height = `${totalHeight}px`;
        const content = target.querySelector<HTMLDivElement>('.virtual-list-content')!;
        content.style.transform = `translateY(${offset}px)`;
        content.innerHTML = '';
        for (let i = start; i < end; i++) {
          const item = document.createElement('div');
          item.style.height = `${itemHeight}px`;
          content.appendChild(item);
        }
      }}
    >
      <div className="virtual-list-phantom" style={{ height: totalHeight }} />
      <div
        className="virtual-list-content"
        style={{ transform: `translateY(${offsetY}px)` }}
      >
        {visibleItems.map((item, i) => (
          <div key={startIndex + i} style={{ height: itemHeight }}>
            {renderItem(item, startIndex + i)}
          </div>
        ))}
      </div>
    </div>
  );
}
