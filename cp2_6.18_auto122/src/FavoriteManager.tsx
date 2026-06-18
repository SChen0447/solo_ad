import React, { useRef, useCallback } from 'react';
import { FavoriteItem, CHINESE_FONTS, ENGLISH_FONTS } from './types';

interface FavoriteManagerProps {
  favorites: FavoriteItem[];
  onLoadFavorite: (item: FavoriteItem) => void;
  onDeleteFavorite: (id: string) => void;
}

const FavoriteManager: React.FC<FavoriteManagerProps> = ({
  favorites,
  onLoadFavorite,
  onDeleteFavorite,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    if (!scrollRef.current) return;
    e.preventDefault();
    const container = scrollRef.current;
    container.scrollLeft += e.deltaY;
  }, []);

  const getFontShortName = (fontValue: string, type: 'zh' | 'en'): string => {
    const list = type === 'zh' ? CHINESE_FONTS : ENGLISH_FONTS;
    const label = list.find((f) => f.value === fontValue)?.label || fontValue.replace(/"/g, '');
    if (type === 'zh') {
      return label.length > 2 ? label.slice(0, 2) : label;
    }
    return label.split(' ')[0];
  };

  return (
    <div
      style={{
        padding: '16px 0',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px',
        }}
      >
        <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>
          我的收藏 <span style={{ color: '#9ca3af', fontWeight: 400, fontSize: '12px' }}>({favorites.length})</span>
        </div>
        {favorites.length > 0 && (
          <div style={{ fontSize: '12px', color: '#9ca3af' }}>
            滚动鼠标滚轮浏览更多
          </div>
        )}
      </div>

      <div
        ref={scrollRef}
        onWheel={handleWheel}
        className="hidden-scrollbar"
        style={{
          height: '140px',
          display: 'flex',
          gap: '12px',
          overflowX: 'auto',
          overflowY: 'hidden',
          padding: '8px 4px',
          scrollBehavior: 'smooth',
        }}
      >
        {favorites.length === 0 ? (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#9ca3af',
              fontSize: '13px',
              borderRadius: '8px',
              border: '1px dashed #e5e7eb',
              backgroundColor: '#fafafa',
              minWidth: '400px',
            }}
          >
            还没有收藏的字体组合，点击上方星星图标收藏吧 ✨
          </div>
        ) : (
          favorites.map((item) => {
            const zhShort = getFontShortName(item.left.chineseFont, 'zh');
            const enShort = getFontShortName(item.left.englishFont, 'en');
            const displayName = item.name || `${zhShort}+${enShort} ${item.left.fontSize}px`;

            return (
              <div
                key={item.id}
                onClick={() => onLoadFavorite(item)}
                onWheel={(e) => {
                  e.stopPropagation();
                  if (scrollRef.current) {
                    scrollRef.current.scrollLeft += e.deltaY;
                  }
                }}
                style={{
                  width: '180px',
                  height: '100px',
                  flexShrink: 0,
                  borderRadius: '8px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'transform 0.3s ease-out, box-shadow 0.3s ease-out',
                  userSelect: 'none',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = 'scale(0.97)';
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = 'translateY(-3px)';
                }}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteFavorite(item.id);
                  }}
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: '#9ca3af',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    lineHeight: 1,
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#fee2e2';
                    e.currentTarget.style.color = '#ef4444';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#9ca3af';
                  }}
                  title="删除收藏"
                >
                  ×
                </button>

                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#1f2937',
                    fontFamily: `${item.left.englishFont}, ${item.left.chineseFont}, sans-serif`,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    paddingRight: '20px',
                  }}
                >
                  {displayName}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div
                    style={{
                      fontSize: '11px',
                      color: '#6b7280',
                      display: 'flex',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>字号</span>
                    <span style={{ color: '#3b82f6', fontWeight: 500 }}>{item.left.fontSize}px</span>
                  </div>
                  <div
                    style={{
                      fontSize: '11px',
                      color: '#6b7280',
                      display: 'flex',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>行高</span>
                    <span style={{ color: '#3b82f6', fontWeight: 500 }}>{item.left.lineHeight.toFixed(1)}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default FavoriteManager;
