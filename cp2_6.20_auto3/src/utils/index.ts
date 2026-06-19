import { v4 as uuidv4 } from 'uuid'

export const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = timestamp - now.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (days === 0) {
    return '今天 ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  } else if (days === 1) {
    return '明天 ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  } else if (days === 2) {
    return '后天 ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  } else if (days < 7) {
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    return weekDays[date.getDay()] + ' ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  } else {
    return date.toLocaleDateString('zh-CN', { 
      month: 'long', 
      day: 'numeric' 
    }) + ' ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }
}

export const formatDateTime = (timestamp: number): string => {
  const date = new Date(timestamp)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export const formatRelativeTime = (timestamp: number): string => {
  const now = Date.now()
  const diff = now - timestamp
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`
  
  return formatDateTime(timestamp)
}

export const getProgressColor = (current: number, max: number): string => {
  if (max === 0) return 'linear-gradient(90deg, #4CAF50 0%, #8BC34A 100%)'
  const ratio = current / max
  if (ratio < 0.5) return 'linear-gradient(90deg, #4CAF50 0%, #8BC34A 100%)'
  if (ratio < 0.8) return 'linear-gradient(90deg, #FF9800 0%, #FFB74D 100%)'
  return 'linear-gradient(90deg, #F44336 0%, #FF5722 100%)'
}

export const getTypeEmoji = (type: string): string => {
  const emojiMap: Record<string, string> = {
    '运动': '🏀',
    '音乐': '🎸',
    '读书': '📚',
    '桌游': '🎲',
    '户外': '🏔️',
    '美食': '🍜'
  }
  return emojiMap[type] || '🎉'
}

export const generateUserId = (): string => {
  const stored = localStorage.getItem('jule_user_id')
  if (stored) return stored
  const newId = uuidv4()
  localStorage.setItem('jule_user_id', newId)
  return newId
}

export const getCurrentUser = () => {
  const id = generateUserId()
  const name = localStorage.getItem('jule_user_name') || ''
  return {
    id,
    name,
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${id}`
  }
}

export const saveUserName = (name: string) => {
  localStorage.setItem('jule_user_name', name)
}

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) & { cancel: () => void } => {
  let timeout: ReturnType<typeof setTimeout> | null = null
  const debounced = (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
  debounced.cancel = () => {
    if (timeout) {
      clearTimeout(timeout)
      timeout = null
    }
  }
  return debounced
}

export const validateForm = (data: {
  title: string
  time: number
  location: string
  maxParticipants: number
  type: string
}): { valid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {}
  
  if (!data.title.trim()) {
    errors.title = '活动标题不能为空'
  }
  
  if (isNaN(data.time)) {
    errors.time = '请输入有效的日期时间'
  } else if (data.time < Date.now()) {
    errors.time = '活动时间不能早于当前时间'
  }
  
  if (!data.location.trim()) {
    errors.location = '活动地点不能为空'
  }
  
  if (!data.maxParticipants || data.maxParticipants < 1) {
    errors.maxParticipants = '请设置活动人数上限'
  }
  
  if (!data.type) {
    errors.type = '请选择活动类型'
  }
  
  return {
    valid: Object.keys(errors).length === 0,
    errors
  }
}
