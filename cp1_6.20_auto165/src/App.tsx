import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  generatePalette,
  getPaletteArray,
} from './modules/colorEngine/colorPaletteGenerator'
import { checkContrast } from './modules/colorEngine/contrastChecker'
import { applyTheme } from './modules/uiPreview/themeApplier'
import ComponentRenderer from './modules/uiPreview/componentRenderer'
import type { ColorPalette, ColorSwatch } from './modules/colorEngine/colorTypes'

const DEFAULT_PRIMARY = '#3498db'
const LIGHT_BG = '#f8f9fa'
const DARK_BG = '#1a1a2e'

const CheckIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="#27ae60"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

const CrossIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="#e74c3c"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

interface ColorSwatchCardProps {
  swatch: ColorSwatch
  contrastPass: boolean | null
  contrastRatio: number | null
  onCopy: () => void
  onContrastClick: () => void
  copied: boolean
}

const ColorSwatchCard: React.FC<ColorSwatchCardProps> = ({
  swatch,
  contrastPass,
  contrastRatio,
  onCopy,
  onContrastClick,
  copied,
}) => {
  const textColor = swatch.isLight ? '#1a1a2e' : '#ffffff'

  return (
    <motion.div
      style={{
        width: '160px',
        height: '60px',
        borderRadius: '8px',
        backgroundColor: swatch.hex,
        cursor: 'pointer',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '8px 12px',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        userSelect: 'none',
      }}
      whileHover={{
        y: -4,
        boxShadow: '0 6px 12px rgba(0, 0, 0, 0.2)',
      }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      onClick={onCopy}
    >
      <span
        style={{
          fontSize: '12px',
          color: textColor,
          fontWeight: 500,
          opacity: 0.9,
        }}
      >
        {swatch.name}
      </span>
      <span
        style={{
          fontSize: '11px',
          color: textColor,
          fontFamily: 'monospace',
          opacity: 0.8,
        }}
      >
        {swatch.hex}
      </span>

      {contrastPass !== null && (
        <div
          style={{
            position: 'absolute',
            bottom: '4px',
            right: '6px',
            cursor: 'pointer',
          }}
          onClick={(e) => {
            e.stopPropagation()
            onContrastClick()
          }}
          title={contrastRatio ? `${contrastRatio}:1` : ''}
        >
          {contrastPass ? <CheckIcon size={16} /> : <CrossIcon size={16} />}
        </div>
      )}

      <AnimatePresence>
        {copied && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              color: '#ffffff',
              padding: '4px 10px',
              borderRadius: '4px',
              fontSize: '12px',
              whiteSpace: 'nowrap',
            }}
          >
            已复制
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

const App: React.FC = () => {
  const [inputColor, setInputColor] = useState(DEFAULT_PRIMARY)
  const [palette, setPalette] = useState<ColorPalette | null>(null)
  const [darkMode, setDarkMode] = useState(false)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [contrastTooltip, setContrastTooltip] = useState<{
    visible: boolean
    ratio: number
    name: string
  } | null>(null)

  useEffect(() => {
    const initialPalette = generatePalette(DEFAULT_PRIMARY)
    setPalette(initialPalette)
    applyTheme(initialPalette)
  }, [])

  const handleGenerate = useCallback(() => {
    try {
      const newPalette = generatePalette(inputColor)
      setPalette(newPalette)
      applyTheme(newPalette)
    } catch (e) {
      alert('请输入有效的十六进制颜色值，例如：#3498db')
    }
  }, [inputColor])

  const handleCopy = useCallback((hex: string, index: number) => {
    navigator.clipboard.writeText(hex).then(() => {
      setCopiedIndex(index)
      setTimeout(() => setCopiedIndex(null), 1500)
    })
  }, [])

  const handleContrastClick = useCallback(
    (name: string, ratio: number) => {
      setContrastTooltip({ visible: true, ratio, name })
      setTimeout(() => setContrastTooltip(null), 2000)
    },
    [],
  )

  const paletteArray = palette ? getPaletteArray(palette) : []

  const getContrastForSwatch = (swatch: ColorSwatch, index: number) => {
    if (!palette) return { pass: null, ratio: null }

    if (index === 0) {
      const result = checkContrast(swatch.hex, '#ffffff')
      return { pass: result.passAA, ratio: result.ratio }
    }
    if (index === 2) {
      const result = checkContrast('#ffffff', swatch.hex)
      return { pass: result.passAA, ratio: result.ratio }
    }
    if (index === 3) {
      const result = checkContrast(swatch.hex, palette.primaryLight.hex)
      return { pass: result.passAA, ratio: result.ratio }
    }
    if (index === 1) {
      const result = checkContrast('#1a1a2e', swatch.hex)
      return { pass: result.passAA, ratio: result.ratio }
    }
    if (index === 6 || index === 7 || index === 8) {
      const result = checkContrast('#ffffff', swatch.hex)
      return { pass: result.passAA, ratio: result.ratio }
    }

    return { pass: null, ratio: null }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#f0f2f5',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: '#1a1a2e',
      }}
    >
      <div
        className="app-container"
        style={{
          display: 'flex',
          flexDirection: 'row',
          gap: '24px',
          padding: '24px',
          maxWidth: '1400px',
          margin: '0 auto',
        }}
      >
        <style>{`
          @media (max-width: 768px) {
            .app-container {
              flex-direction: column !important;
            }
            .left-panel {
              width: 100% !important;
            }
            .right-panel {
              width: 100% !important;
            }
            .swatch-grid {
              grid-template-columns: repeat(2, 1fr) !important;
            }
          }
          @media (min-width: 769px) {
            .swatch-grid {
              grid-template-columns: repeat(2, 1fr) !important;
            }
          }
        `}</style>

        <div
          className="left-panel"
          style={{
            width: '400px',
            flexShrink: 0,
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '24px',
            border: '0.5px solid #e0e0e0',
            boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.04)',
          }}
        >
          <h2
            style={{
              fontSize: '20px',
              fontWeight: 600,
              marginBottom: '20px',
              color: '#1a1a2e',
            }}
          >
            品牌色板生成器
          </h2>

          <div style={{ marginBottom: '24px' }}>
            <div
              style={{
                display: 'flex',
                gap: '12px',
                alignItems: 'center',
              }}
            >
              <input
                type="text"
                value={inputColor}
                onChange={(e) => setInputColor(e.target.value)}
                placeholder="#3498db"
                style={{
                  flex: 1,
                  height: '42px',
                  borderRadius: '8px',
                  border: '1px solid #e0e0e0',
                  padding: '0 12px',
                  fontSize: '14px',
                  fontFamily: 'monospace',
                  outline: 'none',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--color-primary, #3498db)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e0e0e0'
                }}
              />
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleGenerate}
                style={{
                  height: '42px',
                  padding: '0 20px',
                  borderRadius: '8px',
                  backgroundColor: palette?.primary.hex || '#3498db',
                  color: '#ffffff',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                }}
              >
                生成
              </motion.button>
            </div>
          </div>

          <div>
            <h3
              style={{
                fontSize: '14px',
                fontWeight: 500,
                marginBottom: '12px',
                color: '#6c757d',
              }}
            >
              色板预览
            </h3>
            <div
              className="swatch-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '12px',
              }}
            >
              {paletteArray.map((swatch, index) => {
                const contrast = getContrastForSwatch(swatch, index)
                return (
                  <ColorSwatchCard
                    key={swatch.variableName}
                    swatch={swatch}
                    contrastPass={contrast.pass}
                    contrastRatio={contrast.ratio}
                    onCopy={() => handleCopy(swatch.hex, index)}
                    onContrastClick={() =>
                      contrast.ratio !== null &&
                      handleContrastClick(swatch.name, contrast.ratio)
                    }
                    copied={copiedIndex === index}
                  />
                )
              })}
            </div>
          </div>

          <AnimatePresence>
            {contrastTooltip?.visible && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                style={{
                  position: 'fixed',
                  bottom: '24px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: 'rgba(0, 0, 0, 0.85)',
                  color: '#ffffff',
                  padding: '10px 18px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  zIndex: 1000,
                }}
              >
                {contrastTooltip.name} 对比度：{contrastTooltip.ratio}:1
                {contrastTooltip.ratio >= 4.5 ? ' (AA通过)' : ' (AA未通过)'}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div
          className="right-panel"
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
            }}
          >
            <motion.button
              whileHover={{
                backgroundColor: darkMode
                  ? 'rgba(255, 255, 255, 0.1)'
                  : 'rgba(0, 0, 0, 0.05)',
              }}
              whileTap={{ scale: 0.96 }}
              transition={{ duration: 0.2 }}
              onClick={() => setDarkMode(!darkMode)}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                backgroundColor: darkMode ? '#2a2a4e' : '#ffffff',
                color: darkMode ? '#ffffff' : '#1a1a2e',
                border: '1px solid ' + (darkMode ? '#3a3a5e' : '#e0e0e0'),
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
              }}
            >
              {darkMode ? '浅色主题' : '深色主题'}
            </motion.button>
          </div>

          <motion.div
            key={darkMode ? 'dark' : 'light'}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
            style={{
              flex: 1,
              backgroundColor: darkMode ? DARK_BG : LIGHT_BG,
              borderRadius: '12px',
              padding: '32px',
              minHeight: '500px',
            }}
          >
            <h3
              style={{
                fontSize: '16px',
                fontWeight: 600,
                marginBottom: '24px',
                color: darkMode ? '#ffffff' : '#1a1a2e',
              }}
            >
              组件预览
            </h3>
            <ComponentRenderer darkMode={darkMode} />
          </motion.div>
        </div>
      </div>
    </div>
  )
}

export default App
