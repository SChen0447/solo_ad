import { useMemo } from 'react'
import type { Plant, Task } from '@/types'
import { useApp } from '@/context/AppContext'
import { formatDateCN } from '@/utils/format'

interface Props {
  plant: Plant
  onBack: () => void
}

const categoryLabels: Record<Plant['category'], string> = {
  leaf: '叶菜类',
  fruit: '果实类',
  root: '根茎类',
}

const typeLabels: Record<Task['type'], string> = {
  water: '浇水',
  fertilize: '施肥',
  harvest: '收获',
}

const statusLabels: Record<'completed' | 'pending', string> = {
  completed: '已完成',
  pending: '待处理',
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function generateTasks(plan: {
  id: string
  plantName: string
  sowDate: string
  maturityDays: number
  waterFrequency: number
  fertilizeFrequency: number
  completedTasks: string[]
}): Task[] {
  const tasks: Task[] = []
  for (let i = 0; i <= plan.maturityDays; i += plan.waterFrequency) {
    const date = addDays(plan.sowDate, i)
    const taskId = `${plan.id}-water-${date}`
    tasks.push({
      id: taskId,
      planId: plan.id,
      plantName: plan.plantName,
      type: 'water',
      date,
      completed: plan.completedTasks.includes(taskId),
    })
  }
  for (let i = 0; i <= plan.maturityDays; i += plan.fertilizeFrequency) {
    const date = addDays(plan.sowDate, i)
    const taskId = `${plan.id}-fertilize-${date}`
    tasks.push({
      id: taskId,
      planId: plan.id,
      plantName: plan.plantName,
      type: 'fertilize',
      date,
      completed: plan.completedTasks.includes(taskId),
    })
  }
  const harvestDate = addDays(plan.sowDate, plan.maturityDays)
  const harvestTaskId = `${plan.id}-harvest-${harvestDate}`
  tasks.push({
    id: harvestTaskId,
    planId: plan.id,
    plantName: plan.plantName,
    type: 'harvest',
    date: harvestDate,
    completed: plan.completedTasks.includes(harvestTaskId),
  })
  return tasks
}

export default function PlantDetail({ plant, onBack }: Props) {
  const { plans, records } = useApp()

  const relatedPlans = useMemo(() => plans.filter((p) => p.plantId === plant.id), [plans, plant.id])

  const allReminders = useMemo(() => {
    const reminders: Task[] = []
    relatedPlans.forEach((plan) => {
      reminders.push(...generateTasks(plan))
    })
    return reminders.sort((a, b) => b.date.localeCompare(a.date))
  }, [relatedPlans])

  const plantRecords = useMemo(() => {
    const planIds = relatedPlans.map((p) => p.id)
    return records
      .filter((r) => planIds.includes(r.planId))
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [relatedPlans, records])

  return (
    <div className="page-container">
      <button className="back-btn" onClick={onBack}>
        ← 返回植物库
      </button>

      <div className="detail-card" style={{ marginBottom: 32 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 32 }}>
          <div>
            <img
              className="detail-image"
              src={plant.imageUrl}
              alt={plant.name}
              style={{ marginBottom: 0 }}
              onError={(e) => {
                ;(e.target as HTMLImageElement).src =
                  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjI0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjRTVFN0VCIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMjAiIGZpbGw9IiM5Q0EzQUYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj7wn5Sl5qSN54mp54mpPC90ZXh0Pjwvc3ZnPg=='
              }}
            />
          </div>
          <div>
            <div className="detail-name">{plant.name}</div>
            <div>
              <span className={`plant-card-tag ${plant.category}`}>
                {categoryLabels[plant.category]}
              </span>
            </div>
            <div style={{ marginTop: 20 }}>
              <div className="detail-info-row">
                <span className="detail-info-label">预计成熟周期</span>
                <span className="detail-info-value">{plant.maturityDays} 天</span>
              </div>
              <div className="detail-info-row">
                <span className="detail-info-label">浇水频率</span>
                <span className="detail-info-value">每 {plant.waterFrequency} 天</span>
              </div>
              <div className="detail-info-row">
                <span className="detail-info-label">施肥周期</span>
                <span className="detail-info-value">每 {plant.fertilizeFrequency} 天</span>
              </div>
              <div className="detail-info-row">
                <span className="detail-info-label">种植计划数</span>
                <span className="detail-info-value">{relatedPlans.length} 个</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="detail-card" style={{ marginBottom: 32 }}>
        <div className="section-title" style={{ color: '#065F46' }}>生长日记</div>
        {plantRecords.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📝</div>
            <div className="empty-state-text">暂无生长记录</div>
          </div>
        ) : (
          <div className="timeline">
            {plantRecords.map((r, idx) => (
              <div
                key={r.id}
                className="timeline-item"
                style={{ animationDelay: `${idx * 0.05}s` }}
              >
                <div className="timeline-card">
                  {r.photoUrl && (
                    <img
                      className="timeline-photo"
                      src={r.photoUrl}
                      alt=""
                      onError={(e) => {
                        ;(e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  )}
                  <div className="timeline-content">
                    <div className="timeline-date">{formatDateCN(r.date)}</div>
                    <div className="timeline-metrics">
                      {r.height != null && (
                        <span className="timeline-metric">
                          高度：<span className="timeline-metric-value">{r.height}cm</span>
                        </span>
                      )}
                      {r.leafCount != null && (
                        <span className="timeline-metric">
                          叶片：<span className="timeline-metric-value">{r.leafCount}片</span>
                        </span>
                      )}
                    </div>
                    {r.notes && <div className="timeline-notes">{r.notes}</div>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="detail-card">
        <div className="section-title" style={{ color: '#065F46' }}>历史提醒</div>
        {allReminders.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🔔</div>
            <div className="empty-state-text">暂无提醒记录</div>
          </div>
        ) : (
          <div className="history-list">
            {allReminders.map((r) => {
              const status: 'completed' | 'pending' = r.completed ? 'completed' : 'pending'
              return (
                <div key={r.id} className={`history-item ${status}`}>
                  <span className="history-date">{formatDateCN(r.date)}</span>
                  <span style={{ flex: 1, paddingLeft: 16 }}>{r.plantName}</span>
                  <span className={`history-type ${r.type}`}>{typeLabels[r.type]}</span>
                  <span className={`history-status ${status}`}>
                    {r.completed ? `✓ ${statusLabels.completed}` : `○ ${statusLabels.pending}`}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
