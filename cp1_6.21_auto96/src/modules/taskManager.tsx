import { useState } from 'react'
import { getSpeciesEmoji } from '../constants'
import type { Plant, Task, TasksResponse } from '../types'

interface TaskManagerProps {
  tasks: TasksResponse
  plants: Plant[]
  onDataChange: () => void
}

interface EditingTask {
  taskId: string
  note: string
}

const groupTasksByDate = (tasks: Task[]) => {
  const groups: Record<string, Task[]> = {}
  tasks.forEach(task => {
    if (!groups[task.date]) {
      groups[task.date] = []
    }
    groups[task.date].push(task)
  })
  return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
}

const getTaskTypeIcon = (type: string) => {
  switch (type) {
    case 'water': return '💧'
    case 'fertilize': return '🌿'
    case 'repot': return '🪴'
    default: return '📋'
  }
}

export default function TaskManager({ tasks, plants, onDataChange }: TaskManagerProps) {
  const [completingTasks, setCompletingTasks] = useState<Set<string>>(new Set())
  const [editingTask, setEditingTask] = useState<EditingTask | null>(null)

  const getPlantSpecies = (plantId: string) => {
    const plant = plants.find(p => p.id === plantId)
    return plant?.species || '默认'
  }

  const handleToggleComplete = async (task: Task) => {
    if (task.completed) return
    if (completingTasks.has(task.id)) return

    setCompletingTasks(prev => new Set([...prev, task.id]))

    try {
      await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          completed: true,
          note: editingTask?.taskId === task.id ? editingTask.note : task.note
        })
      })
      
      setTimeout(() => {
        onDataChange()
        setCompletingTasks(prev => {
          const newSet = new Set(prev)
          newSet.delete(task.id)
          return newSet
        })
        if (editingTask?.taskId === task.id) {
          setEditingTask(null)
        }
      }, 500)
    } catch (error) {
      console.error('Failed to complete task:', error)
      setCompletingTasks(prev => {
        const newSet = new Set(prev)
        newSet.delete(task.id)
        return newSet
      })
      alert('操作失败，请重试')
    }
  }

  const handleEditNote = (task: Task) => {
    setEditingTask({
      taskId: task.id,
      note: task.note
    })
  }

  const handleSaveNote = async () => {
    if (!editingTask) return

    try {
      await fetch(`/api/tasks/${editingTask.taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: editingTask.note })
      })
      onDataChange()
      setEditingTask(null)
    } catch (error) {
      console.error('Failed to save note:', error)
      alert('保存失败，请重试')
    }
  }

  const formatDateLabel = (dateStr: string) => {
    const date = new Date(dateStr)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const isToday = date.toDateString() === today.toDateString()
    const isTomorrow = date.toDateString() === tomorrow.toDateString()

    if (isToday) return '今天'
    if (isTomorrow) return '明天'
    
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    return `${dateStr} ${weekDays[date.getDay()]}`
  }

  const futureGroups = groupTasksByDate(tasks.future)

  return (
    <div className="task-manager">
      <section className="task-section">
        <h2 className="section-title">
          📅 今日待办
          <span className="task-count">{tasks.today.filter(t => !t.completed).length}</span>
        </h2>
        
        {tasks.today.length === 0 ? (
          <div className="empty-tasks">
            <p className="empty-icon">🎉</p>
            <p>今天没有护理任务，太棒了！</p>
          </div>
        ) : (
          <div className="task-list">
            {tasks.today.map((task, index) => (
              <div
                key={task.id}
                className={`task-card ${task.completed ? 'completed' : ''} ${completingTasks.has(task.id) ? 'completing' : ''}`}
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <div className="task-checkbox">
                  <input
                    type="checkbox"
                    checked={task.completed || completingTasks.has(task.id)}
                    onChange={() => handleToggleComplete(task)}
                    disabled={task.completed || completingTasks.has(task.id)}
                  />
                </div>
                <div className="task-content">
                  <div className="task-header">
                    <span className="task-emoji">{getTaskTypeIcon(task.type)}</span>
                    <span className="task-type">{task.typeLabel}</span>
                    <span className="task-plant">
                      {getSpeciesEmoji(getPlantSpecies(task.plantId))} {task.plantName}
                    </span>
                  </div>
                  {editingTask?.taskId === task.id ? (
                    <div className="task-edit">
                      <input
                        type="text"
                        value={editingTask.note}
                        onChange={(e) => setEditingTask({ ...editingTask, note: e.target.value })}
                        placeholder="添加备注..."
                        autoFocus
                      />
                      <button className="save-note-btn" onClick={handleSaveNote}>
                        保存
                      </button>
                      <button
                        className="cancel-note-btn"
                        onClick={() => setEditingTask(null)}
                      >
                        取消
                      </button>
                    </div>
                  ) : (
                    <>
                      {task.note && <p className="task-note">{task.note}</p>}
                      {!task.completed && (
                        <button
                          className="edit-note-btn"
                          onClick={() => handleEditNote(task)}
                        >
                          ✏️ 添加备注
                        </button>
                      )}
                    </>
                  )}
                </div>
                {task.completed && (
                  <span className="completed-badge">✓ 已完成</span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="task-section">
        <h2 className="section-title">
          📆 未来任务
          <span className="task-count">{tasks.future.length}</span>
        </h2>
        
        {futureGroups.length === 0 ? (
          <div className="empty-tasks">
            <p className="empty-icon">🌿</p>
            <p>暂无未来的护理任务</p>
          </div>
        ) : (
          <div className="future-tasks">
            {futureGroups.map(([date, dateTasks], groupIndex) => (
              <div key={date} className="date-group" style={{ animationDelay: `${groupIndex * 150}ms` }}>
                <h3 className="date-label">{formatDateLabel(date)}</h3>
                <div className="task-list">
                  {dateTasks.map((task, taskIndex) => (
                    <div
                      key={task.id}
                      className={`task-card future ${completingTasks.has(task.id) ? 'completing' : ''}`}
                      style={{ animationDelay: `${(groupIndex * 150) + (taskIndex * 80)}ms` }}
                    >
                      <div className="task-checkbox">
                        <input
                          type="checkbox"
                          checked={task.completed || completingTasks.has(task.id)}
                          onChange={() => handleToggleComplete(task)}
                          disabled={task.completed || completingTasks.has(task.id)}
                        />
                      </div>
                      <div className="task-content">
                        <div className="task-header">
                          <span className="task-emoji">{getTaskTypeIcon(task.type)}</span>
                          <span className="task-type">{task.typeLabel}</span>
                          <span className="task-plant">
                            {getSpeciesEmoji(getPlantSpecies(task.plantId))} {task.plantName}
                          </span>
                        </div>
                        {editingTask?.taskId === task.id ? (
                          <div className="task-edit">
                            <input
                              type="text"
                              value={editingTask.note}
                              onChange={(e) => setEditingTask({ ...editingTask, note: e.target.value })}
                              placeholder="添加备注..."
                              autoFocus
                            />
                            <button className="save-note-btn" onClick={handleSaveNote}>
                              保存
                            </button>
                            <button
                              className="cancel-note-btn"
                              onClick={() => setEditingTask(null)}
                            >
                              取消
                            </button>
                          </div>
                        ) : (
                          <>
                            {task.note && <p className="task-note">{task.note}</p>}
                            {!task.completed && (
                              <button
                                className="edit-note-btn"
                                onClick={() => handleEditNote(task)}
                              >
                                ✏️ 添加备注
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
