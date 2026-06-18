import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../store';
import type { Bottle } from '../types';

const CARD_HEIGHT = 92;
const CARD_GAP = 10;
const OVERSCAN = 4;

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  const date = new Date(timestamp);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

const AnimatedNumber: React.FC<{ value: number; color: string }> = ({ value, color }) => {
  const [display, setDisplay] = useState(value);
  const [key, setKey] = useState(0);
  const prev = useRef(value);

  useEffect(() => {
    if (prev.current !== value) {
      prev.current = value;
      setKey(k => k + 1);
      const start = 0;
      const end = value;
      const duration = 400;
      const startTime = performance.now();
      let raf = 0;
      const tick = (now: number) => {
        const elapsed = now - startTime;
        const t = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        setDisplay(Math.round(start + (end - start) * eased));
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(raf);
    }
  }, [value]);

  return (
    <span
      key={key}
      style={{
        color,
        fontWeight: 600,
        fontSize: 13,
        display: 'inline-flex',
        alignItems: 'center',
        animation: 'numBounce 0.4s ease-out'
      }}
    >
      {display}
    </span>
  );
};

interface BottleCardProps {
  bottle: Bottle;
  isSelected: boolean;
  onClick: () => void;
}

const BottleCard: React.FC<BottleCardProps> = ({ bottle, isSelected, onClick }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const titleOverflow = bottle.title.length > 25;
  const displayTitle = titleOverflow ? bottle.title.slice(0, 25) + '...' : bottle.title;

  return (
    <div
      onClick={onClick}
      style={{
        position: 'relative',
        padding: '14px 14px',
        borderRadius: 12,
        background: isSelected ? 'rgba(59, 130, 246, 0.12)' : 'rgba(255,255,255,0.05)',
        backdropFilter: 'blur(8px)',
        border: `1px solid ${isSelected ? 'rgba(59, 130, 246, 0.4)' : 'rgba(255,255,255,0.1)'}`,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        boxSizing: 'border-box',
        height: CARD_HEIGHT
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = isSelected ? 'rgba(59, 130, 246, 0.18)' : 'rgba(255,255,255,0.08)';
        e.currentTarget.style.transform = 'translateX(2px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = isSelected ? 'rgba(59, 130, 246, 0.12)' : 'rgba(255,255,255,0.05)';
        e.currentTarget.style.transform = 'translateX(0)';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{
          fontSize: 28,
          flexShrink: 0,
          lineHeight: 1,
          marginTop: 2
        }}>
          {bottle.emoji}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{ position: 'relative', display: 'inline-block', width: '100%' }}
            onMouseEnter={() => titleOverflow && setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            <div style={{
              fontSize: 14,
              fontWeight: 600,
              color: isSelected ? '#bfdbfe' : '#e2e8f0',
              marginBottom: 6,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              lineHeight: 1.3
            }}>
              {displayTitle}
            </div>
            {showTooltip && (
              <div style={{
                position: 'absolute',
                top: -32,
                left: 0,
                background: 'rgba(15, 23, 42, 0.98)',
                color: '#f1f5f9',
                padding: '6px 10px',
                borderRadius: 6,
                fontSize: 12,
                whiteSpace: 'nowrap',
                border: '1px solid rgba(255,255,255,0.1)',
                zIndex: 10,
                boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                animation: 'fadeIn 0.15s ease-out'
              }}>
                {bottle.title}
              </div>
            )}
          </div>
          <div style={{
            fontSize: 11,
            color: '#64748b',
            marginBottom: 8
          }}>
            {formatRelativeTime(bottle.createdAt)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 13 }}>👍</span>
              <AnimatedNumber value={bottle.likes} color="#3b82f6" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 13, opacity: 0.8 }}>👎</span>
              <AnimatedNumber value={bottle.dislikes} color="#6b7280" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const BottleList: React.FC = () => {
  const { bottles, selectedId, selectBottle } = useStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(600);
  const rafRef = useRef<number>(0);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateHeight = () => {
      setViewportHeight(el.clientHeight);
    };
    updateHeight();
    const ro = new ResizeObserver(updateHeight);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const handleScroll = () => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      const el = containerRef.current;
      if (el) {
        setScrollTop(el.scrollTop);
      }
      rafRef.current = 0;
    });
  };

  const totalHeight = bottles.length * (CARD_HEIGHT + CARD_GAP);

  const { startIdx, endIdx, offsetY } = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / (CARD_HEIGHT + CARD_GAP)) - OVERSCAN);
    const visibleCount = Math.ceil(viewportHeight / (CARD_HEIGHT + CARD_GAP)) + OVERSCAN * 2;
    const end = Math.min(bottles.length, start + visibleCount);
    return {
      startIdx: start,
      endIdx: end,
      offsetY: start * (CARD_HEIGHT + CARD_GAP)
    };
  }, [scrollTop, viewportHeight, bottles.length]);

  const visibleBottles = bottles.slice(startIdx, endIdx);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      style={{
        height: '100%',
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: 16,
        boxSizing: 'border-box',
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(255,255,255,0.15) transparent'
      }}
    >
      <style>{`
        @keyframes numBounce {
          0% { transform: scale(1); }
          30% { transform: scale(1.25); }
          60% { transform: scale(0.95); }
          100% { transform: scale(1); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        div::-webkit-scrollbar {
          width: 6px;
        }
        div::-webkit-scrollbar-track {
          background: transparent;
        }
        div::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.12);
          border-radius: 3px;
        }
        div::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.2);
        }
      `}</style>
      <div style={{ position: 'relative', height: totalHeight }}>
        <div style={{
          position: 'absolute',
          top: offsetY,
          left: 0,
          right: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: CARD_GAP
        }}>
          {visibleBottles.map((bottle) => (
            <BottleCard
              key={bottle.id}
              bottle={bottle}
              isSelected={selectedId === bottle.id}
              onClick={() => selectBottle(bottle.id)}
            />
          ))}
        </div>
      </div>
      {bottles.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          color: '#64748b'
        }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🌊</div>
          <div style={{ fontSize: 14 }}>漂流瓶还没有漂来...</div>
        </div>
      )}
    </div>
  );
};
