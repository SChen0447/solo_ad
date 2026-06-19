import React, { useState, useCallback } from 'react';
import ColorPicker, { HSV, hsvToHex } from './ColorPicker';
import ColorPalette, { ColorScheme } from './ColorPalette';
import {
  SavedPalette,
  loadFavorites,
  addFavorite,
  removeFavorite,
  clearFavorites,
  generateId,
} from './StorageManager';

const appStyles: Record<string, React.CSSProperties> = {
  root: {
    minHeight: '100vh',
    background: '#1a1a2e',
    color: '#e0e0e0',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  header: {
    padding: '16px 24px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    background: 'rgba(255,255,255,0.02)',
  },
  headerIcon: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    background: 'linear-gradient(135deg, #6c63ff, #ff6b6b)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
  },
  headerTitle: {
    fontSize: '20px',
    fontWeight: 700,
    background: 'linear-gradient(135deg, #6c63ff, #ff6b6b)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  layout: {
    display: 'flex',
    minHeight: 'calc(100vh - 65px)',
  },
  leftPanel: {
    width: '300px',
    minWidth: '300px',
    maxWidth: '300px',
    borderRight: '1px solid rgba(255,255,255,0.06)',
    background: 'rgba(255,255,255,0.02)',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  centerPanel: {
    flex: 1,
    overflowY: 'auto',
    minWidth: 0,
  },
  rightPanel: {
    width: '280px',
    minWidth: '280px',
    maxWidth: '280px',
    borderLeft: '1px solid rgba(255,255,255,0.06)',
    background: 'rgba(255,255,255,0.02)',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
  },
  favHeader: {
    padding: '20px 16px 12px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  favTitle: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#e0e0e0',
  },
  favClearBtn: {
    background: 'rgba(255, 80, 80, 0.12)',
    color: '#ff6b6b',
    border: '1px solid rgba(255, 80, 80, 0.2)',
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '11px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  favList: {
    padding: '0 12px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  favCard: {
    background: 'rgba(255,255,255,0.04)',
    borderRadius: '10px',
    overflow: 'hidden',
    border: '1px solid rgba(255,255,255,0.06)',
    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
    cursor: 'pointer',
  },
  favColorStrip: {
    display: 'flex',
    height: '36px',
  },
  favColorBlock: {
    flex: 1,
  },
  favInfo: {
    padding: '8px 10px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  favName: {
    fontSize: '12px',
    color: '#aaa',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  favDeleteBtn: {
    background: 'none',
    border: 'none',
    color: '#666',
    cursor: 'pointer',
    fontSize: '14px',
    padding: '2px 6px',
    borderRadius: '4px',
    transition: 'all 0.3s ease',
  },
  favEmpty: {
    padding: '32px 16px',
    textAlign: 'center',
    color: '#555',
    fontSize: '13px',
  },
  toast: {
    position: 'fixed',
    bottom: '24px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(108, 99, 255, 0.9)',
    color: '#fff',
    padding: '10px 24px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 500,
    boxShadow: '0 4px 16px rgba(108, 99, 255, 0.3)',
    transition: 'opacity 0.3s ease, transform 0.3s ease',
    zIndex: 1000,
  },
};

const App: React.FC = () => {
  const [hsv, setHsv] = useState<HSV>({ h: 210, s: 0.75, v: 0.85 });
  const [favorites, setFavorites] = useState<SavedPalette[]>(() => loadFavorites());
  const [toast, setToast] = useState<string>('');

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2000);
  }, []);

  const handleColorChange = useCallback((newHsv: HSV) => {
    setHsv(newHsv);
  }, []);

  const handleSelectColor = useCallback((newHsv: HSV) => {
    setHsv(newHsv);
  }, []);

  const handleSaveScheme = useCallback(
    (scheme: ColorScheme) => {
      const palette: SavedPalette = {
        id: generateId(),
        name: scheme.name,
        baseColor: hsvToHex(hsv),
        hsv: {
          h: Math.round(hsv.h * 10) / 10,
          s: Math.round(hsv.s * 1000) / 1000,
          v: Math.round(hsv.v * 1000) / 1000,
        },
        colors: scheme.colors.map((c) => hsvToHex(c)),
        schemeType: scheme.nameEn,
        savedAt: Date.now(),
      };
      const updated = addFavorite(palette);
      setFavorites(updated);
      showToast(`已收藏「${scheme.name}」方案`);
    },
    [hsv, showToast]
  );

  const handleDeleteFavorite = useCallback((id: string) => {
    const updated = removeFavorite(id);
    setFavorites(updated);
  }, []);

  const handleClearFavorites = useCallback(() => {
    const updated = clearFavorites();
    setFavorites(updated);
    showToast('已清空所有收藏');
  }, []);

  const handleFavClick = useCallback((fav: SavedPalette) => {
    setHsv({
      h: fav.hsv.h,
      s: fav.hsv.s,
      v: fav.hsv.v,
    });
  }, []);

  return (
    <div style={appStyles.root}>
      <header style={appStyles.header}>
        <div style={appStyles.headerIcon}>🎨</div>
        <span style={appStyles.headerTitle}>色彩调色板</span>
      </header>

      <div style={appStyles.layout} className="app-layout">
        <div style={appStyles.leftPanel} className="left-panel">
          <ColorPicker hsv={hsv} onChange={handleColorChange} />
        </div>

        <div style={appStyles.centerPanel} className="center-panel">
          <ColorPalette
            hsv={hsv}
            onSelectColor={handleSelectColor}
            onSaveScheme={handleSaveScheme}
          />
        </div>

        <div style={appStyles.rightPanel} className="right-panel">
          <div style={appStyles.favHeader}>
            <span style={appStyles.favTitle}>
              收藏夹 ({favorites.length})
            </span>
            {favorites.length > 0 && (
              <button
                style={appStyles.favClearBtn}
                onClick={handleClearFavorites}
                onMouseEnter={(e) => {
                  const el = e.currentTarget;
                  el.style.background = 'rgba(255, 80, 80, 0.25)';
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget;
                  el.style.background = 'rgba(255, 80, 80, 0.12)';
                }}
              >
                清空
              </button>
            )}
          </div>

          {favorites.length === 0 ? (
            <div style={appStyles.favEmpty}>
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>♡</div>
              <div>还没有收藏的配色方案</div>
              <div style={{ marginTop: '4px', fontSize: '11px', color: '#444' }}>
                点击方案卡片上的收藏按钮
              </div>
            </div>
          ) : (
            <div style={appStyles.favList}>
              {favorites.map((fav) => (
                <div
                  key={fav.id}
                  style={appStyles.favCard}
                  className="fav-card"
                  onMouseEnter={(e) => {
                    const el = e.currentTarget;
                    el.style.transform = 'translateY(-2px)';
                    el.style.boxShadow = '0 4px 12px rgba(108, 99, 255, 0.12)';
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget;
                    el.style.transform = 'translateY(0)';
                    el.style.boxShadow = 'none';
                  }}
                  onClick={() => handleFavClick(fav)}
                >
                  <div style={appStyles.favColorStrip}>
                    {fav.colors.map((color, i) => (
                      <div
                        key={i}
                        style={{
                          ...appStyles.favColorBlock,
                          backgroundColor: color,
                        }}
                      />
                    ))}
                  </div>
                  <div style={appStyles.favInfo}>
                    <span style={appStyles.favName}>
                      {fav.name} · {fav.baseColor.toUpperCase()}
                    </span>
                    <button
                      style={appStyles.favDeleteBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteFavorite(fav.id);
                      }}
                      onMouseEnter={(e) => {
                        const el = e.currentTarget;
                        el.style.color = '#ff6b6b';
                        el.style.background = 'rgba(255,80,80,0.1)';
                      }}
                      onMouseLeave={(e) => {
                        const el = e.currentTarget;
                        el.style.color = '#666';
                        el.style.background = 'none';
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {toast && (
        <div style={appStyles.toast}>{toast}</div>
      )}

      <style>{`
        @media (max-width: 900px) {
          .app-layout {
            flex-direction: column !important;
          }
          .left-panel {
            width: 100% !important;
            min-width: unset !important;
            max-width: 100% !important;
            border-right: none !important;
            border-bottom: 1px solid rgba(255,255,255,0.06) !important;
            align-items: center !important;
          }
          .left-panel > div {
            max-width: 300px;
          }
          .right-panel {
            width: 100% !important;
            min-width: unset !important;
            max-width: 100% !important;
            border-left: none !important;
            border-top: 1px solid rgba(255,255,255,0.06) !important;
          }
          .right-panel > div {
            max-width: 100%;
          }
        }
        .scheme-card:hover {
          border-color: rgba(108, 99, 255, 0.2) !important;
        }
        .fav-card:hover {
          border-color: rgba(108, 99, 255, 0.15) !important;
        }
        ::-webkit-scrollbar {
          width: 6px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.1);
          border-radius: 3px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.2);
        }
      `}</style>
    </div>
  );
};

export default App;
