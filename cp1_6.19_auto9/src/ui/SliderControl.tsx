import React from 'react'

interface SliderControlProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
  onReset: () => void
  defaultValue: number
  unit?: string
}

export const SliderControl: React.FC<SliderControlProps> = ({
  label,
  value,
  min,
  max,
  step,
  onChange,
  onReset,
  defaultValue,
  unit = '',
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value)
    onChange(newValue)
  }

  const isModified = Math.abs(value - defaultValue) > 0.001

  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '8px',
      }}>
        <span style={{
          color: '#e0e0e0',
          fontSize: '0.9rem',
          fontWeight: 500,
        }}>
          {label}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            color: '#9b59b6',
            fontSize: '0.85rem',
            fontWeight: 600,
            fontFamily: 'monospace',
            minWidth: '50px',
            textAlign: 'right',
          }}>
            {value.toFixed(step < 1 ? 1 : 0)}{unit}
          </span>
          <button
            onClick={onReset}
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '6px',
              border: isModified ? '1px solid rgba(155, 89, 182, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
              background: isModified ? 'rgba(155, 89, 182, 0.2)' : 'rgba(255, 255, 255, 0.05)',
              color: isModified ? '#9b59b6' : '#666',
              fontSize: '0.7rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              opacity: isModified ? 1 : 0.5,
            }}
            onMouseEnter={(e) => {
              if (isModified) {
                e.currentTarget.style.background = 'rgba(155, 89, 182, 0.4)'
              }
            }}
            onMouseLeave={(e) => {
              if (isModified) {
                e.currentTarget.style.background = 'rgba(155, 89, 182, 0.2)'
              }
            }}
            title="重置"
          >
            ↺
          </button>
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleChange}
        style={{
          width: '100%',
          height: '6px',
          borderRadius: '3px',
          background: 'rgba(255, 255, 255, 0.1)',
          outline: 'none',
          WebkitAppearance: 'none',
          cursor: 'pointer',
        }}
      />
      <style>{`
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: linear-gradient(135deg, #9b59b6, #3498db);
          cursor: pointer;
          box-shadow: 0 0 10px rgba(155, 89, 182, 0.5);
          transition: transform 0.2s ease;
        }
        input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.2);
        }
        input[type="range"]::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: linear-gradient(135deg, #9b59b6, #3498db);
          cursor: pointer;
          border: none;
          box-shadow: 0 0 10px rgba(155, 89, 182, 0.5);
        }
      `}</style>
    </div>
  )
}
