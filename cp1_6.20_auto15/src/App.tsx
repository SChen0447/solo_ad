import { useState, useCallback, useEffect, useRef } from 'react';
import type { Storyboard } from './services/api';
import { generateStoryboard } from './services/api';
import PanelLeft from './components/PanelLeft';
import PanelCenter from './components/PanelCenter';
import PanelRight from './components/PanelRight';

interface HistoryState {
  past: Storyboard[][];
  future: Storyboard[][];
}

function App() {
  const [storyboards, setStoryboards] = useState<Storyboard[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryState>({ past: [], future: [] });
  const historyRef = useRef<HistoryState>(history);
  historyRef.current = history;

  const selectedPanel = storyboards.find((s) => s.id === selectedId) || null;

  const pushHistory = useCallback((prevPanels: Storyboard[]) => {
    setHistory((h) => ({
      past: [...h.past, prevPanels].slice(-50),
      future: [],
    }));
  }, []);

  const updatePanels = useCallback(
    (updater: (prev: Storyboard[]) => Storyboard[]) => {
      setStoryboards((prev) => {
        const next = updater(prev);
        pushHistory(prev);
        return next;
      });
    },
    [pushHistory]
  );

  const undo = useCallback(() => {
    const h = historyRef.current;
    if (h.past.length === 0) return;
    const previous = h.past[h.past.length - 1];
    const newPast = h.past.slice(0, -1);
    setHistory({
      past: newPast,
      future: [storyboards, ...h.future].slice(0, 50),
    });
    setStoryboards(previous);
  }, [storyboards]);

  const redo = useCallback(() => {
    const h = historyRef.current;
    if (h.future.length === 0) return;
    const next = h.future[0];
    const newFuture = h.future.slice(1);
    setHistory({
      past: [...h.past, storyboards].slice(-50),
      future: newFuture,
    });
    setStoryboards(next);
  }, [storyboards]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (
        ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'Z')))
      ) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  const handleGenerate = async () => {
    if (!inputText.trim()) {
      setError('请输入故事描述文本');
      return;
    }
    setError(null);
    setIsGenerating(true);
    try {
      const response = await generateStoryboard(inputText.trim(), 5);
      if (response.success) {
        setHistory({ past: [], future: [] });
        setStoryboards(response.storyboards);
        setSelectedId(response.storyboards[0]?.id || null);
      }
    } catch (err) {
      setError('生成失败，请确保后端服务已启动（http://localhost:5000）');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  const handleReorder = useCallback(
    (fromIndex: number, toIndex: number) => {
      updatePanels((prev) => {
        const next = [...prev];
        const [removed] = next.splice(fromIndex, 1);
        next.splice(toIndex, 0, removed);
        return next.map((p, idx) => ({ ...p, pageNumber: idx + 1 }));
      });
    },
    [updatePanels]
  );

  const handleUpdatePanel = useCallback(
    (id: string, updates: Partial<Storyboard>) => {
      updatePanels((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
      );
    },
    [updatePanels]
  );

  const handleExportPDF = () => {
    alert('PDF 导出功能演示 - 实际项目中可使用 jsPDF 等库实现');
  };

  return (
    <div className="app-root">
      <header className="app-header">
        <div className="header-left">
          <h1 className="app-title">
            <span className="title-icon">🎨</span>
            AI 漫画分镜生成工具
          </h1>
          <p className="app-subtitle">输入故事，一键生成专业漫画分镜草稿</p>
        </div>
        <div className="header-right">
          <div className="undo-redo-btns">
            <button
              className="btn-icon"
              onClick={undo}
              disabled={history.past.length === 0}
              title="撤销 (Ctrl+Z)"
            >
              ↶ 撤销
            </button>
            <button
              className="btn-icon"
              onClick={redo}
              disabled={history.future.length === 0}
              title="重做 (Ctrl+Y)"
            >
              ↷ 重做
            </button>
          </div>
          <button className="btn-export" onClick={handleExportPDF}>
            📄 导出 PDF
          </button>
        </div>
      </header>

      <section className="generate-section">
        <div className="input-wrap">
          <label className="input-label">故事描述文本</label>
          <textarea
            className="story-input"
            placeholder="在这里输入你的故事片段... 例如：一个剑客在雨夜的酒馆中遇到了神秘女子，两人展开了一场关于命运的对话。"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            rows={3}
          />
        </div>
        <div className="generate-actions">
          <button
            className="btn-generate"
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? '⏳ 生成中...' : '✨ 生成分镜'}
          </button>
          {error && <span className="error-text">{error}</span>}
        </div>
      </section>

      <main className="main-content">
        <PanelLeft
          storyboards={storyboards}
          selectedId={selectedId}
          onSelect={handleSelect}
          onReorder={handleReorder}
        />
        <PanelCenter
          panel={selectedPanel}
          onUpdate={handleUpdatePanel}
        />
        <PanelRight
          panel={selectedPanel}
          totalPanels={storyboards.length}
        />
      </main>

      <footer className="app-footer">
        <div className="footer-bar">
          <span className="footer-text">
            共 <strong>{storyboards.length}</strong> 页分镜
            {selectedPanel && (
              <>
                 • 当前第 <strong>{selectedPanel.pageNumber}</strong> 页
              </>
            )}
          </span>
          <span className="footer-hint">
            💡 提示：拖拽左侧缩略图可调整顺序 · Ctrl+Z/Y 撤销重做
          </span>
        </div>
      </footer>
    </div>
  );
}

export default App;
