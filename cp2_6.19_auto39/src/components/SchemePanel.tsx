import React, { useState } from 'react';
import SchemeCard from './SchemeCard';
import ColorPicker from './ColorPicker';
import type { ColorScheme } from '../theme-engine/colorUtils';
import './SchemePanel.css';

interface SchemePanelProps {
  schemes: ColorScheme[];
  currentScheme: ColorScheme | null;
  onAddScheme: () => void;
  onDeleteScheme: (id: string) => void;
  onSelectScheme: (id: string) => void;
  onUpdateScheme: (id: string, updates: Partial<ColorScheme>) => void;
  onReorderSchemes: (fromIndex: number, toIndex: number) => void;
  onExport: () => void;
  onToggleCompare: () => void;
  isCompareMode: boolean;
  isMobile: boolean;
  isCollapsed: boolean;
}

const colorFields = [
  { key: 'primary', label: '主色' },
  { key: 'secondary', label: '辅色' },
  { key: 'background', label: '背景色' },
  { key: 'text', label: '文字色' },
  { key: 'accent', label: '强调色' }
] as const;

const SchemePanel: React.FC<SchemePanelProps> = ({
  schemes,
  currentScheme,
  onAddScheme,
  onDeleteScheme,
  onSelectScheme,
  onUpdateScheme,
  onReorderSchemes,
  onExport,
  onToggleCompare,
  isCompareMode,
  isMobile,
  isCollapsed
}) => {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (index: number) => {
    if (dragIndex !== null && index !== dragIndex) {
      setDragOverIndex(index);
    }
  };

  const handleDragEnd = () => {
    if (dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex) {
      onReorderSchemes(dragIndex, dragOverIndex);
    }
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleColorChange = (key: keyof ColorScheme, value: string) => {
    if (currentScheme) {
      onUpdateScheme(currentScheme.id, { [key]: value });
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (currentScheme) {
      onUpdateScheme(currentScheme.id, { name: e.target.value });
    }
  };

  if (isMobile && isCollapsed) {
    return null;
  }

  return (
    <div className={`scheme-panel ${isMobile ? 'mobile' : ''}`}>
      <div className="scheme-panel-header">
        <h2 className="scheme-panel-title">配色方案</h2>
        <button className="add-scheme-btn" onClick={onAddScheme}>
          + 新建
        </button>
      </div>

      <div className="scheme-list">
        {schemes.map((scheme, index) => (
          <SchemeCard
            key={scheme.id}
            scheme={scheme}
            isSelected={currentScheme?.id === scheme.id}
            index={index}
            onSelect={onSelectScheme}
            onDelete={onDeleteScheme}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          />
        ))}
      </div>

      {currentScheme && (
        <div className="scheme-editor">
          <div className="scheme-editor-header">
            <span className="scheme-editor-label">编辑当前方案</span>
          </div>
          <input
            type="text"
            className="scheme-name-input"
            value={currentScheme.name}
            onChange={handleNameChange}
            placeholder="方案名称"
          />
          <div className="color-pickers-grid">
            {colorFields.map(({ key, label }) => (
              <ColorPicker
                key={key}
                label={label}
                color={currentScheme[key]}
                onChange={(color) => handleColorChange(key, color)}
              />
            ))}
          </div>
        </div>
      )}

      <div className="scheme-panel-actions">
        <button
          className={`action-btn compare-btn ${isCompareMode ? 'active' : ''}`}
          onClick={onToggleCompare}
        >
          {isCompareMode ? '退出对比' : '对比模式'}
        </button>
        <button className="action-btn export-btn" onClick={onExport}>
          导出 JSON
        </button>
      </div>
    </div>
  );
};

export default SchemePanel;
