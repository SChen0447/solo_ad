import React, { useCallback, useRef } from 'react';
import type { FontItem } from './useFontLoader';

export interface TypographyParams {
  font: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  color: string;
  backgroundColor: string;
}

interface ControlPanelProps {
  title: string;
  params: TypographyParams;
  onChange: (params: TypographyParams) => void;
  fonts: FontItem[];
  loading: boolean;
  addLocalFont: (file: File) => Promise<void>;
  showFontUpload?: boolean;
  locked?: boolean;
  onToggleLock?: () => void;
}

const ControlPanel: React.FC<ControlPanelProps> = React.memo(({
  title,
  params,
  onChange,
  fonts,
  loading,
  addLocalFont,
  showFontUpload = true,
  locked = false,
  onToggleLock,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = useCallback((key: keyof TypographyParams, value: string | number) => {
    onChange({ ...params, [key]: value });
  }, [params, onChange]);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        await addLocalFont(file);
      } catch (err) {
        alert(err instanceof Error ? err.message : '加载字体失败');
      }
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [addLocalFont]);

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '13px',
    fontWeight: 500,
    color: '#495057',
    marginBottom: '6px',
    marginTop: '16px',
  };

  const sliderStyle: React.CSSProperties = {
    width: '100%',
    height: '4px',
    appearance: 'none',
    background: '#e9ecef',
    borderRadius: '2px',
    outline: 'none',
    cursor: 'pointer',
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
      padding: '16px',
      backgroundColor: 'white',
      borderRadius: '8px',
      border: '1px solid #dee2e6',
      transition: 'all 0.2s ease',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #dee2e6',
        paddingBottom: '12px',
      }}>
        <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#212529', margin: 0 }}>
          {title}
        </h3>
        {onToggleLock && (
          <button
            onClick={onToggleLock}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              fontSize: '12px',
              border: '1px solid #dee2e6',
              borderRadius: '6px',
              backgroundColor: locked ? '#e7f5ff' : 'white',
              color: locked ? '#1971c2' : '#495057',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            title={locked ? '点击解锁对比参数' : '点击锁定对比参数'}
          >
            <span>{locked ? '🔒' : '🔓'}</span>
            <span>{locked ? '已锁定' : '锁定对比'}</span>
          </button>
        )}
      </div>

      <label style={labelStyle}>字体 {loading && <span style={{ color: '#868e96', fontSize: '11px' }}>(加载中...)</span>}</label>
      <div style={{ display: 'flex', gap: '8px' }}>
        <select
          value={params.font}
          onChange={(e) => handleChange('font', e.target.value)}
          disabled={locked}
          style={{
            flex: 1,
            padding: '8px 10px',
            fontSize: '13px',
            border: '1px solid #dee2e6',
            borderRadius: '6px',
            backgroundColor: locked ? '#f8f9fa' : 'white',
            color: '#212529',
            cursor: locked ? 'not-allowed' : 'pointer',
            outline: 'none',
            transition: 'all 0.2s ease',
          }}
        >
          {fonts.map((font) => (
            <option key={font.name} value={font.family} style={{ fontFamily: font.family }}>
              {font.name}
            </option>
          ))}
        </select>
        {showFontUpload && (
          <>
            <input
              type="file"
              ref={fileInputRef}
              accept=".ttf,.otf,.woff,.woff2"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                padding: '8px 12px',
                fontSize: '12px',
                border: '2px dashed #adb5bd',
                borderRadius: '6px',
                backgroundColor: 'white',
                color: '#495057',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#495057';
                e.currentTarget.style.color = '#212529';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#adb5bd';
                e.currentTarget.style.color = '#495057';
              }}
            >
              上传字体
            </button>
          </>
        )}
      </div>

      <label style={labelStyle}>
        字号: <span style={{ color: '#212529', fontWeight: 600 }}>{params.fontSize}px</span>
      </label>
      <input
        type="range"
        min="12"
        max="128"
        step="1"
        value={params.fontSize}
        onChange={(e) => handleChange('fontSize', Number(e.target.value))}
        disabled={locked}
        style={sliderStyle}
      />

      <label style={labelStyle}>
        行高: <span style={{ color: '#212529', fontWeight: 600 }}>{params.lineHeight.toFixed(1)}</span>
      </label>
      <input
        type="range"
        min="1.0"
        max="2.5"
        step="0.1"
        value={params.lineHeight}
        onChange={(e) => handleChange('lineHeight', Number(e.target.value))}
        disabled={locked}
        style={sliderStyle}
      />

      <label style={labelStyle}>
        字间距: <span style={{ color: '#212529', fontWeight: 600 }}>{params.letterSpacing.toFixed(2)}em</span>
      </label>
      <input
        type="range"
        min="-0.1"
        max="0.5"
        step="0.01"
        value={params.letterSpacing}
        onChange={(e) => handleChange('letterSpacing', Number(e.target.value))}
        disabled={locked}
        style={sliderStyle}
      />

      <div style={{ display: 'flex', gap: '16px', marginTop: '4px' }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>文字颜色</label>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 10px',
            border: '1px solid #dee2e6',
            borderRadius: '6px',
            backgroundColor: locked ? '#f8f9fa' : 'white',
            cursor: locked ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
          }}>
            <div
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                backgroundColor: params.color,
                border: '2px solid #dee2e6',
                flexShrink: 0,
              }}
            />
            <input
              type="color"
              value={params.color}
              onChange={(e) => handleChange('color', e.target.value)}
              disabled={locked}
              style={{
                opacity: 0,
                position: 'absolute',
                width: '1px',
                height: '1px',
                pointerEvents: 'none',
              }}
            />
            <span style={{ fontSize: '12px', color: '#868e96', fontFamily: 'monospace' }}>
              {params.color.toUpperCase()}
            </span>
            <div
              onClick={() => {
                if (!locked) {
                  const input = document.createElement('input');
                  input.type = 'color';
                  input.value = params.color;
                  input.addEventListener('input', (ev) => {
                    handleChange('color', (ev.target as HTMLInputElement).value);
                  });
                  input.click();
                }
              }}
              style={{
                marginLeft: 'auto',
                width: '24px',
                height: '24px',
                borderRadius: '4px',
                backgroundColor: params.color,
                cursor: locked ? 'not-allowed' : 'pointer',
                boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.1)',
              }}
            />
          </div>
        </div>

        <div style={{ flex: 1 }}>
          <label style={labelStyle}>背景颜色</label>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 10px',
            border: '1px solid #dee2e6',
            borderRadius: '6px',
            backgroundColor: locked ? '#f8f9fa' : 'white',
            cursor: locked ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
          }}>
            <div
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                backgroundColor: params.backgroundColor,
                border: '2px solid #dee2e6',
                flexShrink: 0,
              }}
            />
            <input
              type="color"
              value={params.backgroundColor}
              onChange={(e) => handleChange('backgroundColor', e.target.value)}
              disabled={locked}
              style={{
                opacity: 0,
                position: 'absolute',
                width: '1px',
                height: '1px',
                pointerEvents: 'none',
              }}
            />
            <span style={{ fontSize: '12px', color: '#868e96', fontFamily: 'monospace' }}>
              {params.backgroundColor.toUpperCase()}
            </span>
            <div
              onClick={() => {
                if (!locked) {
                  const input = document.createElement('input');
                  input.type = 'color';
                  input.value = params.backgroundColor;
                  input.addEventListener('input', (ev) => {
                    handleChange('backgroundColor', (ev.target as HTMLInputElement).value);
                  });
                  input.click();
                }
              }}
              style={{
                marginLeft: 'auto',
                width: '24px',
                height: '24px',
                borderRadius: '4px',
                backgroundColor: params.backgroundColor,
                cursor: locked ? 'not-allowed' : 'pointer',
                boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.1)',
              }}
            />
          </div>
        </div>
      </div>

      <style>{`
        input[type="range"]::-webkit-slider-thumb {
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #adb5bd;
          cursor: pointer;
          transition: background 0.2s ease, transform 0.1s ease;
          border: 2px solid white;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        input[type="range"]::-webkit-slider-thumb:hover {
          background: #495057;
        }
        input[type="range"]::-webkit-slider-thumb:active {
          background: #495057;
          transform: scale(1.2);
        }
        input[type="range"]::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #adb5bd;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          transition: background 0.2s ease, transform 0.1s ease;
        }
        input[type="range"]::-moz-range-thumb:hover {
          background: #495057;
        }
        input[type="range"]:disabled::-webkit-slider-thumb {
          background: #ced4da;
          cursor: not-allowed;
        }
        input[type="range"]:disabled {
          cursor: not-allowed;
        }
        select:focus {
          border-color: #868e96;
          box-shadow: 0 0 0 3px rgba(134, 142, 150, 0.1);
        }
      `}</style>
    </div>
  );
});

ControlPanel.displayName = 'ControlPanel';

export default ControlPanel;
