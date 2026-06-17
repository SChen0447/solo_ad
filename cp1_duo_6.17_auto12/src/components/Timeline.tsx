import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { DiaryEntry, MonthGroup } from '../types';
import { DiaryCard } from './DiaryCard';

interface TimelineProps {
  entries: DiaryEntry[];
  onLoadMore?: (year: number, month: number) => void;
  loading?: boolean;
}

const monthNames = [
  '一月', '二月', '三月', '四月', '五月', '六月',
  '七月', '八月', '九月', '十月', '十一月', '十二月'
];

const getMonthColor = (month: number): string => {
  const startR = 26, startG = 35, startB = 126;
  const endR = 66, endG = 165, endB = 245;
  const ratio = (month - 1) / 11;
  
  const r = Math.round(startR + (endR - startR) * ratio);
  const g = Math.round(startG + (endG - startG) * ratio);
  const b = Math.round(startB + (endB - startB) * ratio);
  
  return `rgb(${r}, ${g}, ${b})`;
};

const groupByMonth = (entries: DiaryEntry[]): MonthGroup[] => {
  const groups: Map<string, MonthGroup> = new Map();
  
  entries.forEach(entry => {
    const date = new Date(entry.date);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const key = `${year}-${month}`;
    
    if (!groups.has(key)) {
      groups.set(key, { year, month, entries: [] });
    }
    groups.get(key)!.entries.push(entry);
  });
  
  return Array.from(groups.values())
    .sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    })
    .map(group => ({
      ...group,
      entries: group.entries.sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      )
    }));
};

const estimateMonthHeight = (group: MonthGroup): number => {
  const headerHeight = 80;
  const cardBaseHeight = 180;
  const mediaExtra = 100;
  const spacing = 16;
  
  let total = headerHeight;
  group.entries.forEach(entry => {
    total += cardBaseHeight + spacing;
    if (entry.mediaPaths.length > 0) {
      total += mediaExtra;
    }
  });
  
  return total;
};

export const Timeline: React.FC<TimelineProps> = ({ entries, onLoadMore, loading = false }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const rafRef = useRef<number>();
  
  const monthGroups = useMemo(() => groupByMonth(entries), [entries]);
  
  const monthPositions = useMemo(() => {
    const positions: { top: number; height: number; index: number }[] = [];
    let currentTop = 0;
    
    monthGroups.forEach((group, index) => {
      const height = estimateMonthHeight(group);
      positions.push({ top: currentTop, height, index });
      currentTop += height + 32;
    });
    
    return positions;
  }, [monthGroups]);
  
  const totalHeight = useMemo(() => {
    if (monthPositions.length === 0) return 0;
    const last = monthPositions[monthPositions.length - 1];
    return last.top + last.height;
  }, [monthPositions]);
  
  const visibleRange = useMemo(() => {
    const viewportTop = scrollTop;
    const viewportBottom = scrollTop + containerHeight;
    const buffer = 2;
    
    let startIndex = 0;
    let endIndex = monthPositions.length - 1;
    
    for (let i = 0; i < monthPositions.length; i++) {
      const pos = monthPositions[i];
      if (pos.top + pos.height >= viewportTop) {
        startIndex = Math.max(0, i - buffer);
        break;
      }
    }
    
    for (let i = startIndex; i < monthPositions.length; i++) {
      const pos = monthPositions[i];
      if (pos.top > viewportBottom) {
        endIndex = Math.min(monthPositions.length - 1, i + buffer);
        break;
      }
    }
    
    return { startIndex, endIndex };
  }, [scrollTop, containerHeight, monthPositions]);
  
  const handleScroll = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    
    rafRef.current = requestAnimationFrame(() => {
      if (containerRef.current) {
        setScrollTop(containerRef.current.scrollTop);
      }
    });
  }, []);
  
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const updateHeight = () => {
      setContainerHeight(container.clientHeight);
    };
    
    updateHeight();
    window.addEventListener('resize', updateHeight);
    
    return () => {
      window.removeEventListener('resize', updateHeight);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);
  
  useEffect(() => {
    if (monthPositions.length === 0 || !onLoadMore) return;
    
    const lastPosition = monthPositions[monthPositions.length - 1];
    const scrollThreshold = scrollTop + containerHeight * 2;
    
    if (lastPosition.top < scrollThreshold && !loading) {
      const lastGroup = monthGroups[monthGroups.length - 1];
      let nextYear = lastGroup.year;
      let nextMonth = lastGroup.month - 1;
      
      if (nextMonth < 1) {
        nextMonth = 12;
        nextYear -= 1;
      }
      
      onLoadMore(nextYear, nextMonth);
    }
  }, [scrollTop, containerHeight, monthPositions, monthGroups, loading, onLoadMore]);
  
  const visibleGroups = monthGroups.slice(visibleRange.startIndex, visibleRange.endIndex + 1);
  
  return (
    <div 
      ref={containerRef}
      className="timeline-container"
      onScroll={handleScroll}
      style={{
        height: 'calc(100vh - 80px)',
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: '20px',
        scrollBehavior: 'smooth',
        WebkitOverflowScrolling: 'touch'
      }}
    >
      <div 
        className="timeline-content"
        style={{
          position: 'relative',
          maxWidth: '800px',
          margin: '0 auto',
          height: totalHeight
        }}
      >
        {visibleGroups.map((group) => {
          const position = monthPositions.find(
            (_, i) => i === visibleRange.startIndex + visibleGroups.indexOf(group)
          ) || monthPositions[visibleRange.startIndex + visibleGroups.indexOf(group)];
          
          return (
            <div
              key={`${group.year}-${group.month}`}
              className="month-group"
              style={{
                position: 'absolute',
                top: position.top,
                left: 0,
                right: 0,
                animation: 'fadeIn 0.3s ease-out'
              }}
            >
              <h2 
                className="month-header"
                style={{
                  fontSize: '32px',
                  fontWeight: 700,
                  color: getMonthColor(group.month),
                  marginBottom: '20px',
                  padding: '10px 0',
                  borderBottom: '2px solid rgba(255, 255, 255, 0.1)',
                  position: 'sticky',
                  top: 0,
                  backgroundColor: 'rgba(18, 18, 18, 0.95)',
                  backdropFilter: 'blur(8px)',
                  zIndex: 10
                }}
              >
                {group.year}年 {monthNames[group.month - 1]}
              </h2>
              
              <div className="month-entries">
                {group.entries.map((entry) => (
                  <DiaryCard 
                    key={entry.id} 
                    entry={entry}
                  />
                ))}
              </div>
            </div>
          );
        })}
        
        {loading && (
          <div 
            className="loading-indicator"
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '40px',
              color: '#888'
            }}
          >
            <div 
              style={{
                width: '24px',
                height: '24px',
                border: '3px solid #333',
                borderTopColor: '#64B5F6',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
                marginRight: '12px'
              }}
            />
            <span>加载中...</span>
          </div>
        )}
        
        {entries.length === 0 && !loading && (
          <div 
            className="empty-state"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '80px 20px',
              color: '#666',
              textAlign: 'center'
            }}
          >
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>🎵</div>
            <h3 style={{ fontSize: '20px', marginBottom: '10px', color: '#888' }}>
              还没有日记
            </h3>
            <p style={{ fontSize: '14px' }}>
              点击右下角的按钮开始记录你的音乐时光吧！
            </p>
          </div>
        )}
      </div>
      
      <style>{`
        .timeline-container::-webkit-scrollbar {
          width: 6px;
        }
        .timeline-container::-webkit-scrollbar-track {
          background: #1A1A1A;
        }
        .timeline-container::-webkit-scrollbar-thumb {
          background: #333;
          border-radius: 3px;
        }
        .timeline-container::-webkit-scrollbar-thumb:hover {
          background: #444;
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        
        @media (max-width: 768px) {
          .timeline-container {
            padding: 10px !important;
            height: calc(100vh - 140px) !important;
          }
          .month-header {
            font-size: 24px !important;
          }
        }
      `}</style>
    </div>
  );
};
