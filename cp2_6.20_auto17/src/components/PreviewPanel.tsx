import React from 'react';
import type { ColorSwatch, ThemeMode } from '../colorSystem/colorTypes';

interface PreviewPanelProps {
  primaryScale: ColorSwatch[];
  secondaryScale: ColorSwatch[];
  themeMode: ThemeMode;
  onThemeModeChange: (mode: ThemeMode) => void;
}

const PreviewPanel: React.FC<PreviewPanelProps> = ({
  primaryScale,
  secondaryScale,
  themeMode,
  onThemeModeChange
}) => {
  const primary500 = primaryScale.find((s) => s.level === 500)?.hex || '#3b82f6';
  const primary100 = primaryScale.find((s) => s.level === 100)?.hex || '#dbeafe';
  const primary700 = primaryScale.find((s) => s.level === 700)?.hex || '#1d4ed8';
  const secondary500 = secondaryScale.find((s) => s.level === 500)?.hex || '#8b5cf6';

  const renderCard = (mode: 'light' | 'dark') => {
    const isLight = mode === 'light';
    const bgColor = isLight ? '#ffffff' : '#1a1a2e';
    const textColor = isLight ? '#1f2937' : '#f3f4f6';
    const textMuted = isLight ? '#6b7280' : '#9ca3af';
    const cardBg = isLight ? '#f9fafb' : '#252542';
    const borderColor = isLight ? '#e5e7eb' : '#374151';
    const shadowColor = isLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(0, 0, 0, 0.3)';

    return (
      <div
        className="preview-card-wrapper"
        style={{
          '--preview-bg': bgColor,
          '--preview-text': textColor,
          '--preview-text-muted': textMuted,
          '--preview-card-bg': cardBg,
          '--preview-border': borderColor,
          '--preview-shadow': shadowColor,
          '--accent-primary': primary500,
          '--accent-secondary': secondary500,
          '--accent-light': primary100,
          '--accent-dark': primary700
        } as React.CSSProperties}
      >
        <div className="preview-mode-label">{isLight ? '亮色模式' : '暗色模式'}</div>
        <div className="preview-card">
          <div className="card-header">
            <div className="card-avatar" style={{ backgroundColor: primary500 }}>
              <span>U</span>
            </div>
            <div className="card-header-info">
              <div className="card-title">产品设计团队</div>
              <div className="card-subtitle">20 位成员 · 5 个项目</div>
            </div>
          </div>
          <div className="card-content">
            <p className="card-description">
              使用标准化的色彩系统提升设计一致性，加速开发流程，确保产品在不同场景下的视觉体验统一。
            </p>
            <div className="card-tags">
              <span className="tag tag-primary" style={{ backgroundColor: primary100, color: primary700 }}>
                设计系统
              </span>
              <span className="tag tag-secondary" style={{ backgroundColor: isLight ? '#f3e8ff' : '#4c1d95', color: secondary500 }}>
                前端开发
              </span>
            </div>
          </div>
          <div className="card-footer">
            <button className="card-btn btn-primary" style={{ backgroundColor: primary500 }}>
              查看详情
            </button>
            <button className="card-btn btn-secondary" style={{ borderColor: primary500, color: primary500 }}>
              邀请成员
            </button>
          </div>
        </div>

        <div className="preview-stats">
          <div className="stat-item">
            <div className="stat-value" style={{ color: primary500 }}>847</div>
            <div className="stat-label">组件数量</div>
          </div>
          <div className="stat-divider" style={{ backgroundColor: borderColor }}></div>
          <div className="stat-item">
            <div className="stat-value" style={{ color: secondary500 }}>12</div>
            <div className="stat-label">色彩令牌</div>
          </div>
          <div className="stat-divider" style={{ backgroundColor: borderColor }}></div>
          <div className="stat-item">
            <div className="stat-value" style={{ color: primary700 }}>98%</div>
            <div className="stat-label">覆盖率</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="preview-panel-container">
      <div className="preview-header">
        <h2 className="preview-title">实时预览</h2>
        <div className="theme-toggle">
          <button
            className={`toggle-btn ${themeMode === 'light' ? 'active' : ''}`}
            onClick={() => onThemeModeChange('light')}
          >
            ☀️ 亮色
          </button>
          <button
            className={`toggle-btn ${themeMode === 'dark' ? 'active' : ''}`}
            onClick={() => onThemeModeChange('dark')}
          >
            🌙 暗色
          </button>
        </div>
      </div>
      <div className="preview-grid">
        {renderCard('light')}
        {renderCard('dark')}
      </div>
    </div>
  );
};

export default PreviewPanel;
