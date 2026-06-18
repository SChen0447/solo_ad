import { useMemo, useEffect, useRef, useState, useCallback } from 'react'
import { useAnimationStore } from './store'
import { parseCSS, generateAnimationStyle, getAnimationDescription, generateExportCode } from './animationEngine'

interface PreviewBoxProps {
  code: string
  label?: string
  playKey: number
  width?: number
}

function PreviewBox({ code, label, playKey, width = 500 }: PreviewBoxProps) {
  const { params } = useAnimationStore()
  const elementRef = useRef<HTMLDivElement>(null)

  const parsed = useMemo(() => parseCSS(code), [code])
  const animationStyle = useMemo(
    () => generateAnimationStyle(parsed, params),
    [parsed, params]
  )

  useEffect(() => {
    if (elementRef.current && parsed.hasAnimation) {
      elementRef.current.style.animation = 'none'
      elementRef.current.offsetHeight
      elementRef.current.style.animation = ''
    }
  }, [playKey, parsed.hasAnimation])

  const keyframesStyle = parsed.keyframes ? (
    <style>{parsed.keyframes}</style>
  ) : null

  return (
    <div style={{ ...styles.previewBox, width: `${width}px` }}>
      {keyframesStyle}
      {label && <div style={styles.previewLabel}>{label}</div>}
      <div style={styles.previewContent}>
        <div
          key={playKey}
          ref={elementRef}
          style={{
            ...styles.animatedElement,
            ...animationStyle
          }}
        />
      </div>
    </div>
  )
}

export default function AnimationPreview() {
  const { code, originalCode, compareMode, playKey, toggleCompareMode, params } = useAnimationStore()
  const description = getAnimationDescription(params)
  const [copied, setCopied] = useState(false)
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    setIsVisible(false)
    const timer = setTimeout(() => setIsVisible(true), 10)
    return () => clearTimeout(timer)
  }, [compareMode])

  const handleExport = useCallback(async () => {
    const exportCode = generateExportCode(code, params)
    try {
      await navigator.clipboard.writeText(exportCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('复制失败:', err)
    }
  }, [code, params])

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>动画预览</span>
      </div>

      <div style={styles.previewWrapper}>
        <div
          style={{
            ...styles.previewContainer,
            opacity: isVisible ? 1 : 0,
            transition: 'opacity 0.3s ease'
          }}
        >
          <button style={styles.exportButton} onClick={handleExport} title="导出代码">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span style={{ marginLeft: '6px', fontSize: '12px' }}>
              {copied ? '已复制！' : '导出代码'}
            </span>
          </button>

          <button style={styles.compareButton} onClick={toggleCompareMode} title="对比模式">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="6" y="6" width="14" height="14" rx="2" ry="2" />
              <rect x="4" y="4" width="14" height="14" rx="2" ry="2" />
            </svg>
            <span style={{ marginLeft: '6px', fontSize: '12px' }}>对比模式</span>
          </button>

          {compareMode ? (
            <div style={styles.compareRow}>
              <PreviewBox code={originalCode} label="原始" playKey={playKey} width={250} />
              <div style={styles.divider} />
              <PreviewBox code={code} label="当前" playKey={playKey} width={250} />
            </div>
          ) : (
            <PreviewBox code={code} playKey={playKey} width={500} />
          )}
        </div>
      </div>

      <div style={styles.description}>
        {description}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  title: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#e0e0e0'
  },
  previewWrapper: {
    display: 'flex',
    justifyContent: 'center'
  },
  previewContainer: {
    position: 'relative',
    backgroundColor: '#2a2a3e',
    borderRadius: '12px',
    padding: '16px',
    transition: 'opacity 0.3s ease'
  },
  compareRow: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: '0'
  },
  divider: {
    width: '2px',
    height: '300px',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    margin: '0 0'
  },
  exportButton: {
    position: 'absolute',
    top: '24px',
    left: '24px',
    zIndex: 10,
    display: 'flex',
    alignItems: 'center',
    padding: '6px 12px',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.25)',
    borderRadius: '8px',
    color: '#fff',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
    textShadow: '0 1px 2px rgba(0,0,0,0.3)'
  },
  compareButton: {
    position: 'absolute',
    top: '24px',
    right: '24px',
    zIndex: 10,
    display: 'flex',
    alignItems: 'center',
    padding: '6px 12px',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.25)',
    borderRadius: '8px',
    color: '#fff',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
    textShadow: '0 1px 2px rgba(0,0,0,0.3)'
  },
  previewBox: {
    position: 'relative',
    height: '300px',
    backgroundColor: '#f5f5f5',
    borderRadius: '8px',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  previewLabel: {
    position: 'absolute',
    top: '8px',
    left: '8px',
    padding: '4px 8px',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    color: '#fff',
    fontSize: '12px',
    borderRadius: '4px',
    zIndex: 1
  },
  previewContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%'
  },
  animatedElement: {
    width: '150px',
    height: '150px',
    backgroundColor: '#3b82f6',
    borderRadius: '12px'
  },
  description: {
    padding: '10px 14px',
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
    border: '1px solid rgba(124, 58, 237, 0.3)',
    borderRadius: '8px',
    fontSize: '13px',
    color: '#c4b5fd',
    textAlign: 'center'
  }
}
