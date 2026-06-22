import { useState, useMemo } from 'react'
import { useApp } from '@/context/AppContext'
import GrowthTimeline from '@/components/GrowthTimeline'
import type { PlantingPlan, GrowthRecord } from '@/types'

export default function GrowthAnalysis() {
  const { plans, records, addRecord } = useApp()
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(plans[0]?.id ?? null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    photoUrl: '',
    height: '',
    leafCount: '',
    notes: '',
  })

  const selectedPlan = useMemo(
    () => plans.find((p) => p.id === selectedPlanId) as PlantingPlan | undefined,
    [plans, selectedPlanId],
  )

  const planRecords = useMemo<GrowthRecord[]>(
    () => records.filter((r) => r.planId === selectedPlanId),
    [records, selectedPlanId],
  )

  const handleAddRecord = async () => {
    if (!selectedPlan) return
    const payload: Omit<GrowthRecord, 'id'> = {
      planId: selectedPlan.id,
      date: formData.date,
    }
    if (formData.photoUrl.trim()) payload.photoUrl = formData.photoUrl.trim()
    if (formData.height.trim()) {
      const h = Number(formData.height)
      if (!isNaN(h) && h > 0) payload.height = h
    }
    if (formData.leafCount.trim()) {
      const l = Number(formData.leafCount)
      if (!isNaN(l) && l > 0) payload.leafCount = Math.floor(l)
    }
    if (formData.notes.trim()) payload.notes = formData.notes.trim()

    try {
      await addRecord(payload)
      setFormData({
        date: new Date().toISOString().split('T')[0],
        photoUrl: '',
        height: '',
        leafCount: '',
        notes: '',
      })
      setShowAddForm(false)
    } catch (e) {
      console.error('Failed to add record:', e)
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">生长分析</h1>
        {plans.length > 0 && (
          <button className="btn btn-primary" onClick={() => setShowAddForm((s) => !s)}>
            {showAddForm ? '取消' : '+ 添加记录'}
          </button>
        )}
      </div>

      {plans.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📊</div>
          <div className="empty-state-text">
            还没有种植计划，请先在「种植计划」页面创建计划
          </div>
        </div>
      ) : (
        <>
          <div className="detail-card" style={{ marginBottom: 24 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">选择种植计划</label>
              <select
                className="form-select"
                value={selectedPlanId ?? ''}
                onChange={(e) => setSelectedPlanId(e.target.value)}
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.plantName} · 播种于 {p.sowDate} · {p.potCount}盆
                  </option>
                ))}
              </select>
            </div>
          </div>

          {showAddForm && selectedPlan && (
            <div className="add-record-form" style={{ marginBottom: 24 }}>
              <div className="section-title" style={{ fontSize: 16, marginBottom: 16 }}>
                添加生长记录
              </div>
              <div className="add-record-grid">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">记录日期</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">照片URL（可选）</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="https://..."
                    value={formData.photoUrl}
                    onChange={(e) => setFormData({ ...formData, photoUrl: e.target.value })}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">高度（cm，可选）</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    className="form-input"
                    value={formData.height}
                    onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">叶片数（可选）</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    className="form-input"
                    value={formData.leafCount}
                    onChange={(e) => setFormData({ ...formData, leafCount: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-group" style={{ marginTop: 16, marginBottom: 0 }}>
                <label className="form-label">备注（可选）</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  placeholder="记录今天的生长情况..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
              <div style={{ marginTop: 16, textAlign: 'right' }}>
                <button className="btn btn-primary" onClick={handleAddRecord}>
                  保存记录
                </button>
              </div>
            </div>
          )}

          {selectedPlan && <GrowthTimeline records={planRecords} plan={selectedPlan} />}
        </>
      )}
    </div>
  )
}
