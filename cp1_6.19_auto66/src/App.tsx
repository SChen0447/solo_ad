import { useState, useCallback, useRef } from 'react';
import { useExhibitionStore } from './store';
import { FRAME_TEMPLATES } from './types';
import Floorplan from './Floorplan';
import SidePanel from './SidePanel';
import EditPanel from './EditPanel';
import {
  Menu,
  Download,
  Upload,
  Route,
  Plus,
} from 'lucide-react';

export default function App() {
  const hall = useExhibitionStore((s) => s.hall);
  const setHall = useExhibitionStore((s) => s.setHall);
  const sidePanelOpen = useExhibitionStore((s) => s.sidePanelOpen);
  const toggleSidePanel = useExhibitionStore((s) => s.toggleSidePanel);
  const exportLayout = useExhibitionStore((s) => s.exportLayout);
  const importLayout = useExhibitionStore((s) => s.importLayout);
  const generatePath = useExhibitionStore((s) => s.generatePath);
  const editingFrameId = useExhibitionStore((s) => s.editingFrameId);
  const addFrame = useExhibitionStore((s) => s.addFrame);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useState(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  });

  const handleExport = useCallback(() => {
    const json = exportLayout();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${hall.name || 'exhibition'}-layout.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [exportLayout, hall.name]);

  const handleImport = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        importLayout(text);
      };
      reader.readAsText(file);
      e.target.value = '';
    },
    [importLayout]
  );

  const handleAddFrame = useCallback(
    (templateIndex: number) => {
      const tpl = FRAME_TEMPLATES[templateIndex] ?? FRAME_TEMPLATES[0];
      const cx = hall.width / 2 - tpl.width / 2;
      const cy = hall.depth / 2 - tpl.height / 2;
      addFrame(templateIndex, cx, cy);
    },
    [addFrame, hall.width, hall.depth]
  );

  const panelVisible = sidePanelOpen || !isMobile;

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden" style={{ background: '#FDF8F0' }}>
      <nav
        className="flex items-center justify-between px-4 shrink-0"
        style={{
          height: 56,
          background: '#2C3E50',
        }}
      >
        <div className="flex items-center gap-3">
          {isMobile && (
            <button
              onClick={toggleSidePanel}
              className="text-white/80 hover:text-white transition-colors"
            >
              <Menu size={20} />
            </button>
          )}
          <h1
            className="text-white font-semibold text-lg tracking-wide"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            {hall.name}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleAddFrame(0)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-white/90 hover:text-white hover:bg-white/10 transition-all"
            title="添加小画框 30×40cm"
          >
            <Plus size={14} />
            <span className="hidden sm:inline">画框</span>
          </button>
          <button
            onClick={generatePath}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-white/90 hover:text-white hover:bg-white/10 transition-all"
            title="生成推荐动线"
          >
            <Route size={14} />
            <span className="hidden sm:inline">动线</span>
          </button>
          <button
            onClick={handleImport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-white/90 hover:text-white hover:bg-white/10 transition-all"
            title="导入布局"
          >
            <Upload size={14} />
            <span className="hidden sm:inline">导入</span>
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-white/90 hover:text-white hover:bg-white/10 transition-all"
            title="导出布局"
          >
            <Download size={14} />
            <span className="hidden sm:inline">导出</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </nav>

      <div className="flex flex-1 overflow-hidden relative">
        {panelVisible && (
          <div
            className="shrink-0 overflow-y-auto border-r"
            style={{
              width: 260,
              background: 'rgba(240, 235, 227, 0.9)',
              borderRightWidth: 2,
              borderRightColor: '#D8D0C8',
            }}
          >
            <SidePanel />
          </div>
        )}

        {isMobile && sidePanelOpen && (
          <div
            className="fixed inset-0 z-10"
            style={{ top: 56 }}
            onClick={toggleSidePanel}
          />
        )}

        <div className="flex-1 overflow-hidden relative">
          <Floorplan />
        </div>

        {editingFrameId && (
          <div
            className="shrink-0 overflow-y-auto border-l"
            style={{
              width: 280,
              background: 'rgba(240, 235, 227, 0.95)',
              borderLeftWidth: 2,
              borderLeftColor: '#D8D0C8',
            }}
          >
            <EditPanel />
          </div>
        )}
      </div>
    </div>
  );
}
