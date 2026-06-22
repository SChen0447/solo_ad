import { useRef, useEffect, useState, useCallback } from 'react';
import type { CheckIn } from '../types';

interface Props {
  checkIns: CheckIn[];
  newCheckInId?: string | null;
}

const ITEM_HEIGHT = 160;
const OVERSCAN = 4;

function formatTime(date: string) {
  const d = new Date(date);
  const now = new Date();
  const diff = (now.getTime() - d.getTime()) / 1000;
  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

interface ItemProps {
  checkIn: CheckIn;
  isNew?: boolean;
}

function CheckInItem({ checkIn, isNew }: ItemProps) {
  return (
    <div className={`checkin-card ${isNew ? 'checkin-card-animate' : ''}`}>
      <div className="checkin-header">
        <img
          src={checkIn.userAvatar}
          alt={checkIn.userName}
          className="checkin-avatar"
        />
        <div className="checkin-user">
          <div className="checkin-name">{checkIn.userName}</div>
          <div className="checkin-time">{formatTime(checkIn.createdAt)}</div>
        </div>
        {checkIn.pointsEarned > 0 && (
          <div className="points-badge">
            +{checkIn.pointsEarned}分
          </div>
        )}
      </div>
      <div className="checkin-text">{checkIn.text}</div>
      {checkIn.imageUrl && (
        <div className="checkin-image-wrap">
          <img src={checkIn.imageUrl} alt="" className="checkin-image" />
        </div>
      )}
    </div>
  );
}

export default function CheckInFeed({ checkIns, newCheckInId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(600);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onResize = () => setContainerHeight(el.clientHeight);
    onResize();
    const ro = new ResizeObserver(onResize);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop((e.target as HTMLDivElement).scrollTop);
  }, []);

  const startIdx = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - OVERSCAN);
  const endIdx = Math.min(
    checkIns.length,
    Math.ceil((scrollTop + containerHeight) / ITEM_HEIGHT) + OVERSCAN
  );

  const visibleItems = checkIns.slice(startIdx, endIdx);
  const totalHeight = checkIns.length * ITEM_HEIGHT;
  const offsetY = startIdx * ITEM_HEIGHT;

  if (checkIns.length === 0) {
    return (
      <div className="empty-feed">
        <div style={{ fontSize: 48 }}>📚</div>
        <p>还没有打卡记录，来发布第一条打卡吧！</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="checkin-feed"
      onScroll={handleScroll}
      style={{ height: 600 }}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((c) => (
            <div
              key={c.id}
              style={{ height: ITEM_HEIGHT, boxSizing: 'border-box' }}
            >
              <CheckInItem
                checkIn={c}
                isNew={c.id === newCheckInId}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
