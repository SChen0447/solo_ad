import React, { useCallback, useRef } from 'react';
import { FontData, formatFileSize } from './fontLoader';

export interface TypesetControls {
  fontSize: number;
  letterSpacing: number;
  lineHeight: number;
  alignment: 'left' | 'center' | 'right' | 'justify';
  showGuides: boolean;
  contrastMode: boolean;
}

interface ControlsProps {
  fontData: FontData | null;
  fontError: string | null;
  loading: boolean;
  controls: TypesetControls;
  text: string;
  uploadFlash: boolean;
  onFontUpload: (file: File) => void;
  onClearFont: () => void;
  onControlChange: (controls: Partial<TypesetControls>) => void;
  onTextChange: (text: string) => void;
  onGenerateCard: () => void;
  panelOpen: boolean;
  onTogglePanel: () => void;
}

const Slider: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (v: number) => void;
}> = ({ label, value, min, max, step, unit, onChange }) => (
  <div style={{ marginBottom: 12 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
      <label style={{ fontSize: 13, color: '#555' }}>{label}</label>
      <span style={{ fontSize: 14, color: '#333', fontVariantNumeric: 'tabular-nums' }}>
        {step < 1 ? value.toFixed(1) : value}{unit || ''}
      </span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={e => onChange(parseFloat(e.target.value))}
      style={{
        width: '100%',
        height: 4,
        appearance: 'none',
        WebkitAppearance: 'none',
        background: `linear-gradient(to right, #1976D2 ${((value - min) / (max - min)) * 100}%, #E0E0E0 ${((value - min) / (max - min)) * 100}%)`,
        borderRadius: 2,
        outline: 'none',
        cursor: 'pointer',
      }}
      className="custom-slider"
    />
  </div>
);

export const Controls: React.FC<ControlsProps> = ({
  fontData,
  fontError,
  loading,
  controls,
  text,
  uploadFlash,
  onFontUpload,
  onClearFont,
  onControlChange,
  onTextChange,
  onGenerateCard,
  panelOpen,
  onTogglePanel,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        onFontUpload(file);
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [onFontUpload]
  );

  const alignmentOptions: { value: TypesetControls['alignment']; label: string }[] = [
    { value: 'left', label: '左' },
    { value: 'center', label: '中' },
    { value: 'right', label: '右' },
    { value: 'justify', label: '两端' },
  ];

  const renderFontInfo = () => {
    if (loading) {
      return (
        <div style={{
          width: '100%',
          padding: 12,
          borderRadius: 8,
          background: '#F5F5F5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div className="loading-spinner" />
          <span style={{ marginLeft: 8, fontSize: 13, color: '#999' }}>解析中...</span>
        </div>
      );
    }

    if (fontError) {
      return (
        <div style={{
          width: '100%',
          padding: 12,
          borderRadius: 8,
          background: '#F5F5F5',
          color: '#D32F2F',
          fontSize: 13,
        }}>
          {fontError}
        </div>
      );
    }

    if (fontData) {
      const chineseLabel = fontData.meta.hasChinese ? '包含中文' : '仅支持西文';
      return (
        <div style={{
          width: '100%',
          padding: 12,
          borderRadius: 8,
          background: '#F5F5F5',
          position: 'relative',
        }}>
          <button
            onClick={onClearFont}
            className="btn-action"
            title="清除字体"
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              width: 20,
              height: 20,
              borderRadius: '50%',
              border: 'none',
              background: '#E0E0E0',
              color: '#666',
              fontSize: 11,
              lineHeight: '20px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#D32F2F';
              e.currentTarget.style.color = '#FFF';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '#E0E0E0';
              e.currentTarget.style.color = '#666';
            }}
          >
            ✕
          </button>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#333', marginBottom: 4, paddingRight: 24 }}>
            {fontData.meta.familyName}
          </div>
          <div style={{ fontSize: 12, color: '#666', lineHeight: 1.6 }}>
            {fontData.meta.styleName} · {fontData.meta.glyphCount} 字形 · {chineseLabel}
          </div>
          <div style={{ fontSize: 12, color: '#999', lineHeight: 1.6, marginTop: 2 }}>
            {fontData.meta.fileName} · {formatFileSize(fontData.meta.fileSize)}
          </div>
        </div>
      );
    }

    return (
      <div style={{
        width: '100%',
        padding: 12,
        borderRadius: 8,
        background: '#F5F5F5',
        fontSize: 13,
        color: '#999',
        textAlign: 'center',
      }}>
        未上传字体
      </div>
    );
  };

  const panelContent = (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto', flex: 1 }}>
      {renderFontInfo()}

      <button
        onClick={() => fileInputRef.current?.click()}
        className={`btn-action ${uploadFlash ? 'upload-flash' : ''}`}
        style={{
          width: '100%',
          height: 36,
          borderRadius: 6,
          border: `1px dashed ${uploadFlash ? '#4CAF50' : '#1976D2'}`,
          background: uploadFlash ? 'rgba(76, 175, 80, 0.08)' : 'transparent',
          color: uploadFlash ? '#4CAF50' : '#1976D2',
          fontSize: 13,
          cursor: 'pointer',
          transition: 'all 0.15s',
        }}
      >
        上传字体 (.woff2 / .ttf)
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".woff2,.ttf,.otf"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      <div style={{ height: 1, background: '#E0E0E0' }} />

      <Slider
        label="字体大小"
        value={controls.fontSize}
        min={12}
        max={200}
        step={1}
        unit="px"
        onChange={v => onControlChange({ fontSize: v })}
      />

      <Slider
        label="字距"
        value={controls.letterSpacing}
        min={-5}
        max={20}
        step={0.5}
        unit="px"
        onChange={v => onControlChange({ letterSpacing: v })}
      />

      <Slider
        label="行距"
        value={controls.lineHeight}
        min={0.8}
        max={3.0}
        step={0.1}
        onChange={v => onControlChange({ lineHeight: v })}
      />

      <div>
        <label style={{ fontSize: 13, color: '#555', display: 'block', marginBottom: 6 }}>对齐方式</label>
        <div style={{ display: 'flex', gap: 4 }}>
          {alignmentOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => onControlChange({ alignment: opt.value })}
              className="btn-action"
              style={{
                flex: 1,
                height: 32,
                borderRadius: 4,
                border: '1px solid',
                borderColor: controls.alignment === opt.value ? '#1976D2' : '#DDD',
                background: controls.alignment === opt.value ? '#1976D2' : '#FFF',
                color: controls.alignment === opt.value ? '#FFF' : '#666',
                fontSize: 12,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ height: 1, background: '#E0E0E0' }} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13, color: '#555' }}>参考线</span>
        <button
          onClick={() => onControlChange({ showGuides: !controls.showGuides })}
          style={{
            width: 32,
            height: 32,
            borderRadius: 4,
            border: 'none',
            background: controls.showGuides ? '#1976D2' : '#9E9E9E',
            color: '#FFF',
            fontSize: 14,
            cursor: 'pointer',
            transition: 'background 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {controls.showGuides ? '✓' : '—'}
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13, color: '#555' }}>对比模式</span>
        <div
          onClick={() => onControlChange({ contrastMode: !controls.contrastMode })}
          style={{
            width: 40,
            height: 22,
            borderRadius: 11,
            background: controls.contrastMode ? '#1976D2' : '#CCC',
            position: 'relative',
            cursor: 'pointer',
            transition: 'background 0.2s',
          }}
        >
          <div style={{
            width: 18,
            height: 18,
            borderRadius: 9,
            background: '#FFF',
            position: 'absolute',
            top: 2,
            left: controls.contrastMode ? 20 : 2,
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            transition: 'left 0.2s',
          }} />
        </div>
      </div>

      <div style={{ height: 1, background: '#E0E0E0' }} />

      <textarea
        value={text}
        onChange={e => onTextChange(e.target.value)}
        placeholder="输入预览文本..."
        style={{
          width: '100%',
          height: 120,
          borderRadius: 6,
          border: '1px solid #CCC',
          padding: 10,
          fontSize: 13,
          lineHeight: 1.5,
          resize: 'vertical',
          outline: 'none',
          fontFamily: 'inherit',
          transition: 'border-color 0.2s',
        }}
        onFocus={e => { e.currentTarget.style.borderColor = '#333'; }}
        onBlur={e => { e.currentTarget.style.borderColor = '#1976D2'; }}
      />

      <button
        onClick={onGenerateCard}
        className="btn-action btn-generate"
        style={{
          width: '100%',
          height: 42,
          borderRadius: 8,
          border: 'none',
          background: 'linear-gradient(135deg, #1976D2, #1565C0)',
          color: '#FFF',
          fontSize: 14,
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'all 0.15s',
        }}
      >
        生成测试卡片
      </button>
    </div>
  );

  return (
    <>
      <div className="controls-panel-desktop" style={{
        width: 320,
        height: '100vh',
        background: '#FFF',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        borderRadius: '0 8px 0 0',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '12px 16px',
          borderBottom: '1px solid #F0F0F0',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#1976D2' }} />
          <span style={{ fontSize: 15, fontWeight: 600, color: '#333' }}>字体排印实验室</span>
        </div>
        {panelContent}
      </div>

      <div className="controls-panel-mobile" style={{
        display: 'none',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: '#FFF',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      }}>
        <div
          onClick={onTogglePanel}
          style={{
            height: 60,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#1976D2' }} />
            <span style={{ fontSize: 15, fontWeight: 600, color: '#333' }}>字体排印实验室</span>
          </div>
          <span style={{ fontSize: 12, color: '#999' }}>{panelOpen ? '收起 ▲' : '展开 ▼'}</span>
        </div>
        {panelOpen && (
          <div style={{ maxHeight: 'calc(100vh - 60px)', overflowY: 'auto' }}>
            {panelContent}
          </div>
        )}
      </div>
    </>
  );
};
