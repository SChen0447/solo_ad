import { useEffect, useState, useRef } from 'react';
import { Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import MedicineBox from './pages/MedicineBox';
import Reminders from './pages/Reminders';
import Members from './pages/Members';
import MedicationNotification from './components/MedicationNotification';
import { useAppStore } from './store';
import { Member } from './types';

interface FloatNotification {
  id: string;
  medicineName: string;
  dosageAmount: string;
  reminderId: string;
}

export default function App() {
  const { fetchAll, members, currentUserId, reminders, setCurrentUser, checkExpiry, updateReminderStatus, fetchReminders, medicines } = useAppStore();
  const [scrolled, setScrolled] = useState(false);
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [error, setError] = useState('');
  const { addMember } = useAppStore();
  const [floatNotifications, setFloatNotifications] = useState<FloatNotification[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const processedRemindersRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowMemberDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      checkExpiry();
    }, 30000);
    return () => clearInterval(interval);
  }, [checkExpiry]);

  useEffect(() => {
    const checkMedicationReminders = () => {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentTime = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;

      medicines.forEach(medicine => {
        if (!medicine.dosageSchedule) return;

        const { timesPerDay, startTime, dosageAmount } = medicine.dosageSchedule;
        if (!timesPerDay || !startTime) return;

        const [startHour, startMinute] = startTime.split(':').map(Number);
        const interval = Math.floor(24 / timesPerDay);

        for (let i = 0; i < timesPerDay; i++) {
          let reminderHour = startHour + i * interval;
          let reminderMinute = startMinute;

          if (reminderHour >= 24) {
            reminderHour -= 24;
          }

          const reminderTime = `${String(reminderHour).padStart(2, '0')}:${String(reminderMinute).padStart(2, '0')}`;

          if (reminderTime === currentTime) {
            const reminderKey = `${medicine.id}-${reminderTime}-${now.toDateString()}`;

            if (!processedRemindersRef.current.has(reminderKey)) {
              processedRemindersRef.current.add(reminderKey);

              const message = `该服用 ${medicine.name} ${dosageAmount || ''} 了`;

              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('用药提醒', {
                  body: message,
                  icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="50" font-size="50">💊</text></svg>',
                });
              }

              const floatId = `float-${Date.now()}-${Math.random()}`;
              setFloatNotifications(prev => [
                ...prev,
                {
                  id: floatId,
                  medicineName: medicine.name,
                  dosageAmount: dosageAmount || '',
                  reminderId: floatId,
                },
              ]);
            }
          }
        }
      });
    };

    const interval = setInterval(checkMedicationReminders, 60000);
    checkMedicationReminders();
    return () => clearInterval(interval);
  }, [medicines]);

  const handleTakeMedicine = (notificationId: string) => {
    setFloatNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  const pendingCount = reminders.filter(r => r.status === 'pending').length;
  const currentUser = members.find(m => m.id === currentUserId);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName.trim()) {
      setError('请输入成员昵称');
      return;
    }
    try {
      await addMember(inviteName.trim());
      setShowInviteModal(false);
      setInviteName('');
      setError('');
    } catch (err) {
      setError('添加成员失败');
    }
  };

  const pendingReminders = reminders.filter(r => r.status === 'pending').slice(0, 5);

  return (
    <div className="app-container">
      <nav className={`navbar ${scrolled ? 'navbar-scrolled' : ''}`}>
        <div className="navbar-inner">
          <div className="navbar-left" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
            <span className="logo-icon">💊</span>
            <h1 className="app-title">家庭药箱</h1>
          </div>

          <div className="nav-links">
            <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <span className="nav-icon">🏠</span>
              <span>首页</span>
              <div className="nav-underline"></div>
            </NavLink>
            <NavLink to="/medicine-box" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <span className="nav-icon">📦</span>
              <span>药箱</span>
              <div className="nav-underline"></div>
            </NavLink>
            <NavLink to="/reminders" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <span className="nav-icon">🔔</span>
              <span>提醒</span>
              <div className="nav-underline"></div>
              {pendingCount > 0 && <span className="badge">{pendingCount}</span>}
            </NavLink>
            <NavLink to="/members" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <span className="nav-icon">👨‍👩‍👧</span>
              <span>成员</span>
              <div className="nav-underline"></div>
            </NavLink>
          </div>

          <div className="navbar-right" ref={dropdownRef}>
            {members.slice(0, 3).map((member, idx) => (
              <div
                key={member.id}
                className={`member-avatar ${member.id === currentUserId ? 'current-user' : ''}`}
                style={{
                  backgroundColor: member.color,
                  zIndex: members.length - idx,
                  marginLeft: idx > 0 ? '-8px' : '0',
                }}
                onClick={() => {
                  setCurrentUser(member.id);
                  setShowMemberDropdown(true);
                }}
                title={member.name}
              >
                {member.name.charAt(0)}
              </div>
            ))}
            {members.length > 3 && (
              <div
                className="member-avatar more-members"
                style={{ marginLeft: '-8px' }}
                onClick={() => setShowMemberDropdown(true)}
              >
                +{members.length - 3}
              </div>
            )}

            {showMemberDropdown && (
              <div className="member-dropdown">
                <div className="dropdown-header">
                  <span>家庭成员</span>
                  <button
                    className="invite-btn"
                    onClick={() => setShowInviteModal(true)}
                  >
                    + 邀请成员
                  </button>
                </div>
                <div className="dropdown-list">
                  {members.map(member => (
                    <div
                      key={member.id}
                      className={`dropdown-item ${member.id === currentUserId ? 'selected' : ''}`}
                      onClick={() => {
                        setCurrentUser(member.id);
                        setShowMemberDropdown(false);
                      }}
                    >
                      <div
                        className="dropdown-avatar"
                        style={{ backgroundColor: member.color }}
                      >
                        {member.name.charAt(0)}
                      </div>
                      <div className="dropdown-info">
                        <span className="dropdown-name">
                          {member.name}
                          {member.isOwner && <span className="owner-badge">创建者</span>}
                        </span>
                        {member.id === currentUserId && (
                          <span className="current-label">当前用户</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {pendingReminders.length > 0 && (
                  <div className="dropdown-reminders">
                    <div className="dropdown-reminders-title">
                      待处理提醒 ({pendingCount})
                    </div>
                    {pendingReminders.map(reminder => (
                      <div
                        key={reminder.id}
                        className={`dropdown-reminder-item severity-${reminder.severity || 'normal'}`}
                        onClick={() => {
                          navigate('/reminders');
                          setShowMemberDropdown(false);
                        }}
                      >
                        <span className="reminder-dot"></span>
                        <span className="reminder-text">{reminder.message}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </nav>

      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/medicine-box" element={<MedicineBox />} />
          <Route path="/reminders" element={<Reminders />} />
          <Route path="/members" element={<Members />} />
        </Routes>
      </main>

      {floatNotifications.map(notification => (
        <MedicationNotification
          key={notification.id}
          id={notification.id}
          medicineName={notification.medicineName}
          dosageAmount={notification.dosageAmount}
          onClose={handleTakeMedicine}
          onTake={() => {
            updateReminderStatus(notification.reminderId, 'completed').catch(() => {});
            handleTakeMedicine(notification.id);
          }}
        />
      ))}

      {showInviteModal && (
        <div
          className="modal-overlay"
          onClick={() => {
            setShowInviteModal(false);
            setInviteName('');
            setError('');
          }}
        >
          <div
            className="modal-content invite-modal"
            onClick={e => e.stopPropagation()}
          >
            <button
              className="close-btn rotate-in"
              onClick={() => {
                setShowInviteModal(false);
                setInviteName('');
                setError('');
              }}
            >
              ×
            </button>
            <h2>邀请家庭成员</h2>
            <form onSubmit={handleInvite}>
              <div className="form-group">
                <label>成员昵称</label>
                <input
                  type="text"
                  value={inviteName}
                  onChange={e => {
                    setInviteName(e.target.value);
                    setError('');
                  }}
                  placeholder="请输入成员昵称"
                  autoFocus
                />
              </div>
              {error && <div className="form-error">{error}</div>}
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setShowInviteModal(false);
                    setInviteName('');
                    setError('');
                  }}
                >
                  取消
                </button>
                <button type="submit" className="btn-primary">
                  确认邀请
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
