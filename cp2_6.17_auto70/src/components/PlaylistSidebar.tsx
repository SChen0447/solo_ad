import React, { useState, useRef, useCallback } from 'react';
import type { Favorite } from '../App';

interface PlaylistSidebarProps {
  favorites: Favorite[];
  onRemove: (id: string) => void;
  onReorder: (order: string[]) => void;
  themeColor: string;
}

function PlaylistSidebar({ favorites, onRemove, onReorder, themeColor }: PlaylistSidebarProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [hoveredRemove, setHoveredRemove] = useState<string | null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const handleDragStart = useCallback((index: number) => {
    setDragIndex(index);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    setOverIndex(index);
  }, []);

  const handleDragEnd = useCallback(() => {
    if (dragIndex !== null && overIndex !== null && dragIndex !== overIndex) {
      const newOrder = [...favorites];
      const [removed] = newOrder.splice(dragIndex, 1);
      newOrder.splice(overIndex, 0, removed);
      onReorder(newOrder.map(f => f.id));
    }
    setDragIndex(null);
    setOverIndex(null);
  }, [dragIndex, overIndex, favorites, onReorder]);

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 960;

  if (isMobile) {
    return (
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: 80,
          background: '#2d2d44',
          display: 'flex',
          alignItems: 'center',
          overflowX: 'auto',
          padding: '0 16px',
          gap: 12,
          zIndex: 1000,
        }}
      >
        {favorites.map(fav => (
          <div
            key={fav.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flexShrink: 0,
              padding: '4px 8px',
              background: 'rgba(255,255,255,0.08)',
              borderRadius: 8,
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 8,
                background: `linear-gradient(135deg, ${themeColor}, rgba(108,92,231,0.5))`,
                flexShrink: 0,
              }}
            />
            <div>
              <div style={{ fontSize: 12, color: '#e0e0e0', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {fav.title}
              </div>
              <div style={{ fontSize: 10, color: '#999' }}>
                {fav.artist}
              </div>
            </div>
            <button
              onClick={() => onRemove(fav.id)}
              style={{ background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer', fontSize: 14, padding: 4 }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      ref={sidebarRef}
      style={{
        position: 'fixed',
        right: 0,
        top: 0,
        width: 320,
        height: '100vh',
        background: '#2d2d44',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          height: 15,
          background: `linear-gradient(to bottom, ${themeColor}, transparent)`,
          flexShrink: 0,
        }}
      />

      <div style={{ padding: '20px 20px 12px', flexShrink: 0 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
          🎵 我的收藏
        </h3>
        <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
          {favorites.length} 首歌曲
        </div>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '0 12px 20px',
        }}
      >
        {favorites.length === 0 && (
          <div style={{ textAlign: 'center', color: '#666', padding: 40, fontSize: 13 }}>
            还没有收藏歌曲
          </div>
        )}
        {favorites.map((fav, index) => (
          <div
            key={fav.id}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 8px',
              borderRadius: 8,
              cursor: 'grab',
              opacity: dragIndex === index ? 0.5 : 1,
              border: overIndex === index && dragIndex !== index ? '2px dashed rgba(255,255,255,0.3)' : '2px solid transparent',
              transition: 'opacity 0.2s, border 0.2s',
              marginBottom: 2,
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 8,
                background: `linear-gradient(135deg, ${themeColor}, rgba(108,92,231,0.5))`,
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {fav.title}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: '#999',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {fav.artist}
              </div>
            </div>
            <button
              onClick={() => onRemove(fav.id)}
              onMouseEnter={() => setHoveredRemove(fav.id)}
              onMouseLeave={() => setHoveredRemove(null)}
              style={{
                background: 'none',
                border: 'none',
                color: hoveredRemove === fav.id ? '#c0392b' : '#ff6b6b',
                cursor: 'pointer',
                fontSize: 16,
                padding: 4,
                transition: 'color 0.2s',
                flexShrink: 0,
              }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default PlaylistSidebar;
