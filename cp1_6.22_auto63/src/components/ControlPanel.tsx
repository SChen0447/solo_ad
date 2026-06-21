import { useRef } from 'react'
import { Building, ViewPreset } from '@/types'
import { formatDate, formatTime } from '@/utils/sunPosition'
import { exportSceneToJSON, importSceneFromFile } from '@/utils/sceneExport'

interface ControlPanelProps {
  buildings: Building[]
  selectedBuildingId: string | null
  date: number
  time: number
  viewPreset: ViewPreset
  onDateChange: (date: number) => void
  onTimeChange: (time: number) => void
  onViewPresetChange: (preset: ViewPreset) => void
  onAddBuilding: () => void
  onDeleteBuilding: (id: string) => void
  onImportScene: (scene: any) => void
}

export function ControlPanel({
  buildings,
  selectedBuildingId,
  date,
  time,
  viewPreset,
  onDateChange,
  onTimeChange,
  onViewPresetChange,
  onAddBuilding,
  onDeleteBuilding,
  onImportScene,
}: ControlPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const selectedBuilding = buildings.find(b => b.id === selectedBuildingId)

  const handleExport = () => {
    const sceneData = {
      buildings,
      date,
      time,
    }
    exportSceneToJSON(sceneData)
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      try {
        const scene = await importSceneFromFile(file)
        onImportScene(scene)
      } catch (err) {
        console.error('Import failed:', err)
      }
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const presets: { key: ViewPreset; label: string }[] = [
    { key: 'top', label: '俯视' },
    { key: 'side', label: '侧视' },
    { key: 'orbit', label: '环绕' },
  ]

  return (
    <div className="control-panel">
      <div className="panel-header">
        <h2 className="panel-title">建筑阴影模拟</h2>
        <p className="panel-subtitle">城市规划与日照分析工具</p>
      </div>

      <div className="panel-section">
        <div className="section-label">日期与时间</div>
        
        <div className="time-display">
          <span className="time-value">{formatDate(date)}</span>
          <span className="time-divider">·</span>
          <span className="time-value">{formatTime(time)}</span>
        </div>

        <div className="slider-group">
          <label className="slider-label">
            <span>日期</span>
            <span className="slider-value">{formatDate(date)}</span>
          </label>
          <input
            type="range"
            min={1}
            max={365}
            value={date}
            onChange={(e) => onDateChange(parseInt(e.target.value))}
            className="custom-slider"
          />
        </div>

        <div className="slider-group">
          <label className="slider-label">
            <span>时间</span>
            <span className="slider-value">{formatTime(time)}</span>
          </label>
          <input
            type="range"
            min={6}
            max={19}
            step={0.25}
            value={time}
            onChange={(e) => onTimeChange(parseFloat(e.target.value))}
            className="custom-slider"
          />
        </div>
      </div>

      <div className="panel-section">
        <div className="section-label">视角切换</div>
        <div className="preset-buttons">
          {presets.map(preset => (
            <button
              key={preset.key}
              className={`preset-btn ${viewPreset === preset.key ? 'active' : ''}`}
              onClick={() => onViewPresetChange(preset.key)}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div className="panel-section">
        <div className="section-label">建筑操作</div>
        <div className="action-buttons">
          <button
            className="action-btn primary"
            onClick={onAddBuilding}
            disabled={buildings.length >= 10}
          >
            + 添加建筑 ({buildings.length}/10)
          </button>
          {selectedBuilding && (
            <button
              className="action-btn danger"
              onClick={() => onDeleteBuilding(selectedBuilding.id)}
            >
              删除选中
            </button>
          )}
        </div>

        {selectedBuilding && (
          <div className="building-info">
            <div className="info-title">选中建筑</div>
            <div className="info-row">
              <span>位置</span>
              <span>X: {selectedBuilding.position.x.toFixed(1)}, Z: {selectedBuilding.position.z.toFixed(1)}</span>
            </div>
            <div className="info-row">
              <span>尺寸</span>
              <span>{selectedBuilding.size.x.toFixed(1)} × {selectedBuilding.size.y.toFixed(1)} × {selectedBuilding.size.z.toFixed(1)}</span>
            </div>
          </div>
        )}

        {!selectedBuilding && buildings.length > 0 && (
          <div className="hint-text">
            点击建筑进行选中和编辑
          </div>
        )}

        {buildings.length === 0 && (
          <div className="hint-text">
            点击地面或添加建筑按钮开始
          </div>
        )}
      </div>

      <div className="panel-section">
        <div className="section-label">场景管理</div>
        <div className="action-buttons">
          <button className="action-btn" onClick={handleExport}>
            导出场景
          </button>
          <button className="action-btn" onClick={() => fileInputRef.current?.click()}>
            导入场景
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
      </div>

      <div className="panel-footer">
        <p>提示：拖拽建筑移动位置，拖拽控制点调整尺寸</p>
      </div>
    </div>
  )
}
