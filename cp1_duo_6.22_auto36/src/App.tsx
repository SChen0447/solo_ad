import React, { useState } from 'react';
import BooksPage from './BooksPage';
import StatsPage from './StatsPage';
import api, { ImportResult } from './api';

type Page = 'books' | 'stats';

interface ImportResultModalProps {
  booksCount: number;
  sessionsCount: number;
  onClose: () => void;
}

const ImportResultModal: React.FC<ImportResultModalProps> = ({ booksCount, sessionsCount, onClose }) => {
  React.useEffect(() => {
    const timer = setTimeout(onClose, 1000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="import-result-modal">
      <div className="import-result-content">
        <div className="import-result-icon">✓</div>
        <p className="import-result-text">
          成功导入 <span style={{ color: '#e94560', fontWeight: 'bold' }}>{booksCount}</span> 本书籍
          和 <span style={{ color: '#e94560', fontWeight: 'bold' }}>{sessionsCount}</span> 条阅读记录
        </p>
      </div>
    </div>
  );
};

interface ProgressModalProps {
  progress: number;
  isVisible: boolean;
  message: string;
}

const ProgressModal: React.FC<ProgressModalProps> = ({ progress, isVisible, message }) => {
  if (!isVisible) return null;

  return (
    <div className="progress-modal-overlay">
      <div className="progress-modal-content">
        <p className="progress-modal-text">{message}</p>
        <div className="progress-bar-container">
          <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
        </div>
        <p className="progress-percentage">{Math.round(progress)}%</p>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('books');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const [progressMessage, setProgressMessage] = useState('');
  const [progress, setProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const simulateProgress = (message: string, duration: number = 800): Promise<void> => {
    return new Promise((resolve) => {
      setProgressMessage(message);
      setShowProgress(true);
      setProgress(0);
      const startTime = Date.now();
      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const newProgress = Math.min((elapsed / duration) * 100, 95);
        setProgress(newProgress);
        if (elapsed >= duration) {
          clearInterval(interval);
          setProgress(100);
          setTimeout(() => {
            setShowProgress(false);
            resolve();
          }, 150);
        }
      }, 30);
    });
  };

  const handleExport = async () => {
    await simulateProgress('正在导出数据...', 600);
    try {
      const data = await api.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reading-tracker-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('导出失败：' + (err as Error).message);
    }
  };

  const handleImport = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (ev) => {
        await simulateProgress('正在导入数据...', 800);
        try {
          const jsonStr = ev.target?.result as string;
          const data = JSON.parse(jsonStr);
          const result = await api.importData(data);
          setImportResult(result);
          setRefreshKey(prev => prev + 1);
        } catch (err) {
          alert('导入失败：文件格式不正确');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const NavItem: React.FC<{
    page: Page;
    icon: string;
    label: string;
  }> = ({ page, icon, label }) => (
    <div
      className={`nav-item ${currentPage === page ? 'nav-item-active' : ''}`}
      onClick={() => {
        setCurrentPage(page);
        setMobileMenuOpen(false);
      }}
    >
      <span className="nav-icon">{icon}</span>
      <span>{label}</span>
    </div>
  );

  return (
    <div className="app-container">
      {mobileMenuOpen && (
        <div
          className={`mobile-overlay ${mobileMenuOpen ? 'mobile-overlay-active' : ''}`}
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside className={`sidebar ${mobileMenuOpen ? 'sidebar-open' : ''}`}>
        <div className="logo">
          <span className="logo-icon">📚</span>
          <h1 className="logo-text">阅读记录器</h1>
        </div>

        <nav className="nav">
          <NavItem page="books" icon="📖" label="书籍管理" />
          <NavItem page="stats" icon="📊" label="统计仪表盘" />
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-btn" onClick={handleExport}>
            <span>⬇️</span> 导出数据
          </button>
          <button className="sidebar-btn" onClick={handleImport}>
            <span>⬆️</span> 导入数据
          </button>
        </div>
      </aside>

      <main className="main-content">
        <div className="mobile-header">
          <button
            className="hamburger-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <div className="hamburger-line" />
            <div className="hamburger-line" />
            <div className="hamburger-line" />
          </button>
          <h2 className="mobile-title">
            {currentPage === 'books' ? '书籍管理' : '统计仪表盘'}
          </h2>
        </div>

        <div className="page-content">
          <div key={`${currentPage}-${refreshKey}`} className="fade-in">
            {currentPage === 'books' ? (
              <BooksPage refreshKey={refreshKey} />
            ) : (
              <StatsPage refreshKey={refreshKey} />
            )}
          </div>
        </div>
      </main>

      <ProgressModal
        progress={progress}
        isVisible={showProgress}
        message={progressMessage}
      />

      {importResult && (
        <ImportResultModal
          booksCount={importResult.booksCount}
          sessionsCount={importResult.sessionsCount}
          onClose={() => setImportResult(null)}
        />
      )}
    </div>
  );
};

export default App;
