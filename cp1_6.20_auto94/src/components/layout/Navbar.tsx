import { NavLink, useNavigate } from 'react-router-dom';
import { useAppStore, MOCK_USER, MOCK_RECYCLER, MOCK_READER } from '@/store/useAppStore';
import type { UserRole } from '@/types';

const roleNavItems: Record<UserRole, { to: string; label: string }[]> = {
  admin: [
    { to: '/', label: '仪表盘' },
    { to: '/book-entry', label: '书籍录入' },
    { to: '/books', label: '书籍管理' },
    { to: '/auctions', label: '竞标管理' }
  ],
  recycler: [
    { to: '/auctions', label: '竞标大厅' },
    { to: '/my-bids', label: '我的出价' }
  ],
  reader: [
    { to: '/borrow', label: '可借阅书籍' },
    { to: '/my-reservations', label: '我的预约' }
  ]
};

const roleOptions: { role: UserRole; user: typeof MOCK_USER }[] = [
  { role: 'admin', user: MOCK_USER },
  { role: 'recycler', user: MOCK_RECYCLER },
  { role: 'reader', user: MOCK_READER }
];

export default function Navbar() {
  const { currentUser, setCurrentUser, hasUnreadNotification, setHasUnreadNotification } = useAppStore();
  const navigate = useNavigate();

  const navItems = currentUser ? roleNavItems[currentUser.role] : [];

  const handleRoleSwitch = (role: UserRole) => {
    const option = roleOptions.find(o => o.role === role);
    if (option) {
      setCurrentUser(option.user);
      navigate(role === 'admin' ? '/' : role === 'recycler' ? '/auctions' : '/borrow');
    }
  };

  const handleBellClick = () => {
    setHasUnreadNotification(false);
  };

  if (!currentUser) return null;

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <span>📚</span>
        <span>旧书回收管理系统</span>
      </div>

      <div className="navbar-links">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `navbar-link${isActive ? ' active' : ''}`}
          >
            {item.label}
          </NavLink>
        ))}
      </div>

      <div className="navbar-right">
        <select
          className="form-select"
          style={{ minWidth: 110, padding: '6px 10px', fontSize: 12, color: '#2c3e50' }}
          value={currentUser.role}
          onChange={(e) => handleRoleSwitch(e.target.value as UserRole)}
        >
          <option value="admin">管理员</option>
          <option value="recycler">回收商</option>
          <option value="reader">读者</option>
        </select>

        <div className="notification-bell" onClick={handleBellClick} title="消息通知">
          🔔
          {hasUnreadNotification && <span className="notification-badge" />}
        </div>

        <img
          src={currentUser.avatar}
          alt={currentUser.name}
          className="user-avatar"
          title={currentUser.name}
        />
      </div>
    </nav>
  );
}
