export interface Shelf {
  id: string
  name: string
  description: string
  inviteCode: string
  createdAt: string
}

export interface Member {
  id: string
  nickname: string
  shelfId: string
}

export interface ReadingProgress {
  id: string
  date: string
  currentPage: number
  memberId: string
  memberNickname: string
}

export interface Book {
  id: string
  title: string
  author: string
  totalPages: number
  memberId: string
  memberNickname: string
  progress: ReadingProgress[]
  shelfId: string
}

export interface DiscussionKeyword {
  word: string
  frequency: number
}

export interface Discussion {
  id: string
  word: string
  content: string
  author: string
  date: string
}

export interface AverageProgress {
  date: string
  percentage: number
}

export interface JoinShelfResult {
  member: Member
  shelf: Shelf
}
