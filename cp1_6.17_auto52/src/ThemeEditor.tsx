import React, { useState, useCallback } from 'react';
import { ChromePicker, ColorResult } from 'react-color';
import { ThemeColors, ColorKey, COLOR_KEY_LABELS, COLOR_KEYS } from './types';

type InputMode = 'hex' | 'rgb' | 'hsl';

interface ThemeEditorProps {
  colors: ThemeColors;
  colorOrder: ColorKey[];
  onColorChange: (key: ColorKey, value: string) => void;
  onColorOrderChange: (order: ColorKey[]) => void;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : null;
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: Math.round(l * 100) };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function getColorDisplayValue(hex: string, mode: InputMode): string {
  if (mode === 'hex') return hex;
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  if (mode === 'rgb') return `${rgb.r}, ${rgb.g}, ${rgb.b}`;
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  return `${hsl.h}, ${hsl.s}%, ${hsl.l}%`;
}

function parseColorInput(value: string, mode: InputMode): string | null {
  if (mode === 'hex') {
    const cleaned = value.startsWith('#') ? value : `#${value}`;
    if (/^#[0-9a-fA-F]{6}$/.test(cleaned)) return cleaned;
    if (/^#[0-9a-fA-F]{3}$/.test(cleaned)) {
      return `#${cleaned[1]}${cleaned[1]}${cleaned[2]}${cleaned[2]}${cleaned[3]}${cleaned[3]}`;
    }
    return null;
  }
  if (mode === 'rgb') {
    const parts = value.split(',').map((s) => parseInt(s.trim(), 10));
    if (parts.length === 3 && parts.every((p) => !isNaN(p) && p >= 0 && p <= 255)) {
      return `#${parts.map((p) => p.toString(16).padStart(2, '0')).join('')}`;
    }
    return null;
  }
  if (mode === 'hsl') {
    const match = value.match(/(\d+)\s*,\s*(\d+)%?\s*,\s*(\d+)%?/);
    if (match) {
      const h = parseInt(match[1]) / 360;
      const s = parseInt(match[2]) / 100;
      const l = parseInt(match[3]) / 100;
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };
      let r: number, g: number, b: number;
      if (s === 0) { r = g = b = l; }
      else {
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
      }
      return `#${[r, g, b].map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('')}`;
    }
    return null;
  }
  return null;
}

const ThemeEditor: React.FC<ThemeEditorProps> = ({ colors, colorOrder, onColorChange, onColorOrderChange }) => {
  const [selectedKey, setSelectedKey] = useState<ColorKey>('primary');
  const [inputMode, setInputMode] = useState<InputMode>('hex');
  const [inputValues, setInputValues] = useState<Record<ColorKey, string>>(
    Object.fromEntries(COLOR_KEYS.map((k) => [k, getColorDisplayValue(colors[k], 'hex')])) as Record<ColorKey, string>
  );
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handlePickerChange = useCallback((color: ColorResult) => {
    onColorChange(selectedKey, color.hex);
    setInputValues((prev) => ({ ...prev, [selectedKey]: getColorDisplayValue(color.hex, inputMode) }));
  }, [selectedKey, inputMode, onColorChange]);

  const handleInputChange = useCallback((key: ColorKey, value: string) => {
    setInputValues((prev) => ({ ...prev, [key]: value }));
    const parsed = parseColorInput(value, inputMode);
    if (parsed) {
      onColorChange(key, parsed);
    }
  }, [inputMode, onColorChange]);

  const handleInputModeChange = useCallback((mode: InputMode) => {
    setInputMode(mode);
    const newValues: Record<string, string> = {};
    COLOR_KEYS.forEach((k) => { newValues[k] = getColorDisplayValue(colors[k], mode); });
    setInputValues(newValues as Record<ColorKey, string>);
  }, [colors]);

  const handleDragStart = useCallback((index: number) => {
    setDragIndex(index);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  }, []);

  const handleDragEnd = useCallback(() => {
    if (dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex) {
      const newOrder = [...colorOrder];
      const [removed] = newOrder.splice(dragIndex, 1);
      newOrder.splice(dragOverIndex, 0, removed);
      onColorOrderChange(newOrder);
    }
    setDragIndex(null);
    setDragOverIndex(null);
  }, [dragIndex, dragOverIndex, colorOrder, onColorOrderChange]);

  return (
    <div className="editor-panel">
      <h2 className="section-title">Theme Editor</h2>

      <div className="subsection-title">Color Swatches</div>
      <div className="color-swatches">
        {colorOrder.map((key, index) => (
          <div
            key={key}
            className={`color-swatch ${selectedKey === key ? 'active' : ''} ${dragIndex === index ? 'dragging' : ''} ${dragOverIndex === index ? 'drag-over' : ''}`}
            style={{ backgroundColor: colors[key] }}
            onClick={() => {
              setSelectedKey(key);
              setInputValues((prev) => ({ ...prev, [key]: getColorDisplayValue(colors[key], inputMode) }));
            }}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
          >
            <span className="color-swatch-label">{COLOR_KEY_LABELS[key]}</span>
          </div>
        ))}
      </div>

      <div className="divider" />

      <div className="editor-section">
        <h3>{COLOR_KEY_LABELS[selectedKey]}</h3>

        <ChromePicker
          color={colors[selectedKey]}
          onChange={handlePickerChange}
          disableAlpha
        />

        <div className="divider" />

        <div className="input-mode-tabs">
          {(['hex', 'rgb', 'hsl'] as InputMode[]).map((mode) => (
            <button
              key={mode}
              className={`input-mode-tab ${inputMode === mode ? 'active' : ''}`}
              onClick={() => handleInputModeChange(mode)}
            >
              {mode.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="color-input-group">
          <label>{inputMode.toUpperCase()}</label>
          <input
            type="text"
            value={inputValues[selectedKey] || ''}
            onChange={(e) => handleInputChange(selectedKey, e.target.value)}
            placeholder={inputMode === 'hex' ? '#000000' : inputMode === 'rgb' ? '0, 0, 0' : '0, 0%, 0%'}
          />
        </div>
      </div>

      <div className="divider" />

      <div className="editor-section">
        <div className="subsection-title">All Colors</div>
        {colorOrder.map((key) => (
          <div key={key} className="color-input-group">
            <div style={{ width: 20, height: 20, borderRadius: 6, backgroundColor: colors[key], border: '1px solid rgba(0,0,0,0.1)', flexShrink: 0 }} />
            <label style={{ minWidth: 90 }}>{COLOR_KEY_LABELS[key]}</label>
            <input
              type="text"
              value={inputValues[key] || ''}
              onChange={(e) => handleInputChange(key, e.target.value)}
              onFocus={() => {
                setSelectedKey(key);
                setInputValues((prev) => ({ ...prev, [key]: getColorDisplayValue(colors[key], inputMode) }));
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ThemeEditor;
