export const WARM_COLORS = [
  '#e94560',
  '#f38181',
  '#fce38a',
  '#ff9a76',
  '#ff6b6b',
  '#ee9595',
  '#f5a25d',
  '#fa7f72',
  '#e1701a',
  '#d35d6e',
]

export const TAG_COLORS: Record<string, string> = {
  技术: '#00d4ff',
  市场: '#ff6b6b',
  设计: '#ffd93d',
  产品: '#6bcf7f',
  运营: '#a855f7',
  其他: '#94a3b8',
}

export function getRandomColor(): string {
  return WARM_COLORS[Math.floor(Math.random() * WARM_COLORS.length)]
}

export function getTagColor(tag: string): string {
  const cleanTag = tag.replace(/^#/, '')
  return TAG_COLORS[cleanTag] || TAG_COLORS['其他']
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 10)
}

export function getAvatarColor(userId: string): string {
  const colors = ['#0f3460', '#533483', '#e94560', '#16213e', '#6bcf7f', '#ffd93d']
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

export function getInitials(name: string): string {
  if (!name) return '?'
  return name.trim().charAt(0).toUpperCase()
}

export function parseTags(text: string): string[] {
  const matches = text.match(/#[\u4e00-\u9fa5a-zA-Z0-9]+/g)
  return matches || []
}

export function formatTime(ts: number): string {
  const date = new Date(ts * 1000)
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
}
