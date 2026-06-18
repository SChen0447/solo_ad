import React, { useState, useCallback } from 'react'
import { useAppStore } from './store'
import { FontEngine } from './FontEngine'

interface SliderConfig {
  key: 'tracking' | 'lineHeight' | 'fontWeight' | 'obliqueAngle' | 'horizontalScale' | 'verticalScale'
  label: string
  min: number
  max: number
  step: number
  unit: string
  displayUnit: string
  precision: number
}

const SLIDERS: SliderConfig[] = [
  { key: 'tracking', label: '字距', min: -0.2, max: 0.5, step: 0.01, unit: 'em', displayUnit: 'em', precision: 2 },
  { key: 'lineHeight', label: '行高', min: 1.0, max: 2.5, step: 0.1, unit: '', displayUnit: '', precision: 2 },
  { key: 'fontWeight', label: '字重', min: 100, max: 900, step: 100, unit: '', displayUnit: '', precision: 0 },
  { key: 'obliqueAngle', label: '倾斜度', min: -10, max: 10, step: 1, unit: 'deg', displayUnit: '°', precision: 0 },
  { key: 'horizontalScale', label: '水平缩放', min: 50, max: 200, step: 1, unit: '%', displayUnit: '%', precision: 0 },
  { key: 'verticalScale', label: '垂直缩放', min: 50, max: 200, step: 1, unit: '%', displayUnit: '%', precision: 0 }
]

interface ParamPanelProps {
  onClose?: () => void
}

export const ParamPanel: React.FC<ParamPanelProps> = ({ onClose }) => {
  const params = useAppStore((s) => s.params)
  const updateParam = useAppStore((s) => s.updateParam)
  const resetParams = useAppStore((s) => s.resetParams)
  const [exportSuccess, setExportSuccess] = useState(false)
  const [inputValues, setInputValues] = useState<Record<string, string>>({})

  const handleSliderChange = useCallback((config: SliderConfig, value: number) => {
    updateParam(config.key, value as never)
  }, [updateParam])

  const handleInputChange = useCallback((config: SliderConfig, raw: string) => {
    setInputValues((prev) => ({ ...prev, [config.key]: raw }))
    const num = parseFloat(raw)
    if (!isNaN(num)) {
      const clamped = Math.min(Math.max(num, config.min), config.max)
      updateParam(config.key, clamped as never)
    }
  }, [updateParam])

  const handleInputBlur = useCallback((config: SliderConfig) => {
    setInputValues((prev) => {
      const next = { ...prev }
      delete next[config.key]
      return next
    })
  }, [])

  const getDisplayValue = (config: SliderConfig): string => {
    if (inputValues[config.key] !== undefined) {
      return inputValues[config.key]
    }
    const value = params[config.key] as number
    return value.toFixed(config.precision)
  }

  const handleExportCSS = useCallback(async () => {
    const css = FontEngine.exportCSSVariables(params)
    try {
      await navigator.clipboard.writeText(css)
      setExportSuccess(true)
      setTimeout(() => setExportSuccess(false), 1800)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = css
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setExportSuccess(true)
      setTimeout(() => setExportSuccess(false), 1800)
    }
  }, [params])

  return (
    <div style={panelStyle}>
      {onClose && (
        <button
          onClick={onClose}
          style={closeBtnStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(80, 160, 255, 0.3)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'scale(0.92)'
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'scale(1)'
          }}
        >
          ✕
        </button>
      )}

      <h2 style={titleStyle}>排版参数</h2>

      <div style={slidersContainerStyle}>
        {SLIDERS.map((config) => {
          const value = params[config.key] as number
          const percent = ((value - config.min) / (config.max - config.min)) * 100
          return (
            <div key={config.key} style={sliderRowStyle}>
              <div style={sliderLabelRowStyle}>
                <span style={sliderLabelStyle}>{config.label}</span>
                <div style={inputWrapperStyle}>
                  <input
                    type="text"
                    value={getDisplayValue(config)}
                    onChange={(e) => handleInputChange(config, e.target.value)}
                    onBlur={() => handleInputBlur(config)}
                    style={inputStyle}
                  />
                  <span style={inputUnitStyle}>{config.displayUnit}</span>
                </div>
              </div>
              <div style={sliderTrackContainerStyle}>
                <div
                  style={{
                    ...sliderFillStyle,
                    width: `${percent}%`
                  }}
                />
                <input
                  type="range"
                  min={config.min}
                  max={config.max}
                  step={config.step}
                  value={value}
                  onChange={(e) => handleSliderChange(config, parseFloat(e.target.value))}
                  style={sliderInputStyle}
                />
              </div>
              <div style={sliderRangeStyle}>
                <span>{config.min}{config.displayUnit}</span>
                <span>{config.max}{config.displayUnit}</span>
              </div>
            </div>
          )
        })}
      </div>

      <div style={buttonContainerStyle}>
        <button
          onClick={resetParams}
          style={actionBtnStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 120, 120, 0.25)'
            e.currentTarget.style.borderColor = 'rgba(255, 120, 120, 0.6)'
            e.currentTarget.style.transform = 'scale(1.03)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'
            e.currentTarget.style.transform = 'scale(1)'
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'scale(0.95)'
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'scale(1.03)'
          }}
        >
          重置参数
        </button>
        <button
          onClick={handleExportCSS}
          style={{
            ...actionBtnStyle,
            background: exportSuccess ? 'rgba(80, 220, 140, 0.3)' : 'transparent',
            borderColor: exportSuccess ? 'rgba(80, 220, 140, 0.7)' : 'rgba(80, 160, 255, 0.4)'
          }}
          onMouseEnter={(e) => {
            if (!exportSuccess) {
              e.currentTarget.style.background = 'rgba(80, 160, 255, 0.25)'
              e.currentTarget.style.transform = 'scale(1.03)'
            }
          }}
          onMouseLeave={(e) => {
            if (!exportSuccess) {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.transform = 'scale(1)'
            }
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'scale(0.95)'
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'scale(1.03)'
          }}
        >
          {exportSuccess ? '✓ 已复制' : '导出 CSS'}
        </button>
      </div>

      <div style={dividerStyle} />
    </div>
  )
}

const panelStyle: React.CSSProperties = {
  position: 'relative',
  width: '100%',
  height: '100%',
  padding: '24px 20px',
  boxSizing: 'border-box',
  background: 'rgba(30, 30, 30, 0.85)',
  backdropFilter: 'blur(18px)',
  WebkitBackdropFilter: 'blur(18px)',
  color: '#F0F0F0',
  fontFamily: '"Inter", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif',
  overflowY: 'auto',
  overflowX: 'hidden'
}

const closeBtnStyle: React.CSSProperties = {
  position: 'absolute',
  top: '12px',
  right: '14px',
  width: '32px',
  height: '32px',
  borderRadius: '50%',
  border: 'none',
  background: 'transparent',
  color: '#CCC',
  fontSize: '16px',
  cursor: 'pointer',
  display: 'none',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.15s ease'
}

const titleStyle: React.CSSProperties = {
  fontSize: '17px',
  fontWeight: 600,
  margin: '0 0 22px 0',
  paddingBottom: '12px',
  borderBottom: '1px solid rgba(255,255,255,0.08)',
  letterSpacing: '0.03em',
  background: 'linear-gradient(135deg, #8AB4F8 0%, #B48EF8 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text'
}

const slidersContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '18px'
}

const sliderRowStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px'
}

const sliderLabelRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '2px'
}

const sliderLabelStyle: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: 500,
  color: 'rgba(255,255,255,0.8)'
}

const inputWrapperStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  background: 'rgba(255,255,255,0.06)',
  borderRadius: '6px',
  padding: '2px 8px',
  border: '1px solid rgba(255,255,255,0.08)'
}

const inputStyle: React.CSSProperties = {
  width: '50px',
  background: 'transparent',
  border: 'none',
  outline: 'none',
  color: '#FFF',
  fontSize: '12px',
  fontWeight: 600,
  textAlign: 'right',
  fontFamily: 'inherit'
}

const inputUnitStyle: React.CSSProperties = {
  fontSize: '11px',
  color: 'rgba(255,255,255,0.5)',
  marginLeft: '3px'
}

const sliderTrackContainerStyle: React.CSSProperties = {
  position: 'relative',
  height: '8px',
  display: 'flex',
  alignItems: 'center'
}

const sliderFillStyle: React.CSSProperties = {
  position: 'absolute',
  left: '0',
  top: '50%',
  transform: 'translateY(-50%)',
  height: '4px',
  borderRadius: '2px',
  background: 'linear-gradient(90deg, #5B9BFF, #9B6DFF)',
  pointerEvents: 'none',
  zIndex: 1
}

const sliderInputStyle: React.CSSProperties = {
  position: 'relative',
  width: '100%',
  height: '20px',
  margin: 0,
  padding: 0,
  background: `linear-gradient(to right,
    rgba(255,255,255,0.15) 0%,
    rgba(255,255,255,0.25) 50%,
    rgba(255,255,255,0.15) 100%)`,
  borderRadius: '4px',
  outline: 'none',
  WebkitAppearance: 'none',
  appearance: 'none',
  cursor: 'pointer',
  zIndex: 2,
  accentColor: 'transparent'
} as React.CSSProperties

const sliderRangeStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: '10px',
  color: 'rgba(255,255,255,0.35)',
  padding: '0 2px'
}

const buttonContainerStyle: React.CSSProperties = {
  display: 'flex',
  gap: '10px',
  marginTop: '28px'
}

const actionBtnStyle: React.CSSProperties = {
  flex: 1,
  padding: '10px 12px',
  borderRadius: '8px',
  border: '1px solid rgba(255,255,255,0.2)',
  background: 'transparent',
  color: '#FFF',
  fontSize: '12.5px',
  fontWeight: 500,
  cursor: 'pointer',
  fontFamily: 'inherit',
  transition: 'all 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)'
}

const dividerStyle: React.CSSProperties = {
  position: 'absolute',
  right: 0,
  top: 0,
  width: '1.5px',
  height: '100%',
  background: 'linear-gradient(180deg, transparent 0%, rgba(91, 155, 255, 0.5) 30%, rgba(155, 109, 255, 0.5) 70%, transparent 100%)',
  boxShadow: '0 0 16px rgba(91, 155, 255, 0.35)',
  pointerEvents: 'none'
}

const sliderGlobalCSS = `
  @media (max-width: 900px) {
    .param-panel-close {
      display: flex !important;
    }
  }
  input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #FFFFFF;
    box-shadow: 0 2px 8px rgba(0,0,0,0.4), 0 0 0 2px rgba(91, 155, 255, 0.3);
    cursor: pointer;
    transition: transform 0.12s ease, box-shadow 0.12s ease;
    border: none;
  }
  input[type="range"]::-webkit-slider-thumb:hover {
    transform: scale(1.15);
    box-shadow: 0 3px 12px rgba(0,0,0,0.5), 0 0 0 3px rgba(155, 109, 255, 0.4);
  }
  input[type="range"]::-webkit-slider-thumb:active {
    transform: scale(0.95);
  }
  input[type="range"]::-moz-range-thumb {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #FFFFFF;
    box-shadow: 0 2px 8px rgba(0,0,0,0.4), 0 0 0 2px rgba(91, 155, 255, 0.3);
    cursor: pointer;
    border: none;
  }
  input[type="range"]::-moz-range-track {
    background: transparent;
    border: none;
  }
  input[type=number]::-webkit-inner-spin-button,
  input[type=number]::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
`

const styleEl = typeof document !== 'undefined' ? document.createElement('style') : null
if (styleEl) {
  styleEl.textContent = sliderGlobalCSS
  document.head.appendChild(styleEl)
}
