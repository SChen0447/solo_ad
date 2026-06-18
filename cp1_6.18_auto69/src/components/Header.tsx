import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { CreateItemModal } from './CreateItemModal';

export const Header = () => {
  const user = useStore((s) => s.user);
  const setLoginModalOpen = useStore((s) => s.setLoginModalOpen);
  const logout = useStore((s) => s.logout);
  const [showMenu, setShowMenu] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const location = useLocation();

  const handleCreateClick = () => {
    if (!user) {
      useStore.getState().setRedirectAfterLogin(location.pathname);
      setLoginModalOpen(true);
    } else {
      setCreateOpen(true);
    }
  };

  return (
    <>
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          padding: '14px 32px',
          background: 'rgba(26, 26, 46, 0.85)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        <div
          style={{
            maxWidth: '1400px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #f0a500, #e89000)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
              }}
            >
              🎨
            </div>
            <div>
              <div style={{ color: '#fff', fontSize: '20px', fontWeight: 800, letterSpacing: '0.5px' }}>ArtAuction</div>
              <div style={{ color: '#888', fontSize: '11px' }}>线上艺术品拍卖平台</div>
            </div>
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <button
              onClick={handleCreateClick}
              style={{
                padding: '10px 22px',
                borderRadius: '10px',
                border: 'none',
                background: 'linear-gradient(135deg, #f0a500, #e89000)',
                color: '#1a1a2e',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'transform 0.15s, box-shadow 0.15s',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(240, 165, 0, 0.35)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              + 发布拍品
            </button>
            {user ? (
              <div style={{ position: 'relative' }}>
                <div
                  onClick={() => setShowMenu(!showMenu)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '6px 14px 6px 6px',
                    borderRadius: '30px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)')}
                  onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)')}
                >
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #f0a500, #e89000)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#1a1a2e',
                      fontWeight: 800,
                      fontSize: '14px',
                    }}
                  >
                    {user.avatar}
                  </div>
                  <span style={{ color: '#fff', fontSize: '14px', fontWeight: 500 }}>{user.username}</span>
                </div>
                {showMenu && (
                  <div
                    onClick={() => setShowMenu(false)}
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 8px)',
                      right: 0,
                      minWidth: '160px',
                      borderRadius: '12px',
                      background: 'rgba(22, 33, 62, 0.98)',
                      backdropFilter: 'blur(12px)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)',
                      overflow: 'hidden',
                      animation: 'fadeIn 0.2s ease-out',
                    }}
                  >
                    <button
                      onClick={logout}
                      style={{
                        width: '100%',
                        padding: '12px 18px',
                        background: 'transparent',
                        border: 'none',
                        color: '#ef4444',
                        fontSize: '14px',
                        textAlign: 'left',
                        cursor: 'pointer',
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)')}
                      onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      退出登录
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setLoginModalOpen(true)}
                style={{
                  padding: '10px 22px',
                  borderRadius: '10px',
                  border: '1px solid rgba(240, 165, 0, 0.4)',
                  background: 'transparent',
                  color: '#f0a500',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(240, 165, 0, 0.1)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                登录
              </button>
            )}
          </div>
        </div>
      </header>
      <CreateItemModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </>
  );
};
