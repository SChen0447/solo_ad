import React, { useState, useRef, useEffect } from 'react';
import { useColorStore } from './stores/colorStore';
import { ColorPickerPanel } from './components/ColorPickerPanel';
import { ColorScalePreview } from './components/ColorScalePreview';
import { UIPreview } from './components/UIPreview';
import './App.css';

const App: React.FC = () => {
  const projectName = useColorStore((s) => s.projectName);
  const projectCount = useColorStore((s) => s.projectCount);
  const coreColors = useColorStore((s) => s.coreColors);
  const setProjectName = useColorStore((s) => s.setProjectName);

  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState(projectName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingName && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingName]);

  const handleNameSubmit = () => {
    const trimmed = tempName.trim() || '未命名项目';
    setProjectName(trimmed);
    setTempName(trimmed);
    setEditingName(false);
  };

  return (
    <div className="app-root">
      <header className="app-header">
        <div className="app-header-content">
          <div className="app-title">
            <div className="logo-icon" />
            <h1>品牌色彩系统设计器</h1>
          </div>
          <div className="project-indicator">
            <span className="indicator-dot" />
            <span>项目 {projectCount}</span>
          </div>
        </div>
      </header>

      <main className="app-main">
        <aside className="side-panel">
          <div className="panel-section">
            <div className="section-label">项目信息</div>
            <div className="project-name-wrapper">
              {editingName ? (
                <input
                  ref={inputRef}
                  type="text"
                  value={tempName}
                  maxLength={20}
                  onChange={(e) => setTempName(e.target.value)}
                  onBlur={handleNameSubmit}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleNameSubmit();
                    if (e.key === 'Escape') {
                      setTempName(projectName);
                      setEditingName(false);
                    }
                  }}
                  className="project-name-input"
                />
              ) : (
                <div
                  className="project-name-display"
                  onClick={() => setEditingName(true)}
                  title="点击编辑项目名称"
                >
                  <span className="project-name-text">{projectName}</span>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="edit-icon"
                  >
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                </div>
              )}
              <div className="project-count-info">
                核心色：{coreColors.length} / 4
              </div>
            </div>
          </div>

          <div className="panel-section">
            <div className="section-label">添加颜色</div>
            <ColorPickerPanel />
          </div>

          <div className="panel-section colors-section">
            <div className="section-label">核心色与色阶</div>
            <div className="section-hint">点击核心色块可展开/收起色阶</div>
            <ColorScalePreview />
          </div>
        </aside>

        <section className="preview-area">
          <UIPreview />
        </section>
      </main>
    </div>
  );
};

export default App;
