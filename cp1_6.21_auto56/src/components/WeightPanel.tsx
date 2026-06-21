import { useState, useEffect } from 'react'
import type { Weights, WeightKey } from '../types'

interface WeightPanelProps {
  isOpen: boolean
  weights: Weights
  weightLabels: Record<WeightKey, string>
  onClose: () => void
  onChange: (weights: Weights) => void
}

export default function WeightPanel({
  isOpen,
  weights,
  weightLabels,
  onClose,
  onChange,
}: WeightPanelProps) {
  const [localWeights, setLocalWeights] = useState<Weights>(weights)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    setLocalWeights(weights)
  }, [weights])

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => setIsAnimating(true))
    } else {
      setIsAnimating(false)
    }
  }, [isOpen])

  const handleSliderChange = (key: WeightKey, value: number) => {
    const newWeights = { ...localWeights, [key]: value }
    setLocalWeights(newWeights)
    onChange(newWeights)
  }

  if (!isOpen && !isAnimating) return null

  const keys = Object.keys(weightLabels) as WeightKey[]

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.3)',
          zIndex: 999,
          opacity: isAnimating ? 1 : 0,
          transition: 'opacity 300ms ease',
        }}
      />
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: '360px',
          maxWidth: '100vw',
          height: '100vh',
          background: '#fff',
          boxShadow: '0 0 40px rgba(0,0,0,0.15)',
          zIndex: 1000,
          transform: isAnimating ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 300ms ease',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h3 style={{ fontSize: '18px', fontWeight: 700 }}>⚙️ 属性权重设置</h3>
          <button
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              color: 'var(--text-secondary)',
              transition: 'background 200ms',
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = 'var(--bg-gray)')}
            onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            ×
          </button>
        </div>

        <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px' }}>
            拖动滑块调整各属性的重要程度（1-10分），数值越高权重越大，系统将根据权重自动计算每个房源的综合得分。
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {keys.map((key) => (
              <div key={key}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '10px',
                  }}
                >
                  <label style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>
                    {weightLabels[key]}
                  </label>
                  <span
                    style={{
                      background: 'var(--primary)',
                      color: '#fff',
                      padding: '2px 10px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      minWidth: '32px',
                      textAlign: 'center',
                    }}
                  >
                    {localWeights[key]}
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={localWeights[key]}
                  onChange={(e) => handleSliderChange(key, Number(e.target.value))}
                  style={{
                    width: '100%',
                    height: '6px',
                    borderRadius: '3px',
                    background: `linear-gradient(to right, var(--primary) 0%, var(--primary) ${
                      ((localWeights[key] - 1) / 9) * 100
                    }%, var(--border) ${((localWeights[key] - 1) / 9) * 100}%, var(--border) 100%)`,
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                />
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: '6px',
                    fontSize: '11px',
                    color: 'var(--text-secondary)',
                  }}
                >
                  <span>1</span>
                  <span>5</span>
                  <span>10</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--border)',
            background: 'var(--bg-gray)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '13px',
              color: 'var(--text-secondary)',
            }}
          >
            <span>权重总和</span>
            <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '16px' }}>
              {Object.values(localWeights).reduce((a, b) => a + b, 0)}
            </span>
          </div>
        </div>
      </div>
      <style>{`
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #fff;
          border: 3px solid var(--primary);
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(74, 144, 217, 0.4);
        }
        input[type=range]::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #fff;
          border: 3px solid var(--primary);
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(74, 144, 217, 0.4);
        }
      `}</style>
    </>
  )
}
