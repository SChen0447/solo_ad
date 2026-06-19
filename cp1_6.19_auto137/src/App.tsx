import React, { useState, useReducer, useCallback, useEffect, useRef } from 'react';
import { Annotation, HistoryAction, HistoryState, TagType } from './types';
import AnnotationCanvas from './AnnotationCanvas';
import EditPanel from './EditPanel';
import {
  buildExportPayload,
  copyToClipboard,
  downloadJSON,
  uploadImageToServer,
  validateExportWithServer,
  generateComponentId
} from './export';

type ToastType = 'success' | 'error' | 'info';
interface Toast {
  id: number;
  type: ToastType;
  message: string;
  leaving?: boolean;
}

const historyReducer = (state: HistoryState, action: HistoryAction): HistoryState => {
  switch (action.type) {
    case 'ADD': {
      const newPresent = [...state.present, action.payload];
      return {
        past: [...state.past, state.present],
        present: newPresent,
        future: []
      };
    }
    case 'UPDATE': {
      const newPresent = state.present.map((a) =>
        a.id === action.payload.id ? action.payload : a
      );
      return {
        past: [...state.past, state.present],
        present: newPresent,
        future: []
      };
    }
    case 'DELETE': {
      const newPresent = state.present.filter((a) => a.id !== action.payload);
      return {
        past: [...state.past, state.present],
        present: newPresent,
        future: []
      };
    }
    case 'BATCH_SET': {
      return {
        past: [...state.past, state.present],
        present: action.payload,
        future: []
      };
    }
    case 'UNDO': {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      const newPast = state.past.slice(0, -1);
      return {
        past: newPast,
        present: previous,
        future: [state.present, ...state.future]
      };
    }
    case 'REDO': {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      const newFuture = state.future.slice(1);
      return {
        past: [...state.past, state.present],
        present: next,
        future: newFuture
      };
    }
    default:
      return state;
  }
};

const initialHistory: HistoryState = {
  past: [],
  present: [],
  future: []
};

const App: React.FC = () => {
  const [historyState, dispatch] = useReducer(historyReducer, initialHistory);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [animatingIds, setAnimatingIds] = useState<Set<string>>(new Set());

  const fileInputRef = useRef<HTMLInputElement>(null);
  const toastIdRef = useRef(0);
  const prevPresentRef = useRef<Annotation[]>([]);

  const annotations = historyState.present;
  const totalSteps = historyState.past.length + historyState.future.length + 1;
  const currentStep = historyState.past.length + 1;

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = ++toastIdRef.current;
    const newToast: Toast = { id, type, message };
    setToasts((prev) => [...prev, newToast]);
    setTimeout(() => {
      setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 350);
    }, 2000);
  }, []);

  useEffect(() => {
    const prev = prevPresentRef.current;
    const curr = historyState.present;
    if (prev.length !== curr.length) {
      const addedIds = curr.filter((a) => !prev.find((p) => p.id === a.id)).map((a) => a.id);
      if (addedIds.length > 0) {
        setAnimatingIds((s) => {
          const next = new Set(s);
          addedIds.forEach((id) => next.add(id));
          return next;
        });
        setTimeout(() => {
          setAnimatingIds((s) => {
            const next = new Set(s);
            addedIds.forEach((id) => next.delete(id));
            return next;
          });
        }, 200);
      }
    }
    prevPresentRef.current = curr;
  }, [historyState.present]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInputActive =
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (!isInputActive && historyState.past.length > 0) {
          dispatch({ type: 'UNDO' });
          showToast('已撤销上一步操作', 'info');
        }
        return;
      }

      if (
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z') ||
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y')
      ) {
        e.preventDefault();
        if (!isInputActive && historyState.future.length > 0) {
          dispatch({ type: 'REDO' });
          showToast('已重做操作', 'info');
        }
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (!isInputActive && selectedId) {
          e.preventDefault();
          dispatch({ type: 'DELETE', payload: selectedId });
          setSelectedId(null);
          showToast('已删除标注框', 'info');
        }
      }

      if (e.key === 'Escape') {
        setSelectedId(null);
        setExportMenuOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyState.past.length, historyState.future.length, selectedId, showToast]);

  useEffect(() => {
    const handleClick = () => setExportMenuOpen(false);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const handleAddAnnotation = useCallback(
    (x: number, y: number, width: number, height: number) => {
      const existingIndex = annotations.length;
      const newAnnotation: Annotation = {
        id: generateComponentId(existingIndex),
        x,
        y,
        width,
        height,
        componentName: '',
        parentName: '',
        tagType: 'div',
        createdAt: Date.now()
      };
      dispatch({ type: 'ADD', payload: newAnnotation });
      setSelectedId(newAnnotation.id);
      setMobilePanelOpen(true);
    },
    [annotations.length]
  );

  const handleUpdateAnnotation = useCallback((updated: Annotation) => {
    dispatch({ type: 'UPDATE', payload: updated });
  }, []);

  const handleDeleteAnnotation = useCallback(
    (id: string) => {
      dispatch({ type: 'DELETE', payload: id });
      if (selectedId === id) setSelectedId(null);
      showToast('已删除标注框', 'info');
    },
    [selectedId, showToast]
  );

  const handleSelectAnnotation = useCallback((id: string | null) => {
    setSelectedId(id);
    if (id) setMobilePanelOpen(true);
  }, []);

  const handleFileSelected = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) {
        showToast('请选择图片文件', 'error');
        return;
      }
      showToast('正在上传图片...', 'info');
      const result = await uploadImageToServer(file);
      if (result.success && result.url) {
        setImageUrl(result.url);
        setImageName(result.originalName || file.name);
        dispatch({ type: 'BATCH_SET', payload: [] });
        setSelectedId(null);
        showToast('图片上传成功，开始标注吧！', 'success');
      } else {
        showToast(result.error || '上传失败', 'error');
      }
    },
    [showToast]
  );

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelected(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFileSelected(file);
    },
    [handleFileSelected]
  );

  const handleExportCopy = useCallback(async () => {
    setExportMenuOpen(false);
    if (annotations.length === 0) {
      showToast('还没有任何标注，先添加几个吧', 'error');
      return;
    }
    const payload = buildExportPayload(annotations, imageUrl, imageName);
    const jsonStr = JSON.stringify(payload, null, 2);
    const ok = await copyToClipboard(jsonStr);
    showToast(ok ? '复制成功！JSON已到剪贴板' : '复制失败，请手动复制', ok ? 'success' : 'error');
  }, [annotations, imageUrl, imageName, showToast]);

  const handleExportDownload = useCallback(async () => {
    setExportMenuOpen(false);
    if (annotations.length === 0) {
      showToast('还没有任何标注，先添加几个吧', 'error');
      return;
    }
    const serverResult = await validateExportWithServer(annotations, imageUrl, imageName);
    const payload = serverResult.success && serverResult.data
      ? serverResult.data
      : buildExportPayload(annotations, imageUrl, imageName);
    downloadJSON(payload);
    showToast(serverResult.success ? 'JSON 文件下载成功' : '已使用本地数据导出', 'success');
  }, [annotations, imageUrl, imageName, showToast]);

  const selectedAnnotation = annotations.find((a) => a.id === selectedId) || null;

  return (
    <div className="app-container">
      <nav className="navbar">
        <div className="navbar-brand">
          <div className="navbar-logo">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <line x1="14" y1="17.5" x2="21" y2="17.5" />
            </svg>
          </div>
          <span className="navbar-title">DesignScribe</span>
          <span className="navbar-subtitle">设计稿转代码框架</span>
        </div>
        <div className="navbar-actions">
          <button
            className="btn btn-secondary"
            onClick={() => fileInputRef.current?.click()}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            上传截图
          </button>
          <div className="export-dropdown" onClick={(e) => e.stopPropagation()}>
            <button
              className="btn btn-primary"
              onClick={() => setExportMenuOpen((v) => !v)}
              disabled={annotations.length === 0}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              导出
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 2 }}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {exportMenuOpen && (
              <div className="export-menu">
                <button className="export-menu-item" onClick={handleExportCopy}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  复制 JSON
                </button>
                <button className="export-menu-item" onClick={handleExportDownload}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  下载文件
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <input
        ref={fileInputRef}
        type="file"
        className="upload-input"
        accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
        onChange={handleFileInputChange}
      />

      <div className="main-content">
        <div
          className="canvas-wrapper"
          onDragOver={(e) => {
            e.preventDefault();
            if (!imageUrl) setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <div className="status-bar">
            <div className="status-info">
              <span className="status-step">步骤 {currentStep}/{totalSteps}</span>
              <span>标注数: <strong style={{ color: 'var(--color-text-primary)' }}>{annotations.length}</strong></span>
              {imageName && <span>图片: <strong style={{ color: 'var(--color-text-primary)' }}>{imageName}</strong></span>}
            </div>
            <div className="status-hint">
              <span><span className="shortcut">Ctrl+Z</span> 撤销</span>
              <span><span className="shortcut">Ctrl+Shift+Z</span> 重做</span>
              <span><span className="shortcut">Del</span> 删除</span>
            </div>
          </div>

          <div className="canvas-area">
            {!imageUrl ? (
              <div className="canvas-empty">
                <div
                  className={`upload-dropzone ${dragOver ? 'dragover' : ''}`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="canvas-empty-icon">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                  </div>
                  <div className="canvas-empty-text" style={{ marginTop: 20, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                    点击或拖拽 PNG/JPG 截图到此处
                  </div>
                  <div style={{ fontSize: 12, marginTop: 6, color: 'var(--color-text-muted)' }}>
                    支持 PNG / JPG / JPEG / GIF / WebP，最大 20MB
                  </div>
                </div>
              </div>
            ) : (
              <AnnotationCanvas
                imageUrl={imageUrl}
                annotations={annotations}
                selectedId={selectedId}
                onAddAnnotation={handleAddAnnotation}
                onSelectAnnotation={handleSelectAnnotation}
                onUpdateAnnotation={handleUpdateAnnotation}
                animatingIds={animatingIds}
              />
            )}
          </div>
        </div>

        <div className={`panel-wrapper ${mobilePanelOpen ? 'panel-open' : ''}`}>
          {selectedAnnotation ? (
            <EditPanel
              annotation={selectedAnnotation}
              allAnnotations={annotations}
              onUpdate={handleUpdateAnnotation}
              onDelete={handleDeleteAnnotation}
              onClose={() => {
                setSelectedId(null);
                setMobilePanelOpen(false);
              }}
            />
          ) : (
            <div className="panel-empty">
              <div className="panel-empty-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <line x1="3" y1="9" x2="21" y2="9" />
                  <line x1="9" y1="21" x2="9" y2="9" />
                </svg>
              </div>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-secondary)' }}>
                选择或创建标注框
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', maxWidth: 220 }}>
                {imageUrl
                  ? '在图片上按住鼠标左键拖拽绘制矩形，点击已有框可编辑详情'
                  : '请先上传一张设计截图'}
              </div>
            </div>
          )}
        </div>

        {mobilePanelOpen && window.innerWidth <= 768 && (
          <div className="overlay" onClick={() => setMobilePanelOpen(false)} />
        )}

        {selectedAnnotation && window.innerWidth <= 768 && (
          <button className="mobile-panel-toggle" onClick={() => setMobilePanelOpen((v) => !v)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        )}
      </div>

      <div className="toast-container">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast toast-${toast.type} ${toast.leaving ? 'toast-out' : ''}`}
          >
            {toast.type === 'success' && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
            {toast.type === 'error' && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            )}
            {toast.type === 'info' && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            )}
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;
