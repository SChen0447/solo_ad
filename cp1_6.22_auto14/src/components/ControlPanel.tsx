import { useRef, useState, useCallback, useEffect } from 'react'
import './ControlPanel.css'

interface ControlPointData {
  x: number
  y: number
  z: number
}

interface ControlPanelProps {
  controlPoints: ControlPointData[]
  flashingIndex: number | null
  progress: number
  isPlaying: boolean
  onCoordChange: (index: number, axis: 'x' | 'y' | 'z', value: number) => void
  onPlay: () => void
  onPause: () => void
  onReset: () => void
  onPreset: () => void
  onClear: () => void
  onProgressSeek: (value: number) => void
  onKeyframeChange: (index: number, value: number) => void
  keyframePositions: number[]
}

const pointLabels = ['起点', '控制点1', '控制点2', '终点']
const pointColors = ['#ff4444', '#ffaa00', '#4488ff', '#44dd44', '#ff44ff', '#44ffff', '#ffaa44', '#aa44ff']

function ControlPanel({
  controlPoints,
  flashingIndex,
  progress,
  isPlaying,
  onCoordChange,
  onPlay,
  onPause,
  onReset,
  onPreset,
  onClear,
  onProgressSeek,
  onKeyframeChange,
  keyframePositions
}: ControlPanelProps) {
  const progressBarRef = useRef<HTMLDivElement>(null)
  const [draggingKeyframe, setDraggingKeyframe] = useState<number | null>(null)

  const handleProgressBarClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current) return
    const rect = progressBarRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percent = Math.max(0, Math.min(1, x / rect.width))
    onProgressSeek(percent)
  }, [onProgressSeek])

  const handleKeyframeMouseDown = useCallback((index: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setDraggingKeyframe(index)
  }, [])

  useEffect(() => {
    if (draggingKeyframe === null) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!progressBarRef.current) return
      const rect = progressBarRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const percent = Math.max(0, Math.min(1, x / rect.width))
      onKeyframeChange(draggingKeyframe, percent)
    }

    const handleMouseUp = () => {
      setDraggingKeyframe(null)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [draggingKeyframe, onKeyframeChange])

  return (
    <div className="control-panel">
      <div className="panel-section">
        <h3 className="section-title">控制点坐标</h3>
        <div className="coordinate-list">
          {controlPoints.map((point, index) => (
            <div
              key={index}
              className={`coordinate-item ${flashingIndex === index ? 'flash' : ''}`}
            >
              <div
                className="point-indicator"
                style={{ backgroundColor: pointColors[index % pointColors.length] }}
              />
              <span className="point-label">
                {pointLabels[index] || `点${index + 1}`}
              </span>
              <div className="coord-inputs">
                <div className="coord-input-group">
                  <label className="coord-label x-label">X</label>
                  <input
                    type="number"
                    step="0.1"
                    value={point.x}
                    onChange={(e) => onCoordChange(index, 'x', parseFloat(e.target.value) || 0)}
                    className="coord-input"
                  />
                </div>
                <div className="coord-input-group">
                  <label className="coord-label y-label">Y</label>
                  <input
                    type="number"
                    step="0.1"
                    value={point.y}
                    onChange={(e) => onCoordChange(index, 'y', parseFloat(e.target.value) || 0)}
                    className="coord-input"
                  />
                </div>
                <div className="coord-input-group">
                  <label className="coord-label z-label">Z</label>
                  <input
                    type="number"
                    step="0.1"
                    value={point.z}
                    onChange={(e) => onCoordChange(index, 'z', parseFloat(e.target.value) || 0)}
                    className="coord-input"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="panel-section">
        <h3 className="section-title">时间轴</h3>
        <div
          ref={progressBarRef}
          className="progress-bar-container"
          onClick={handleProgressBarClick}
        >
          <div className="progress-bar-track" />
          <div
            className="progress-bar-fill"
            style={{ width: `${progress * 100}%` }}
          />
          {keyframePositions.map((pos, index) => (
            <div
              key={index}
              className="keyframe-marker"
              style={{ left: `${pos * 100}%` }}
              onMouseDown={(e) => handleKeyframeMouseDown(index, e)}
              title={`关键帧 ${index + 1}`}
            />
          ))}
          <div
            className="progress-thumb"
            style={{ left: `calc(${progress * 100}% - 6px)` }}
          />
        </div>
        <div className="progress-time">
          <span>{(progress * 3).toFixed(2)}s</span>
          <span>3.00s</span>
        </div>
      </div>

      <div className="panel-section bottom-section">
        <h3 className="section-title">播放控制</h3>
        <div className="playback-controls">
          <button
            className={`control-btn play-btn ${isPlaying ? 'playing' : ''}`}
            onClick={isPlaying ? onPause : onPlay}
          >
            {isPlaying ? '暂停' : '播放'}
          </button>
          <button className="control-btn reset-btn" onClick={onReset}>
            重置
          </button>
        </div>
        <div className="preset-controls">
          <button className="control-btn preset-btn" onClick={onPreset}>
            螺旋示例
          </button>
          <button className="control-btn clear-btn" onClick={onClear}>
            重置路径
          </button>
        </div>
      </div>

      <div className="panel-section info-section">
        <p className="info-text">
          💡 拖拽场景中的彩色小球调整控制点
        </p>
        <p className="info-text">
          🖱️ 鼠标左键旋转视角，滚轮缩放
        </p>
      </div>
    </div>
  )
}

export default ControlPanel
