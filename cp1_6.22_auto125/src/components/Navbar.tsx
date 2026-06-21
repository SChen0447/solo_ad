import { NavLink } from 'react-router-dom';
import './Navbar.css';

function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-logo">
          🍳 家庭食材管理
        </div>
        <div className="navbar-links">
          <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} end>
            食材库存
          </NavLink>
          <NavLink to="/recommend" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            菜谱推荐
          </NavLink>
          <NavLink to="/family" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            家庭成员
          </NavLink>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
