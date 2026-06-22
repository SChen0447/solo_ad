import { useUser } from '../context/UserContext';
import NotificationBubble from '../modules/notify/NotificationBubble';
import './Navbar.css';

interface NavbarProps {
  onMenuClick?: () => void;
}

export default function Navbar({ onMenuClick }: NavbarProps) {
  const { bookedActivities } = useUser();

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <div className="logo">
          <div className="logo-icon">T</div>
          <span className="logo-text">TechConf 2026</span>
        </div>

        <div className="date-picker">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <input type="date" defaultValue="2026-06-23" />
        </div>
      </div>

      <div className="navbar-right">
        <div className="nav-stats">
          <svg className="nav-stats-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
          已预约 {bookedActivities.length} 场
        </div>

        <NotificationBubble />

        {onMenuClick && (
          <button className="mobile-menu-btn" onClick={onMenuClick}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        )}

        <div className="user-avatar">
          U
          {bookedActivities.length > 0 && (
            <span className="booking-badge">{bookedActivities.length}</span>
          )}
        </div>
      </div>
    </nav>
  );
}
