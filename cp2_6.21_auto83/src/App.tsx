import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import InstrumentList from './components/InstrumentList';
import InstrumentDetail from './components/InstrumentDetail';
import PublishForm from './components/PublishForm';
import './App.css';

interface Notification {
  id: string;
  type: 'success' | 'info';
  message: string;
}

interface AppContextType {
  showNotification: (type: 'success' | 'info', message: string) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};

function App() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const navigate = useNavigate();

  const showNotification = (type: 'success' | 'info', message: string) => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 3000);
  };

  return (
    <AppContext.Provider value={{ showNotification }}>
      <div className="app">
        <header className="app-header">
          <div className="header-content">
            <h1 className="app-title" onClick={() => navigate('/')}>
              🎸 二手乐器市场
            </h1>
            <button className="publish-btn" onClick={() => navigate('/publish')}>
              + 发布乐器
            </button>
          </div>
        </header>

        <div className="notification-container">
          {notifications.map(notification => (
            <div
              key={notification.id}
              className={`notification notification-${notification.type}`}
            >
              {notification.message}
            </div>
          ))}
        </div>

        <main className="app-main">
          <Routes>
            <Route path="/" element={<InstrumentList />} />
            <Route path="/instrument/:id" element={<InstrumentDetail />} />
            <Route path="/publish" element={<PublishForm />} />
          </Routes>
        </main>

        <footer className="app-footer">
          <p>© 2024 二手乐器交易市场 - 让音乐传递价值</p>
        </footer>
      </div>
    </AppContext.Provider>
  );
}

export default App;
