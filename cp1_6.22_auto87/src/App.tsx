import { useEffect, useMemo, useRef, useState } from 'react';
import SnippetList from './components/SnippetList';
import TagBar from './components/TagBar';
import CreateSnippetModal from './components/CreateSnippetModal';
import type { Snippet } from './data/snippets';
import {
  addSnippet,
  filterByTags,
  getAllTags,
  getSnippets,
  searchByKeyword,
} from './data/snippets';

export default function App() {
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setSnippets(getSnippets());
  }, []);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      setSearchKeyword(searchInput);
    }, 300);
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchInput]);

  const allTags = useMemo(() => getAllTags(snippets), [snippets]);

  const filteredSnippets = useMemo(() => {
    let result = snippets;
    result = filterByTags(result, selectedTags);
    result = searchByKeyword(result, searchKeyword);
    return result;
  }, [snippets, selectedTags, searchKeyword]);

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleClearTags = () => {
    setSelectedTags([]);
  };

  const handleCreateSnippet = (snippet: Snippet) => {
    const updated = addSnippet(snippet);
    setSnippets(updated);
    showToast('片段创建成功');
  };

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2000);
  };

  const handleShare = async () => {
    try {
      const url = window.location.href;
      await navigator.clipboard.writeText(url);
      showToast('链接已复制到剪贴板');
    } catch {
      showToast('复制失败，请手动复制链接');
    }
  };

  return (
    <div className="app">
      <header className="navbar">
        <div className="navbar-inner">
          <div className="brand">
            <div className="brand-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
              </svg>
            </div>
            <div>
              <h1 className="brand-title">CodeSnippets</h1>
              <p className="brand-subtitle">个人代码片段收藏集</p>
            </div>
          </div>
          <button className="create-btn" onClick={() => setIsModalOpen(true)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>新建片段</span>
          </button>
        </div>
      </header>

      <main className="main-content">
        <div className="toolbar">
          <div className="toolbar-left">
            <TagBar
              tags={allTags}
              selectedTags={selectedTags}
              onTagToggle={handleTagToggle}
              onClearAll={handleClearTags}
            />
          </div>
          <div className="toolbar-right">
            <div className="search-wrapper">
              <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                className="search-input"
                placeholder="搜索标题、描述或标签..."
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
              />
              {searchInput && (
                <button
                  className="search-clear"
                  onClick={() => setSearchInput('')}
                  title="清除搜索"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="results-bar">
          <span className="results-count">
            共 <strong>{filteredSnippets.length}</strong> 个片段
            {(selectedTags.length > 0 || searchKeyword) && (
              <span className="results-filtered"> (已筛选)</span>
            )}
          </span>
          <span className="results-total">
            总计 {snippets.length} 条
          </span>
        </div>

        <SnippetList
          snippets={filteredSnippets}
          searchKeyword={searchKeyword}
          onShare={handleShare}
        />
      </main>

      <div className="footer-space" />

      <CreateSnippetModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={handleCreateSnippet}
      />

      {toast && (
        <div className="toast" key={toast}>
          {toast}
        </div>
      )}

      <style>{`
        .app {
          min-height: 100vh;
          background: #ffffff;
        }

        .navbar {
          position: sticky;
          top: 0;
          z-index: 100;
          height: 56px;
          background: #ffffff;
          border-bottom: 1px solid #e2e8f0;
          backdrop-filter: saturate(180%) blur(8px);
        }

        .navbar-inner {
          max-width: 1200px;
          margin: 0 auto;
          height: 100%;
          padding: 0 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .brand-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }

        .brand-title {
          font-size: 17px;
          font-weight: 700;
          color: #1a202c;
          line-height: 1.2;
        }

        .brand-subtitle {
          font-size: 12px;
          color: #718096;
          line-height: 1.2;
          margin-top: 2px;
        }

        .create-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 9px 18px;
          border-radius: 10px;
          background: #1a202c;
          color: #ffffff;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s ease;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .create-btn:hover {
          background: #2d3748;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .create-btn:active {
          transform: scale(0.97);
        }

        .main-content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 24px 24px 0 24px;
        }

        .toolbar {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 24px;
          margin-bottom: 16px;
        }

        .toolbar-left {
          flex: 1;
          min-width: 0;
        }

        .toolbar-right {
          flex-shrink: 0;
        }

        .search-wrapper {
          position: relative;
          width: 240px;
        }

        .search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #a0aec0;
          pointer-events: none;
        }

        .search-input {
          width: 100%;
          height: 40px;
          padding: 0 36px 0 38px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 14px;
          color: #1a202c;
          background: #ffffff;
          transition: all 0.2s ease;
        }

        .search-input::placeholder {
          color: #a0aec0;
        }

        .search-input:focus {
          outline: none;
          border-color: #3182ce;
          box-shadow: rgba(49, 130, 206, 0.15) 0px 0px 0px 3px;
        }

        .search-clear {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          width: 24px;
          height: 24px;
          border-radius: 6px;
          background: transparent;
          color: #a0aec0;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;
        }

        .search-clear:hover {
          background: rgba(0, 0, 0, 0.05);
          color: #4a5568;
        }

        .results-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 4px 20px 4px;
          border-bottom: 1px solid #f1f5f9;
          margin-bottom: 24px;
        }

        .results-count {
          font-size: 14px;
          color: #4a5568;
        }

        .results-count strong {
          color: #1a202c;
          font-weight: 600;
        }

        .results-filtered {
          color: #3182ce;
          font-size: 13px;
        }

        .results-total {
          font-size: 12px;
          color: #a0aec0;
        }

        .footer-space {
          height: 40px;
        }

        .toast {
          position: fixed;
          top: 80px;
          left: 50%;
          transform: translateX(-50%);
          width: 200px;
          padding: 12px 20px;
          border-radius: 8px;
          background: #2d3748;
          color: #ffffff;
          font-size: 14px;
          font-weight: 500;
          text-align: center;
          z-index: 2000;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
          animation: toastIn 0.3s ease-out, toastOut 0.3s ease-in 1.7s forwards;
        }

        @keyframes toastIn {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }

        @keyframes toastOut {
          from {
            opacity: 1;
          }
          to {
            opacity: 0;
          }
        }

        @media (max-width: 768px) {
          .toolbar {
            flex-direction: column;
            align-items: stretch;
          }
          .search-wrapper {
            width: 100%;
          }
          .brand-subtitle {
            display: none;
          }
          .create-btn span {
            display: none;
          }
          .create-btn {
            padding: 9px 12px;
          }
        }
      `}</style>
    </div>
  );
}
