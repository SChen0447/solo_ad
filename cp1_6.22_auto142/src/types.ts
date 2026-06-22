export interface User {
  id: string
  name: string
  avatar: string
  role: 'volunteer' | 'organizer'
  totalHours: number
  activityCount: number
  earnedBadges?: string[]
}

export interface Activity {
  id: string
  title: string
  description: string
  organizer: string
  organizerId: string
  date: string
  location: string
  maxParticipants: number
  registrationDeadline: string
  coverImage: string
  estimatedHours: number
  registrants: string[]
  confirmedAttendees: string[]
  status: 'upcoming' | 'ongoing' | 'completed'
}

export interface WorkRecord {
  id: string
  userId: string
  activityId: string
  activityTitle: string
  date: string
  hours: number
  review: string
  organizer: string
}

export interface Badge {
  name: string
  hours: number
  color: string
  icon: string
  category?: string
  requires?: number
  earned: boolean
  progress: number
}
