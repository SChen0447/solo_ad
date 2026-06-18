import React, { useRef, useCallback } from 'react';
import TextPreview from './TextPreview';
import { FontSettings } from './types';

interface ComparisonPanelProps {
  leftSettings: FontSettings;
  rightSettings: FontSettings;
  sampleText: string;
  syncScroll: boolean;
  isFavorited: boolean;
  onToggleFavorite: () => void;
}

const ComparisonPanel: React.FC<ComparisonPanelProps> = ({
  leftSettings,
  rightSettings,
  sampleText,
  syncScroll,
  isFavorited,
  onToggleFavorite,
}) => {
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const isSyncingRef = useRef(false);

  const handleLeftScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      if (!syncScroll || isSyncingRef.current) return;
      isSyncingRef.current = true;
      if (rightRef.current) {
        rightRef.current.scrollTop = e.currentTarget.scrollTop;
        rightRef.current.scrollLeft = e.currentTarget.scrollLeft;
      }
      requestAnimationFrame(() => {
        isSyncingRef.current = false;
      });
    },
    [syncScroll]
  );

  const handleRightScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      if (!syncScroll || isSyncingRef.current) return;
      isSyncingRef.current = true;
      if (leftRef.current) {
        leftRef.current.scrollTop = e.currentTarget.scrollTop;
        leftRef.current.scrollLeft = e.currentTarget.scrollLeft;
      }
      requestAnimationFrame(() => {
        isSyncingRef.current = false;
      });
    },
    [syncScroll]
  );

  const StarIcon = ({ filled }: { filled: boolean }) => (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill={filled ? '#f59e0b' : 'none'}
      stroke={filled ? '#f59e0b' : '#9ca3af'}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ transition: 'all 0.2s ease' }}
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );

  const favoriteBtnStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '8px 16px',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    backgroundColor: '#ffffff',
    cursor: 'pointer',
    fontSize: '13px',
    color: isFavorited ? '#f59e0b' : '#6b7280',
    transition: 'all 0.2s ease',
    fontFamily: 'inherit',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '12px',
  };

  const tagStyle: React.CSSProperties = {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '6px',
    backgroundColor: '#f3f4f6',
    fontSize: '12px',
    color: '#6b7280',
  };

  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', gap: '16px' }}>
        <button
          onClick={onToggleFavorite}
          style={favoriteBtnStyle}
          onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
          onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = isFavorited ? '#fffbeb' : '#f9fafb';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = '#ffffff';
          }}
        >
          <StarIcon filled={isFavorited} />
          <span>{isFavorited ? '已收藏' : '收藏此组合'}</span>
        </button>
      </div>

      <div style={{ display: 'flex', gap: '5%' }}>
        <div style={{ width: '45%' }}>
          <div style={headerStyle}>
            <span style={tagStyle}>左栏预览</span>
          </div>
          <TextPreview
            ref={leftRef}
            settings={leftSettings}
            sampleText={sampleText}
            onScroll={handleLeftScroll}
          />
        </div>
        <div style={{ width: '10%' }} />
        <div style={{ width: '45%' }}>
          <div style={headerStyle}>
            <span style={tagStyle}>右栏预览</span>
          </div>
          <TextPreview
            ref={rightRef}
            settings={rightSettings}
            sampleText={sampleText}
            onScroll={handleRightScroll}
          />
        </div>
      </div>
    </div>
  );
};

export default ComparisonPanel;
