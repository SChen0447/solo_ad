import { useState } from 'react'
import type { FragmentInfo, StageType } from '../App'
import './ControlPanel.css'

interface ControlPanelProps {
  currentStage: StageType
  onStageChange: (stage: StageType) => void
  selectedFragment: FragmentInfo | null
  overlayMode: boolean
  onOverlayToggle: () => void
  transparency: { fragments: number; restored: number; complete: number }
  onTransparencyChange: (key: 'fragments' | 'restored' | 'complete', value: number) => void
  onClearAnnotations: () => void
  onExportAnnotations: () => void
  annotationCount: number
}

const stageLabels = [
  { value: 'fragments', label: '原始碎块' },
  { value: 'restored', label: '修复填充' },
  { value: 'complete', label: '完整复原' },
] as const

function ControlPanel({
  currentStage,
  onStageChange,
  selectedFragment,
  overlayMode,
  onOverlayToggle,
  transparency,
  onTransparencyChange,
  onClearAnnotations,
  onExportAnnotations,
  annotationCount,
}: ControlPanelProps) {
  const [showHelp, setShowHelp] = useState(false)

  const sliderValue = stageLabels.findIndex((s) => s.value === currentStage)

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const index = parseInt(e.target.value, 10)
    onStageChange(stageLabels[index].value as StageType)
  }

  return (
    <div className="control-panel">
      <div className="panel-header">
        <h2 className="panel-title">文物修复对比</h2>
        <button
          className="help-button"
          onClick={() => setShowHelp(!showHelp)}
          title="帮助"
        >
          ?
        </button>
      </div>

      {showHelp && (
        <div className="help-card">
          <h3>操作说明</h3>
          <ul>
            <li>鼠标左键拖拽：旋转视角</li>
            <li>鼠标滚轮：缩放场景</li>
            <li>鼠标右键拖拽：平移场景</li>
            <li>点击碎块：查看详细信息</li>
            <li>按 N 键：添加标注</li>
            <li>点击模型表面：放置标注</li>
          </ul>
        </div>
      )}

      <div className="section">
        <h3 className="section-title">修复阶段</h3>
        <div className="stage-slider">
          <div className="stage-labels">
            {stageLabels.map((stage) => (
              <span
                key={stage.value}
                className={`stage-label ${currentStage === stage.value ? 'active' : ''}`}
              >
                {stage.label}
              </span>
            ))}
          </div>
          <input
            type="range"
            min="0"
            max="2"
            step="1"
            value={sliderValue}
            onChange={handleSliderChange}
            className="slider"
            disabled={overlayMode}
          />
        </div>
      </div>

      <div className="section">
        <div className="overlay-toggle">
          <span className="toggle-label">叠加对比模式</span>
          <button
            className={`toggle-switch ${overlayMode ? 'active' : ''}`}
            onClick={onOverlayToggle}
          >
            <span className="toggle-slider" />
          </button>
        </div>

        {overlayMode && (
          <div className="transparency-controls">
            <div className="transparency-item">
              <span className="transparency-label fragments-label">原始碎块</span>
              <input
                type="range"
                min="0"
                max="100"
                value={transparency.fragments}
                onChange={(e) =>
                  onTransparencyChange('fragments', parseInt(e.target.value, 10))
                }
                className="transparency-slider fragments-slider"
              />
              <span className="transparency-value">{transparency.fragments}%</span>
            </div>
            <div className="transparency-item">
              <span className="transparency-label restored-label">修复填充</span>
              <input
                type="range"
                min="0"
                max="100"
                value={transparency.restored}
                onChange={(e) =>
                  onTransparencyChange('restored', parseInt(e.target.value, 10))
                }
                className="transparency-slider restored-slider"
              />
              <span className="transparency-value">{transparency.restored}%</span>
            </div>
            <div className="transparency-item">
              <span className="transparency-label complete-label">完整复原</span>
              <input
                type="range"
                min="0"
                max="100"
                value={transparency.complete}
                onChange={(e) =>
                  onTransparencyChange('complete', parseInt(e.target.value, 10))
                }
                className="transparency-slider complete-slider"
              />
              <span className="transparency-value">{transparency.complete}%</span>
            </div>
          </div>
        )}
      </div>

      <div className="section">
        <h3 className="section-title">碎块信息</h3>
        <div className={`fragment-info-card ${selectedFragment ? 'visible' : ''}`}>
          {selectedFragment ? (
            <>
              <div className="info-row">
                <span className="info-label">编号</span>
                <span className="info-value">{selectedFragment.id}</span>
              </div>
              <div className="info-row">
                <span className="info-label">名称</span>
                <span className="info-value">{selectedFragment.name}</span>
              </div>
              <div className="info-row">
                <span className="info-label">材质</span>
                <span className="info-value">{selectedFragment.material}</span>
              </div>
              <div className="info-row">
                <span className="info-label">所属区域</span>
                <span className="info-value">{selectedFragment.region}</span>
              </div>
              <div className="info-row">
                <span className="info-label">出土位置</span>
                <span className="info-value">
                  X:{selectedFragment.position.x.toFixed(2)}
                  &nbsp;Y:{selectedFragment.position.y.toFixed(2)}
                  &nbsp;Z:{selectedFragment.position.z.toFixed(2)}
                </span>
              </div>
            </>
          ) : (
            <p className="no-selection">点击碎块查看详细信息</p>
          )}
        </div>
      </div>

      <div className="section">
        <h3 className="section-title">标注工具</h3>
        <div className="annotation-controls">
          <span className="annotation-count">
            当前标注：{annotationCount} 个
          </span>
          <div className="annotation-buttons">
            <button
              className="action-button secondary"
              onClick={onClearAnnotations}
              disabled={annotationCount === 0}
            >
              清除全部
            </button>
            <button
              className="action-button primary"
              onClick={onExportAnnotations}
              disabled={annotationCount === 0}
            >
              导出JSON
            </button>
          </div>
        </div>
        <p className="annotation-hint">提示：按 N 键点击模型添加标注</p>
      </div>
    </div>
  )
}

export default ControlPanel
