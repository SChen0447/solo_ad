import { useState, useRef } from 'react';
import type { Favorite, Song } from '../types';

interface Props {
  favorites: Favorite[];
  onRemove: (song: Favorite['song']) => void;
  onReorder: (orderIds: string[]) => void;
  onClear: () => void;
  onPlay: (song: Song) => void;
  themeColor: string;
}

export default function PlaylistSidebar({ favorites, onRemove, onReorder, onClear, onPlay, themeColor }: Props) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
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

  const handleClearClick = () => {
    if (favorites.length === 0) return;
    setShowConfirm(true);
  };

  const handleConfirmClear = () => {
    onClear();
    setShowConfirm(false);
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 600 }}>
            📋 我的收藏
            <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', marginLeft: '6px', fontWeight: 400 }}>
              ({favorites.length})
            </span>
          </h3>
          <button
            onClick={handleClearClick}
            style={{
              background: 'none',
              border: 'none',
              color: favorites.length > 0 ? '#FF6B6B' : 'rgba(255,255,255,0.3)',
              fontSize: '13px',
              cursor: favorites.length > 0 ? 'pointer' : 'not-allowed',
              padding: '4px 8px',
              borderRadius: '4px',
              transition: 'all 0.2s ease-out',
            }}
            onMouseEnter={(e) => {
              if (favorites.length > 0) {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255, 107, 107, 0.2)';
              }
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            }}
          >
            清空全部
          </button>
          </div>
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: 500,
                          color: 'white',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          marginBottom: '2px',
                          flex: 1,
                        }}
                      >
                        {fav.song.title}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onPlay(fav.song);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#A29BFE',
                          cursor: 'pointer',
                          padding: '2px',
                          borderRadius: '50%',
                          width: '20px',
                          height: '20px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          transition: 'all 0.2s ease-out',
                          flexShrink: 0,
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(162, 155, 254, 0.2)';
                          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.2)';
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
                        }}
                      >
                        ▶
                      </button>
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

      {showConfirm && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 200,
          }}
          onClick={() => setShowConfirm(false)}
        >
          <div
            style={{
              background: '#2d2d44',
              padding: '32px',
              borderRadius: '16px',
              minWidth: '320px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h4 style={{ fontSize: '18px', marginBottom: '12px', color: 'white' }}>
              确认操作
            </h4>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', marginBottom: '24px' }}>
              确定要清空所有收藏歌曲吗？
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                onClick={() => setShowConfirm(false)}
                style={{
                  padding: '8px 20px',
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-out',
                }}
              >
                取消
              </button>
              <button
                onClick={handleConfirmClear}
                style={{
                  padding: '8px 20px',
                  background: '#FF6B6B',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-out',
                }}
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}

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
