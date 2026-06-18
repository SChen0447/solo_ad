import { useMemo } from 'react'
import { useAppStore } from './store'
import { CodeEditor } from './components/CodeEditor'
import { SplitView } from './components/SplitView'
import { DiffHighlighter, useDiffLines } from './components/DiffHighlighter'
import './App.css'

function ControlBar() {
  const { zoom, syncScroll, diffEnabled, setZoom, setSyncScroll, setDiffEnabled } = useAppStore()

  return (
    <div className="control-bar">
      <div className="control-group">
        <label className="control-label">
          <span className="label-text">差异高亮</span>
          <button
            type="button"
            className={`toggle-btn ${diffEnabled ? 'active' : ''}`}
            onClick={() => setDiffEnabled(!diffEnabled)}
          >
            <span className="toggle-track">
              <span className="toggle-thumb" />
            </span>
          </button>
        </label>
      </div>

      <div className="control-group">
        <label className="control-label">
          <span className="label-text">同步滚动</span>
          <button
            type="button"
            className={`toggle-btn ${syncScroll ? 'active' : ''}`}
            onClick={() => setSyncScroll(!syncScroll)}
          >
            <span className="toggle-track">
              <span className="toggle-thumb" />
            </span>
          </button>
        </label>
      </div>

      <div className="control-group zoom-group">
        <span className="label-text">缩放</span>
        <input
          type="range"
          min="50"
          max="150"
          step="10"
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="zoom-slider"
        />
        <span className="zoom-value">{zoom}%</span>
      </div>
    </div>
  )
}

function AppContent() {
  const {
    leftCode,
    rightCode,
    setLeftCode,
    setRightCode,
    applyLeftCode,
    applyRightCode,
    diffEnabled,
  } = useAppStore()

  const { leftLineNumbers, rightLineNumbers } = useDiffLines()

  return (
    <div className="app-container">
      <div className="editors-section">
        <div className="editor-wrapper">
          <CodeEditor
            value={leftCode}
            onChange={setLeftCode}
            onApply={applyLeftCode}
            label="版本 A 代码"
            variant="left"
            diffLineNumbers={leftLineNumbers}
            diffEnabled={diffEnabled}
          />
        </div>
        <div className="editor-divider" />
        <div className="editor-wrapper">
          <CodeEditor
            value={rightCode}
            onChange={setRightCode}
            onApply={applyRightCode}
            label="版本 B 代码"
            variant="right"
            diffLineNumbers={rightLineNumbers}
            diffEnabled={diffEnabled}
          />
        </div>
      </div>

      <div className="preview-section">
        <SplitView
          diffLeftLines={leftLineNumbers}
          diffRightLines={rightLineNumbers}
        />
      </div>

      <ControlBar />
    </div>
  )
}

function App() {
  return (
    <DiffHighlighter>
      <AppContent />
    </DiffHighlighter>
  )
}

export default App
