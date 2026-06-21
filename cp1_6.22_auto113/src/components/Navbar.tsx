import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Wine } from 'lucide-react';

interface NavbarProps {
  userId: string;
  userAvatar: string;
}

const Navbar: React.FC<NavbarProps> = ({ userId, userAvatar }) => {
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const response = await fetch(`/api/notifications/${userId}/unread-count`);
        const data = await response.json();
        setUnreadCount(data.count);
      } catch (error) {
        console.error('获取未读通知数失败:', error);
      }
    };

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [userId]);

  const handleLogoClick = () => {
    navigate('/');
  };

  const handleNotificationClick = () => {
    navigate('/notifications');
  };

  const handleProfileClick = () => {
    navigate('/profile');
  };

  const displayCount = unreadCount > 9 ? '9+' : unreadCount;

  return (
    <nav className="navbar">
      <div className="navbar-logo" onClick={handleLogoClick}>
        <Wine size={24} />
        <span>校园漂流瓶</span>
      </div>

      <div className="navbar-actions">
        <div
          className="notification-bell"
          onClick={handleNotificationClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && handleNotificationClick()}
        >
          <Bell size={22} color="#374151" />
          {unreadCount > 0 && (
            <span className="notification-badge">{displayCount}</span>
          )}
        </div>

        <div
          className="user-avatar-link"
          onClick={handleProfileClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && handleProfileClick()}
        >
          <img src={userAvatar} alt="用户头像" />
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
