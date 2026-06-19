import React, { useState, useRef, useCallback, useEffect } from 'react';
import debounce from 'lodash.debounce';
import type { SampleConfig } from '../types';
import { FONT_FAMILIES } from '../types';

interface EditorPanelProps {
  sample: SampleConfig;
  onChange: (config: SampleConfig) => void;
  onDelete: () => void;
}

export default React.memo(function EditorPanel({ sample, onChange, onDelete }: EditorPanelProps) {
  const [localSample, setLocalSample] = useState<SampleConfig>(sample);

  const debouncedOnChange = useRef(
    debounce((config: SampleConfig) => {
      onChange(config);
    }, 50)
  ).current;

  useEffect(() => {
    debouncedOnChange.cancel();
  }, [debouncedOnChange]);

  useEffect(() => {
    setLocalSample(sample);
  }, [sample]);

  const updateField = useCallback(<K extends keyof SampleConfig>(key: K, value: SampleConfig[K]) => {
    const newConfig = { ...localSample, [key]: value };
    setLocalSample(newConfig);
    debouncedOnChange(newConfig);
  }, [localSample, debouncedOnChange]);

  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value.slice(0, 200);
    updateField('text', val);
  }, [updateField]);

  return (
    <div style={{
      background: '#fff',
      borderRadius: 12,
      padding: 16,
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      position: 'relative',
      marginBottom: 16,
    }}>
      <button
        onClick={onDelete}
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          width: 24,
          height: 24,
          border: 'none',
          background: 'transparent',
          color: '#999',
          fontSize: 18,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 4,
          transition: 'background 0.2s, color 0.2s',
          lineHeight: 1,
        }}
        onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#ef4444'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#999'; }}
        title="删除样本"
      >
        ✕
      </button>

      <label style={labelStyle}>
        <span style={labelTextStyle}>字体</span>
        <select
          value={localSample.fontFamily}
          onChange={e => updateField('fontFamily', e.target.value)}
          style={selectStyle}
        >
          {FONT_FAMILIES.map(f => (
            <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
          ))}
        </select>
      </label>

      <label style={labelStyle}>
        <span style={labelTextStyle}>字号 <b>{localSample.fontSize}px</b></span>
        <input
          type="range"
          min={12}
          max={72}
          value={localSample.fontSize}
          onChange={e => updateField('fontSize', Number(e.target.value))}
          style={sliderStyle}
        />
      </label>

      <label style={labelStyle}>
        <span style={labelTextStyle}>行高 <b>{localSample.lineHeight.toFixed(1)}</b></span>
        <input
          type="range"
          min={10}
          max={20}
          value={Math.round(localSample.lineHeight * 10)}
          onChange={e => updateField('lineHeight', Number(e.target.value) / 10)}
          style={sliderStyle}
        />
      </label>

      <label style={labelStyle}>
        <span style={labelTextStyle}>字重 <b>{localSample.fontWeight}</b></span>
        <select
          value={localSample.fontWeight}
          onChange={e => updateField('fontWeight', Number(e.target.value))}
          style={selectStyle}
        >
          {Array.from({ length: 9 }, (_, i) => (i + 1) * 100).map(w => (
            <option key={w} value={w}>{w}</option>
          ))}
        </select>
      </label>

      <label style={labelStyle}>
        <span style={labelTextStyle}>颜色</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="color"
            value={localSample.color}
            onChange={e => updateField('color', e.target.value)}
            style={{ width: 32, height: 32, border: 'none', cursor: 'pointer', padding: 0 }}
          />
          <span style={{ fontSize: 12, color: '#666', fontFamily: 'Source Code Pro, monospace' }}>
            {localSample.color}
          </span>
        </div>
      </label>

      <label style={{ ...labelStyle, flexDirection: 'column', alignItems: 'flex-start' }}>
        <span style={labelTextStyle}>文字内容 <span style={{ fontSize: 11, color: '#aaa' }}>({localSample.text.length}/200)</span></span>
        <textarea
          value={localSample.text}
          onChange={handleTextChange}
          rows={3}
          style={{
            width: '100%',
            border: '1px solid #e0e0e0',
            borderRadius: 6,
            padding: '6px 8px',
            fontSize: 13,
            resize: 'vertical',
            outline: 'none',
            fontFamily: 'inherit',
            transition: 'border-color 0.2s',
          }}
          onFocus={e => { e.currentTarget.style.borderColor = '#1a73e8'; }}
          onBlur={e => { e.currentTarget.style.borderColor = '#e0e0e0'; }}
        />
      </label>
    </div>
  );
});

const labelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  marginBottom: 12,
};

const labelTextStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#666',
  fontWeight: 600,
  textTransform: 'uppercase' as const,
  letterSpacing: 0.5,
};

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '6px 8px',
  border: '1px solid #e0e0e0',
  borderRadius: 6,
  fontSize: 13,
  outline: 'none',
  background: '#fff',
  cursor: 'pointer',
  transition: 'border-color 0.2s',
};

const sliderStyle: React.CSSProperties = {
  width: '100%',
  cursor: 'pointer',
  accentColor: '#1a73e8',
};
