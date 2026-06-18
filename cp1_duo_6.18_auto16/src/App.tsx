import { useEffect, useState } from 'react';
import { useCodeReviewStore } from './store';
import { CodeEditor } from './CodeEditor';
import { SharePreview } from './SharePreview';

function SearchIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  );
}

function CodeIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ color: 'var(--accent-blue)' }}
    >
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}

function App() {
  const currentView = useCodeReviewStore((state) => state.currentView);
  const darkMode = useCodeReviewStore((state) => state.darkMode);
  const toggleDarkMode = useCodeReviewStore((state) => state.toggleDarkMode);
  const loadInput = useCodeReviewStore((state) => state.loadInput);
  const setLoadInput = useCodeReviewStore((state) => state.setLoadInput);
  const loadSnippetById = useCodeReviewStore((state) => state.loadSnippetById);
  const loadFromLocalStorage = useCodeReviewStore((state) => state.loadFromLocalStorage);
  const setView = useCodeReviewStore((state) => state.setView);

  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    loadFromLocalStorage();
  }, [loadFromLocalStorage]);

  useEffect(() => {
    document.body.setAttribute('data-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const handleLoad = () => {
    const id = loadInput.trim();
    if (!id) {
      setLoadError('请输入短链接');
      return;
    }
    const success = loadSnippetById(id);
    if (!success) {
      setLoadError('未找到对应的代码片段');
      setTimeout(() => setLoadError(''), 2000);
    } else {
      setLoadError('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleLoad();
    }
  };

  return (
    <>
      <nav className="navbar">
        <div className="navbar-left">
          <CodeIcon />
          <span className="navbar-title">代码审查批注</span>
        </div>
        <div className="navbar-right">
          <button className="icon-button" onClick={toggleDarkMode} title={darkMode ? '切换亮色' : '切换暗色'}>
            {darkMode ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </nav>

      <main className="main-content">
        <div className="load-bar">
          <div className="search-input-wrapper">
            <SearchIcon />
            <input
              type="text"
              className="search-input"
              placeholder="输入短链接加载代码片段..."
              value={loadInput}
              onChange={(e) => {
                setLoadInput(e.target.value);
                if (loadError) setLoadError('');
              }}
              onKeyDown={handleKeyDown}
            />
          </div>
          <button className="button button-primary" onClick={handleLoad}>
            加载
          </button>
        </div>

        {loadError && (
          <div style={{ color: '#e74c3c', fontSize: 13, marginBottom: 16 }}>
            {loadError}
          </div>
        )}

        {currentView !== 'editor' && currentView !== 'share' && (
          <div className="view-tabs">
            <button
              className={`view-tab ${currentView === 'editor' ? 'active' : ''}`}
              onClick={() => setView('editor')}
            >
              编辑器
            </button>
            <button
              className={`view-tab ${currentView === 'preview' ? 'active' : ''}`}
              onClick={() => setView('preview')}
            >
              预览
            </button>
          </div>
        )}

        {currentView === 'editor' && <CodeEditor />}
        {(currentView === 'preview' || currentView === 'share') && <SharePreview />}
      </main>
    </>
  );
}

export default App;
