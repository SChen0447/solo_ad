import { useState, useEffect } from 'react'
import { hexToHsl, hslToHex, isValidHex } from '../../utils/colorUtils'

interface ColorPickerProps {
  value: string
  onChange: (hex: string) => void
  label?: string
}

export default function ColorPicker({ value, onChange, label }: ColorPickerProps) {
  const [hex, setHex] = useState(value)
  const [hsl, setHsl] = useState(hexToHsl(value))
  const [mode, setMode] = useState<'hex' | 'hsl'>('hex')

  useEffect(() => {
    setHex(value)
    if (isValidHex(value)) {
      setHsl(hexToHsl(value))
    }
  }, [value])

  const handleHexChange = (val: string) => {
    let newHex = val
    if (!newHex.startsWith('#')) newHex = '#' + newHex
    setHex(newHex)
    if (isValidHex(newHex)) {
      setHsl(hexToHsl(newHex))
      onChange(newHex)
    }
  }

  const handleHslChange = (key: 'h' | 's' | 'l', val: number) => {
    const newHsl = { ...hsl, [key]: val }
    setHsl(newHsl)
    const newHex = hslToHex(newHsl.h, newHsl.s, newHsl.l)
    setHex(newHex)
    onChange(newHex)
  }

  return (
    <div className="color-picker">
      {label && <label className="color-picker-label">{label}</label>}
      <div className="color-picker-row">
        <input
          type="color"
          className="color-picker-native"
          value={isValidHex(hex) ? hex : '#000000'}
          onChange={(e) => handleHexChange(e.target.value)}
        />
        <div className="color-picker-switch">
          <button
            type="button"
            className={mode === 'hex' ? 'active' : ''}
            onClick={() => setMode('hex')}
          >
            HEX
          </button>
          <button
            type="button"
            className={mode === 'hsl' ? 'active' : ''}
            onClick={() => setMode('hsl')}
          >
            HSL
          </button>
        </div>
      </div>
      {mode === 'hex' ? (
        <input
          type="text"
          className="color-picker-input"
          value={hex}
          onChange={(e) => handleHexChange(e.target.value)}
          placeholder="#RRGGBB"
        />
      ) : (
        <div className="color-picker-hsl">
          <div className="hsl-field">
            <span>H</span>
            <input
              type="number"
              min={0}
              max={360}
              value={hsl.h}
              onChange={(e) => handleHslChange('h', Math.min(360, Math.max(0, parseInt(e.target.value) || 0)))}
            />
          </div>
          <div className="hsl-field">
            <span>S</span>
            <input
              type="number"
              min={0}
              max={100}
              value={hsl.s}
              onChange={(e) => handleHslChange('s', Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
            />
            <span>%</span>
          </div>
          <div className="hsl-field">
            <span>L</span>
            <input
              type="number"
              min={0}
              max={100}
              value={hsl.l}
              onChange={(e) => handleHslChange('l', Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
            />
            <span>%</span>
          </div>
        </div>
      )}
    </div>
  )
}
