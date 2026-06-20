import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThemeVars, ThemeSide, colorVarKeys, numericVarKeys, themeVarKeys } from './themeTypes';

interface ThemeEditorProps {
  side: ThemeSide;
  vars: ThemeVars;
  onUpdate: <K extends keyof ThemeVars>(key: K, value: ThemeVars[K]) => void;
}

const colorPalette = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
  '#22c55e', '#10b981', '#14b8a6', '#06b6d4',
  '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7',
  '#d946ef', '#ec4899', '#f43f5e', '#64748b', '#1f2937',
  '#ffffff', '#f8fafc', '#f1f5f9', '#e2e8f0', '#cbd5e1',
  '#94a3b8', '#64748b', '#475569', '#334155', '#1e293b',
  '#0f172a', '#020617', '#fef2f2', '#fee2e2', '#fecaca',
  '#fca5a5', '#f87171', '#fef3c7', '#fde68a', '#fcd34d',
  '#fbbf24', '#f59e0b', '#dcfce7', '#bbf7d0', '#86efac',
  '#4ade80', '#22c55e', '#dbeafe', '#bfdbfe', '#93c5fd',
  '#60a5fa', '#3b82f6', '#ede9fe', '#ddd6fe', '#c4b5fd',
  '#a78bfa', '#8b5cf6', '#fce7f3', '#fbcfe8', '#f9a8d4',
  '#f472b6', '#ec4899', '#fdf2f8', '#fbcfe8', '#f9a8d4',
  '#f472b6', '#ec4899', '#db2777', '#be185d', '#9d174d',
  '#831843', '#701a75', '#a21caf', '#c026d3', '#d946ef',
  '#e879f9', '#f0abfc', '#f5d0fe', '#fae8ff', '#fdf4ff',
];

const ColorPicker: React.FC<{
  color: string;
  onChange: (color: string) => void;
  label: string;
}> = ({ color, onChange, label }) => {
  const [open, setOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={pickerRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '8px 12px',
          backgroundColor: '#fff',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          cursor: 'pointer',
          width: '100%',
          transition: 'all 0.2s ease',
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = '#d1d5db';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = '#e5e7eb';
        }}
      >
        <div
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '4px',
            backgroundColor: color,
            border: '1px solid rgba(0,0,0,0.1)',
          }}
        />
        <span style={{ fontSize: '13px', color: '#374151', fontFamily: 'monospace' }}>
          {color}
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              left: 0,
              zIndex: 100,
              backgroundColor: '#fff',
              borderRadius: '10px',
              padding: '12px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.12)',
              border: '1px solid #e5e7eb',
              width: '200px',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(9, 1fr)',
                gap: '2px',
                marginBottom: '10px',
              }}
            >
              {colorPalette.slice(0, 81).map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    onChange(c);
                    setOpen(false);
                  }}
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '3px',
                    backgroundColor: c,
                    border: color.toLowerCase() === c.toLowerCase() ? '2px solid #374151' : '1px solid rgba(0,0,0,0.08)',
                    cursor: 'pointer',
                    transition: 'transform 0.15s ease',
                    padding: 0,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                  title={c}
                />
              ))}
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                paddingTop: '8px',
                borderTop: '1px solid #f3f4f6',
              }}
            >
              <span style={{ fontSize: '12px', color: '#6b7280' }}>#</span>
              <input
                type="text"
                value={color.replace('#', '')}
                onChange={(e) => {
                  let val = e.target.value.replace(/[^0-9a-fA-F]/g, '');
                  if (val.length <= 6) {
                    onChange('#' + val);
                  }
                }}
                style={{
                  flex: 1,
                  padding: '4px 6px',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  border: '1px solid #e5e7eb',
                  borderRadius: '4px',
                  outline: 'none',
                  textTransform: 'uppercase',
                }}
                maxLength={6}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const SliderControl: React.FC<{
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  label: string;
  accentColor: string;
}> = ({ value, min, max, step, onChange, label, accentColor }) => {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div style={{ width: '100%' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px',
        }}
      >
        <span style={{ fontSize: '13px', color: '#374151', fontWeight: 500 }}>{label}</span>
        <span
          style={{
            fontSize: '12px',
            color: '#6b7280',
            fontFamily: 'monospace',
            backgroundColor: '#fff',
            padding: '2px 8px',
            borderRadius: '4px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}
        >
          {value.toFixed(1)}x
        </span>
      </div>
      <div style={{ position: 'relative', height: '6px' }}>
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: 0,
            right: 0,
            height: '6px',
            transform: 'translateY(-50%)',
            backgroundColor: '#e5e7eb',
            borderRadius: '3px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${percentage}%`,
              backgroundColor: accentColor,
              borderRadius: '3px',
              transition: 'width 0.1s ease, background-color 0.2s ease',
            }}
          />
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            opacity: 0,
            cursor: 'pointer',
            margin: 0,
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: `calc(${percentage}% - 8px)`,
            width: '16px',
            height: '16px',
            backgroundColor: '#fff',
            border: `2px solid ${accentColor}`,
            borderRadius: '50%',
            transform: 'translateY(-50%)',
            pointerEvents: 'none',
            transition: 'left 0.1s ease, border-color 0.2s ease',
            boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
          }}
        />
      </div>
    </div>
  );
};

const varLabels: Record<string, string> = {
  '--primary': '主色',
  '--secondary': '辅助色',
  '--bg': '背景色',
  '--text': '文字色',
  '--radius': '圆角倍数',
  '--shadow': '阴影强度',
};

const ThemeEditor: React.FC<ThemeEditorProps> = ({ side, vars, onUpdate }) => {
  const primaryColor = vars['--primary'];

  return (
    <div style={{ padding: '16px' }}>
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: '8px',
          padding: '8px 12px',
          marginBottom: '16px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        }}
      >
        <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
          当前编辑
        </div>
        <div style={{ fontSize: '14px', fontWeight: 600, color: '#1f2937' }}>
          {side === 'left' ? '左侧主题组' : '右侧主题组'}
        </div>
      </div>

      <h3
        style={{
          fontSize: '13px',
          fontWeight: 600,
          color: '#374151',
          margin: '0 0 12px 0',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}
      >
        颜色变量
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
        {colorVarKeys.map((key) => (
          <div key={key}>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 500,
                color: '#374151',
                marginBottom: '6px',
              }}
            >
              {varLabels[key]}
            </label>
            <ColorPicker
              color={vars[key] as string}
              onChange={(val) => onUpdate(key, val as ThemeVars[typeof key])}
              label={varLabels[key]}
            />
          </div>
        ))}
      </div>

      <h3
        style={{
          fontSize: '13px',
          fontWeight: 600,
          color: '#374151',
          margin: '0 0 12px 0',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}
      >
        数值变量
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {numericVarKeys.map((key) => (
          <SliderControl
            key={key}
            value={vars[key] as number}
            min={0}
            max={3}
            step={0.1}
            onChange={(val) => onUpdate(key, val as ThemeVars[typeof key])}
            label={varLabels[key]}
            accentColor={primaryColor}
          />
        ))}
      </div>
    </div>
  );
};

export default ThemeEditor;
