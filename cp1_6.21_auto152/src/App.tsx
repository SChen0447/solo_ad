import { useState, useEffect } from 'react';
import EditorPanel from './components/EditorPanel';
import PreviewArea from './components/PreviewArea';
import './styles/App.css';
import { useEditorStore } from './stores/editorStore';

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const { undo, redo, canUndo, canRedo } = useEditorStore();

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) {
        setSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          if (canUndo) undo();
        } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
          e.preventDefault();
          if (canRedo) redo();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, canUndo, canRedo]);

  return (
    <div className="app-root">
      {isMobile && (
        <div className="mobile-header">
          <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? '✕ 关闭编辑器' : '☰ 打开编辑器'}
          </button>
          <span className="mobile-title">促销弹窗编辑器</span>
        </div>
      )}
      <div className={`app-layout ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'} ${isMobile ? 'mobile-layout' : ''}`}>
        {sidebarOpen && <EditorPanel />}
        <PreviewArea />
      </div>
    </div>
  );
}
