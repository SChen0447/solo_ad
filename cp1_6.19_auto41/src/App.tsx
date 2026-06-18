import React, { useState, useCallback } from 'react'
import PalettePanel from './PalettePanel'
import PreviewArea from './PreviewArea'
import HistoryPanel from './HistoryPanel'
import { useStore } from './store'
import { saveAs } from 'file-saver'
import { generateJSONExport, generateCSSVariables, calculateContrast, getReadableTextColor, getComponentName } from './utils'

const App: React.FC = () => {
  const { palette, componentColors, resetComponentColors } = useStore()
  const [showExportMenu, setShowExportMenu] = useState(false)

  const exportJSON = useCallback(() => {
    const json = generateJSONExport(palette, componentColors)
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
    saveAs(blob, `color-scheme-${Date.now()}.json`)
    setShowExportMenu(false)
  }, [palette, componentColors])

  const exportCSS = useCallback(() => {
    const usageMap: Record<string, string> = {}
    Object.entries(componentColors).forEach(([comp, hex]) => {
      usageMap[hex] = comp
    })
    const colorList = palette.map(c => ({
      name: c.name,
      hex: c.hex,
      usage: usageMap[c.hex] || 'unassigned'
    }))

    const contrastInfo = Object.entries(componentColors)
      .filter(([key]) => ['navbar-bg', 'hero-bg', 'button-bg', 'card-bg', 'footer-bg'].includes(key))
      .map(([key, hex]) => {
        const textKey = key.replace('-bg', '-text')
        const textColor = getReadableTextColor(hex)
        const contrast = calculateContrast(hex, textColor)
        return `/* ${getComponentName(key)} vs ${getComponentName(textKey)}: 对比度 ${contrast.ratio}:1 (${contrast.level}) */`
      })
      .join('\n')

    const css = `${contrastInfo ? contrastInfo + '\n\n' : ''}${generateCSSVariables(colorList)}`
    const blob = new Blob([css], { type: 'text/css;charset=utf-8' })
    saveAs(blob, `color-variables-${Date.now()}.css`)
    setShowExportMenu(false)
  }, [palette, componentColors])

  return (
    <div style={styles.app}>
      {/* Global Top Toolbar */}
      <header style={styles.topBar}>
        <div style={styles.topBarLeft}>
          <div style={styles.logo}>
            <span style={{ fontSize: '22px' }}>🎨</span>
            <div>
              <div style={styles.logoTitle}>配色方案预览工具</div>
              <div style={styles.logoSub}>Color Scheme Preview Studio</div>
            </div>
          </div>
        </div>

        <div style={styles.topBarCenter}>
          <div style={styles.statusPill}>
            <span style={styles.statusDot} />
            <span style={styles.statusText}>实时预览已启用</span>
          </div>
        </div>

        <div style={styles.topBarRight}>
          <button
            onClick={resetComponentColors}
            style={{
              ...styles.topBtn,
              background: '#F8F9FA',
              color: '#495057',
              border: '1px solid #DEE2E6'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#E9ECEF' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#F8F9FA' }}
            onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.95)' }}
            onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
          >
            🔄 重置组件
          </button>

          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              style={{
                ...styles.topBtn,
                background: '#007BFF',
                color: '#fff',
                padding: '8px 16px'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#0056b3' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#007BFF' }}
              onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.95)' }}
              onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
            >
              💾 导出方案 ▾
            </button>

            {showExportMenu && (
              <>
                <div
                  style={styles.overlay}
                  onClick={() => setShowExportMenu(false)}
                />
                <div style={styles.exportMenu}>
                  <button
                    onClick={exportJSON}
                    style={styles.exportMenuItem}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#F1F3F5' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = '#fff' }}
                  >
                    <span style={{ fontSize: '18px', marginRight: '10px' }}>📄</span>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#212529' }}>
                        导出 JSON 方案
                      </div>
                      <div style={{ fontSize: '11px', color: '#6C757D', marginTop: '2px' }}>
                        含颜色名称、用途标签、对比度数据
                      </div>
                    </div>
                  </button>
                  <div style={styles.menuDivider} />
                  <button
                    onClick={exportCSS}
                    style={styles.exportMenuItem}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#F1F3F5' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = '#fff' }}
                  >
                    <span style={{ fontSize: '18px', marginRight: '10px' }}>🎨</span>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#212529' }}>
                        导出 CSS 变量
                      </div>
                      <div style={{ fontSize: '11px', color: '#6C757D', marginTop: '2px' }}>
                        :root 中定义 --color-* 变量
                      </div>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div style={styles.main}>
        <PalettePanel />
        <PreviewArea />
        <HistoryPanel />
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    width: '100vw',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: '#F1F3F5'
  },
  topBar: {
    height: '56px',
    minHeight: '56px',
    background: '#FFFFFF',
    borderBottom: '1px solid #DEE2E6',
    boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 20px',
    zIndex: 100
  },
  topBarLeft: {
    display: 'flex',
    alignItems: 'center'
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  logoTitle: {
    fontSize: '15px',
    fontWeight: 700,
    color: '#212529',
    lineHeight: 1.2
  },
  logoSub: {
    fontSize: '10px',
    color: '#ADB5BD',
    fontWeight: 500,
    letterSpacing: '0.3px'
  },
  topBarCenter: {
    position: 'absolute',
    left: '50%',
    transform: 'translateX(-50%)'
  },
  statusPill: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: '#F0FFF4',
    padding: '6px 14px',
    borderRadius: '999px',
    border: '1px solid #C6F6D5'
  },
  statusDot: {
    width: '7px',
    height: '7px',
    borderRadius: '50%',
    background: '#28A745',
    animation: 'pulse 2s ease-in-out infinite'
  },
  statusText: {
    fontSize: '12px',
    color: '#2F855A',
    fontWeight: 500
  },
  topBarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  topBtn: {
    padding: '7px 14px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 500,
    transition: 'all 0.2s ease'
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 199
  },
  exportMenu: {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    right: 0,
    width: '280px',
    background: '#fff',
    borderRadius: '10px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.15), 0 2px 6px rgba(0,0,0,0.05)',
    border: '1px solid #E9ECEF',
    padding: '6px',
    zIndex: 200
  },
  exportMenuItem: {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    padding: '12px',
    borderRadius: '8px',
    transition: 'background 0.15s ease',
    textAlign: 'left'
  },
  menuDivider: {
    height: '1px',
    background: '#E9ECEF',
    margin: '2px 8px'
  },
  main: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
    minHeight: 0
  }
}

export default App
