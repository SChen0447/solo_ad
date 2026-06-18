import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Download, X, Check, FileText, Edit3, Eye } from 'lucide-react';
import { DraftList } from './components/DraftList';
import { EditorPanel } from './components/EditorPanel';
import { PreviewPanel } from './components/PreviewPanel';
import { useEditorStore, startAutoSave, stopAutoSave } from './stores/editorStore';
import { exportToHtml, exportToPlainText, downloadFile, copyToClipboard } from './utils/export';

const App: React.FC = () => {
  const [html, setHtml] = useState('');
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportStatus, setExportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isDragging, setIsDragging] = useState(false);
  const { splitRatio, setSplitRatio, isMobile, activeTab, setActiveTab, setIsMobile, getCurrentDraft, loadFromStorage, saveToStorage } = useEditorStore();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadFromStorage();
    startAutoSave();
    
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    
    const handleBeforeUnload = () => {
      saveToStorage();
      stopAutoSave();
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      stopAutoSave();
    };
  }, [loadFromStorage, saveToStorage, setIsMobile]);

  const handleHtmlChange = useCallback((newHtml: string) => {
    setHtml(newHtml);
  }, []);

  const handleMouseDown = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      const ratio = (e.clientX - rect.left) / rect.width;
      setSplitRatio(ratio);
    },
    [isDragging, setSplitRatio]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const showStatus = (status: 'success' | 'error') => {
    setExportStatus(status);
    setTimeout(() => {
      setExportStatus('idle');
    }, 1200);
  };

  const handleExportHtml = async () => {
    try {
      const currentDraft = getCurrentDraft();
      if (!currentDraft) {
        showStatus('error');
        return;
      }
      
      const htmlContent = exportToHtml(currentDraft.content, currentDraft.title);
      const filename = `${currentDraft.title.replace(/[^\w\u4e00-\u9fa5]/g, '_')}.html`;
      downloadFile(htmlContent, filename, 'text/html');
      
      setShowExportModal(false);
      showStatus('success');
    } catch {
      showStatus('error');
    }
  };

  const handleCopyText = async () => {
    try {
      const currentDraft = getCurrentDraft();
      if (!currentDraft) {
        showStatus('error');
        return;
      }
      
      const plainText = exportToPlainText(currentDraft.content);
      const success = await copyToClipboard(plainText);
      
      setShowExportModal(false);
      showStatus(success ? 'success' : 'error');
    } catch {
      showStatus('error');
    }
  };

  const currentDraft = getCurrentDraft();

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-white">
      <DraftList />

      <div className="flex-1 flex flex-col min-w-0">
        <div className="h-14 px-6 flex items-center justify-between border-b border-[#e0e0e0] bg-white flex-shrink-0">
          <h1
            className="text-[1.6rem] text-[#2c3e50] font-bold tracking-wide"
            style={{ fontFamily: "'Source Han Serif SC', 'Noto Serif SC', Georgia, serif" }}
          >
            行文笺
          </h1>
          
          <div className="relative">
            <button
              onClick={() => setShowExportModal(true)}
              className="w-10 h-10 rounded-full bg-[#4a90d9] text-white flex items-center justify-center transition-all duration-200 ease-out hover:bg-[#357abd] hover:scale-110 active:scale-95"
              aria-label="导出"
            >
              <Download size={18} />
            </button>
            
            {exportStatus !== 'idle' && (
              <div
                className={`absolute -bottom-8 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full flex items-center justify-center ${
                  exportStatus === 'success' ? 'bg-green-500' : 'bg-[#e74c3c]'
                }`}
                style={{
                  animation: 'fadeInOut 1.2s ease-out forwards',
                }}
              >
                {exportStatus === 'success' ? (
                  <Check size={14} className="text-white" />
                ) : (
                  <X size={14} className="text-white" />
                )}
              </div>
            )}
          </div>
        </div>

        <div
          ref={containerRef}
          className="flex-1 flex overflow-hidden"
        >
          {!isMobile ? (
            <>
              <div
                className="h-full overflow-hidden"
                style={{ width: `${splitRatio * 100}%` }}
              >
                {currentDraft && <EditorPanel onHtmlChange={handleHtmlChange} />}
              </div>
              
              <div
                className={`w-1 h-full cursor-col-resize transition-colors duration-200 flex-shrink-0 ${
                  isDragging ? 'bg-[#4a90d9]' : 'bg-[#e0e0e0] hover:bg-[#4a90d9]'
                }`}
                onMouseDown={handleMouseDown}
              />
              
              <div
                className="h-full overflow-hidden"
                style={{ width: `${(1 - splitRatio) * 100}%` }}
              >
                <PreviewPanel html={html} />
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-hidden">
                {activeTab === 'editor' && currentDraft && (
                  <EditorPanel onHtmlChange={handleHtmlChange} />
                )}
                {activeTab === 'preview' && <PreviewPanel html={html} />}
              </div>
              
              <div className="h-14 border-t border-[#e0e0e0] flex bg-white flex-shrink-0">
                <button
                  onClick={() => setActiveTab('editor')}
                  className={`flex-1 flex items-center justify-center gap-2 transition-colors duration-200 ${
                    activeTab === 'editor'
                      ? 'text-[#4a90d9] bg-[#4a90d9]/5'
                      : 'text-[#999] hover:text-[#2c3e50]'
                  }`}
                >
                  <Edit3 size={18} />
                  <span>编辑</span>
                </button>
                <div className="w-px bg-[#e0e0e0]" />
                <button
                  onClick={() => setActiveTab('preview')}
                  className={`flex-1 flex items-center justify-center gap-2 transition-colors duration-200 ${
                    activeTab === 'preview'
                      ? 'text-[#4a90d9] bg-[#4a90d9]/5'
                      : 'text-[#999] hover:text-[#2c3e50]'
                  }`}
                >
                  <Eye size={18} />
                  <span>预览</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showExportModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: 'rgba(0, 0, 0, 0.4)' }}
          onClick={() => setShowExportModal(false)}
        >
          <div
            className="bg-white rounded-xl p-6 w-[500px] max-w-[90vw] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            style={{
              animation: 'modalIn 200ms ease-out',
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[#2c3e50]">导出选项</h2>
              <button
                onClick={() => setShowExportModal(false)}
                className="p-1 rounded-lg hover:bg-[#f8f9fa] text-[#999] hover:text-[#2c3e50] transition-colors duration-200"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleExportHtml}
                className="w-full p-4 border-2 border-[#e0e0e0] rounded-lg flex items-center gap-4 transition-all duration-200 ease-out hover:border-[#4a90d9] hover:bg-[#4a90d9]/5 group"
              >
                <div className="w-12 h-12 rounded-lg bg-[#4a90d9]/10 text-[#4a90d9] flex items-center justify-center group-hover:bg-[#4a90d9] group-hover:text-white transition-all duration-200">
                  <FileText size={24} />
                </div>
                <div className="text-left">
                  <div className="font-medium text-[#2c3e50]">导出为 HTML</div>
                  <div className="text-sm text-[#999]">
                    包含内联 CSS 样式和字体，可直接在浏览器打开
                  </div>
                </div>
              </button>

              <button
                onClick={handleCopyText}
                className="w-full p-4 border-2 border-[#e0e0e0] rounded-lg flex items-center gap-4 transition-all duration-200 ease-out hover:border-[#4a90d9] hover:bg-[#4a90d9]/5 group"
              >
                <div className="w-12 h-12 rounded-lg bg-[#2c3e50]/10 text-[#2c3e50] flex items-center justify-center group-hover:bg-[#2c3e50] group-hover:text-white transition-all duration-200">
                  <FileText size={24} />
                </div>
                <div className="text-left">
                  <div className="font-medium text-[#2c3e50]">复制纯文本</div>
                  <div className="text-sm text-[#999]">
                    移除所有 Markdown 格式，仅保留正文内容
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeInOut {
          0% {
            opacity: 0;
            transform: translate(-50%, -10px);
          }
          20% {
            opacity: 1;
            transform: translate(-50%, 0);
          }
          80% {
            opacity: 1;
            transform: translate(-50%, 0);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -10px);
          }
        }

        @keyframes modalIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .active\:scale-95:active {
          transform: scale(0.95);
        }
      `}</style>
    </div>
  );
};

export default App;
