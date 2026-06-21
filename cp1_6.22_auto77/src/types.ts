export interface Project {
  id: string
  name: string
  color: string
  dailyLimit: number
  createdAt: string
}

export interface TimeLog {
  id: string
  projectId: string
  date: string
  subtaskName: string
  duration: number
  tagIds: string[]
  createdAt: string
}

export interface Tag {
  id: string
  name: string
}

export interface ArchiveEntry {
  projectName: string
  date: string
  subtaskName: string
  duration: number
  tags: string[]
}

export const PALETTE = [
  '#f6ad55',
  '#fc8181',
  '#f687b3',
  '#b794f4',
  '#9f7aea',
  '#6b9fff',
  '#63b3ed',
  '#4fd1c5',
  '#68d391',
  '#9ae6b4',
  '#fbd38d',
  '#feb2b2',
]
