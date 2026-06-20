import { useState, useEffect, useRef } from 'react'
import type { ColorMap, ThemePreset } from '../theme/themeManager'
import { THEME_PRESETS, ThemeManager } from '../theme/themeManager'

interface ColorEditorProps {
  colors: ColorMap
  onChange: (name: string, value: string) => void
  onAddVariable: (name: string) => boolean
  onRemoveVariable: (name: string) => void
  onApplyPreset: (preset: ThemePreset) => void
  onReset: () => void
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
  onExportCss: () => void
  onExportScss: () => void
  onCopyCss: () => void
  isOpen?: boolean
  onToggle?: () => void
}

type ColorFormat = 'hex' | 'rgb' | 'hsl'

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')
}

function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  const rgb = hexToRgb(hex)
  if (!rgb) return null
  const r = rgb.r / 255, g = rgb.g / 255, b = rgb.b / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break
      case g: h = (b - r) / d + 2; break
      case b: h = (r - g) / d + 4; break
    }
    h /= 6
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) }
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100
  l /= 100
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

export function ColorEditor({
  colors,
  onChange,
  onAddVariable,
  onRemoveVariable,
  onApplyPreset,
  onReset,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onExportCss,
  onExportScss,
  onCopyCss,
  isOpen = true,
  onToggle,
}: ColorEditorProps) {
  const [activePicker, setActivePicker] = useState<string | null>(null)
  const [pickerFormat, setPickerFormat] = useState<ColorFormat>('hex')
  const [newVarName, setNewVarName] = useState('')
  const [copySuccess, setCopySuccess] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)

  const colorEntries = Object.entries(colors)
  const canAddMore = colorEntries.length < ThemeManager.getMaxVariables()

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setActivePicker(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleCopyCss = () => {
    onCopyCss()
    setCopySuccess(true)
    setTimeout(() => setCopySuccess(false), 1500)
  }

  const handleAddVariable = () => {
    if (!newVarName.trim()) return
    const success = onAddVariable(newVarName.trim())
    if (success) setNewVarName('')
  }

  const renderColorInput = (name: string, value: string) => {
    if (pickerFormat === 'hex') {
      return (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(name, e.target.value)}
          className="color-hex-input"
        />
      )
    }
    if (pickerFormat === 'rgb') {
      const rgb = hexToRgb(value) || { r: 0, g: 0, b: 0 }
      return (
        <div className="color-rgb-inputs">
          <input
            type="number"
            min="0"
            max="255"
            value={rgb.r}
            onChange={(e) => {
              const r = Math.min(255, Math.max(0, parseInt(e.target.value) || 0))
              onChange(name, rgbToHex(r, rgb.g, rgb.b))
            }}
          />
          <input
            type="number"
            min="0"
            max="255"
            value={rgb.g}
            onChange={(e) => {
              const g = Math.min(255, Math.max(0, parseInt(e.target.value) || 0))
              onChange(name, rgbToHex(rgb.r, g, rgb.b))
            }}
          />
          <input
            type="number"
            min="0"
            max="255"
            value={rgb.b}
            onChange={(e) => {
              const b = Math.min(255, Math.max(0, parseInt(e.target.value) || 0))
              onChange(name, rgbToHex(rgb.r, rgb.g, b))
            }}
          />
        </div>
      )
    }
    const hsl = hexToHsl(value) || { h: 0, s: 0, l: 0 }
    return (
      <div className="color-hsl-inputs">
        <input
          type="number"
          min="0"
          max="360"
          value={hsl.h}
          onChange={(e) => {
            const h = Math.min(360, Math.max(0, parseInt(e.target.value) || 0))
            onChange(name, hslToHex(h, hsl.s, hsl.l))
          }}
        />
        <input
          type="number"
          min="0"
          max="100"
          value={hsl.s}
          onChange={(e) => {
            const s = Math.min(100, Math.max(0, parseInt(e.target.value) || 0))
            onChange(name, hslToHex(hsl.h, s, hsl.l))
          }}
        />
        <input
          type="number"
          min="0"
          max="100"
          value={hsl.l}
          onChange={(e) => {
            const l = Math.min(100, Math.max(0, parseInt(e.target.value) || 0))
            onChange(name, hslToHex(hsl.h, hsl.s, l))
          }}
        />
      </div>
    )
  }

  const mobileToggle = onToggle ? (
    <button className="mobile-toggle" onClick={onToggle}>
      {isOpen ? '收起' : '展开'}编辑面板
    </button>
  ) : null

  return (
    <>
      {mobileToggle}
      <aside className={`color-editor ${isOpen ? 'open' : 'closed'}`}>
        <div className="editor-header">
          <h2>颜色变量编辑器</h2>
          <div className="history-buttons">
            <button onClick={onUndo} disabled={!canUndo} title="撤销 (Ctrl+Z)">
              ↶
            </button>
            <button onClick={onRedo} disabled={!canRedo} title="重做 (Ctrl+Shift+Z)">
              ↷
            </button>
            <button onClick={onReset} title="重置">
              ⟲
            </button>
          </div>
        </div>

        <div className="theme-presets">
          <h3>主题预设</h3>
          <div className="preset-list">
            {THEME_PRESETS.map((preset) => (
              <button
                key={preset.name}
                className="preset-card"
                onClick={() => onApplyPreset(preset)}
                style={{
                  background: `linear-gradient(135deg, ${preset.colors['--primary']}, ${preset.colors['--secondary']})`,
                }}
              >
                <span>{preset.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="color-variables">
          <h3>
            颜色变量 ({colorEntries.length}/{ThemeManager.getMaxVariables()})
          </h3>
          <div className="color-list">
            {colorEntries.map(([name, value]) => (
              <div key={name} className="color-item">
                <div
                  className="color-swatch"
                  style={{ backgroundColor: value }}
                  onClick={() => setActivePicker(activePicker === name ? null : name)}
                />
                <div className="color-info">
                  <span className="color-name">{name}</span>
                  {activePicker === name ? (
                    <div className="color-picker-popup" ref={pickerRef}>
                      <div className="picker-formats">
                        {(['hex', 'rgb', 'hsl'] as ColorFormat[]).map((fmt) => (
                          <button
                            key={fmt}
                            className={pickerFormat === fmt ? 'active' : ''}
                            onClick={() => setPickerFormat(fmt)}
                          >
                            {fmt.toUpperCase()}
                          </button>
                        ))}
                      </div>
                      <input
                        type="color"
                        value={value}
                        onChange={(e) => onChange(name, e.target.value)}
                        className="native-color-picker"
                      />
                      {renderColorInput(name, value)}
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => onChange(name, e.target.value)}
                      className="color-hex-input inline"
                    />
                  )}
                </div>
                {colorEntries.length > 8 && (
                  <button
                    className="remove-var-btn"
                    onClick={() => onRemoveVariable(name)}
                    title="删除变量"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>

          {canAddMore && (
            <div className="add-variable">
              <input
                type="text"
                placeholder="新变量名 (如 --warning)"
                value={newVarName}
                onChange={(e) => setNewVarName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddVariable()}
              />
              <button onClick={handleAddVariable}>添加</button>
            </div>
          )}
        </div>

        <div className="export-section">
          <h3>导出</h3>
          <div className="export-buttons">
            <button onClick={handleCopyCss} className={copySuccess ? 'success' : ''}>
              {copySuccess ? '已复制 ✓' : '复制 CSS'}
            </button>
            <button onClick={onExportCss}>下载 CSS</button>
            <button onClick={onExportScss}>下载 SCSS</button>
          </div>
        </div>
      </aside>
    </>
  )
}
