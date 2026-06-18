import { useState, useEffect, useCallback } from 'react'
import type { Task, ScheduleSuggestion } from './types'
import TaskList from './TaskList'
import Timeline from './Timeline'

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [suggestions, setSuggestions] = useState<ScheduleSuggestion[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [newTask, setNewTask] = useState({
    title: '',
    estimatedMinutes: 30,
    dueDate: new Date().toISOString().split('T')[0],
    urgency: 'medium' as Task['urgency'],
    energy: 'medium' as Task['energy']
  })

  useEffect(() => {
    fetch('/api/tasks')
      .then(res => res.json())
      .then(data => setTasks(data))
  }, [])

  const saveTasks = useCallback(async (updatedTasks: Task[]) => {
    setTasks(updatedTasks)
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedTasks)
    })
  }, [])

  const updateTaskSchedule = useCallback((taskId: string, scheduledStart: number | undefined) => {
    const updated = tasks.map(t =>
      t.id === taskId ? { ...t, scheduledStart } : t
    )
    saveTasks(updated)
    setSuggestions(prev => prev.filter(s => s.taskId !== taskId))
  }, [tasks, saveTasks])

  const addTask = async () => {
    if (!newTask.title.trim()) return
    const task: Task = {
      id: crypto.randomUUID(),
      ...newTask
    }
    const updated = [...tasks, task]
    await saveTasks(updated)
    setNewTask({
      title: '',
      estimatedMinutes: 30,
      dueDate: new Date().toISOString().split('T')[0],
      urgency: 'medium',
      energy: 'medium'
    })
    setShowAddModal(false)
  }

  const generateSuggestions = useCallback(() => {
    const DAY_START = 9
    const DAY_END = 18
    const sorted = [...tasks].sort((a, b) => calcPriority(b) - calcPriority(a))
    const usedSlots: Array<{ start: number; end: number }> = []
    const result: ScheduleSuggestion[] = []

    for (const task of sorted) {
      const duration = task.estimatedMinutes / 60
      let placed = false
      for (let hour = DAY_START; hour + duration <= DAY_END; hour += 0.25) {
        const slotStart = hour
        const slotEnd = hour + duration
        const conflict = usedSlots.some(
          s => slotStart < s.end && slotEnd > s.start
        )
        if (!conflict) {
          usedSlots.push({ start: slotStart, end: slotEnd })
          result.push({ taskId: task.id, startTime: slotStart })
          placed = true
          break
        }
      }
      if (!placed && task.scheduledStart !== undefined) {
        result.push({ taskId: task.id, startTime: task.scheduledStart })
      }
    }
    setSuggestions(result)
  }, [tasks])

  const applySuggestions = () => {
    const updated = tasks.map(t => {
      const sug = suggestions.find(s => s.taskId === t.id)
      return sug ? { ...t, scheduledStart: sug.startTime } : t
    })
    saveTasks(updated)
    setSuggestions([])
  }

  const today = new Date()
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100%' }}>
      <div style={{
        width: 300,
        minWidth: 300,
        background: '#f9fafb',
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid #e5e7eb'
      }}>
        <div style={{
          padding: '20px 16px 12px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: '#111827' }}>任务列表</h2>
          <button onClick={() => setShowAddModal(true)} style={{
            width: 32, height: 32,
            background: '#3b82f6', color: 'white', border: 'none',
            borderRadius: 8, cursor: 'pointer', fontSize: 20,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s ease'
          }} onMouseOver={e => e.currentTarget.style.background = '#2563eb'}
             onMouseOut={e => e.currentTarget.style.background = '#3b82f6'}>+</button>
        </div>
        <TaskList tasks={tasks} onSchedule={updateTaskSchedule} />
      </div>

      <div style={{
        flex: '3 1 0',
        display: 'flex',
        flexDirection: 'column',
        background: 'white',
        minWidth: 0
      }}>
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'baseline',
          gap: 12
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>
            {today.getFullYear()}年{today.getMonth() + 1}月{today.getDate()}日
          </h2>
          <span style={{ fontSize: 14, color: '#6b7280' }}>{weekdays[today.getDay()]}</span>
        </div>
        <Timeline
          tasks={tasks}
          suggestions={suggestions}
          onSchedule={updateTaskSchedule}
        />
      </div>

      <div style={{
        flex: '1 1 280px',
        minWidth: 280,
        maxWidth: 420,
        background: '#f3f4f6',
        display: 'flex',
        flexDirection: 'column',
        borderLeft: '1px solid #e5e7eb'
      }}>
        <div style={{ padding: 20, borderBottom: '1px solid #d1d5db' }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: '#111827', marginBottom: 16 }}>智能建议</h2>
          <button onClick={generateSuggestions} style={{
            width: '100%', padding: '10px 14px',
            background: '#3b82f6', color: 'white', border: 'none',
            borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600,
            transition: 'all 0.2s ease', marginBottom: 10
          }} onMouseOver={e => e.currentTarget.style.background = '#2563eb'}
             onMouseOut={e => e.currentTarget.style.background = '#3b82f6'}>
            一键优化建议
          </button>
          {suggestions.length > 0 && (
            <button onClick={applySuggestions} style={{
              width: '100%', padding: '10px 14px',
              background: 'white', color: '#3b82f6', border: '1px solid #3b82f6',
              borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600,
              transition: 'all 0.2s ease'
            }} onMouseOver={e => { e.currentTarget.style.background = '#eff6ff' }}
               onMouseOut={e => { e.currentTarget.style.background = 'white' }}>
              采纳全部建议 ({suggestions.length})
            </button>
          )}
        </div>
        <div style={{ padding: 16, overflowY: 'auto', flex: 1 }}>
          {suggestions.length === 0 ? (
            <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>
              点击"一键优化建议"按钮，系统将根据任务优先级和可用时段为您智能推荐日程排布方案。
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {suggestions.map(sug => {
                const task = tasks.find(t => t.id === sug.taskId)
                if (!task) return null
                const startH = Math.floor(sug.startTime)
                const startM = Math.round((sug.startTime - startH) * 60)
                const end = sug.startTime + task.estimatedMinutes / 60
                const endH = Math.floor(end)
                const endM = Math.round((end - endH) * 60)
                return (
                  <div key={sug.taskId} style={{
                    background: 'white', padding: 12, borderRadius: 8,
                    border: '2px dashed #3b82f6'
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 4 }}>
                      {task.title}
                    </div>
                    <div style={{ fontSize: 12, color: '#3b82f6', fontWeight: 500 }}>
                      {String(startH).padStart(2, '0')}:{String(startM).padStart(2, '0')} - {String(endH).padStart(2, '0')}:{String(endM).padStart(2, '0')}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {showAddModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }} onClick={() => setShowAddModal(false)}>
          <div style={{
            background: 'white', borderRadius: 12, padding: 24, width: 380,
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, color: '#111827' }}>新建任务</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>任务标题</label>
                <input value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14 }}
                  placeholder="请输入任务标题" />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>预计耗时（分钟）</label>
                  <input type="number" value={newTask.estimatedMinutes}
                    onChange={e => setNewTask({ ...newTask, estimatedMinutes: Math.max(5, parseInt(e.target.value) || 0) })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14 }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>截止日期</label>
                  <input type="date" value={newTask.dueDate}
                    onChange={e => setNewTask({ ...newTask, dueDate: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14 }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>紧急程度</label>
                  <select value={newTask.urgency} onChange={e => setNewTask({ ...newTask, urgency: e.target.value as Task['urgency'] })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14 }}>
                    <option value="high">高</option>
                    <option value="medium">中</option>
                    <option value="low">低</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>精力消耗</label>
                  <select value={newTask.energy} onChange={e => setNewTask({ ...newTask, energy: e.target.value as Task['energy'] })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14 }}>
                    <option value="high">大</option>
                    <option value="medium">中</option>
                    <option value="low">小</option>
                  </select>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowAddModal(false)} style={{
                padding: '8px 16px', background: '#f3f4f6', color: '#374151',
                border: 'none', borderRadius: 8, fontSize: 14, cursor: 'pointer', fontWeight: 500
              }}>取消</button>
              <button onClick={addTask} style={{
                padding: '8px 16px', background: '#3b82f6', color: 'white',
                border: 'none', borderRadius: 8, fontSize: 14, cursor: 'pointer', fontWeight: 500
              }}>创建</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function calcPriority(task: Task): number {
  const urgencyScore = task.urgency === 'high' ? 100 : task.urgency === 'medium' ? 60 : 30
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const due = new Date(task.dueDate)
  due.setHours(0, 0, 0, 0)
  const diffDays = Math.max(0, Math.ceil((due.getTime() - now.getTime()) / 86400000))
  const dueScore = diffDays === 0 ? 100 : diffDays <= 1 ? 90 : diffDays <= 2 ? 75 : diffDays <= 3 ? 55 : diffDays <= 5 ? 35 : 20
  const energyScore = task.energy === 'high' ? 100 : task.energy === 'medium' ? 55 : 25
  return urgencyScore * 0.5 + dueScore * 0.3 + energyScore * 0.2
}
