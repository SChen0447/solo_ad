import React, { Component, ErrorInfo, ReactNode, useState, useEffect } from 'react'
import Scene from './components/Scene'
import InfoPanel from './components/InfoPanel'
import ControlPanel from './components/ControlPanel'

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('3D 场景渲染错误:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0a1628 0%, #1a2a4a 100%)',
          color: '#e0e0e0',
          fontFamily: 'system-ui, sans-serif',
        }}>
          <h2 style={{ color: '#ff6b6b', marginBottom: '16px' }}>渲染出错</h2>
          <p style={{ color: '#a0a0a0', marginBottom: '24px' }}>{this.state.error?.message}</p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              padding: '10px 24px',
              background: '#00d4ff',
              color: '#0a1628',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 600,
            }}
          >
            重试
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

const App: React.FC = () => {
  const [isCompact, setIsCompact] = useState(false)

  useEffect(() => {
    const handleResize = () => {
      setIsCompact(window.innerWidth < 1024)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const layoutStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: isCompact ? 'column' : 'row',
    background: 'linear-gradient(135deg, #0a1628 0%, #1a2a4a 100%)',
    position: 'relative',
    overflow: 'hidden',
  }

  const infoPanelStyle: React.CSSProperties = isCompact
    ? {
        display: 'none',
      }
    : {
        width: '280px',
        flexShrink: 0,
        padding: '16px',
        zIndex: 10,
      }

  const sceneContainerStyle: React.CSSProperties = {
    flex: 1,
    position: 'relative',
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
  }

  const controlPanelStyle: React.CSSProperties = isCompact
    ? {
        width: '100%',
        flexShrink: 0,
        padding: '12px 16px',
        zIndex: 10,
        maxHeight: '120px',
      }
    : {
        width: '240px',
        flexShrink: 0,
        padding: '16px',
        zIndex: 10,
      }

  return (
    <div style={layoutStyle}>
      {!isCompact && (
        <div style={infoPanelStyle}>
          <InfoPanel />
        </div>
      )}

      <div style={sceneContainerStyle}>
        {isCompact && (
          <div style={{
            ...controlPanelStyle,
            order: -1,
            borderBottom: '1px solid rgba(255,255,255,0.1)',
          }}>
            <ControlPanel isCompact />
          </div>
        )}

        <ErrorBoundary>
          <div style={{ flex: 1, position: 'relative' }}>
            <Scene />
            <div style={{
              position: 'absolute',
              bottom: '16px',
              left: '50%',
              transform: 'translateX(-50%)',
              color: '#a0a0a0',
              fontSize: '12px',
              fontWeight: 300,
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              padding: '8px 20px',
              borderRadius: '20px',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
            }}>
              点击部件查看详情 · 拖拽旋转视角 · 滚轮缩放 · Shift+拖拽平移
            </div>
          </div>
        </ErrorBoundary>
      </div>

      {!isCompact && (
        <div style={controlPanelStyle}>
          <ControlPanel />
        </div>
      )}
    </div>
  )
}

export default App
