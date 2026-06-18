import { useEffect, useState } from 'react'
import EditorPanel from './EditorPanel'
import ControlPanel from './ControlPanel'

export default function App() {
  const [isResponsive, setIsResponsive] = useState(false)

  useEffect(() => {
    const checkWidth = () => {
      setIsResponsive(window.innerWidth < 960)
    }
    checkWidth()
    window.addEventListener('resize', checkWidth)
    return () => window.removeEventListener('resize', checkWidth)
  }, [])

  return (
    <div style={styles.app}>
      <div style={styles.header}>
        <div style={styles.logo}>
          <div style={styles.logoIcon}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
          </div>
          <span style={styles.logoText}>CSS 动画调试工具</span>
        </div>
        <span style={styles.subtitle}>实时预览 · 参数微调 · 对比分析</span>
      </div>

      <div
        style={{
          ...styles.main,
          flexDirection: isResponsive ? 'column' : 'row'
        }}
      >
        <div
          style={{
            ...styles.leftPanel,
            width: isResponsive ? '100%' : '60%',
            height: isResponsive ? 'auto' : '100%'
          }}
        >
          <EditorPanel />
        </div>

        <div
          style={{
            ...styles.rightPanel,
            width: isResponsive ? '100%' : '40%',
            height: isResponsive ? '400px' : '100%'
          }}
        >
          <ControlPanel />
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    display: 'flex',
    flexDirection: 'column',
    width: '100vw',
    height: '100vh',
    backgroundColor: '#1e1e2e',
    color: '#e0e0e0',
    overflow: 'hidden'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 24px',
    backgroundColor: '#2a2a3e',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    flexShrink: 0
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  logoIcon: {
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(124, 58, 237, 0.2)',
    borderRadius: '8px'
  },
  logoText: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#e0e0e0'
  },
  subtitle: {
    fontSize: '13px',
    color: '#808090'
  },
  main: {
    display: 'flex',
    flex: 1,
    minHeight: 0,
    padding: '16px',
    gap: '16px'
  },
  leftPanel: {
    display: 'flex',
    minHeight: 0,
    transition: 'width 0.3s ease'
  },
  rightPanel: {
    display: 'flex',
    minHeight: 0,
    transition: 'width 0.3s ease'
  }
}
