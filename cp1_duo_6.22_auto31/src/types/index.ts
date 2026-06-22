export interface PostcardData {
  id: string
  imageUrl: string
  unlockDate: string
  message: string
  createdAt: string
}

export interface GuestMessage {
  id: string
  postcardId: string
  nickname: string
  content: string
  createdAt: string
  visitorId: string
}
