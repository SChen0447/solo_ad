import React from 'react'

interface NavbarProps {
  currentPage: string
  onNavigate: (page: string) => void
  userName: string
}

const Navbar: React.FC<NavbarProps> = ({ currentPage, onNavigate, userName }) => {
  const navItems = [
    { id: 'create', label: '创意提交' },
    { id: 'voting', label: '投票' },
    { id: 'board', label: '排序看板' }
  ]

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <div className="spacer" />
      </div>
      <div className="navbar-center">
        <h1 className="app-title">创意点子看板</h1>
      </div>
      <div className="navbar-right">
        <div className="user-info">
          <span className="user-name">{userName}</span>
        </div>
      </div>
      
      <div className="nav-links">
        {navItems.map(item => (
          <button
            key={item.id}
            className={`nav-link ${currentPage === item.id ? 'active' : ''}`}
            onClick={() => onNavigate(item.id)}
          >
            {item.label}
            <span className="nav-underline" />
          </button>
        ))}
      </div>

      <style>{`
        .navbar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 64px;
          background: #FFFFFF;
          border-bottom: 1px solid #E5E7EB;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 32px;
          z-index: 1000;
          box-sizing: border-box;
        }
        
        .navbar-left,
        .navbar-right {
          width: 200px;
          display: flex;
          align-items: center;
        }
        
        .navbar-right {
          justify-content: flex-end;
        }
        
        .navbar-center {
          flex: 1;
          display: flex;
          justify-content: center;
        }
        
        .app-title {
          font-size: 24px;
          font-weight: 700;
          background: linear-gradient(135deg, #6366F1, #8B5CF6, #A855F7);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin: 0;
        }
        
        .nav-links {
          position: absolute;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 32px;
        }
        
        .nav-link {
          position: relative;
          background: none;
          border: none;
          padding: 8px 4px 14px;
          font-size: 14px;
          color: #6B7280;
          cursor: pointer;
          font-weight: 500;
          transition: color 0.3s ease;
        }
        
        .nav-link:hover {
          color: #6366F1;
        }
        
        .nav-link.active {
          color: #6366F1;
        }
        
        .nav-underline {
          position: absolute;
          bottom: 8px;
          left: 50%;
          transform: translateX(-50%) scaleX(0);
          width: 100%;
          height: 2px;
          background: #6366F1;
          transition: transform 0.3s ease;
          border-radius: 1px;
        }
        
        .nav-link.active .nav-underline {
          transform: translateX(-50%) scaleX(1);
        }
        
        .user-info {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .user-name {
          font-size: 14px;
          font-weight: 500;
          color: #374151;
        }
        
        .spacer {
          width: 200px;
        }
      `}</style>
    </nav>
  )
}

export default Navbar
