import axios from 'axios'
import { Venue, Booking, Review, Artist } from '../types'
import { mockVenues, mockArtists, mockReviews, mockBookings, mockUser } from '../data/mockData'

const USE_MOCK = true

const api = axios.create({
  baseURL: '/api',
  timeout: 5000,
})

export const venueApi = {
  async getVenues(): Promise<Venue[]> {
    if (USE_MOCK) {
      return new Promise((resolve) => setTimeout(() => resolve(mockVenues), 300))
    }
    const res = await api.get('/venues')
    return res.data
  },

  async getVenue(id: string): Promise<Venue | undefined> {
    if (USE_MOCK) {
      return new Promise((resolve) =>
        setTimeout(() => resolve(mockVenues.find((v) => v.id === id)), 200)
      )
    }
    const res = await api.get(`/venues/${id}`)
    return res.data
  },
}

export const bookingApi = {
  async createBooking(
    venueId: string,
    timeSlotId: string,
    date: string
  ): Promise<{ success: boolean; message: string; booking?: Booking }> {
    if (USE_MOCK) {
      return new Promise((resolve) => {
        setTimeout(() => {
          const venue = mockVenues.find((v) => v.id === venueId)
          const slot = venue?.timeSlots.find((s) => s.id === timeSlotId)
          if (!slot?.available) {
            resolve({ success: false, message: '该时间段已被预约' })
            return
          }
          const newBooking: Booking = {
            id: `b_${Date.now()}`,
            venueId,
            venueName: venue?.name || '',
            artistId: mockUser.id,
            artistName: mockUser.name,
            date,
            startTime: slot.startTime,
            endTime: slot.endTime,
            status: 'confirmed',
          }
          resolve({ success: true, message: '预约成功！', booking: newBooking })
        }, 500)
      })
    }
    const res = await api.post('/bookings', { venueId, timeSlotId, date })
    return res.data
  },

  async getUserBookings(): Promise<Booking[]> {
    if (USE_MOCK) {
      return new Promise((resolve) => setTimeout(() => resolve(mockBookings), 300))
    }
    const res = await api.get('/bookings')
    return res.data
  },

  async getTodayPerformances(): Promise<Booking[]> {
    if (USE_MOCK) {
      const today = '2024-01-15'
      const todayBookings: Booking[] = []
      mockVenues.forEach((venue) => {
        venue.timeSlots.forEach((slot) => {
          if (!slot.available && slot.bookedBy) {
            const artist = mockArtists.find((a) => a.id === slot.bookedBy)
            todayBookings.push({
              id: `${venue.id}_${slot.id}`,
              venueId: venue.id,
              venueName: venue.name,
              artistId: slot.bookedBy,
              artistName: artist?.name || '未知艺人',
              date: today,
              startTime: slot.startTime,
              endTime: slot.endTime,
              status: 'confirmed',
            })
          }
        })
      })
      return new Promise((resolve) => setTimeout(() => resolve(todayBookings), 300))
    }
    const res = await api.get('/bookings/today')
    return res.data
  },

  async cancelBooking(bookingId: string): Promise<{ success: boolean }> {
    if (USE_MOCK) {
      return new Promise((resolve) => setTimeout(() => resolve({ success: true }), 300))
    }
    const res = await api.delete(`/bookings/${bookingId}`)
    return res.data
  },
}

export const artistApi = {
  async getArtist(id: string): Promise<Artist | undefined> {
    if (USE_MOCK) {
      return new Promise((resolve) =>
        setTimeout(() => resolve(mockArtists.find((a) => a.id === id)), 200)
      )
    }
    const res = await api.get(`/artists/${id}`)
    return res.data
  },
}

export const reviewApi = {
  async getArtistReviews(artistId: string): Promise<Review[]> {
    if (USE_MOCK) {
      return new Promise((resolve) =>
        setTimeout(() => resolve(mockReviews.filter((r) => r.artistId === artistId)), 300)
      )
    }
    const res = await api.get(`/reviews/artist/${artistId}`)
    return res.data
  },

  async addReview(
    artistId: string,
    rating: number,
    comment: string
  ): Promise<{ success: boolean; review?: Review }> {
    if (USE_MOCK) {
      const newReview: Review = {
        id: `r_${Date.now()}`,
        artistId,
        userId: 'u_current',
        userName: '当前用户',
        userAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face',
        rating,
        comment,
        date: new Date().toISOString().split('T')[0],
      }
      return new Promise((resolve) =>
        setTimeout(() => resolve({ success: true, review: newReview }), 400)
      )
    }
    const res = await api.post('/reviews', { artistId, rating, comment })
    return res.data
  },

  async replyReview(
    reviewId: string,
    reply: string
  ): Promise<{ success: boolean }> {
    if (USE_MOCK) {
      return new Promise((resolve) => setTimeout(() => resolve({ success: true }), 300))
    }
    const res = await api.post(`/reviews/${reviewId}/reply`, { reply })
    return res.data
  },
}
