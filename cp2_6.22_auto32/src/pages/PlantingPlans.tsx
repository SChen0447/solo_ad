import { useState, useMemo } from 'react'
import { useApp } from '@/context/AppContext'
import CalendarView, { addDays } from '@/components/CalendarView'
import PlanForm from '@/components/PlanForm'
import type { Task, PlantingPlan } from '@/types'

function generateTasks(plan: PlantingPlan): Task[] {
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

function getProgress(plan: PlantingPlan): number {
  const start = new Date(plan.sowDate).getTime()
  const now = Date.now()
  const total = plan.maturityDays * 24 * 60 * 60 * 1000
  const elapsed = now - start
  return Math.max(0, Math.min(100, Math.round((elapsed / total) * 100)))
}

export default function PlantingPlans() {
  const { plans } = useApp()
  const [showForm, setShowForm] = useState(false)

  const allTasks = useMemo(() => {
    const tasks: Task[] = []
    plans.forEach((plan) => tasks.push(...generateTasks(plan)))
    return tasks
  }, [plans])

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">种植计划</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          + 创建计划
        </button>
      </div>

      {plans.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <div className="empty-state-text">还没有种植计划，点击右上角创建第一个计划吧</div>
        </div>
      ) : (
        <div className="plan-list">
          {plans.map((plan, idx) => {
            const progress = getProgress(plan)
            const harvestDate = addDays(plan.sowDate, plan.maturityDays)
            return (
              <div
                key={plan.id}
                className="plan-card"
                style={{ animationDelay: `${idx * 0.05}s` }}
              >
                <div className="plan-info">
                  <div className="plan-plant-name">
                    🌱 {plan.plantName} · {plan.potCount}盆
                  </div>
                  <div className="plan-meta">
                    <span>播种：{plan.sowDate}</span>
                    <span>预计收获：{harvestDate}</span>
                  </div>
                </div>
                <div className="plan-progress">
                  <div className="plan-progress-label">
                    <span>生长进度</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="plan-progress-bar">
                    <div
                      className="plan-progress-fill"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <CalendarView tasks={allTasks} />

      <PlanForm open={showForm} onClose={() => setShowForm(false)} />
    </div>
  )
}
