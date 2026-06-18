import { useState, useCallback, useEffect, useRef } from 'react';
import { Menu, X } from 'lucide-react';
import { ColorPicker } from '@/components/ColorPicker';
import { SchemeList } from '@/components/SchemeList';
import { PreviewPanel } from '@/components/PreviewPanel';
import { ExportModal } from '@/components/ExportModal';
import { useThemeStore } from '@/stores/themeStore';

function App() {
  const [leftWidth, setLeftWidth] = useState(() => {
    const saved = localStorage.getItem('leftPanelWidth');
    return saved ? parseInt(saved, 10) : 420;
  });
  const [isDragging, setIsDragging] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { tempColors, isCompareMode, setCompareMode, selectedForCompare } =
    useThemeStore();

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    localStorage.setItem('leftPanelWidth', leftWidth.toString());
  }, [leftWidth]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const newWidth = e.clientX - containerRect.left;
      const minWidth = 320;
      const maxWidth = containerRect.width - 400;
      setLeftWidth(Math.max(minWidth, Math.min(maxWidth, newWidth)));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const handleExitCompare = () => {
    setCompareMode(false);
  };

  const leftPanelContent = (
    <div className="h-full flex flex-col bg-white overflow-hidden">
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg font-bold"
              style={{ backgroundColor: tempColors.primary }}
            >
              🎨
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-800">配色方案生成器</h1>
              <p className="text-xs text-gray-500">创建专属CSS主题</p>
            </div>
          </div>
          {isMobile && (
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
            >
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="p-4">
          <ColorPicker compact={isMobile} />
        </div>
      </div>

      <SchemeList />
    </div>
  );

  if (isMobile) {
    return (
      <div ref={containerRef} className="h-screen flex flex-col bg-[#f8fafc]">
        <div className="bg-white border-b border-gray-100 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-base font-bold"
              style={{ backgroundColor: tempColors.primary }}
            >
              🎨
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-800">配色方案生成器</h1>
              <p className="text-xs text-gray-500">创建专属CSS主题</p>
            </div>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
          >
            <Menu size={22} />
          </button>
        </div>

        {isCompareMode && (
          <div
            className="px-4 py-2 text-white text-sm font-medium flex items-center justify-between"
            style={{ backgroundColor: tempColors.primary }}
          >
            <span>对比模式 ({selectedForCompare.length}/2)</span>
            <button
              onClick={handleExitCompare}
              className="px-3 py-1 bg-white/20 rounded-lg text-xs hover:bg-white/30 transition-colors"
            >
              退出对比
            </button>
          </div>
        )}

        <div className="flex-1 overflow-hidden">
          <PreviewPanel />
        </div>

        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 bg-black/50">
            <div className="absolute inset-y-0 left-0 w-full max-w-sm bg-white shadow-2xl modal-enter">
              {leftPanelContent}
            </div>
          </div>
        )}

        <ExportModal />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-screen flex overflow-hidden bg-[#f8fafc]"
    >
      <div
        className="h-full flex-shrink-0 flex overflow-hidden"
        style={{ width: `${leftWidth}px` }}
      >
        <div className="flex-1 overflow-hidden">{leftPanelContent}</div>
      </div>

      <div
        className={`w-[3px] h-full cursor-col-resize flex-shrink-0 transition-colors duration-150 ${
          isDragging ? 'bg-[#3b82f6]' : 'bg-transparent hover:bg-[#3b82f6]'
        }`}
        onMouseDown={handleMouseDown}
      >
        <div className="w-1 h-full mx-auto bg-gray-200 hover:bg-transparent transition-colors" />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden bg-[#f8fafc]">
        {isCompareMode && (
          <div
            className="px-6 py-3 text-white font-medium flex items-center justify-between flex-shrink-0"
            style={{ backgroundColor: tempColors.primary }}
          >
            <span className="flex items-center gap-2">
              <span className="text-lg">🔄</span>
              对比模式 - 已选择 {selectedForCompare.length}/2 个方案
            </span>
            <button
              onClick={handleExitCompare}
              className="px-4 py-1.5 bg-white/20 rounded-xl text-sm hover:bg-white/30 transition-colors btn-bounce"
            >
              退出对比
            </button>
          </div>
        )}
        <div className="flex-1 overflow-hidden">
          <PreviewPanel />
        </div>
      </div>

      <ExportModal />
    </div>
  );
}

export default App;
