import { useState, useEffect } from 'react';

interface UserInfo {
  id: string;
  username: string;
  nickname: string;
  avatar: string;
  reminderEnabled: boolean;
}

export default function Settings() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [nickname, setNickname] = useState('');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      const parsed = JSON.parse(stored);
      setUser(parsed);
      setNickname(parsed.nickname || '');
      setReminderEnabled(parsed.reminderEnabled || false);
    }
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname, reminderEnabled }),
      });
      if (res.ok) {
        const updated = await res.json();
        setUser(updated);
        localStorage.setItem('user', JSON.stringify(updated));
        showToast('设置已保存');
      }
    } catch {} finally {
      setSaving(false);
    }
  };

  const handleReminderToggle = () => {
    const newValue = !reminderEnabled;
    setReminderEnabled(newValue);
    if (newValue) {
      showToast('已开启每日学习提醒');
    }
  };

  if (!user) return null;

  return (
    <div>
      <div className="page-header">
        <h1>个人设置</h1>
        <p>管理你的个人资料和偏好</p>
      </div>
      <div className="page-body">
        <div className="settings-page">
          <div className="settings-section">
            <h3>个人资料</h3>
            <div className="avatar-upload">
              <div className="avatar-preview">
                {user.avatar ? <img src={user.avatar} alt="" /> : nickname?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <button className="avatar-upload-btn" onClick={() => showToast('头像上传功能模拟中')}>更换头像</button>
            </div>
            <div className="form-group">
              <label>昵称</label>
              <input type="text" value={nickname} onChange={e => setNickname(e.target.value)} placeholder="输入昵称" />
            </div>
            <div className="form-group">
              <label>用户名</label>
              <input type="text" value={user.username} disabled style={{ background: '#f5f5f5' }} />
            </div>
          </div>
          <div className="settings-section">
            <h3>学习提醒</h3>
            <div className="toggle-row">
              <span>每日学习提醒</span>
              <button className={`toggle-switch ${reminderEnabled ? 'active' : ''}`} onClick={handleReminderToggle} />
            </div>
          </div>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? '保存中...' : '保存设置'}
          </button>
        </div>
      </div>
      {toast && <div className="notification-toast">{toast}</div>}
    </div>
  );
}
