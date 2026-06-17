import React, { useState, useEffect, useRef, useCallback } from 'react';
import CodePreview, { CodePreviewHandle } from './modules/preview/CodePreview';
import AnnotationLayer from './modules/annotate/AnnotationLayer';
import AnnotationList from './modules/annotate/AnnotationList';
import DiffVisualizer from './modules/diff/DiffVisualizer';
import CodeEditor from './modules/editor/CodeEditor';
import { getAnnotations, deleteAnnotation } from './services/api';
import type { Annotation, ViewMode } from './types';
import './App.css';

const STORAGE_KEY = 'codereview-lens-state';

const defaultCode = `<div style="padding: 40px; font-family: Arial, sans-serif;">
  <h1 style="color: #1A237E;">Hello, CodeReview Lens!</h1>
  <p style="color: #666; font-size: 16px; line-height: 1.6;">
    这是一个代码作业在线批注与可视化差异对比工具。
  </p>
  <button style="padding: 10px 24px; background: #4CAF50; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px;">
    点击按钮
  </button>
</div>
`;

const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('preview');
  const [originalCode, setOriginalCode] = useState('');
  const [modifiedCode, setModifiedCode] = useState('');
  const [currentSubmissionId, setCurrentSubmissionId] = useState('');
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [highlightAnnotationId, setHighlightAnnotationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showCodeInput, setShowCodeInput] = useState(true);
  const [previewLoaded, setPreviewLoaded] = useState(false);
  const [fadeTransition, setFadeTransition] = useState(false);

  const previewContainerRef = useRef<HTMLDivElement>(null);
  const originalPreviewRef = useRef<CodePreviewHandle>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const state = JSON.parse(saved);
        if (state.originalCode) setOriginalCode(state.originalCode);
        if (state.modifiedCode) setModifiedCode(state.modifiedCode);
        if (state.viewMode) setViewMode(state.viewMode);
        if (state.annotations) setAnnotations(state.annotations);
        if (state.submissionId) setCurrentSubmissionId(state.submissionId);
      } catch (e) {
        console.error('Failed to load saved state:', e);
      }
    } else {
      setOriginalCode(defaultCode);
    }
  }, []);

  useEffect(() => {
    const state = {
      originalCode,
      modifiedCode,
      viewMode,
      annotations,
      submissionId: currentSubmissionId
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [originalCode, modifiedCode, viewMode, annotations, currentSubmissionId]);

  useEffect(() => {
    if (currentSubmissionId) {
      loadAnnotations();
    }
  }, [currentSubmissionId]);

  const loadAnnotations = async () => {
    if (!currentSubmissionId) return;
    try {
      const data = await getAnnotations(currentSubmissionId);
      setAnnotations(data);
    } catch (error) {
      console.error('Failed to load annotations:', error);
    }
  };

  const handleSubmitCode = useCallback(() => {
    if (!originalCode.trim()) return;
    setIsLoading(true);
    setFadeTransition(true);

    setTimeout(() => {
      const id = 'submission_' + Date.now();
      setCurrentSubmissionId(id);
      setPreviewLoaded(false);
      setAnnotations([]);
      setIsLoading(false);
      setFadeTransition(false);
    }, 300);
  }, [originalCode]);

  const handleAnnotationCreated = (annotation: Annotation) => {
    setAnnotations((prev) => [...prev, annotation]);
  };

  const handleAnnotationClick = (annotation: Annotation) => {
    setHighlightAnnotationId(annotation.id);

    if (previewContainerRef.current) {
      const container = previewContainerRef.current;
      const sel = annotation.selection;
      const containerRect = container.getBoundingClientRect();
      
      const scrollLeft = sel.left + sel.width / 2 - containerRect.width / 2;
      const scrollTop = sel.top + sel.height / 2 - containerRect.height / 2;
      
      container.scrollTo({
        left: Math.max(0, scrollLeft),
        top: Math.max(0, scrollTop),
        behavior: 'smooth'
      });
    }

    setTimeout(() => {
      setHighlightAnnotationId(null);
    }, 3000);
  };

  const handleDeleteAnnotation = (id: string) => {
    setAnnotations((prev) => prev.filter((a) => a.id !== id));
    deleteAnnotation(id).catch((err) => {
      console.error('Failed to delete annotation:', err);
      loadAnnotations();
    });
  };

  const handleModeChange = (mode: ViewMode) => {
    if (mode === viewMode) return;
    
    setFadeTransition(true);
    setTimeout(() => {
      setViewMode(mode);
      setFadeTransition(false);
    }, 250);
  };

  const modeTabs = [
    { key: 'preview' as ViewMode, label: '预览', icon: '👁️' },
    { key: 'annotate' as ViewMode, label: '批注', icon: '✏️' },
    { key: 'diff' as ViewMode, label: '差异对比', icon: '🔄' }
  ];

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-left">
          <span className="logo-icon">🔍</span>
          <h1 className="app-title">CodeReview Lens</h1>
        </div>
        <nav className="mode-tabs">
          {modeTabs.map((tab) => (
            <button
              key={tab.key}
              className={`mode-tab ${viewMode === tab.key ? 'active' : ''}`}
              onClick={() => handleModeChange(tab.key)}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
            </button>
          ))}
        </nav>
        <div className="header-right">
          <button
            className="toggle-editor-btn"
            onClick={() => setShowCodeInput(!showCodeInput)}
          >
            {showCodeInput ? '隐藏代码' : '显示代码'}
          </button>
        </div>
      </header>

      <div className="app-body">
        <div className={`main-content ${showCodeInput ? 'with-editor' : ''}`}>
          {showCodeInput && (
            <div className="code-input-section">
              <CodeEditor
                value={viewMode === 'diff' ? modifiedCode : originalCode}
                onChange={viewMode === 'diff' ? setModifiedCode : setOriginalCode}
                onSubmit={handleSubmitCode}
                isLoading={isLoading}
                label={viewMode === 'diff' ? '修改后代码' : '源代码'}
                placeholder="粘贴 HTML/CSS/JS 代码，或上传文件..."
              />
              
              {viewMode === 'diff' && (
                <CodeEditor
                  value={originalCode}
                  onChange={setOriginalCode}
                  onSubmit={() => {}}
                  label="原始代码"
                  placeholder="原始 HTML/CSS/JS 代码..."
                />
              )}
            </div>
          )}

          <div className="preview-section" ref={previewContainerRef}>
            <div className={`preview-wrapper ${fadeTransition ? 'fade-out' : 'fade-in'}`}>
              {viewMode === 'preview' && originalCode && (
                <CodePreview
                  ref={originalPreviewRef}
                  code={originalCode}
                  onLoad={() => setPreviewLoaded(true)}
                />
              )}

              {viewMode === 'annotate' && originalCode && (
                <div className="annotate-container">
                  <CodePreview
                    ref={originalPreviewRef}
                    code={originalCode}
                    onLoad={() => setPreviewLoaded(true)}
                  />
                  <AnnotationLayer
                    visible={true}
                    containerRef={previewContainerRef as React.RefObject<HTMLDivElement>}
                    annotations={annotations}
                    submissionId={currentSubmissionId}
                    onAnnotationCreated={handleAnnotationCreated}
                    onAnnotationClick={handleAnnotationClick}
                    highlightId={highlightAnnotationId}
                  />
                </div>
              )}

              {viewMode === 'diff' && originalCode && modifiedCode && (
                <DiffVisualizer
                  originalCode={originalCode}
                  modifiedCode={modifiedCode}
                />
              )}

              {!originalCode && (
                <div className="empty-preview">
                  <span className="empty-icon">📄</span>
                  <p>请在左侧输入代码开始预览</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {(viewMode === 'annotate' || viewMode === 'preview') && (
          <AnnotationList
            annotations={annotations}
            onAnnotationClick={handleAnnotationClick}
            onDelete={handleDeleteAnnotation}
          />
        )}
      </div>
    </div>
  );
};

export default App;
