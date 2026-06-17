import { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import DeviceDetail from './pages/DeviceDetail';
import { useSocket } from './hooks/useSocket';
import { useStore } from './store/useStore';
import Notification from './components/Notification';
import type { DeviceWithQueue } from './types';

function App() {
  const [nickname, setNickname] = useState('');
  const [showNameInput, setShowNameInput] = useState(true);
  const [tempNickname, setTempNickname] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const { connect } = useSocket();
  const { setDevices, setQueue } = useStore();

  useEffect(() => {
    const savedNickname = localStorage.getItem('queue-nickname');
    const savedIsAdmin = localStorage.getItem('queue-isadmin') === 'true';
    if (savedNickname) {
      setNickname(savedNickname);
      setIsAdmin(savedIsAdmin);
      setShowNameInput(false);
      initApp(savedNickname, savedIsAdmin);
    }
  }, []);

  const initApp = async (name: string, admin: boolean) => {
    try {
      const res = await fetch('/api/devices');
      const data: DeviceWithQueue[] = await res.json();
      setDevices(data);
      data.forEach((d) => {
        setQueue(d.id, d.queue);
      });
      connect(name, admin);
    } catch (error) {
      console.error('Failed to fetch devices:', error);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempNickname.trim()) return;
    const name = tempNickname.trim();
    const admin = name.toLowerCase() === 'admin';
    localStorage.setItem('queue-nickname', name);
    localStorage.setItem('queue-isadmin', String(admin));
    setNickname(name);
    setIsAdmin(admin);
    setShowNameInput(false);
    initApp(name, admin);
  };

  if (showNameInput) {
    return (
      <div className="name-input-container">
        <div className="name-input-card">
          <h1>智能排队系统</h1>
          <p>请输入您的昵称开始使用</p>
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="输入昵称（admin 为管理员）"
              value={tempNickname}
              onChange={(e) => setTempNickname(e.target.value)}
              autoFocus
              maxLength={20}
            />
            <button type="submit">进入系统</button>
          </form>
          <p className="hint">提示：输入 &quot;admin&quot; 可体验管理员模式</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<Dashboard nickname={nickname} isAdmin={isAdmin} />} />
        <Route path="/device/:id" element={<DeviceDetail nickname={nickname} isAdmin={isAdmin} />} />
      </Routes>
      <Notification />
    </div>
  );
}

export default App;
