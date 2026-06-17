import { useState, useRef } from 'react';
import type { Favorite } from '../types';

interface Props {
  favorites: Favorite[];
  onRemove: (song: Favorite['song']) => void;
  onReorder: (orderIds: string[]) => void;
  themeColor: string;
}

export default function PlaylistSidebar({ favorites, onRemove, onReorder, themeColor }: Props) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const dragOverIdx = useRef<number>(-1);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, id: string, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (id !== draggedId) {
      setDragOverId(id);
      dragOverIdx.current = index;
    }
  };

  const handleDragLeave = () => {
    setDragOverId(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedId || dragOverIdx.current < 0) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    const fromIdx = favorites.findIndex((f) => f.id === draggedId);
    const toIdx = dragOverIdx.current;

    if (fromIdx !== toIdx) {
      const newFavs = [...favorites];
      const [removed] = newFavs.splice(fromIdx, 1);
      newFavs.splice(toIdx, 0, removed);
      onReorder(newFavs.map((f) => f.id));
    }

    setDraggedId(null);
    setDragOverId(null);
    dragOverIdx.current = -1;
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
    dragOverIdx.current = -1;
  };

  return (
    <>
      <div
        style={{
          position: 'fixed',
          right: 0,
          top: 0,
          width: '320px',
          height: '100vh',
          background: '#2d2d44',
          color: 'white',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          zIndex: 100,
        }}
      >
        <div
          style={{
            height: '15px',
            background: `linear-gradient(180deg, ${themeColor} 0%, transparent 100%)`,
            flexShrink: 0,
          }}
        />
        <div style={{ padding: '20px 20px 12px 20px', flexShrink: 0 }}>
          <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '4px' }}>
            📋 我的收藏
          </h3>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
            共 {favorites.length} 首歌曲
          </p>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '8px 12px 20px 12px',
          }}
        >
          {favorites.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: 'rgba(255,255,255,0.4)',
                fontSize: '13px',
              }}
            >
              还没有收藏歌曲哦～
            </div>
          ) : (
            favorites.map((fav, index) => {
              const isDragging = draggedId === fav.id;
              const isDragOver = dragOverId === fav.id && draggedId !== fav.id;
              return (
                <div
                  key={fav.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, fav.id)}
                  onDragOver={(e) => handleDragOver(e, fav.id, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onDragEnd={handleDragEnd}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px',
                    borderRadius: '8px',
                    marginBottom: '6px',
                    background: isDragging
                      ? 'rgba(255,255,255,0.05)'
                      : 'transparent',
                    border: isDragOver ? '1px dashed rgba(255,255,255,0.3)' : '1px solid transparent',
                    opacity: isDragging ? 0.5 : 1,
                    cursor: isDragging ? 'grabbing' : 'grab',
                    transition: 'all 0.2s ease-out',
                  }}
                >
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '8px',
                      background: fav.gradient
                        ? `linear-gradient(135deg, ${fav.gradient[0]}, ${fav.gradient[1]})`
                        : 'linear-gradient(135deg, #6C5CE7, #A29BFE)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '24px',
                      flexShrink: 0,
                    }}
                  >
                    🎵
                  </div>
                  <div
                    style={{
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: 500,
                        color: 'white',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        marginBottom: '2px',
                      }}
                    >
                      {fav.song.title}
                    </div>
                    <div
                      style={{
                        fontSize: '11px',
                        color: 'rgba(255,255,255,0.5)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {fav.song.artist}
                    </div>
                  </div>
                  <button
                    onClick={() => onRemove(fav.song)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#FF6B6B',
                      fontSize: '18px',
                      cursor: 'pointer',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      transition: 'all 0.2s ease-out',
                      fontWeight: 'bold',
                      lineHeight: 1,
                      flexShrink: 0,
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background =
                        'rgba(192, 57, 43, 0.3)';
                      (e.currentTarget as HTMLButtonElement).style.color = '#C0392B';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                      (e.currentTarget as HTMLButtonElement).style.color = '#FF6B6B';
                    }}
                  >
                    ✕
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div
        style={{
          display: 'none',
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: '80px',
          background: '#2d2d44',
          color: 'white',
          zIndex: 100,
          overflowX: 'auto',
          overflowY: 'hidden',
          whiteSpace: 'nowrap',
          padding: '12px',
          borderTop: `2px solid ${themeColor}`,
        }}
        className="mobile-sidebar"
      >
        {favorites.length === 0 ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'rgba(255,255,255,0.4)',
              fontSize: '13px',
            }}
          >
            还没有收藏歌曲
          </div>
        ) : (
          favorites.map((fav) => (
            <div
              key={fav.id}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '0 8px',
                height: '56px',
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '8px',
                  background: fav.gradient
                    ? `linear-gradient(135deg, ${fav.gradient[0]}, ${fav.gradient[1]})`
                    : 'linear-gradient(135deg, #6C5CE7, #A29BFE)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  flexShrink: 0,
                }}
              >
                🎵
              </div>
              <div style={{ maxWidth: '100px' }}>
                <div
                  style={{
                    fontSize: '12px',
                    color: 'white',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {fav.song.title}
                </div>
                <div
                  style={{
                    fontSize: '10px',
                    color: 'rgba(255,255,255,0.5)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {fav.song.artist}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <style>{`
        @media (max-width: 960px) {
          div[style*="position: fixed"][style*="width: 320px"] {
            display: none !important;
          }
          div.mobile-sidebar {
            display: block !important;
          }
        }
      `}</style>
    </>
  );
}
