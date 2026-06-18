import { useEffect, useMemo, useRef } from 'react'
import Editor from '@monaco-editor/react'
import { useAnimationStore } from './store'
import {
  parseCSS,
  generateAnimationStyle,
  generateDescription,
  injectKeyframesStyle,
} from './animationEngine'

export default function EditorPanel() {
  const code = useAnimationStore((s) => s.code)
  const originalCode = useAnimationStore((s) => s.originalCode)
  const setCode = useAnimationStore((s) => s.setCode)
  const setOriginalCode = useAnimationStore((s) => s.setOriginalCode)
  const params = useAnimationStore((s) => s.params)
  const compareMode = useAnimationStore((s) => s.compareMode)
  const toggleCompareMode = useAnimationStore((s) => s.toggleCompareMode)
  const animationKey = useAnimationStore((s) => s.animationKey)
  const replayAnimation = useAnimationStore((s) => s.replayAnimation)
  const copyButtonRef = useRef<HTMLButtonElement>(null)

  const parsedCurrent = useMemo(() => parseCSS(code), [code])
  const parsedOriginal = useMemo(() => parseCSS(originalCode), [originalCode])

  const currentStyle = useMemo(
    () => generateAnimationStyle(parsedCurrent, params, false),
    [parsedCurrent, params]
  )
  const originalStyle = useMemo(
    () => generateAnimationStyle(parsedOriginal, params, true),
    [parsedOriginal, params]
  )

  const description = useMemo(() => generateDescription(params), [params])

  useEffect(() => {
    injectKeyframesStyle(code, 'current-keyframes')
    if (compareMode) {
      injectKeyframesStyle(originalCode, 'original-keyframes')
    }
  }, [code, originalCode, compareMode])

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setCode(value)
    }
  }

  const handleCompareToggle = () => {
    if (!compareMode) {
      setOriginalCode(code)
    }
    toggleCompareMode()
    setTimeout(() => replayAnimation(), 50)
  }

  const handleExport = async () => {
    const { generateExportCode } = await import('./animationEngine')
    const exportCode = generateExportCode(code, params)
    try {
      await navigator.clipboard.writeText(exportCode)
      const btn = copyButtonRef.current
      if (btn) {
        btn.classList.add('copied')
        const originalText = btn.innerHTML
        btn.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          已复制！
        `
        setTimeout(() => {
          btn.classList.remove('copied')
          btn.innerHTML = originalText
        }, 2000)
      }
    } catch (e) {
      console.error('复制失败:', e)
    }
  }

  return (
    <>
      <div className="panel-card editor-wrapper">
        <h2 className="panel-title">CSS 代码编辑器</h2>
        <Editor
          height="100%"
          defaultLanguage="css"
          value={code}
          onChange={handleEditorChange}
          theme="vs-dark"
          options={{
            fontSize: 14,
            fontFamily: "'Fira Code', monospace",
            fontLigatures: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            lineNumbers: 'on',
            renderLineHighlight: 'all',
            automaticLayout: true,
            tabSize: 2,
            wordWrap: 'on',
            padding: { top: 8, bottom: 8 },
          }}
        />
      </div>

      <div className="panel-card preview-container">
        <h2 className="panel-title">动画预览</h2>
        <div className="preview-wrapper">
          <div className="preview-controls">
            <button
              ref={copyButtonRef}
              className="glass-btn"
              onClick={handleExport}
              title="导出代码"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              导出代码
            </button>
            <button
              className={`glass-btn ${compareMode ? 'active' : ''}`}
              onClick={handleCompareToggle}
              title="对比模式"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="6" y="6" width="14" height="14" rx="2" ry="2"></rect>
                <rect x="4" y="4" width="14" height="14" rx="2" ry="2"></rect>
              </svg>
              {compareMode ? '退出对比' : '对比模式'}
            </button>
          </div>

          {compareMode ? (
            <div className="preview-box compare">
              <div className="preview-sub">
                <span className="preview-label">原始</span>
                <div
                  key={`original-${animationKey}`}
                  className="demo-element"
                  style={originalStyle}
                />
              </div>
              <div className="preview-sub">
                <span className="preview-label">当前</span>
                <div
                  key={`current-${animationKey}`}
                  className="demo-element"
                  style={currentStyle}
                />
              </div>
            </div>
          ) : (
            <div className="preview-box">
              <div
                key={`single-${animationKey}`}
                className="demo-element"
                style={currentStyle}
              />
            </div>
          )}

          <div className="preview-description">{description}</div>
        </div>
      </div>
    </>
  )
}
