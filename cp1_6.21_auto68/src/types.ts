export interface Member {
  id: string
  name: string
  lastReportTime: string | null
  lastCheckpoint: number | null
  distanceFromStart: number
  emergencyContact: string
  supplies: string[]
  isActive: boolean
}

export interface Checkpoint {
  id: number
  distance: number
  elevation: number
  estimatedTime: string
}

export interface Activity {
  id: string
  code: string
  name: string
  meetingPoint: string
  estimatedDuration: number
  difficulty: 'easy' | 'medium' | 'hard'
  maxMembers: number
  members: Member[]
  checkpoints: Checkpoint[]
  status: 'upcoming' | 'ongoing' | 'finished'
  startTime: string | null
  endTime: string | null
  createdAt: string
}

export interface MemberStat {
  memberId: string
  name: string
  reportCount: number
  totalCheckpoints: number
  lastReportTime: string | null
}

export interface ActivitySummary {
  activity: Activity & {
    actualDuration: number
    actualRoute: Checkpoint[]
  }
  memberStats: MemberStat[]
}

export const SUPPLIES_LIST = [
  '饮用水',
  '急救包',
  '登山杖',
  '头灯',
  '防晒用品',
  '雨衣',
  '能量食品',
  '地图指南针'
]
