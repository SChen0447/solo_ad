import React, { useEffect, useRef, useState } from 'react';
import { useStore } from './store';
import { BottleList } from './components/BottleList';
import { BottleDetail } from './components/BottleDetail';
import { Modal } from './components/Modal';

const BottleIcon: React.FC = () => (
  <div style={{
    width: 36,
    height: 36,
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    clipPath: 'polygon(40% 0%, 60% 0%, 60% 15%, 78% 22%, 88% 38%, 88% 82%, 78% 96%, 22% 96%, 12% 82%, 12% 38%, 22% 22%, 40% 15%)',
    background: 'linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%)',
    opacity: 0.85
  }}>
    <div style={{
      position: 'absolute',
      inset: '4px 3px',
      clipPath: 'polygon(40% 0%, 60% 0%, 60% 15%, 78% 22%, 88% 38%, 88% 82%, 78% 96%, 22% 96%, 12% 82%, 12% 38%, 22% 22%, 40% 15%)',
      background: 'linear-gradient(180deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.08) 40%, rgba(96,165,250,0.3) 70%, rgba(167,139,250,0.4) 100%)',
      backdropFilter: 'blur(2px)'
    }} />
    <div style={{
      position: 'absolute',
      top: '52%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      fontSize: 12
    }}>
      🌟
    </div>
    <div style={{
      position: 'absolute',
      top: '22%',
      left: '28%',
      width: 4,
      height: 10,
      borderRadius: 2,
      background: 'rgba(255,255,255,0.6)',
      transform: 'rotate(-15deg)'
    }} />
  </div>
);

export const App: React.FC = () => {
  const { init, setModalOpen, selectedId, selectBottle, refreshPoll, bottles } = useStore();
  const [isMobile, setIsMobile] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      init();
    }
  }, [init]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (selectedId && isMobile) {
      setIsDrawerOpen(true);
    }
  }, [selectedId, isMobile]);

  useEffect(() => {
    const interval = setInterval(() => {
      refreshPoll();
    }, 30000);
    return () => clearInterval(interval);
  }, [refreshPoll]);

  const sortedBottles = [...bottles].sort((a, b) => (b.likes - b.dislikes) - (a.likes - a.dislikes));
  const topThree = sortedBottles.slice(0, 3);

  const handleCardClickMobile = (id: string) => {
    selectBottle(id);
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
  };

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #1e40af 100%)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    }}>
      <style>{`
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; }
        #root { width: 100%; height: 100%; }
        @keyframes floatSlow {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-8px) rotate(2deg); }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>

      <div style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 0
      }}>
        <div style={{
          position: 'absolute',
          top: '10%',
          left: '5%',
          fontSize: 48,
          opacity: 0.06,
          animation: 'floatSlow 8s ease-in-out infinite'
        }}>🌀</div>
        <div style={{
          position: 'absolute',
          top: '60%',
          right: '8%',
          fontSize: 60,
          opacity: 0.05,
          animation: 'floatSlow 10s ease-in-out infinite 1s'
        }}>🌊</div>
        <div style={{
          position: 'absolute',
          bottom: '15%',
          left: '15%',
          fontSize: 40,
          opacity: 0.05,
          animation: 'floatSlow 7s ease-in-out infinite 2s'
        }}>🐚</div>
        <div style={{
          position: 'absolute',
          top: '30%',
          right: '20%',
          fontSize: 36,
          opacity: 0.04,
          animation: 'floatSlow 9s ease-in-out infinite 0.5s'
        }}>⭐</div>
      </div>

      <nav style={{
        height: 60,
        flexShrink: 0,
        background: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        zIndex: 10,
        position: 'relative'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }}>
          <BottleIcon />
          <div>
            <h1 style={{
              margin: 0,
              fontSize: 17,
              fontWeight: 700,
              color: '#fff',
              letterSpacing: 0.5
            }}>
              灵感漂流瓶
            </h1>
            <div style={{
              fontSize: 11,
              color: '#60a5fa',
              marginTop: 1
            }}>
              Drift Bottle · 团队创意收集
            </div>
          </div>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16
        }}>
          {!isMobile && topThree.length > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 14px',
              background: 'rgba(245, 158, 11, 0.1)',
              borderRadius: 999,
              border: '1px solid rgba(245, 158, 11, 0.2)'
            }}>
              <span>🏆</span>
              <span style={{
                fontSize: 12,
                color: '#fbbf24',
                fontWeight: 500
              }}>
                今日热榜: {topThree[0].emoji} {topThree[0].title.slice(0, 12)}{topThree[0].title.length > 12 ? '...' : ''}
              </span>
            </div>
          )}

          <button
            onClick={() => setModalOpen(true)}
            style={{
              padding: '10px 20px',
              fontSize: 14,
              fontWeight: 600,
              borderRadius: 12,
              border: 'none',
              background: '#10b981',
              color: '#fff',
              cursor: 'pointer',
              transition: 'all 0.25s ease',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
              letterSpacing: 0.3
            }}
            onMouseOver={e => {
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.55), 0 0 12px rgba(16, 185, 129, 0.35)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseOut={e => {
              e.currentTarget.style.boxShadow = '0 4px 14px rgba(16, 185, 129, 0.4)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <span style={{ fontSize: 16 }}>🍾</span>
            扔瓶子
          </button>
        </div>
      </nav>

      <div style={{
        flex: 1,
        display: 'flex',
        position: 'relative',
        zIndex: 5,
        overflow: 'hidden',
        minHeight: 0
      }}>
        <aside
          style={{
            width: 280,
            flexShrink: 0,
            display: isMobile ? (isDrawerOpen ? 'none' : 'block') : 'block',
            background: 'rgba(255,255,255,0.03)',
            backdropFilter: 'blur(8px)',
            borderRight: isMobile ? 'none' : '1px solid rgba(255,255,255,0.06)',
            overflow: 'hidden',
            height: '100%',
            position: 'relative'
          }}
        >
          <div style={{
            padding: '14px 16px 8px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{
              fontSize: 13,
              fontWeight: 600,
              color: '#cbd5e1',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}>
              <span>🌊</span>
              漂流瓶列表
            </div>
            <span style={{
              fontSize: 11,
              padding: '2px 8px',
              borderRadius: 999,
              background: 'rgba(59, 130, 246, 0.15)',
              color: '#60a5fa',
              fontWeight: 500
            }}>
              {bottles.length} 个
            </span>
          </div>
          <div style={{ height: 'calc(100% - 46px)' }}>
            <BottleList />
          </div>
        </aside>

        {!isMobile && (
          <main style={{
            flex: 1,
            background: 'rgba(248, 250, 252, 0.96)',
            backdropFilter: 'blur(8px)',
            margin: 12,
            marginLeft: 0,
            borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.5)',
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
            minWidth: 0
          }}>
            <BottleDetail />
          </main>
        )}

        {isMobile && (
          <>
            {isDrawerOpen && (
              <div
                onClick={closeDrawer}
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(0,0,0,0.5)',
                  zIndex: 20
                }}
              />
            )}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: 25,
                background: '#f8fafc',
                transform: isDrawerOpen ? 'translateX(0)' : 'translateX(100%)',
                transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                display: isDrawerOpen ? 'flex' : 'none',
                flexDirection: 'column',
                pointerEvents: isDrawerOpen ? 'auto' : 'none'
              }}
            >
              <div style={{
                height: 52,
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                padding: '0 16px',
                gap: 12,
                borderBottom: '1px solid #e2e8f0',
                background: '#fff'
              }}>
                <button
                  onClick={closeDrawer}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    border: 'none',
                    background: 'rgba(15, 23, 42, 0.05)',
                    fontSize: 18,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#475569'
                  }}
                >
                  ←
                </button>
                <div style={{
                  flex: 1,
                  fontSize: 15,
                  fontWeight: 600,
                  color: '#1e293b'
                }}>
                  漂流瓶详情
                </div>
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <BottleDetail />
              </div>
            </div>
          </>
        )}
      </div>

      <Modal />

      {isMobile && selectedId && (
        <button
          onClick={() => {
            const cardClick = handleCardClickMobile;
            cardClick(selectedId);
          }}
          style={{
            display: isDrawerOpen ? 'none' : 'flex'
          }}
        />
      )}
    </div>
  );
};
