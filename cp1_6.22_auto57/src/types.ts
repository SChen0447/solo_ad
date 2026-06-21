export interface Song {
  id: string
  title: string
  artist: string
  cover: string
  duration: number
  tags: string[]
}

export interface RoomSong {
  id: string
  roomId: string
  userId: string
  userName: string
  songId: string
  songTitle: string
  songArtist: string
  songCover: string
  songDuration: number
  songTags: string[]
  addedAt: number
}

export interface Room {
  id: string
  code: string
  theme: string
  createdAt: number
  userId: string
  userName: string
  songs?: RoomSong[]
}

export interface TagData {
  name: string
  count: number
  weight: number
}

export interface AnalyticsData {
  room: Room
  songs: RoomSong[]
  tags: TagData[]
  recommendedSongs: Song[]
  totalSongs: number
  uniqueUsers: number
}

export interface UserHistory {
  user: {
    id: string
    name: string
    createdAt: number
  }
  history: (RoomSong & { roomCode: string; roomTheme: string })[]
  rooms: (Room & { songCount: number })[]
}
