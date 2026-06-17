import React, { memo, useEffect, useRef, useState } from 'react';
import type { MoodRecord } from '../types';
import { getMoodConfig, formatRelativeTime, ENERGY_EMOJIS } from '../types';

interface HistoryListProps {
  records: MoodRecord[];
  onDelete: (id: string) => void;
}

interface HistoryCardProps {
  record: MoodRecord;
  index: number;
  onDelete: (id: string) => void;
}

const HistoryCard: React.FC<HistoryCardProps> = memo(
  ({ record, index, onDelete }) => {
    const [hover, setHover] = useState(false);
    const config = getMoodConfig(record.mood);
    const emoji = ENERGY_EMOJIS[record.energy] || ENERGY_EMOJIS[5];

    return (
      <div
        className="history-card"
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          position: 'relative',
          padding: '14px 16px 14px 20px',
          borderRadius: 12,
          marginBottom: 10,
          background: `linear-gradient(135deg, ${config.rgbaColor} 0%, rgba(255,255,255,0.85) 100%)`,
          borderLeft: `4px solid ${config.solidColor}`,
          backdropFilter: 'blur(12px)',
          boxShadow: hover
            ? `0 10px 28px ${config.rgbaColor}, 0 2px 6px rgba(0,0,0,0.06)`
            : '0 4px 14px rgba(74,58,92,0.08)',
          transform: hover ? 'translateX(2px)' : 'translateX(0)',
          transition:
            'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.25s',
          opacity: 0,
          animation: `cardSlideIn 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) ${index * 0.03}s forwards`,
          overflow: 'visible',
        }}
      >
        <button
          onClick={() => onDelete(record.id)}
          aria-label="删除记录"
          style={{
            position: 'absolute',
            left: -14,
            top: '50%',
            marginTop: -16,
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'linear-gradient(145deg, #FF6B6B, #EE5253)',
            border: '2px solid #ffffff',
            color: '#fff',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: hover
              ? 'translateX(0) scale(1)'
              : 'translateX(-8px) scale(0.85)',
            opacity: hover ? 1 : 0,
            transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
            boxShadow: '0 4px 12px rgba(238, 82, 83, 0.45)',
            pointerEvents: hover ? 'auto' : 'none',
            zIndex: 5,
          }}
        >
          ×
        </button>

        <div style={styles.cardRow}>
          <div style={styles.moodInfo}>
            <span style={{ fontSize: 26 }}>{config.emoji}</span>
            <div style={styles.moodText}>
              <span
                style={{
                  ...styles.moodName,
                  color: config.solidColor,
                  textShadow: `0 1px 0 rgba(255,255,255,0.8)`,
                }}
              >
                {config.name}
              </span>
              <span style={styles.recordTime}>
                {formatRelativeTime(record.timestamp)}
              </span>
            </div>
          </div>

          <div
            style={{
              ...styles.energyBadge,
              background: `linear-gradient(135deg, ${config.gradientFrom}33, ${config.gradientTo}55)`,
              border: `1.5px solid ${config.solidColor}`,
            }}
          >
            <span style={styles.energyEmoji}>{emoji}</span>
            <span
              style={{
                ...styles.energyScore,
                color: config.solidColor,
              }}
            >
              {record.energy}
            </span>
          </div>
        </div>
      </div>
    );
  }
);
HistoryCard.displayName = 'HistoryCard';

const HistoryList: React.FC<HistoryListProps> = memo(({ records, onDelete }) => {
  const [visibleCount, setVisibleCount] = useState(30);
  const listRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVisibleCount(30);
  }, [records.length]);

  useEffect(() => {
    if (visibleCount >= records.length) return;
    const sentinel = sentinelRef.current;
    const list = listRef.current;
    if (!sentinel || !list) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleCount((c) => Math.min(c + 20, records.length));
          }
        });
      },
      { root: list, rootMargin: '200px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [visibleCount, records.length]);

  const visibleRecords = records.slice(0, visibleCount);
  const totalCount = records.length;

  return (
    <div style={styles.wrapper}>
      <div style={styles.header}>
        <div>
          <h3 style={styles.title}>情绪足迹</h3>
          <p style={styles.subtitle}>
            共 {totalCount} 条记录 · 保留最近100条
          </p>
        </div>
        <div style={styles.counterBadge}>
          <span style={styles.counterEmoji}>📜</span>
          <span style={styles.counterText}>{visibleRecords.length}</span>
          <span style={styles.counterSlash}>/</span>
          <span style={{ ...styles.counterText, opacity: 0.6 }}>
            {totalCount}
          </span>
        </div>
      </div>

      <div ref={listRef} style={styles.list}>
        {totalCount === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyEmoji}>🌱</div>
            <p style={styles.emptyText}>还没有记录</p>
            <p style={styles.emptySub}>在转盘上点击情绪开启你的第一篇日记吧</p>
          </div>
        ) : (
          <>
            {visibleRecords.map((record, idx) => (
              <HistoryCard
                key={record.id}
                record={record}
                index={idx}
                onDelete={onDelete}
              />
            ))}
            {visibleCount < totalCount && (
              <div
                ref={sentinelRef}
                style={{
                  padding: 20,
                  textAlign: 'center',
                  color: '#8A7DA3',
                  fontSize: 13,
                }}
              >
                <div style={styles.loaderDot}>...</div>
                滚动加载更多...
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
});

HistoryList.displayName = 'HistoryList';

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    width: '100%',
    minHeight: 0,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    flexShrink: 0,
  },
  title: {
    margin: 0,
    fontSize: 20,
    fontWeight: 800,
    color: '#3D2F52',
    letterSpacing: '1.5px',
  },
  subtitle: {
    margin: '4px 0 0',
    fontSize: 12,
    color: '#8A7DA3',
  },
  counterBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '6px 14px',
    borderRadius: 999,
    background:
      'linear-gradient(135deg, rgba(107,91,138,0.1), rgba(107,91,138,0.03))',
    border: '1px solid rgba(107,91,138,0.15)',
    fontSize: 13,
    fontWeight: 700,
    color: '#4A3A5C',
  },
  counterEmoji: { fontSize: 14 },
  counterText: { fontWeight: 800 },
  counterSlash: { opacity: 0.4, padding: '0 2px' },
  list: {
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
    paddingRight: 6,
    paddingLeft: 14,
    scrollbarWidth: 'thin',
    scrollbarColor: 'rgba(107,91,138,0.25) transparent',
  },
  cardRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  moodInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    minWidth: 0,
  },
  moodText: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    minWidth: 0,
  },
  moodName: {
    fontSize: 16,
    fontWeight: 800,
    letterSpacing: '1px',
  },
  recordTime: {
    fontSize: 12,
    color: '#6B5B8A',
    fontWeight: 500,
  },
  energyBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 14px',
    borderRadius: 999,
    flexShrink: 0,
  },
  energyEmoji: { fontSize: 16 },
  energyScore: {
    fontSize: 16,
    fontWeight: 800,
    letterSpacing: '1px',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    gap: 8,
    textAlign: 'center',
  },
  emptyEmoji: {
    fontSize: 56,
    animation: 'floatBounce 2.5s ease-in-out infinite',
  },
  emptyText: {
    margin: 0,
    fontSize: 18,
    fontWeight: 700,
    color: '#6B5B8A',
  },
  emptySub: {
    margin: 0,
    fontSize: 13,
    color: '#9A8DB5',
    lineHeight: 1.6,
    maxWidth: 240,
  },
  loaderDot: {
    display: 'inline-block',
    letterSpacing: 3,
    animation: 'loaderBlink 1s steps(4, end) infinite',
  },
};

export default HistoryList;
