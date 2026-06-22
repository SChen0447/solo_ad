import React, { useState, useEffect, createContext, useContext } from 'react';
import CreateIdeaPage from './pages/CreateIdeaPage';
import VotingPage from './pages/VotingPage';
import PrioritizationBoard from './pages/PrioritizationBoard';
import { getUsers } from './api/ideas';

type Page = 'create' | 'vote' | 'board';

interface AppContextType {
  currentUser: string;
  setCurrentUser: (u: string) => void;
  toast: { message: string; type: 'success' | 'error' } | null;
  showToast: (message: string, type: 'success' | 'error') => void;
}

export const AppContext = createContext<AppContextType>({
  currentUser: '',
  setCurrentUser: () => {},
  toast: null,
  showToast: () => {},
});

export const useAppContext = () => useContext(AppContext);

const navItems: { key: Page; label: string }[] = [
  { key: 'create', label: '创意提交' },
  { key: 'vote', label: '投票' },
  { key: 'board', label: '排序看板' },
];

export default function App() {
  const [page, setPage] = useState<Page>('create');
  const [currentUser, setCurrentUser] = useState('');
  const [users, setUsers] = useState<string[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    getUsers()
      .then((data) => {
        setUsers(data);
        if (data.length > 0 && !currentUser) {
          setCurrentUser(data[0]);
        }
      })
      .catch(() => {});
  }, []);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <AppContext.Provider value={{ currentUser, setCurrentUser, toast, showToast }}>
      <style>{`
        @keyframes toastSlideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes toastFadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
      `}</style>

      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 64,
        background: '#FFFFFF',
        borderBottom: '1px solid #E5E7EB',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '0 24px',
      }}>
        <div style={{
          position: 'absolute',
          left: 24,
          fontSize: 24,
          fontWeight: 700,
          background: 'linear-gradient(135deg, #6366F1, #818CF8, #6366F1)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          💡 创意投票
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setPage(item.key)}
              style={{
                background: 'none',
                border: 'none',
                padding: '8px 16px',
                fontSize: 15,
                fontWeight: page === item.key ? 600 : 400,
                color: page === item.key ? '#6366F1' : '#6B7280',
                cursor: 'pointer',
                position: 'relative',
                transition: 'color 0.2s',
              }}
            >
              {item.label}
              {page === item.key && (
                <span style={{
                  position: 'absolute',
                  bottom: 0,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '70%',
                  height: 3,
                  background: '#6366F1',
                  borderRadius: 2,
                  animation: 'underlineIn 0.3s ease',
                }} />
              )}
            </button>
          ))}
        </div>

        <div style={{
          position: 'absolute',
          right: 24,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <span style={{ fontSize: 13, color: '#6B7280' }}>当前用户:</span>
          <select
            value={currentUser}
            onChange={(e) => setCurrentUser(e.target.value)}
            style={{
              padding: '4px 8px',
              borderRadius: 8,
              border: '1px solid #E5E7EB',
              fontSize: 14,
              color: '#374151',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            {users.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </div>
      </nav>

      <div style={{ marginTop: 64, minHeight: 'calc(100vh - 64px)', background: '#F9FAFB' }}>
        {page === 'create' && <CreateIdeaPage />}
        {page === 'vote' && <VotingPage />}
        {page === 'board' && <PrioritizationBoard />}
      </div>

      {toast && (
        <div style={{
          position: 'fixed',
          top: 80,
          right: 24,
          padding: '12px 24px',
          borderRadius: 12,
          background: toast.type === 'success' ? '#10B981' : '#EF4444',
          color: '#fff',
          fontSize: 14,
          fontWeight: 600,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          animation: 'toastSlideIn 0.3s ease',
          zIndex: 2000,
        }}>
          {toast.message}
        </div>
      )}
    </AppContext.Provider>
  );
}
