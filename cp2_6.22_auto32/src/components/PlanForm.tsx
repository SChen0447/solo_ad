import { useState } from 'react'
import { useApp } from '@/context/AppContext'
import type { Plant } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
}

export default function PlanForm({ open, onClose }: Props) {
  const { plants, addPlan } = useApp()
  const [plantId, setPlantId] = useState('')
  const [sowDate, setSowDate] = useState(new Date().toISOString().split('T')[0])
  const [potCount, setPotCount] = useState('1')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!open) return null

  const selectedPlant = plants.find((p) => p.id === plantId) as Plant | undefined

  const handleSubmit = async () => {
    if (!plantId) {
      setError('请选择植物')
      return
    }
    if (!sowDate) {
      setError('请选择播种日期')
      return
    }
    const count = Number(potCount)
    if (!potCount || isNaN(count) || count <= 0) {
      setError('请输入有效的盆数')
      return
    }
    if (!selectedPlant) return

    setSubmitting(true)
    try {
      await addPlan({
        plantId: selectedPlant.id,
        plantName: selectedPlant.name,
        category: selectedPlant.category,
        maturityDays: selectedPlant.maturityDays,
        waterFrequency: selectedPlant.waterFrequency,
        fertilizeFrequency: selectedPlant.fertilizeFrequency,
        sowDate,
        potCount: count,
      })
      setPlantId('')
      setSowDate(new Date().toISOString().split('T')[0])
      setPotCount('1')
      setError('')
      onClose()
    } catch (e) {
      console.error('Failed to add plan:', e)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">创建种植计划</div>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div>
          <div className="form-group">
            <label className="form-label">选择植物</label>
            <select
              className={`form-select ${error && !plantId ? 'error' : ''}`}
              value={plantId}
              onChange={(e) => {
                setPlantId(e.target.value)
                setError('')
              }}
            >
              <option value="">请选择植物</option>
              {plants.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {selectedPlant && (
            <div className="form-group">
              <div className="detail-info-row">
                <span className="detail-info-label">预计成熟</span>
                <span className="detail-info-value">{selectedPlant.maturityDays} 天</span>
              </div>
              <div className="detail-info-row">
                <span className="detail-info-label">浇水频率</span>
                <span className="detail-info-value">每 {selectedPlant.waterFrequency} 天</span>
              </div>
              <div className="detail-info-row">
                <span className="detail-info-label">施肥周期</span>
                <span className="detail-info-value">每 {selectedPlant.fertilizeFrequency} 天</span>
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">播种日期</label>
            <input
              className={`form-input ${error && !sowDate ? 'error' : ''}`}
              type="date"
              value={sowDate}
              onChange={(e) => {
                setSowDate(e.target.value)
                setError('')
              }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">盆数</label>
            <input
              className={`form-input ${error && (!potCount || Number(potCount) <= 0) ? 'error' : ''}`}
              type="number"
              min="1"
              value={potCount}
              onChange={(e) => {
                setPotCount(e.target.value)
                setError('')
              }}
            />
          </div>

          {selectedPlant && sowDate && (
            <div className="form-group">
              <div className="detail-info-row">
                <span className="detail-info-label">预计收获日期</span>
                <span className="detail-info-value" style={{ color: '#10B981' }}>
                  {new Date(new Date(sowDate).getTime() + selectedPlant.maturityDays * 24 * 60 * 60 * 1000)
                    .toISOString()
                    .split('T')[0]}
                </span>
              </div>
            </div>
          )}

          {error && <div className="form-error">{error}</div>}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            取消
          </button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? '创建中...' : '创建计划'}
          </button>
        </div>
      </div>
    </div>
  )
}
