import React from 'react';
import { FontSettings, CHINESE_FONTS, ENGLISH_FONTS } from './types';

interface FontSelectorProps {
  settings: FontSettings;
  onSettingChange: <K extends keyof FontSettings>(key: K, value: FontSettings[K]) => void;
  title: string;
}

const FontSelector: React.FC<FontSelectorProps> = ({ settings, onSettingChange, title }) => {
  const selectStyle: React.CSSProperties = {
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    backgroundColor: '#ffffff',
    fontSize: '13px',
    color: '#1f2937',
    cursor: 'pointer',
    outline: 'none',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
    fontFamily: 'inherit',
  };

  const sliderRowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12px',
    color: '#4b5563',
  };

  const sliderLabelStyle: React.CSSProperties = {
    width: '48px',
    flexShrink: 0,
    fontWeight: 500,
  };

  const sliderValueStyle: React.CSSProperties = {
    width: '40px',
    flexShrink: 0,
    textAlign: 'right',
    fontWeight: 600,
    color: '#3b82f6',
  };

  return (
    <div
      style={{
        width: '100%',
        padding: '16px',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827', marginBottom: '4px' }}>
        {title}
      </div>

      <div style={{ display: 'flex', gap: '12px' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '11px', color: '#6b7280' }}>中文字体</label>
          <select
            value={settings.chineseFont}
            onChange={(e) => onSettingChange('chineseFont', e.target.value)}
            style={selectStyle}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#3b82f6';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#e5e7eb';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {CHINESE_FONTS.map((font) => (
              <option key={font.value} value={font.value}>
                {font.label}
              </option>
            ))}
          </select>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '11px', color: '#6b7280' }}>英文字体</label>
          <select
            value={settings.englishFont}
            onChange={(e) => onSettingChange('englishFont', e.target.value)}
            style={selectStyle}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#3b82f6';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#e5e7eb';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {ENGLISH_FONTS.map((font) => (
              <option key={font.value} value={font.value}>
                {font.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={sliderRowStyle}>
          <span style={sliderLabelStyle}>字号</span>
          <input
            type="range"
            min={12}
            max={72}
            step={2}
            value={settings.fontSize}
            onChange={(e) => onSettingChange('fontSize', parseInt(e.target.value, 10))}
          />
          <span style={sliderValueStyle}>{settings.fontSize}px</span>
        </div>

        <div style={sliderRowStyle}>
          <span style={sliderLabelStyle}>行高</span>
          <input
            type="range"
            min={1.0}
            max={2.5}
            step={0.1}
            value={settings.lineHeight}
            onChange={(e) => onSettingChange('lineHeight', parseFloat(e.target.value))}
          />
          <span style={sliderValueStyle}>{settings.lineHeight.toFixed(1)}</span>
        </div>

        <div style={sliderRowStyle}>
          <span style={sliderLabelStyle}>字重</span>
          <input
            type="range"
            min={100}
            max={900}
            step={100}
            value={settings.fontWeight}
            onChange={(e) => onSettingChange('fontWeight', parseInt(e.target.value, 10))}
          />
          <span style={sliderValueStyle}>{settings.fontWeight}</span>
        </div>
      </div>
    </div>
  );
};

export default FontSelector;
