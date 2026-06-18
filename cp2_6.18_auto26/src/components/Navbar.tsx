import { NavLink } from 'react-router-dom';

export default function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <div className="navbar-logo">eSign · 电子协议签署平台</div>
        <ul className="navbar-links">
          <li>
            <NavLink
              to="/"
              end
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              协议列表
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/create"
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              创建协议
            </NavLink>
          </li>
        </ul>
      </div>
    </nav>
  );
}
