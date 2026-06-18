import React, { useState, useRef, useEffect } from 'react';
import { useGradientStore, generateCSSGradient, type SavedGradient } from './state';
import { GradientEditor } from './GradientEditor';
import { ColorPicker } from './ColorPicker';
import { Preview } from './Preview';

const App: React.FC = () => {
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveName, setSaveName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const library = useGradientStore((s) => s.library);
  const searchQuery = useGradientStore((s) => s.searchQuery);
  const setSearchQuery = useGradientStore((s) => s.setSearchQuery);
  const saveToLibrary = useGradientStore((s) => s.saveToLibrary);
  const loadFromLibrary = useGradientStore((s) => s.loadFromLibrary);
  const deleteFromLibrary = useGradientStore((s) => s.deleteFromLibrary);
  const selectedStopId = useGradientStore((s) => s.config.selectedStopId);

  const filteredLibrary = library.filter((g) =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    if (showSaveDialog && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showSaveDialog]);

  const handleSave = () => {
    if (saveName.trim()) {
      saveToLibrary(saveName.trim());
      setSaveName('');
      setShowSaveDialog(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setShowSaveDialog(false);
    }
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2 className="sidebar-title">渐变库</h2>
          <span className="library-count">{library.length}/50</span>
        </div>

        <div className="search-box">
          <input
            type="text"
            placeholder="搜索渐变..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="gradient-list">
          {filteredLibrary.length === 0 ? (
            <div className="empty-library">
              {searchQuery ? '没有找到匹配的渐变' : '渐变库为空'}
            </div>
          ) : (
            filteredLibrary.map((item: SavedGradient) => (
              <div
                key={item.id}
                className="gradient-card"
                onClick={() => loadFromLibrary(item.id)}
              >
                <div
                  className="gradient-thumb"
                  style={{ background: generateCSSGradient(item.config) }}
                />
                <div className="gradient-info">
                  <span className="gradient-name">{item.name}</span>
                  <button
                    className="delete-grad-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteFromLibrary(item.id);
                    }}
                    title="删除"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </aside>

      <main className="main-content">
        <header className="app-header">
          <h1 className="app-title">CSS 渐变编辑器</h1>
          <button
            className="save-btn"
            onClick={() => {
              setSaveName('');
              setShowSaveDialog(true);
            }}
          >
            保存到库
          </button>
        </header>

        <div className="editor-layout">
          <div className="center-area">
            <Preview />
            <GradientEditor />
          </div>

          <div className="right-panel">
            <ColorPicker visible={selectedStopId !== null} />
          </div>
        </div>
      </main>

      {showSaveDialog && (
        <div className="modal-overlay" onClick={() => setShowSaveDialog(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">保存渐变</h3>
            <input
              ref={inputRef}
              type="text"
              placeholder="输入渐变名称"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={handleKeyDown}
              className="modal-input"
            />
            <div className="modal-actions">
              <button
                className="modal-btn cancel"
                onClick={() => setShowSaveDialog(false)}
              >
                取消
              </button>
              <button
                className="modal-btn confirm"
                onClick={handleSave}
                disabled={!saveName.trim()}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
