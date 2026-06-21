import { NavLink, useNavigate } from 'react-router-dom'

function BottomNav() {
  const navigate = useNavigate()

  return (
    <nav className="bottom-nav">
      <button 
        className="nav-item" 
        onClick={() => navigate('/')}
      >
        <span className="nav-icon">🏠</span>
        <span>首页</span>
      </button>
      <NavLink 
        to="/profile" 
        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
      >
        <span className="nav-icon">👤</span>
        <span>我的</span>
      </NavLink>
    </nav>
  )
}

export default BottomNav
