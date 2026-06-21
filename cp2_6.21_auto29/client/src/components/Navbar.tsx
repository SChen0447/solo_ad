import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

interface NavbarProps {
  unreadCount: number;
  onNotificationClick: () => void;
}

const Navbar = ({ unreadCount, onNotificationClick }: NavbarProps) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { path: '/', label: '课程广场' },
    { path: '/assignments', label: '作业管理' }
  ];

  return (
    <>
      <nav style={navbarStyle}>
        <div style={containerStyle}>
          <div style={leftSectionStyle}>
            <Link to="/" style={logoStyle}>
              <span style={logoIconStyle}>🎨</span>
              <span style={logoTextStyle}>技能工作坊</span>
            </Link>
            
            <div style={navLinksStyle}>
              {navLinks.map(link => (
                <Link
                  key={link.path}
                  to={link.path}
                  style={{
                    ...navLinkStyle,
                    color: location.pathname === link.path || (link.path !== '/' && location.pathname.startsWith(link.path)) 
                      ? '#7C3AED' 
                      : '#4B5563'
                  }}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div style={rightSectionStyle}>
            <button onClick={onNotificationClick} style={notificationBtnStyle}>
              <span style={notificationIconStyle}>🔔</span>
              {unreadCount > 0 && (
                <span style={notificationBadgeStyle}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
            
            <div style={userAvatarStyle}>
              <img 
                src="https://i.pravatar.cc/100?img=65" 
                alt="用户头像" 
                style={avatarImgStyle} 
              />
            </div>

            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              style={mobileMenuBtnStyle}
            >
              {isMobileMenuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>
      </nav>

      {isMobileMenuOpen && (
        <>
          <div style={mobileOverlayStyle} onClick={() => setIsMobileMenuOpen(false)} />
          <div style={mobileDrawerStyle}>
            <div style={mobileDrawerHeaderStyle}>
              <span style={mobileDrawerTitleStyle}>菜单</span>
              <button 
                onClick={() => setIsMobileMenuOpen(false)} 
                style={mobileCloseBtnStyle}
              >
                ✕
              </button>
            </div>
            <div style={mobileNavLinksStyle}>
              {navLinks.map(link => (
                <Link
                  key={link.path}
                  to={link.path}
                  style={{
                    ...mobileNavLinkStyle,
                    color: location.pathname === link.path ? '#7C3AED' : '#4B5563'
                  }}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
};

const navbarStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  height: '56px',
  backgroundColor: '#FFFFFF',
  borderBottom: '1px solid #E5E7EB',
  zIndex: 100,
  display: 'flex',
  alignItems: 'center'
};

const containerStyle: React.CSSProperties = {
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '0 24px',
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between'
};

const leftSectionStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '32px'
};

const logoStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  textDecoration: 'none',
  color: '#1F2937'
};

const logoIconStyle: React.CSSProperties = {
  fontSize: '24px'
};

const logoTextStyle: React.CSSProperties = {
  fontSize: '18px',
  fontWeight: '700',
  background: 'linear-gradient(135deg, #7C3AED, #A855F7)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text'
};

const navLinksStyle: React.CSSProperties = {
  display: 'flex',
  gap: '24px'
};

const navLinkStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: '500',
  textDecoration: 'none',
  transition: 'color 0.2s ease',
  display: 'none'
};

const rightSectionStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px'
};

const notificationBtnStyle: React.CSSProperties = {
  position: 'relative',
  width: '40px',
  height: '40px',
  borderRadius: '50%',
  border: 'none',
  backgroundColor: '#F3F4F6',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};

const notificationIconStyle: React.CSSProperties = {
  fontSize: '18px'
};

const notificationBadgeStyle: React.CSSProperties = {
  position: 'absolute',
  top: '4px',
  right: '4px',
  minWidth: '16px',
  height: '16px',
  borderRadius: '8px',
  backgroundColor: '#EF4444',
  color: '#FFFFFF',
  fontSize: '10px',
  fontWeight: '600',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '0 4px'
};

const userAvatarStyle: React.CSSProperties = {
  width: '36px',
  height: '36px',
  borderRadius: '50%',
  overflow: 'hidden',
  border: '2px solid #E8DEF8',
  cursor: 'pointer'
};

const avatarImgStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  objectFit: 'cover'
};

const mobileMenuBtnStyle: React.CSSProperties = {
  display: 'none',
  width: '40px',
  height: '40px',
  borderRadius: '50%',
  border: 'none',
  backgroundColor: '#F3F4F6',
  cursor: 'pointer',
  fontSize: '18px'
};

const mobileOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: '56px',
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.3)',
  zIndex: 90
};

const mobileDrawerStyle: React.CSSProperties = {
  position: 'fixed',
  top: '56px',
  left: 0,
  width: '280px',
  height: 'calc(100vh - 56px)',
  backgroundColor: '#FFFFFF',
  zIndex: 91,
  boxShadow: '2px 0 12px rgba(0, 0, 0, 0.1)',
  animation: 'slideInLeft 0.3s ease'
};

const mobileDrawerHeaderStyle: React.CSSProperties = {
  padding: '16px 20px',
  borderBottom: '1px solid #E5E7EB',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between'
};

const mobileDrawerTitleStyle: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: '600',
  color: '#1F2937'
};

const mobileCloseBtnStyle: React.CSSProperties = {
  width: '32px',
  height: '32px',
  borderRadius: '50%',
  border: 'none',
  backgroundColor: '#F3F4F6',
  cursor: 'pointer',
  fontSize: '12px'
};

const mobileNavLinksStyle: React.CSSProperties = {
  padding: '12px 0'
};

const mobileNavLinkStyle: React.CSSProperties = {
  display: 'block',
  padding: '14px 20px',
  fontSize: '15px',
  textDecoration: 'none'
};

const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @media (min-width: 769px) {
    ${navLinksStyle.display ? '' : ''}
    a[style*="navLinkStyle"],
    div[style*="navLinksStyle"] a {
      display: inline-block !important;
    }
  }
  
  @media (max-width: 768px) {
    button[style*="mobileMenuBtnStyle"] {
      display: flex !important;
    }
    div[style*="navLinksStyle"] a {
      display: none !important;
    }
    div[style*="userAvatarStyle"] {
      display: none;
    }
  }
  
  @keyframes slideInLeft {
    from {
      transform: translateX(-100%);
    }
    to {
      transform: translateX(0);
    }
  }
`;
document.head.appendChild(styleSheet);

export default Navbar;
