import React, { useCallback } from 'react';
import { ChromePicker, ColorResult } from 'react-color';
import { Theme, presetThemes, PresetTheme } from '../theme/ThemeEngine';

interface EditorPanelProps {
  theme: Theme;
  brightness: number;
  contrastIssues: string[];
  onPrimaryChange: (color: string) => void;
  onSecondaryChange: (color: string) => void;
  onBackgroundChange: (color: string) => void;
  onBrightnessChange: (value: number) => void;
  onPresetSelect: (preset: PresetTheme) => void;
  onExport: () => void;
}

const cardStyle: React.CSSProperties = {
  background: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: '12px',
  padding: '20px',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
  marginBottom: '16px',
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 600,
  marginBottom: '16px',
  color: '#374151',
};

const colorPickerContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
};

const colorRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
};

const colorLabelStyle: React.CSSProperties = {
  width: '60px',
  fontSize: '13px',
  color: '#6b7280',
  fontWeight: 500,
};

const customPickerStyle = {
  default: {
    picker: {
      width: '100%',
      boxShadow: 'none',
    },
  },
};

const EditorPanel: React.FC<EditorPanelProps> = ({
  theme,
  brightness,
  contrastIssues,
  onPrimaryChange,
  onSecondaryChange,
  onBackgroundChange,
  onBrightnessChange,
  onPresetSelect,
  onExport,
}) => {
  const handleColorChange = useCallback(
    (handler: (color: string) => void) =>
      (color: ColorResult) => {
        handler(color.hex);
      },
    []
  );

  return (
    <div style={{ padding: '20px', overflowY: 'auto', height: '100%', boxSizing: 'border-box' }}>
      <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px', color: '#1f2937' }}>
        配色方案编辑器
      </h2>

      <div style={cardStyle}>
        <h3 style={sectionTitleStyle}>色盘调节</h3>
        <div style={colorPickerContainerStyle}>
          <div>
            <div style={colorRowStyle}>
              <div style={colorLabelStyle}>主色</div>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: theme.primary,
                  border: '3px solid rgba(255,255,255,0.5)',
                  boxShadow: '0 0 0 2px rgba(0,0,0,0.1)',
                  cursor: 'pointer',
                }}
              />
              <span style={{ fontSize: '12px', fontFamily: 'monospace', color: '#9ca3af' }}>
                {theme.primary}
              </span>
            </div>
            <ChromePicker
              color={theme.primary}
              onChange={handleColorChange(onPrimaryChange)}
              styles={customPickerStyle}
            />
          </div>

          <div>
            <div style={colorRowStyle}>
              <div style={colorLabelStyle}>辅色</div>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: theme.secondary,
                  border: '3px solid rgba(255,255,255,0.5)',
                  boxShadow: '0 0 0 2px rgba(0,0,0,0.1)',
                  cursor: 'pointer',
                }}
              />
              <span style={{ fontSize: '12px', fontFamily: 'monospace', color: '#9ca3af' }}>
                {theme.secondary}
              </span>
            </div>
            <ChromePicker
              color={theme.secondary}
              onChange={handleColorChange(onSecondaryChange)}
              styles={customPickerStyle}
            />
          </div>

          <div>
            <div style={colorRowStyle}>
              <div style={colorLabelStyle}>背景色</div>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: theme.background,
                  border: '3px solid rgba(255,255,255,0.5)',
                  boxShadow: '0 0 0 2px rgba(0,0,0,0.1)',
                  cursor: 'pointer',
                }}
              />
              <span style={{ fontSize: '12px', fontFamily: 'monospace', color: '#9ca3af' }}>
                {theme.background}
              </span>
            </div>
            <ChromePicker
              color={theme.background}
              onChange={handleColorChange(onBackgroundChange)}
              styles={customPickerStyle}
            />
          </div>
        </div>
      </div>

      <div style={cardStyle}>
        <h3 style={sectionTitleStyle}>预设主题</h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
          }}
        >
          {presetThemes.map((preset) => (
            <div
              key={preset.name}
              onClick={() => onPresetSelect(preset)}
              title={preset.name}
              style={{
                width: '75px',
                height: '75px',
                borderRadius: '8px',
                background: `linear-gradient(135deg, ${preset.primary} 0%, ${preset.secondary} 50%, ${preset.background} 100%)`,
                cursor: 'pointer',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                position: 'relative',
                overflow: 'hidden',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.1)';
                e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  bottom: '4px',
                  left: '0',
                  right: '0',
                  textAlign: 'center',
                  fontSize: '10px',
                  color: '#fff',
                  textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                  fontWeight: 500,
                }}
              >
                {preset.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div style={cardStyle}>
        <h3 style={sectionTitleStyle}>亮度调节</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: '#6b7280' }}>整体亮度</span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: theme.primary }}>
              {brightness > 0 ? '+' : ''}
              {brightness}
            </span>
          </div>
          <input
            type="range"
            min="-30"
            max="30"
            value={brightness}
            onChange={(e) => onBrightnessChange(Number(e.target.value))}
            style={{
              width: '100%',
              height: '6px',
              borderRadius: '3px',
              background: `linear-gradient(to right, #374151 0%, ${theme.primary} 50%, #f3f4f6 100%)`,
              appearance: 'none',
              outline: 'none',
              cursor: 'pointer',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#9ca3af' }}>
            <span>-30</span>
            <span>0</span>
            <span>+30</span>
          </div>
        </div>
      </div>

      <div style={cardStyle}>
        <h3 style={sectionTitleStyle}>导出主题</h3>
        <button
          onClick={onExport}
          style={{
            width: '100%',
            padding: '12px 20px',
            background: theme.primary,
            color: theme.textOnPrimary,
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: theme.shadow,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = theme.primaryDark;
            e.currentTarget.style.boxShadow = theme.hoverShadow;
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = theme.primary;
            e.currentTarget.style.boxShadow = theme.shadow;
            e.currentTarget.style.transform = 'translateY(0)';
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          导出主题 JSON
        </button>
      </div>

      {contrastIssues.length > 0 && (
        <div
          style={{
            padding: '16px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            marginBottom: '16px',
          }}
        >
          <div
            style={{
              color: '#dc2626',
              fontSize: '13px',
              fontWeight: 600,
              marginBottom: '8px',
            }}
          >
            ⚠️ 对比度警告
          </div>
          {contrastIssues.map((issue, index) => (
            <div
              key={index}
              style={{
                color: '#b91c1c',
                fontSize: '12px',
                lineHeight: '1.5',
                marginBottom: index < contrastIssues.length - 1 ? '4px' : '0',
              }}
            >
              • {issue}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default React.memo(EditorPanel);
