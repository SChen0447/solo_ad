import { useState, useCallback } from 'react';
import type { ResumeData, Theme, ModuleItem, ViewMode } from './types';
import { presetThemes, createCustomTheme } from './utils/themes';
import ParserPanel from './components/ParserPanel';
import PreviewPanel from './components/PreviewPanel';
import ThemeSwitcher from './components/ThemeSwitcher';
import ExportButton from './components/ExportButton';

const defaultResumeData: ResumeData = {
  personalInfo: {
    name: '',
    email: '',
    phone: '',
    address: '',
    age: '',
    avatar: '',
    title: '',
  },
  workExperience: [],
  education: [],
  projects: [],
  skills: [],
};

const defaultModuleOrder: ModuleItem[] = [
  { id: 'work', label: '工作经历', enabled: true, key: 'workExperience' },
  { id: 'education', label: '教育背景', enabled: true, key: 'education' },
  { id: 'projects', label: '项目经历', enabled: true, key: 'projects' },
  { id: 'skills', label: '技能标签', enabled: true, key: 'skills' },
];

function App() {
  const [resumeData, setResumeData] = useState<ResumeData>(defaultResumeData);
  const [theme, setTheme] = useState<Theme>(presetThemes[0]);
  const [moduleOrder, setModuleOrder] = useState<ModuleItem[]>(defaultModuleOrder);
  const [viewMode, setViewMode] = useState<ViewMode>('desktop');
  const [hasParsedData, setHasParsedData] = useState(false);

  const handleParseComplete = useCallback((data: ResumeData) => {
    setResumeData(data);
    setHasParsedData(true);
  }, []);

  const handleThemeChange = useCallback((newTheme: Theme) => {
    setTheme(newTheme);
  }, []);

  const handleCustomTheme = useCallback((primary: string, secondary: string) => {
    setTheme(createCustomTheme(primary, secondary));
  }, []);

  const handleModuleOrderChange = useCallback((newOrder: ModuleItem[]) => {
    setModuleOrder(newOrder);
  }, []);

  const handleModuleToggle = useCallback((moduleId: string) => {
    setModuleOrder((prev) =>
      prev.map((item) =>
        item.id === moduleId ? { ...item, enabled: !item.enabled } : item
      )
    );
  }, []);

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
  }, []);

  return (
    <div className="app-container">
      <aside className="control-panel">
        <div className="control-panel-header">
          <h1>🎯 智能简历生成器</h1>
        </div>
        <div className="control-panel-content">
          <ParserPanel onParseComplete={handleParseComplete} />

          <div className="panel-section">
            <div className="panel-section-title">模块顺序</div>
            <ModuleOrderList
              moduleOrder={moduleOrder}
              onOrderChange={handleModuleOrderChange}
              onToggle={handleModuleToggle}
            />
          </div>

          <div className="panel-section">
            <div className="panel-section-title">主题样式</div>
            <ThemeSwitcher
              currentTheme={theme}
              presetThemes={presetThemes}
              onThemeChange={handleThemeChange}
              onCustomTheme={handleCustomTheme}
            />
          </div>

          <div className="panel-section">
            <ExportButton
              resumeData={resumeData}
              theme={theme}
              moduleOrder={moduleOrder}
              disabled={!hasParsedData}
            />
          </div>
        </div>
      </aside>

      <PreviewPanel
        resumeData={resumeData}
        theme={theme}
        moduleOrder={moduleOrder}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        hasData={hasParsedData}
      />
    </div>
  );
}

interface ModuleOrderListProps {
  moduleOrder: ModuleItem[];
  onOrderChange: (order: ModuleItem[]) => void;
  onToggle: (id: string) => void;
}

function ModuleOrderList({ moduleOrder, onOrderChange, onToggle }: ModuleOrderListProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    const target = e.target as HTMLElement;
    target.style.opacity = '0.5';
  };

  const handleDragEnd = (e: React.DragEvent) => {
    const target = e.target as HTMLElement;
    target.style.opacity = '1';
    setDraggedIndex(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) return;

    const newOrder = [...moduleOrder];
    const [removed] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(dropIndex, 0, removed);
    onOrderChange(newOrder);
    setDraggedIndex(null);
  };

  return (
    <div className="module-list">
      {moduleOrder.map((module, index) => (
        <div
          key={module.id}
          className={`module-item ${draggedIndex === index ? 'dragging' : ''}`}
          draggable
          onDragStart={(e) => handleDragStart(e, index)}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, index)}
        >
          <div className="drag-handle" title="拖拽排序">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <circle cx="9" cy="6" r="1.5" />
              <circle cx="15" cy="6" r="1.5" />
              <circle cx="9" cy="12" r="1.5" />
              <circle cx="15" cy="12" r="1.5" />
              <circle cx="9" cy="18" r="1.5" />
              <circle cx="15" cy="18" r="1.5" />
            </svg>
          </div>
          <span className="module-label">{module.label}</span>
          <div
            className={`module-toggle ${module.enabled ? 'enabled' : ''}`}
            onClick={() => onToggle(module.id)}
            title={module.enabled ? '点击隐藏' : '点击显示'}
          />
        </div>
      ))}
    </div>
  );
}

export default App;
