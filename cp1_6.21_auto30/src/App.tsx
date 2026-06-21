import { useState, useEffect, useCallback } from 'react';
import type { Template, PosterElement } from './types';
import TemplateList from './components/TemplateList';
import Editor from './components/Editor';
import ExportPanel from './components/ExportPanel';
import './App.css';

function App() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [currentTemplate, setCurrentTemplate] = useState<Template | null>(null);
  const [elements, setElements] = useState<PosterElement[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setSidebarCollapsed(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetch('/api/templates')
      .then((res) => res.json())
      .then((data: Template[]) => {
        setTemplates(data);
        if (data.length > 0) {
          handleSelectTemplate(data[0]);
        }
      })
      .catch((err) => console.error('Failed to load templates:', err));
  }, []);

  const handleSelectTemplate = useCallback((template: Template) => {
    setCurrentTemplate(template);
    const clonedElements = JSON.parse(JSON.stringify(template.elements));
    setElements(clonedElements);
  }, []);

  const handleUpdateElement = useCallback((elementId: string, updates: Partial<PosterElement>) => {
    setElements((prev) =>
      prev.map((el) => (el.id === elementId ? ({ ...el, ...updates } as PosterElement) : el))
    );
  }, []);

  const handleImageUpload = useCallback((elementId: string, src: string) => {
    setElements((prev) =>
      prev.map((el) =>
        el.id === elementId && el.type === 'image'
          ? ({ ...el, src, scale: 1, rotation: 0 } as PosterElement)
          : el
      )
    );
  }, []);

  const handleExport = useCallback(
    async (size: { width: number; height: number }) => {
      if (!currentTemplate) return;
      setIsExporting(true);
      setExportProgress(10);

      try {
        const templateData = {
          ...currentTemplate,
          elements,
        };

        setExportProgress(30);

        const response = await fetch('/api/export', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            template: templateData,
            size,
          }),
        });

        setExportProgress(70);

        if (!response.ok) {
          throw new Error('Export failed');
        }

        const blob = await response.blob();
        setExportProgress(90);

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `poster-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setExportProgress(100);
        setTimeout(() => {
          setIsExporting(false);
          setExportProgress(0);
        }, 500);
      } catch (err) {
        console.error('Export error:', err);
        setIsExporting(false);
        setExportProgress(0);
      }
    },
    [currentTemplate, elements]
  );

  return (
    <div className="app-container">
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <h1 className="app-title">海报编辑器</h1>
        </div>
        <div className="sidebar-content">
          <h2 className="section-title">选择模板</h2>
          <TemplateList
            templates={templates}
            currentTemplateId={currentTemplate?.id || null}
            onSelect={handleSelectTemplate}
            collapsed={sidebarCollapsed}
          />
        </div>
      </aside>

      <main className="main-content">
        <header className="toolbar">
          <h2 className="current-template-name">
            当前模板：{currentTemplate?.name || '未选择'}
          </h2>
          <ExportPanel
            onExport={handleExport}
            isExporting={isExporting}
            progress={exportProgress}
            disabled={!currentTemplate}
          />
        </header>

        <div className="canvas-container">
          {currentTemplate ? (
            <Editor
              template={currentTemplate}
              elements={elements}
              onUpdateElement={handleUpdateElement}
              onImageUpload={handleImageUpload}
            />
          ) : (
            <div className="empty-state">
              <p>请从左侧选择一个模板开始编辑</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
