export interface User {
  id: string
  username: string
  avatar: string | null
}

export interface Album {
  id: string
  userId: string
  name: string
  releaseDate: string
  cover: string | null
  createdAt: string
  songCount?: number
}

export interface Song {
  id: string
  albumId: string
  name: string
  duration: number
  audioUrl: string | null
  createdAt: string
  playCount?: number
  likeCount?: number
  album?: Album
}

export interface Comment {
  id: string
  songId: string
  nickname: string
  content: string
  createdAt: string
}

export interface PlaysTrendItem {
  date: string
  count: number
}

export interface TopSongItem {
  song: Song
  playCount: number
}

export interface Summary {
  totalPlays: number
  totalLikes: number
  totalComments: number
}
