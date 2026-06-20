export type VenueType = 'square' | 'park' | 'subway'

export interface Venue {
  id: string
  name: string
  type: VenueType
  address: string
  lat: number
  lng: number
  photo: string
  timeSlots: TimeSlot[]
}

export interface TimeSlot {
  id: string
  startTime: string
  endTime: string
  available: boolean
  bookedBy?: string
}

export interface Booking {
  id: string
  venueId: string
  venueName: string
  artistId: string
  artistName: string
  date: string
  startTime: string
  endTime: string
  status: 'confirmed' | 'pending' | 'cancelled'
}

export interface Artist {
  id: string
  name: string
  avatar: string
  bio: string
  socialLinks: {
    platform: string
    url: string
  }[]
  upcomingShows: UpcomingShow[]
}

export interface UpcomingShow {
  date: string
  startTime: string
  endTime: string
  venueName: string
}

export interface Review {
  id: string
  artistId: string
  userId: string
  userName: string
  userAvatar: string
  rating: number
  comment: string
  date: string
  reply?: string
  replyDate?: string
}

export interface User {
  id: string
  name: string
  avatar: string
  role: 'artist' | 'audience'
}
