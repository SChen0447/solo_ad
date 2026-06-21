import { NavLink } from 'react-router-dom';
import { BookOpen, BookMarked, Trophy } from 'lucide-react';
import './Navbar.css';

const navItems = [
  { to: '/', label: '推荐', icon: BookOpen, end: true },
  { to: '/loans', label: '我的借阅', icon: BookMarked },
  { to: '/ranking', label: '书评排行榜', icon: Trophy },
];

export default function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-content">
        <div className="navbar-logo">
          <BookOpen size={28} />
          <span>悦读书房</span>
        </div>
        <div className="navbar-links">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => 
                `nav-link ${isActive ? 'active' : ''}`
              }
            >
              <item.icon size={18} />
              <span>{item.label}</span>
              {item.end ? null : (
                <span className="nav-underline" />
              )}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
}
