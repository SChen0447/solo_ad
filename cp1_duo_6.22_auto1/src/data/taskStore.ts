import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { generateMockTasks, getTeamMembers, getDateRange } from './mockData'

export type TaskStatus = 'todo' | 'in_progress' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high'

export interface Task {
  id: string
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  estimatedHours: number
  actualHours: number
  assigneeId: string
  createdAt: Date
  startedAt?: Date
  completedAt?: Date
  switchCount: number
}

export interface TeamMember {
  id: string
  name: string
  avatar: string
}

export interface DailyStats {
  date: string
  completedCount: number
  hoursDeviation: number
  activeMinutes: number
}

export interface HeatMapCell {
  memberId: string
  date: string
  switchCount: number
  inProgressCount: number
  loadLevel: 1 | 2 | 3
}

export interface Recommendation {
  memberId: string
  memberName: string
  taskId: string
  taskTitle: string
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const useTaskStore = defineStore('task', () => {
  const tasks = ref<Task[]>(generateMockTasks())
  const members = ref<TeamMember[]>(getTeamMembers())
  const notifications = ref<{ id: string; message: string; type: 'info' | 'warning' }[]>([])

  const todoTasks = computed(() => tasks.value.filter(t => t.status === 'todo'))
  const inProgressTasks = computed(() => tasks.value.filter(t => t.status === 'in_progress'))
  const doneTasks = computed(() => tasks.value.filter(t => t.status === 'done'))

  function addTask(task: Omit<Task, 'id' | 'createdAt' | 'switchCount'>) {
    const newTask: Task = {
      ...task,
      id: `t${Date.now()}`,
      createdAt: new Date(),
      switchCount: 0,
    }
    tasks.value.push(newTask)
  }

  function updateTask(id: string, patch: Partial<Task>) {
    const idx = tasks.value.findIndex(t => t.id === id)
    if (idx !== -1) {
      tasks.value[idx] = { ...tasks.value[idx], ...patch }
    }
  }

  function removeTask(id: string) {
    const idx = tasks.value.findIndex(t => t.id === id)
    if (idx !== -1) tasks.value.splice(idx, 1)
  }

  function canMoveToInProgress(assigneeId: string): boolean {
    return tasks.value.filter(t => t.status === 'in_progress' && t.assigneeId === assigneeId).length < 3
  }

  function moveTask(taskId: string, newStatus: TaskStatus): boolean {
    const task = tasks.value.find(t => t.id === taskId)
    if (!task) return false
    if (newStatus === 'in_progress' && !canMoveToInProgress(task.assigneeId)) {
      return false
    }
    const oldStatus = task.status
    if (oldStatus !== newStatus) {
      task.switchCount = task.switchCount + 1
    }
    task.status = newStatus
    if (newStatus === 'in_progress' && !task.startedAt) {
      task.startedAt = new Date()
    }
    if (newStatus === 'done') {
      task.completedAt = new Date()
    } else {
      task.completedAt = undefined
    }
    return true
  }

  const dailyStats = computed<DailyStats[]>(() => {
    const dates = getDateRange(7)
    return dates.map(date => {
      const dayDone = tasks.value.filter(t => t.completedAt && formatDate(t.completedAt) === date)
      const completedCount = dayDone.length
      let totalEst = 0
      let totalAct = 0
      dayDone.forEach(t => {
        totalEst += t.estimatedHours
        totalAct += t.actualHours
      })
      const hoursDeviation = totalEst > 0 ? Math.round((totalAct / totalEst) * 100) / 100 : 1
      const startedToday = tasks.value.filter(t => t.startedAt && formatDate(t.startedAt) <= date && (!t.completedAt || formatDate(t.completedAt) >= date))
      const activeMinutes = startedToday.length * 60 + Math.floor(Math.random() * 120)
      return { date, completedCount, hoursDeviation, activeMinutes }
    })
  })

  const heatMapData = computed<HeatMapCell[]>(() => {
    const dates = getDateRange(7)
    const cells: HeatMapCell[] = []
    members.value.forEach(m => {
      dates.forEach(date => {
        const memberTasks = tasks.value.filter(t => t.assigneeId === m.id)
        const switchesOnDay = memberTasks.reduce((sum, t) => {
          const created = formatDate(t.createdAt) <= date
          const done = t.completedAt ? formatDate(t.completedAt) >= date : true
          return created && done ? sum + t.switchCount : sum
        }, 0)
        const inProgressOnDay = memberTasks.filter(t => {
          const created = formatDate(t.createdAt) <= date
          const done = t.completedAt ? formatDate(t.completedAt) >= date : true
          return created && done && (t.status === 'in_progress' || (formatDate(t.createdAt) === date))
        }).length
        const score = switchesOnDay + inProgressOnDay * 2
        const loadLevel: 1 | 2 | 3 = score <= 2 ? 1 : score <= 5 ? 2 : 3
        cells.push({ memberId: m.id, date, switchCount: switchesOnDay, inProgressCount: inProgressOnDay, loadLevel })
      })
    })
    return cells
  })

  const recommendations = computed<Recommendation[]>(() => {
    const result: Recommendation[] = []
    const dates = getDateRange(7)
    const recentDates = dates.slice(-2)
    members.value.forEach(m => {
      const doneRecently = tasks.value.filter(t =>
        t.assigneeId === m.id && t.status === 'done' && t.completedAt && recentDates.includes(formatDate(t.completedAt))
      )
      if (doneRecently.length === 0) {
        const lowPriorityTodo = tasks.value
          .filter(t => t.assigneeId === m.id && t.status === 'todo' && t.priority === 'low')
          .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        if (lowPriorityTodo.length > 0) {
          result.push({ memberId: m.id, memberName: m.name, taskId: lowPriorityTodo[0].id, taskTitle: lowPriorityTodo[0].title })
        }
      }
    })
    return result
  })

  function pushNotification(message: string, type: 'info' | 'warning' = 'info') {
    const id = `n${Date.now()}`
    notifications.value.push({ id, message, type })
    setTimeout(() => {
      const idx = notifications.value.findIndex(n => n.id === id)
      if (idx !== -1) notifications.value.splice(idx, 1)
    }, 5000)
  }

  watch(recommendations, (recs) => {
    recs.forEach(r => {
      pushNotification(`建议 ${r.memberName} 开始处理低优先级任务：${r.taskTitle}`, 'warning')
    })
  }, { immediate: true })

  return {
    tasks,
    members,
    notifications,
    todoTasks,
    inProgressTasks,
    doneTasks,
    dailyStats,
    heatMapData,
    recommendations,
    addTask,
    updateTask,
    removeTask,
    canMoveToInProgress,
    moveTask,
    pushNotification,
  }
})
