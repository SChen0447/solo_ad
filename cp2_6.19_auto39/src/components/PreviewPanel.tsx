import React, { useState } from 'react';
import { darkenColor } from '../theme-engine/colorUtils';
import type { ColorScheme } from '../theme-engine/colorUtils';
import './PreviewPanel.css';

interface PreviewPanelProps {
  currentScheme: ColorScheme | null;
  schemes: ColorScheme[];
  isCompareMode: boolean;
  onSelectScheme: (id: string) => void;
  isMobile: boolean;
}

const PreviewPanel: React.FC<PreviewPanelProps> = ({
  currentScheme,
  schemes,
  isCompareMode,
  onSelectScheme,
  isMobile
}) => {
  const [fadeKey, setFadeKey] = useState(0);
  const [buttonHovered, setButtonHovered] = useState(false);
  const [compareButtonHovered, setCompareButtonHovered] = useState<string | null>(null);

  React.useEffect(() => {
    setFadeKey(prev => prev + 1);
  }, [currentScheme?.id]);

  const compareSchemes = schemes.slice(0, 4);

  const renderButtonPreview = (scheme: ColorScheme, isCompare: boolean = false, schemeId?: string) => {
    const isHovered = isCompare ? compareButtonHovered === schemeId : buttonHovered;
    return (
      <div className="preview-item button-preview" style={{ backgroundColor: scheme.background }}>
        <div className="preview-item-label">按钮</div>
        <button
          className="preview-button"
          style={{
            backgroundColor: isHovered ? darkenColor(scheme.primary, 10) : scheme.primary,
            color: scheme.text,
            transform: isHovered ? 'scale(1.02)' : 'scale(1)'
          }}
          onMouseEnter={() => {
            if (isCompare && schemeId) {
              setCompareButtonHovered(schemeId);
            } else {
              setButtonHovered(true);
            }
          }}
          onMouseLeave={() => {
            if (isCompare) {
              setCompareButtonHovered(null);
            } else {
              setButtonHovered(false);
            }
          }}
        >
          主要按钮
        </button>
      </div>
    );
  };

  const renderCardPreview = (scheme: ColorScheme) => (
    <div className="preview-item card-preview" style={{ backgroundColor: scheme.background }}>
      <div className="preview-item-label">卡片</div>
      <div
        className="preview-card"
        style={{
          backgroundColor: scheme.secondary,
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.2)'
        }}
      >
        <div
          className="preview-card-title"
          style={{ color: scheme.text }}
        >
          卡片标题
        </div>
        <div
          className="preview-card-text"
          style={{ color: scheme.accent }}
        >
          这是卡片的描述文字，展示配色在内容上的效果。
        </div>
        <div
          className="preview-card-accent"
          style={{ backgroundColor: scheme.accent }}
        />
      </div>
    </div>
  );

  const renderInputPreview = (scheme: ColorScheme) => (
    <div className="preview-item input-preview" style={{ backgroundColor: scheme.background }}>
      <div className="preview-item-label">表单输入框</div>
      <div className="preview-input-wrapper">
        <input
          type="text"
          className="preview-input"
          placeholder="请输入内容..."
          style={{
            backgroundColor: scheme.secondary,
            color: scheme.text,
            borderColor: scheme.primary
          }}
        />
        <button
          className="preview-input-btn"
          style={{
            backgroundColor: scheme.accent,
            color: scheme.text
          }}
        >
          搜索
        </button>
      </div>
    </div>
  );

  const renderAlertPreview = (scheme: ColorScheme) => (
    <div className="preview-item alert-preview" style={{ backgroundColor: scheme.background }}>
      <div className="preview-item-label">警告条</div>
      <div
        className="preview-alert"
        style={{
          backgroundColor: scheme.accent + '20',
          borderLeftColor: scheme.accent
        }}
      >
        <span style={{ color: scheme.text }}>⚠️</span>
        <span style={{ color: scheme.text }}>这是一条警告提示信息</span>
      </div>
    </div>
  );

  return (
    <div className="preview-panel" key={fadeKey}>
      <div className={`preview-view ${isCompareMode ? '' : 'active'}`}>
        <div className="preview-header">
          <h3>实时预览</h3>
          {currentScheme && <span className="current-scheme-name">{currentScheme.name}</span>}
        </div>
        <div className="preview-grid">
          {currentScheme && renderButtonPreview(currentScheme)}
          {currentScheme && renderCardPreview(currentScheme)}
          {currentScheme && renderInputPreview(currentScheme)}
          {currentScheme && renderAlertPreview(currentScheme)}
        </div>
      </div>

      <div className={`preview-view compare-view ${isCompareMode ? 'active' : ''}`}>
        <div className="compare-header">
          <h3>对比模式 - 2×2 网格</h3>
          <span className="compare-hint">点击任意方案设为当前方案并退出对比</span>
        </div>
        <div className={`compare-grid ${isMobile ? 'mobile' : ''}`}>
          {compareSchemes.map((scheme) => (
            <div
              key={scheme.id}
              className="compare-card"
              onClick={() => onSelectScheme(scheme.id)}
            >
              <div className="compare-card-label">{scheme.name}</div>
              <div className="compare-card-content">
                {renderButtonPreview(scheme, true, scheme.id)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PreviewPanel;
