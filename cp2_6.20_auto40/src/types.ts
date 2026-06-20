/* ============================================
 * 共享类型定义
 * 上游：无（类型定义文件）
 * 下游：api.ts、所有页面/组件文件
 * 数据流向：
 *   - 导出：Activity, Equipment, User, Review, Achievement
 *     Difficulty, ActivityType, Category 及相关枚举标签
 * ============================================ */

export type ActivityType = 'hiking' | 'camping' | 'climbing' | 'cycling' | 'running'
export type Difficulty = 'easy' | 'moderate' | 'hard' | 'expert'
export type EquipmentCategory = 'tent' | 'backpack' | 'stove' | 'hiking-boots' | 'climbing-gear' | 'sleeping-bag'
export type ActivityStatus = 'upcoming' | 'ongoing' | 'ended'
export type EquipmentStatus = 'available' | 'borrowed' | 'maintenance'

export const ActivityTypeLabels: Record<ActivityType, string> = {
  hiking: '徒步',
  camping: '露营',
  climbing: '攀岩',
  cycling: '骑行',
  running: '越野跑'
}

export const DifficultyLabels: Record<Difficulty, { label: string; color: string }> = {
  easy: { label: '入门', color: '#4CAF50' },
  moderate: { label: '进阶', color: '#FF8F00' },
  hard: { label: '挑战', color: '#F44336' },
  expert: { label: '专家', color: '#9C27B0' }
}

export const EquipmentCategoryLabels: Record<EquipmentCategory, string> = {
  tent: '帐篷',
  backpack: '背包',
  stove: '炉具',
  'hiking-boots': '登山鞋',
  'climbing-gear': '攀岩装备',
  'sleeping-bag': '睡袋'
}

export interface Participant {
  id: string
  name: string
  avatar: string
}

export interface Activity {
  id: string
  title: string
  description: string
  type: ActivityType
  date: string
  location: string
  coverImage: string
  maxParticipants: number
  participants: Participant[]
  organizer: string
  difficulty: Difficulty
  status: ActivityStatus
  itinerary: string
  createdAt: string
}

export interface Equipment {
  id: string
  name: string
  category: EquipmentCategory
  imageUrl: string
  description: string
  status: EquipmentStatus
  owner: string
  ownerName?: string
  ownerAvatar: string
  condition: string
  borrowCount: number
  returnDate?: string
}

export interface User {
  id: string
  name: string
  avatar: string
  level: number
  bio: string
  registeredActivities: string[]
  completedActivities: string[]
  unlockedAchievements: string[]
  borrowedEquipment: string[]
  activityDates?: { id: string; date: string; title: string; type: string }[]
}

export interface Review {
  id: string
  activityId: string
  userId: string
  userName: string
  userAvatar: string
  content: string
  imageUrl?: string
  likes: number
  likedBy: string[]
  createdAt: string
}

export interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  condition: string
  unlockedAt?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}

export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
}
