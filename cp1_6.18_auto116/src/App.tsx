import { useState, useEffect } from 'react';
import StarScene from '@/components/StarScene';
import ControlPanel from '@/components/ControlPanel';
import ComparePanel from '@/components/ComparePanel';
import { useStore } from '@/store';
import { Settings, BarChart3, X } from 'lucide-react';

export default function App() {
  const comparePanelOpen = useStore((s) => s.comparePanelOpen);
  const setComparePanelOpen = useStore((s) => s.setComparePanelOpen);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [width, setWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isDesktop = width >= 1024;
  const isTablet = width >= 768 && width < 1024;
  const isMobile = width < 768;

  return (
    <div style={{
      width: '100%',
      height: '100vh',
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      overflow: 'hidden',
      position: 'relative',
    }}>
      <header style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 20px',
        background: 'linear-gradient(180deg, rgba(5,10,26,0.9) 0%, rgba(5,10,26,0) 100%)',
        pointerEvents: 'none',
      }}>
        <div style={{ pointerEvents: 'auto' }}>
          <h1 style={{
            fontFamily: "'Orbitron', sans-serif",
            fontSize: '16px',
            fontWeight: 800,
            color: '#00d4ff',
            letterSpacing: '2px',
            textShadow: '0 0 20px rgba(0, 212, 255, 0.4)',
          }}>
            STELLAR INTERIOR
          </h1>
          <p style={{
            fontSize: '10px',
            color: '#556677',
            letterSpacing: '1px',
            marginTop: '2px',
          }}>
            恒星内部结构对比可视化
          </p>
        </div>
        <div style={{ pointerEvents: 'auto', display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setComparePanelOpen(!comparePanelOpen)}
            style={{
              background: comparePanelOpen ? 'rgba(124, 58, 237, 0.3)' : 'rgba(0, 212, 255, 0.1)',
              border: `1px solid ${comparePanelOpen ? '#7c3aed' : 'rgba(0, 212, 255, 0.3)'}`,
              borderRadius: '6px',
              color: comparePanelOpen ? '#c4b5fd' : '#88ccdd',
              padding: '6px 10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              transition: 'all 0.3s ease',
            }}
          >
            <BarChart3 size={14} />
            {!isMobile && '对比'}
          </button>
        </div>
      </header>

      {isDesktop && (
        <aside style={{
          width: '240px',
          minWidth: '240px',
          height: '100%',
          padding: '60px 12px 12px 12px',
          overflowY: 'auto',
          zIndex: 10,
        }}>
          <ControlPanel />
        </aside>
      )}

      {isTablet && (
        <aside style={{
          width: '220px',
          minWidth: '220px',
          height: '100%',
          padding: '60px 10px 10px 10px',
          overflowY: 'auto',
          zIndex: 10,
        }}>
          <ControlPanel />
        </aside>
      )}

      <main style={{
        flex: 1,
        height: '100%',
        position: 'relative',
        zIndex: 5,
      }}>
        <StarScene />
      </main>

      {isDesktop && comparePanelOpen && (
        <aside style={{
          width: '320px',
          minWidth: '320px',
          height: '100%',
          padding: '60px 12px 12px 12px',
          overflowY: 'auto',
          zIndex: 10,
        }}>
          <ComparePanel />
        </aside>
      )}

      {(isTablet || isMobile) && drawerOpen && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          maxHeight: '50vh',
          zIndex: 200,
          padding: '0 12px 12px 12px',
          animation: 'slideUp 0.3s ease',
        }}>
          <div style={{
            background: 'rgba(20, 20, 40, 0.92)',
            backdropFilter: 'blur(16px)',
            borderRadius: '12px 12px 0 0',
            border: '1px solid rgba(0, 212, 255, 0.15)',
            overflowY: 'auto',
            maxHeight: '50vh',
            padding: '14px',
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '10px',
            }}>
              <span style={{
                fontFamily: "'Orbitron', sans-serif",
                fontSize: '10px',
                color: '#00d4ff',
                letterSpacing: '1px',
              }}>
                参数对比
              </span>
              <button
                onClick={() => setDrawerOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#667799',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <X size={14} />
              </button>
            </div>
            <ComparePanel />
          </div>
        </div>
      )}

      {isMobile && (
        <>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              position: 'fixed',
              bottom: '16px',
              left: '16px',
              zIndex: 300,
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: 'rgba(0, 212, 255, 0.2)',
              border: '1px solid rgba(0, 212, 255, 0.4)',
              color: '#00d4ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              backdropFilter: 'blur(8px)',
              transition: 'all 0.3s ease',
            }}
          >
            <Settings size={20} />
          </button>

          <button
            onClick={() => setDrawerOpen(!drawerOpen)}
            style={{
              position: 'fixed',
              bottom: '16px',
              right: '16px',
              zIndex: 300,
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: 'rgba(124, 58, 237, 0.2)',
              border: '1px solid rgba(124, 58, 237, 0.4)',
              color: '#7c3aed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              backdropFilter: 'blur(8px)',
              transition: 'all 0.3s ease',
            }}
          >
            <BarChart3 size={20} />
          </button>

          {mobileMenuOpen && (
            <div style={{
              position: 'fixed',
              bottom: '70px',
              left: '16px',
              right: '16px',
              zIndex: 290,
              animation: 'slideUp 0.3s ease',
            }}>
              <div style={{
                background: 'rgba(20, 20, 40, 0.92)',
                backdropFilter: 'blur(16px)',
                borderRadius: '12px',
                border: '1px solid rgba(0, 212, 255, 0.15)',
                padding: '14px',
                maxHeight: '60vh',
                overflowY: 'auto',
              }}>
                <ControlPanel />
              </div>
            </div>
          )}
        </>
      )}

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(0, 212, 255, 0.2); border-radius: 2px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(0, 212, 255, 0.4); }
      `}</style>
    </div>
  );
}
