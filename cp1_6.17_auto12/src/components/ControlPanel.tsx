import React, { useRef } from 'react';
import { RawGraphData } from '../utils/dataParser';

export type ThemeName = 'classicBlue' | 'darkGreen' | 'softPink' | 'minimalGray';

export interface ThemeColors {
  [key: string]: string;
}

export const themes: Record<ThemeName, ThemeColors> = {
  classicBlue: {
    '1': '#3b82f6',
    '2': '#60a5fa',
    '3': '#93c5fd',
    '4': '#bfdbfe',
    '5': '#dbeafe',
    '6': '#1d4ed8',
    '7': '#1e40af',
    '8': '#1e3a8a',
    '9': '#172554',
    '10': '#0c4a6e'
  },
  darkGreen: {
    '1': '#059669',
    '2': '#10b981',
    '3': '#34d399',
    '4': '#6ee7b7',
    '5': '#a7f3d0',
    '6': '#047857',
    '7': '#065f46',
    '8': '#064e3b',
    '9': '#022c22',
    '10': '#134e4a'
  },
  softPink: {
    '1': '#ec4899',
    '2': '#f472b6',
    '3': '#f9a8d4',
    '4': '#fbcfe8',
    '5': '#fce7f3',
    '6': '#db2777',
    '7': '#be185d',
    '8': '#9d174d',
    '9': '#831843',
    '10': '#500724'
  },
  minimalGray: {
    '1': '#374151',
    '2': '#4b5563',
    '3': '#6b7280',
    '4': '#9ca3af',
    '5': '#d1d5db',
    '6': '#1f2937',
    '7': '#111827',
    '8': '#030712',
    '9': '#f3f4f6',
    '10': '#e5e7eb'
  }
};

interface ControlPanelProps {
  onDataImport: (data: RawGraphData) => void;
  onExportPNG: () => void;
  onReset: () => void;
  theme: ThemeName;
  onThemeChange: (theme: ThemeName) => void;
  nodeSpacing: number;
  onNodeSpacingChange: (value: number) => void;
  showLabels: boolean;
  onShowLabelsChange: (show: boolean) => void;
  isExporting: boolean;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  onDataImport,
  onExportPNG,
  onReset,
  theme,
  onThemeChange,
  nodeSpacing,
  onNodeSpacingChange,
  showLabels,
  onShowLabelsChange,
  isExporting
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleTextareaImport = () => {
    if (textareaRef.current) {
      try {
        const data = JSON.parse(textareaRef.current.value);
        onDataImport(data);
      } catch (error) {
        alert('JSON 格式错误，请检查数据格式');
      }
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          onDataImport(data);
        } catch (error) {
          alert('JSON 文件格式错误');
        }
      };
      reader.readAsText(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const themeNames: ThemeName[] = ['classicBlue', 'darkGreen', 'softPink', 'minimalGray'];
  const themeLabels: Record<ThemeName, string> = {
    classicBlue: '经典蓝',
    darkGreen: '暗夜绿',
    softPink: '柔和粉',
    minimalGray: '极简灰'
  };

  const getThemePreviewColor = (themeName: ThemeName): string => {
    return themes[themeName]['1'];
  };

  return (
    <div className="control-panel">
      <div className="panel-section">
        <h2>依赖关系可视化</h2>
      </div>

      <div className="panel-section">
        <h3>导入数据</h3>
        <textarea
          ref={textareaRef}
          placeholder='粘贴 JSON 数据&#10;{&#10;  "nodes": [&#10;    {"id": "1", "label": "Node A", "group": 1}&#10;  ],&#10;  "links": [&#10;    {"source": "1", "target": "2"}&#10;  ]&#10;}'
        />
        <button className="btn btn-success" onClick={handleTextareaImport}>
          导入数据
        </button>
        <label className="file-input-label">
          <input
            type="file"
            accept=".json"
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
          上传 JSON 文件
        </label>
      </div>

      <div className="panel-section">
        <h3>颜色主题</h3>
        <div className="theme-selector">
          {themeNames.map((themeName) => (
            <button
              key={themeName}
              className={`theme-btn ${theme === themeName ? 'active' : ''}`}
              style={{ backgroundColor: getThemePreviewColor(themeName) }}
              onClick={() => onThemeChange(themeName)}
              title={themeLabels[themeName]}
            />
          ))}
        </div>
      </div>

      <div className="panel-section">
        <h3>布局设置</h3>
        <div className="slider-container">
          <label>
            <span>节点间距</span>
            <span>{nodeSpacing}</span>
          </label>
          <input
            type="range"
            min="50"
            max="300"
            value={nodeSpacing}
            onChange={(e) => onNodeSpacingChange(Number(e.target.value))}
          />
        </div>
        <div className="toggle-container">
          <label>显示标签</label>
          <div
            className={`toggle-switch ${showLabels ? 'active' : ''}`}
            onClick={() => onShowLabelsChange(!showLabels)}
          />
        </div>
      </div>

      <div className="panel-section">
        <h3>操作</h3>
        <button
          className="btn"
          onClick={onExportPNG}
          disabled={isExporting}
        >
          {isExporting ? '导出中...' : '导出 PNG'}
        </button>
        <button className="btn btn-secondary" onClick={onReset}>
          重置布局
        </button>
      </div>
    </div>
  );
};

export default ControlPanel;
