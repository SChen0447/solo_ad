export type Difficulty = 'easy' | 'moderate' | 'hard' | 'expert'
export type ActivityType = 'hiking' | 'camping' | 'climbing' | 'cycling' | 'running' | 'swimming'
export type EquipmentCategory = 'tent' | 'backpack' | 'sleeping_bag' | 'climbing' | 'cooking' | 'clothing' | 'navigation' | 'other'
export type EquipmentStatus = 'available' | 'borrowed'
export type ActivityStatus = 'upcoming' | 'ongoing' | 'ended'

export interface Participant {
  id: string
  name: string
  avatar: string
  registeredAt: string
}

export interface Activity {
  id: string
  title: string
  type: ActivityType
  date: string
  location: string
  maxParticipants: number
  participants: Participant[]
  difficulty: Difficulty
  description: string
  itinerary: string
  coverImage: string
  organizer: string
  createdAt: string
  status: ActivityStatus
}

export interface Equipment {
  id: string
  name: string
  category: EquipmentCategory
  description: string
  imageUrl: string
  status: EquipmentStatus
  ownerId: string
  ownerName: string
  borrowedBy?: string
  borrowedDate?: string
  returnDate?: string
  createdAt: string
}

export interface User {
  id: string
  name: string
  avatar: string
  bio: string
  joinDate: string
  registeredActivities: string[]
  completedActivities: string[]
  borrowedEquipment: string[]
  totalBorrows: number
  hikingCount: number
  campingCount: number
  climbingCount: number
}

export interface Review {
  id: string
  activityId: string
  userId: string
  userName: string
  userAvatar: string
  imageUrl?: string
  content: string
  likes: number
  likedBy: string[]
  createdAt: string
}

export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  unlocked: boolean
  condition: string
}

export const ActivityTypeLabels: Record<ActivityType, string> = {
  hiking: '徒步',
  camping: '露营',
  climbing: '登山',
  cycling: '骑行',
  running: '跑步',
  swimming: '游泳'
}

export const DifficultyLabels: Record<Difficulty, { label: string; color: string }> = {
  easy: { label: '简单', color: '#52c41a' },
  moderate: { label: '中等', color: '#faad14' },
  hard: { label: '困难', color: '#f5222d' },
  expert: { label: '专家', color: '#722ed1' }
}

export const EquipmentCategoryLabels: Record<EquipmentCategory, string> = {
  tent: '帐篷',
  backpack: '背包',
  sleeping_bag: '睡袋',
  climbing: '攀岩',
  cooking: '炉具',
  clothing: '服装',
  navigation: '导航',
  other: '其他'
}
