import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import DesignList from './pages/DesignList';
import DesignDetail from './pages/DesignDetail';
import { useStore } from './store';
import './App.css';

function Sidebar() {
  const navigate = useNavigate();
  const { exportData, designs, importData, fetchDesigns } = useStore();

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        const count = await importData(data);
        alert(`成功导入 ${count} 个设计稿`);
      } catch {
        alert('导入失败：无效的JSON文件');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <aside className="sidebar">
      <div className="logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
        <span className="logo-icon">DF</span>
        <span className="logo-text">DesignFlow</span>
      </div>
      <nav className="nav-menu">
        <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <span>📋</span> 设计稿列表
        </NavLink>
      </nav>
      <div className="sidebar-footer">
        <button className="action-btn" onClick={() => { exportData(); }} disabled={designs.length === 0}>
          📤 导出数据
        </button>
        <label className="action-btn import-btn">
          📥 导入数据
          <input type="file" accept=".json" hidden onChange={handleImport} />
        </label>
        <button className="action-btn" onClick={fetchDesigns}>
          🔄 刷新列表
        </button>
      </div>
    </aside>
  );
}

export default function App() {
  const { initSocket } = useStore();

  useEffect(() => {
    initSocket();
  }, [initSocket]);

  return (
    <BrowserRouter>
      <div className="app">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<DesignList />} />
            <Route path="/design/:id" element={<DesignDetail />} />
          </Routes>
        </main>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 2000,
            style: {
              borderRadius: '8px',
              background: '#2D3748',
              color: '#fff',
              padding: '12px 16px',
              fontSize: '14px'
            }
          }}
        />
      </div>
    </BrowserRouter>
  );
}
