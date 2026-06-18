import React from 'react'
import { useProcessingStore } from '../store/processingStore'
import { RATIO_LABELS, LUT_LABELS } from '../engine/types'
import type { CropRatio, LUTPreset } from '../engine/types'

const controlPanelStyle: React.CSSProperties = {
  width: '320px',
  backgroundColor: '#1e1e1e',
  padding: '24px',
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
  borderRight: '1px solid #333',
  fontFamily: 'Inter, sans-serif',
  overflowY: 'auto',
}

const labelStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#9e9e9e',
  marginBottom: '8px',
  display: 'block',
  fontWeight: 500,
  letterSpacing: '0.02em',
}

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  backgroundColor: '#121212',
  border: '2px solid #333',
  borderRadius: '2px',
  color: '#e0e0e0',
  fontSize: '14px',
  fontFamily: 'Inter, sans-serif',
  cursor: 'pointer',
  transition: 'border-color 0.2s ease',
  outline: 'none',
}

const sliderContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
}

const sliderRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
}

const sliderStyle: React.CSSProperties = {
  flex: 1,
  height: '4px',
  WebkitAppearance: 'none',
  appearance: 'none',
  background: '#333',
  borderRadius: '2px',
  outline: 'none',
  cursor: 'pointer',
}

const valueInputStyle: React.CSSProperties = {
  width: '60px',
  padding: '6px 8px',
  backgroundColor: '#121212',
  border: '2px solid #333',
  borderRadius: '2px',
  color: '#e0e0e0',
  fontSize: '13px',
  fontFamily: 'Inter, sans-serif',
  textAlign: 'center',
  transition: 'border-color 0.2s ease',
  outline: 'none',
  MozAppearance: 'textfield',
}

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 600,
  color: '#e0e0e0',
  marginBottom: '8px',
  paddingBottom: '8px',
  borderBottom: '1px solid #333',
}

export const ControlPanel: React.FC = () => {
  const {
    params,
    setCropRatio,
    setBrightness,
    setColorTemp,
    setLutPreset,
    images,
  } = useProcessingStore()

  const handleSelectFocus = (e: React.FocusEvent<HTMLSelectElement>) => {
    e.target.style.borderColor = '#1a73e8'
  }

  const handleSelectBlur = (e: React.FocusEvent<HTMLSelectElement>) => {
    e.target.style.borderColor = '#333'
  }

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = '#1a73e8'
  }

  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = '#333'
  }

  return (
    <div className="control-panel-desktop" style={controlPanelStyle}>
      <div>
        <h3 style={sectionTitleStyle}>裁剪设置</h3>
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>裁剪比例</label>
          <select
            value={params.cropRatio}
            onChange={(e) => setCropRatio(e.target.value as CropRatio)}
            style={selectStyle}
            onFocus={handleSelectFocus}
            onBlur={handleSelectBlur}
          >
            {Object.entries(RATIO_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <h3 style={sectionTitleStyle}>色彩调整</h3>

        <div style={sliderContainerStyle}>
          <label style={labelStyle}>亮度</label>
          <div style={sliderRowStyle}>
            <input
              type="range"
              min="-50"
              max="50"
              step="1"
              value={params.brightness}
              onChange={(e) => setBrightness(Number(e.target.value))}
              style={sliderStyle}
            />
            <input
              type="number"
              min="-50"
              max="50"
              step="1"
              value={params.brightness}
              onChange={(e) => {
                const val = Math.max(-50, Math.min(50, Number(e.target.value)))
                setBrightness(isNaN(val) ? 0 : val)
              }}
              style={valueInputStyle}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
            />
          </div>
        </div>

        <div style={{ ...sliderContainerStyle, marginTop: '16px' }}>
          <label style={labelStyle}>色温</label>
          <div style={sliderRowStyle}>
            <input
              type="range"
              min="-50"
              max="50"
              step="1"
              value={params.colorTemp}
              onChange={(e) => setColorTemp(Number(e.target.value))}
              style={sliderStyle}
            />
            <input
              type="number"
              min="-50"
              max="50"
              step="1"
              value={params.colorTemp}
              onChange={(e) => {
                const val = Math.max(-50, Math.min(50, Number(e.target.value)))
                setColorTemp(isNaN(val) ? 0 : val)
              }}
              style={valueInputStyle}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
            />
          </div>
        </div>

        <div style={{ marginTop: '16px' }}>
          <label style={labelStyle}>颜色预设</label>
          <select
            value={params.lutPreset}
            onChange={(e) => setLutPreset(e.target.value as LUTPreset)}
            style={selectStyle}
            onFocus={handleSelectFocus}
            onBlur={handleSelectBlur}
          >
            {Object.entries(LUT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {images.length > 0 && (
        <div style={{ marginTop: 'auto', paddingTop: '16px' }}>
          <div
            style={{
              fontSize: '12px',
              color: '#9e9e9e',
              textAlign: 'center',
              padding: '8px',
              backgroundColor: '#121212',
              borderRadius: '2px',
              border: '1px solid #333',
            }}
          >
            已上传 {images.length} 张图片
          </div>
        </div>
      )}

      <style>{`
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #1a73e8;
          cursor: pointer;
          transition: transform 0.1s ease;
        }
        input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.2);
        }
        input[type="range"]::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #1a73e8;
          cursor: pointer;
          border: none;
          transition: transform 0.1s ease;
        }
        input[type="range"]::-moz-range-thumb:hover {
          transform: scale(1.2);
        }
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
      `}</style>
    </div>
  )
}
