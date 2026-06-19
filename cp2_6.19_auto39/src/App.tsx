import React, { useState, useEffect, useCallback } from 'react';
import SchemePanel from './components/SchemePanel';
import PreviewPanel from './components/PreviewPanel';
import { useSchemeManager } from './theme-engine/schemeManager';
import { themeToJSONString } from './theme-engine/colorUtils';
import './App.css';

const App: React.FC = () => {
  const {
    schemes,
    currentScheme,
    addScheme,
    deleteScheme,
    selectScheme,
    updateScheme,
    reorderSchemes
  } = useSchemeManager();

  const [isCompareMode, setIsCompareMode] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(true);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleToggleCompare = useCallback(() => {
    setIsCompareMode(prev => !prev);
  }, []);

  const handleSelectScheme = useCallback((id: string) => {
    selectScheme(id);
    if (isCompareMode) {
      setIsCompareMode(false);
    }
  }, [selectScheme, isCompareMode]);

  const handleExport = useCallback(() => {
    setIsExportModalOpen(true);
  }, []);

  const handleCloseExportModal = useCallback(() => {
    setIsExportModalOpen(false);
    setIsCopied(false);
  }, []);

  const handleCopyToClipboard = useCallback(async () => {
    if (!currentScheme) return;
    try {
      const json = themeToJSONString(currentScheme);
      await navigator.clipboard.writeText(json);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 1500);
    } catch (err) {
      console.error('复制失败:', err);
    }
  }, [currentScheme]);

  const togglePanel = useCallback(() => {
    setIsPanelCollapsed(prev => !prev);
  }, []);

  return (
    <div className="app-container">
      {isMobile && (
        <div className="mobile-header">
          <h1 className="app-title">配色方案对比工具</h1>
          <button className="mobile-toggle-btn" onClick={togglePanel}>
            {isPanelCollapsed ? '展开方案' : '收起方案'}
          </button>
        </div>
      )}

      <div className="app-content">
        <div className="scheme-panel-wrapper">
          <SchemePanel
            schemes={schemes}
            currentScheme={currentScheme}
            onAddScheme={addScheme}
            onDeleteScheme={deleteScheme}
            onSelectScheme={handleSelectScheme}
            onUpdateScheme={updateScheme}
            onReorderSchemes={reorderSchemes}
            onExport={handleExport}
            onToggleCompare={handleToggleCompare}
            isCompareMode={isCompareMode}
            isMobile={isMobile}
            isCollapsed={isMobile && isPanelCollapsed}
          />
        </div>

        <div className="divider" />

        <div className="preview-panel-wrapper">
          <PreviewPanel
            currentScheme={currentScheme}
            schemes={schemes}
            isCompareMode={isCompareMode}
            onSelectScheme={handleSelectScheme}
            isMobile={isMobile}
          />
        </div>
      </div>

      {isExportModalOpen && (
        <div className="modal-overlay" onClick={handleCloseExportModal}>
          <div
            className="export-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>导出主题变量</h3>
              <button
                className="modal-close-btn"
                onClick={handleCloseExportModal}
              >
                ×
              </button>
            </div>
            <div className="modal-content">
              <pre className="json-display">
                {currentScheme ? themeToJSONString(currentScheme) : ''}
              </pre>
            </div>
            <div className="modal-footer">
              <button
                className={`copy-btn ${isCopied ? 'copied' : ''}`}
                onClick={handleCopyToClipboard}
              >
                {isCopied ? (
                  <>
                    <span className="check-icon">✓</span>
                    已复制
                  </>
                ) : (
                  <>
                    <span className="copy-icon">📋</span>
                    复制到剪贴板
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
