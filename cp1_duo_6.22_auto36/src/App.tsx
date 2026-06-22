import React, { useState, useEffect } from 'react';
import BooksPage from './BooksPage';
import StatsPage from './StatsPage';
import { readingTracker } from './ReadingTracker';

type Page = 'books' | 'stats';

interface ImportResultModalProps {
  booksCount: number;
  sessionsCount: number;
  onClose: () => void;
}

const ImportResultModal: React.FC<ImportResultModalProps> = ({ booksCount, sessionsCount, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 1000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div style={styles.importResultModal}>
      <div style={styles.importResultContent}>
        <div style={styles.importResultIcon}>✓</div>
        <p style={styles.importResultText}>
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
    <div style={styles.progressModalOverlay}>
      <div style={styles.progressModalContent}>
        <p style={styles.progressModalText}>{message}</p>
        <div style={styles.progressBarContainer}>
          <div style={{ ...styles.progressBar, width: `${progress}%` }} />
        </div>
        <p style={styles.progressPercentage}>{Math.round(progress)}%</p>
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
  const [importResult, setImportResult] = useState<{ booksCount: number; sessionsCount: number } | null>(null);
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
    const data = readingTracker.exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reading-tracker-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
          const result = readingTracker.importData(jsonStr);
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
      onClick={() => {
        setCurrentPage(page);
        setMobileMenuOpen(false);
      }}
      style={{
        ...styles.navItem,
        ...(currentPage === page ? styles.navItemActive : {}),
      }}
    >
      <span style={styles.navIcon}>{icon}</span>
      <span>{label}</span>
    </div>
  );

  return (
    <div style={styles.container}>
      {mobileMenuOpen && (
        <div
          style={styles.mobileOverlay}
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside
        style={{
          ...styles.sidebar,
          ...(mobileMenuOpen ? styles.sidebarOpen : {}),
        }}
      >
        <div style={styles.logo}>
          <span style={styles.logoIcon}>📚</span>
          <h1 style={styles.logoText}>阅读记录器</h1>
        </div>

        <nav style={styles.nav}>
          <NavItem page="books" icon="📖" label="书籍管理" />
          <NavItem page="stats" icon="📊" label="统计仪表盘" />
        </nav>

        <div style={styles.sidebarFooter}>
          <button style={styles.sidebarBtn} onClick={handleExport}>
            <span>⬇️</span> 导出数据
          </button>
          <button style={styles.sidebarBtn} onClick={handleImport}>
            <span>⬆️</span> 导入数据
          </button>
        </div>
      </aside>

      <main style={styles.mainContent}>
        <div style={styles.mobileHeader}>
          <button
            style={styles.hamburgerBtn}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <div style={styles.hamburgerLine} />
            <div style={styles.hamburgerLine} />
            <div style={styles.hamburgerLine} />
          </button>
          <h2 style={styles.mobileTitle}>
            {currentPage === 'books' ? '书籍管理' : '统计仪表盘'}
          </h2>
        </div>

        <div style={styles.pageContent} className="fade-in" key={`${currentPage}-${refreshKey}`}>
          {currentPage === 'books' ? (
            <BooksPage refreshKey={refreshKey} />
          ) : (
            <StatsPage refreshKey={refreshKey} />
          )}
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

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: '#0f0f23',
    color: '#e0e0e0',
  },
  sidebar: {
    width: '220px',
    minWidth: '220px',
    backgroundColor: '#1a1a2e',
    display: 'flex',
    flexDirection: 'column',
    borderRight: '1px solid #2a2a4e',
    position: 'fixed',
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 100,
    '@media (max-width: 768px)': {
      transform: 'translateX(-100%)',
    },
  },
  sidebarOpen: {
    transform: 'translateX(0) !important',
    transition: 'transform 0.3s ease',
  },
  logo: {
    padding: '24px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    borderBottom: '1px solid #2a2a4e',
  },
  logoIcon: {
    fontSize: '28px',
  },
  logoText: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#e0e0e0',
  },
  nav: {
    flex: 1,
    padding: '16px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease, color 0.2s ease',
    color: '#a0a0c0',
    fontSize: '15px',
    fontWeight: 500,
  },
  navItemActive: {
    backgroundColor: '#e94560',
    color: '#ffffff',
  },
  navIcon: {
    fontSize: '18px',
  },
  sidebarFooter: {
    padding: '16px 12px',
    borderTop: '1px solid #2a2a4e',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  sidebarBtn: {
    width: '100%',
    padding: '10px 14px',
    backgroundColor: 'transparent',
    border: '1px solid #2a2a4e',
    borderRadius: '8px',
    color: '#a0a0c0',
    fontSize: '13px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    transition: 'all 0.15s ease',
  },
  mainContent: {
    flex: 1,
    marginLeft: '220px',
    minHeight: '100vh',
    padding: '0',
    '@media (max-width: 768px)': {
      marginLeft: 0,
    },
  },
  mobileHeader: {
    display: 'none',
    '@media (max-width: 768px)': {
      display: 'flex',
      alignItems: 'center',
      padding: '16px 20px',
      backgroundColor: '#1a1a2e',
      borderBottom: '1px solid #2a2a4e',
      position: 'sticky',
      top: 0,
      zIndex: 50,
    },
  },
  hamburgerBtn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
    backgroundColor: 'transparent',
    border: 'none',
    padding: '4px',
    marginRight: '16px',
  },
  hamburgerLine: {
    width: '24px',
    height: '2px',
    backgroundColor: '#e0e0e0',
    borderRadius: '1px',
  },
  mobileTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#e0e0e0',
  },
  mobileOverlay: {
    display: 'none',
    '@media (max-width: 768px)': {
      display: 'block',
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      zIndex: 99,
    },
  },
  pageContent: {
    padding: '32px',
    '@media (max-width: 768px)': {
      padding: '20px',
    },
  },
  progressModalOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  progressModalContent: {
    backgroundColor: '#1a1a2e',
    border: '1px solid #2a2a4e',
    borderRadius: '12px',
    padding: '32px 40px',
    width: '320px',
    textAlign: 'center',
  },
  progressModalText: {
    color: '#e0e0e0',
    fontSize: '16px',
    marginBottom: '20px',
    fontWeight: 500,
  },
  progressBarContainer: {
    width: '100%',
    height: '8px',
    backgroundColor: '#2a2a4e',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#e94560',
    borderRadius: '4px',
    transition: 'width 0.1s linear',
  },
  progressPercentage: {
    color: '#a0a0c0',
    fontSize: '14px',
    marginTop: '12px',
  },
  importResultModal: {
    position: 'fixed',
    top: '24px',
    right: '24px',
    zIndex: 1001,
    animation: 'fadeIn 0.3s ease',
  },
  importResultContent: {
    backgroundColor: '#1a1a2e',
    border: '1px solid #4a4a6e',
    borderRadius: '12px',
    padding: '20px 28px',
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
  },
  importResultIcon: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: 'rgba(46, 204, 113, 0.15)',
    color: '#2ecc71',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    fontWeight: 'bold',
  },
  importResultText: {
    color: '#e0e0e0',
    fontSize: '14px',
  },
};

export default App;
