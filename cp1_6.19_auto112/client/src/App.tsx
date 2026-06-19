import { useState, useCallback, useEffect, createContext, useContext, ReactNode, useMemo } from 'react';
import { Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import PlantDetail from './pages/PlantDetail';
import { Toast, ToastType, Plant } from './types';
import { plantApi } from './api/plantApi';

interface AppContextType {
  plants: Plant[];
  loading: boolean;
  loadPlants: () => Promise<void>;
  showToast: (type: ToastType, message: string) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};

function ToastContainer({ toasts, removeToast }: { toasts: Toast[]; removeToast: (id: string) => void }) {
  return (
    <div style={{
      position: 'fixed',
      top: 20,
      right: 20,
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
    }}>
      {toasts.map(toast => (
        <div
          key={toast.id}
          style={{
            padding: '14px 20px',
            borderRadius: 'var(--radius)',
            color: '#fff',
            boxShadow: 'var(--shadow-hover)',
            animation: 'toastIn 0.3s ease-out',
            minWidth: 280,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 14,
            background: toast.type === 'success' ? 'var(--primary-green)'
              : toast.type === 'error' ? 'var(--accent-red)'
              : '#455A64',
          }}
        >
          <i className={`fas ${
            toast.type === 'success' ? 'fa-check-circle'
            : toast.type === 'error' ? 'fa-exclamation-circle'
            : 'fa-info-circle'
          }`} style={{ fontSize: 18 }} />
          <span>{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            style={{ marginLeft: 'auto', background: 'transparent', color: '#fff', fontSize: 16 }}
          >
            <i className="fas fa-times" />
          </button>
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((type: ToastType, message: string) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 2500);
  }, []);

  const loadPlants = useCallback(async () => {
    try {
      const data = await plantApi.getAllPlants();
      setPlants(data);
    } catch (err) {
      showToast('error', '加载植物数据失败');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadPlants();
  }, [loadPlants]);

  const contextValue = useMemo(() => ({
    plants,
    loading,
    loadPlants,
    showToast,
  }), [plants, loading, loadPlants, showToast]);

  return (
    <AppContext.Provider value={contextValue}>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '20px 24px' }}>
        <header style={{
          textAlign: 'center',
          marginBottom: 32,
          padding: '24px 0',
        }}>
          <h1 style={{
            fontSize: 32,
            fontWeight: 700,
            color: 'var(--primary-green-dark)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
          }}>
            <span style={{ fontSize: 36 }}>🌱</span>
            植物生长追踪器
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: 8, fontSize: 15 }}>
            记录每一次浇水，见证每一份成长
          </p>
        </header>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/plant/:id" element={<PlantDetail />} />
        </Routes>
      </div>
    </AppContext.Provider>
  );
}
