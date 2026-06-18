import { useState, useEffect } from 'react';

interface NavbarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  currentUser: string | null;
  isAdmin: boolean;
  onLogin: (username: string, isAdmin: boolean) => void;
  onLogout: () => void;
}

export default function Navbar({
  currentPage,
  onNavigate,
  currentUser,
  isAdmin,
  onLogin,
  onLogout,
}: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginUsername === 'admin' && loginPassword === 'admin123') {
      onLogin('admin', true);
      setShowLoginModal(false);
      setLoginError('');
      setLoginUsername('');
      setLoginPassword('');
    } else if (loginUsername.trim() && loginPassword.trim()) {
      onLogin(loginUsername, false);
      setShowLoginModal(false);
      setLoginError('');
      setLoginUsername('');
      setLoginPassword('');
    } else {
      setLoginError('请输入用户名和密码');
    }
  };

  const navLinks = [
    { key: 'list', label: '申购列表', adminOnly: false },
    { key: 'form', label: '提交申购', adminOnly: false },
    { key: 'admin', label: '审批仪表板', adminOnly: true },
  ];

  const visibleLinks = navLinks.filter((link) => !link.adminOnly || isAdmin);

  return (
    <>
      <nav
        style={{
          height: 56,
          backgroundColor: 'rgba(31, 41, 55, 0.95)',
          backdropFilter: 'blur(8px)',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          <div
            style={{
              fontSize: 18,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
            onClick={() => onNavigate('list')}
          >
            <span>📦</span>
            <span>办公用品申购系统</span>
          </div>

          {!isMobile && (
            <div style={{ display: 'flex', gap: 8 }}>
              {visibleLinks.map((link) => (
                <button
                  key={link.key}
                  onClick={() => onNavigate(link.key)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    backgroundColor:
                      currentPage === link.key ? 'rgba(59, 130, 246, 0.3)' : 'transparent',
                    color: '#ffffff',
                    fontSize: 14,
                    fontWeight: currentPage === link.key ? 600 : 400,
                    transition: 'all 0.2s ease-out',
                  }}
                >
                  {link.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {!isMobile && (
            <>
              {currentUser ? (
                <>
                  <span style={{ fontSize: 14, opacity: 0.9 }}>
                    {isAdmin && '👑 '}
                    欢迎，{currentUser}
                  </span>
                  <button
                    onClick={onLogout}
                    style={{
                      padding: '6px 16px',
                      borderRadius: 6,
                      backgroundColor: 'rgba(239, 68, 68, 0.2)',
                      color: '#fca5a5',
                      fontSize: 13,
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                    }}
                  >
                    登出
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setShowLoginModal(true)}
                  style={{
                    padding: '6px 20px',
                    borderRadius: 6,
                    backgroundColor: '#3b82f6',
                    color: '#ffffff',
                    fontSize: 13,
                    fontWeight: 500,
                  }}
                >
                  登录
                </button>
              )}
            </>
          )}

          {isMobile && (
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              style={{
                padding: 8,
                borderRadius: 6,
                backgroundColor: 'transparent',
                color: '#ffffff',
                fontSize: 20,
              }}
              aria-label="菜单"
            >
              {menuOpen ? '✕' : '☰'}
            </button>
          )}
        </div>
      </nav>

      {isMobile && (
        <div
          style={{
            maxHeight: menuOpen ? 500 : 0,
            overflow: 'hidden',
            transition: 'max-height 0.3s ease-out',
            backgroundColor: '#374151',
            position: 'sticky',
            top: 56,
            zIndex: 99,
          }}
        >
          <div style={{ padding: '8px 16px 16px' }}>
            {visibleLinks.map((link) => (
              <button
                key={link.key}
                onClick={() => {
                  onNavigate(link.key);
                  setMenuOpen(false);
                }}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '12px 16px',
                  borderRadius: 8,
                  backgroundColor:
                    currentPage === link.key ? 'rgba(59, 130, 246, 0.3)' : 'transparent',
                  color: '#ffffff',
                  fontSize: 14,
                  marginTop: 4,
                }}
              >
                {link.label}
              </button>
            ))}
            <div
              style={{
                marginTop: 12,
                paddingTop: 12,
                borderTop: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              {currentUser ? (
                <>
                  <div
                    style={{
                      padding: '8px 16px',
                      fontSize: 14,
                      color: '#d1d5db',
                    }}
                  >
                    {isAdmin && '👑 '}
                    {currentUser}
                  </div>
                  <button
                    onClick={() => {
                      onLogout();
                      setMenuOpen(false);
                    }}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      padding: '12px 16px',
                      borderRadius: 8,
                      backgroundColor: 'rgba(239, 68, 68, 0.15)',
                      color: '#fca5a5',
                      fontSize: 14,
                      marginTop: 4,
                    }}
                  >
                    登出
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    setShowLoginModal(true);
                    setMenuOpen(false);
                  }}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: 8,
                    backgroundColor: '#3b82f6',
                    color: '#ffffff',
                    fontSize: 14,
                    fontWeight: 500,
                  }}
                >
                  登录
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showLoginModal && (
        <div
          onClick={() => setShowLoginModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 200,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 16,
              padding: 32,
              width: '90%',
              maxWidth: 400,
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}
          >
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24, color: '#1f2937' }}>
              登录系统
            </h2>
            <form onSubmit={handleLoginSubmit}>
              <div style={{ marginBottom: 16 }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: 13,
                    marginBottom: 6,
                    color: '#374151',
                    fontWeight: 500,
                  }}
                >
                  用户名
                </label>
                <input
                  type="text"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  placeholder="admin 或自定义用户名"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: '1px solid #d1d5db',
                    fontSize: 14,
                  }}
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: 13,
                    marginBottom: 6,
                    color: '#374151',
                    fontWeight: 500,
                  }}
                >
                  密码
                </label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="admin123 或任意密码"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: '1px solid #d1d5db',
                    fontSize: 14,
                  }}
                />
              </div>
              {loginError && (
                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: 6,
                    backgroundColor: '#fef2f2',
                    color: '#dc2626',
                    fontSize: 13,
                    marginBottom: 16,
                  }}
                >
                  {loginError}
                </div>
              )}
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: 6,
                  backgroundColor: '#eff6ff',
                  color: '#1d4ed8',
                  fontSize: 12,
                  marginBottom: 16,
                }}
              >
                💡 管理员账号：admin / admin123（可访问审批仪表板）
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  type="button"
                  onClick={() => setShowLoginModal(false)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: 8,
                    backgroundColor: '#f3f4f6',
                    color: '#374151',
                    fontSize: 14,
                    fontWeight: 500,
                  }}
                >
                  取消
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: 8,
                    backgroundColor: '#3b82f6',
                    color: '#ffffff',
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  登录
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
