import { useState } from 'react'
import { Venue, Booking, TimeSlot } from '../types'
import { motion, AnimatePresence } from 'framer-motion'

interface ArtistPanelProps {
  venue: Venue | null
  bookings: Booking[]
  onBooking: (venueId: string, timeSlotId: string, date: string) => Promise<boolean>
}

const venueTypeColors: Record<string, string> = {
  square: '#f59e0b',
  park: '#10b981',
  subway: '#6366f1',
}

const venueTypeLabels: Record<string, string> = {
  square: '广场',
  park: '公园',
  subway: '地铁通道',
}

function TimeSlotItem({
  slot,
  venueId,
  selectedDate,
  onBooking,
}: {
  slot: TimeSlot
  venueId: string
  selectedDate: string
  onBooking: (venueId: string, timeSlotId: string, date: string) => Promise<boolean>
}) {
  const [isBooking, setIsBooking] = useState(false)

  const handleBooking = async () => {
    if (!slot.available || isBooking) return
    setIsBooking(true)
    await onBooking(venueId, slot.id, selectedDate)
    setIsBooking(false)
  }

  return (
    <motion.button
      className={`panel-time-slot ${slot.available ? 'available' : 'booked'}`}
      onClick={handleBooking}
      whileHover={slot.available ? { scale: 1.02 } : {}}
      whileTap={slot.available ? { scale: 0.98 } : {}}
      transition={{ duration: 0.2 }}
      disabled={!slot.available || isBooking}
    >
      <span className="slot-time">{slot.startTime} - {slot.endTime}</span>
      {slot.available ? (
        <span className="slot-status available">可预约</span>
      ) : (
        <span className="slot-status booked">已预约</span>
      )}
    </motion.button>
  )
}

function VenueDetail({
  venue,
  onBooking,
}: {
  venue: Venue
  onBooking: (venueId: string, timeSlotId: string, date: string) => Promise<boolean>
}) {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  )

  const availableCount = venue.timeSlots.filter((s) => s.available).length

  return (
    <motion.div
      className="venue-detail"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="venue-detail-header">
        <img src={venue.photo} alt={venue.name} className="venue-detail-photo" />
        <div className="venue-detail-info">
          <h2 className="venue-detail-name">{venue.name}</h2>
          <span
            className="venue-type-tag"
            style={{
              backgroundColor: venueTypeColors[venue.type] + '20',
              color: venueTypeColors[venue.type],
            }}
          >
            {venueTypeLabels[venue.type]}
          </span>
        </div>
      </div>

      <p className="venue-detail-address">📍 {venue.address}</p>

      <div className="venue-detail-stats">
        <div className="stat-item">
          <span className="stat-value">{venue.timeSlots.length}</span>
          <span className="stat-label">总时段</span>
        </div>
        <div className="stat-divider" />
        <div className="stat-item">
          <span className="stat-value available">{availableCount}</span>
          <span className="stat-label">可预约</span>
        </div>
        <div className="stat-divider" />
        <div className="stat-item">
          <span className="stat-value booked">
            {venue.timeSlots.length - availableCount}
          </span>
          <span className="stat-label">已预约</span>
        </div>
      </div>

      <div className="booking-section">
        <div className="section-title">
          <span>选择日期</span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="date-input"
          />
        </div>

        <div className="section-title">
          <span>选择时间段</span>
        </div>

        <div className="time-slots-list">
          {venue.timeSlots.map((slot) => (
            <TimeSlotItem
              key={slot.id}
              slot={slot}
              venueId={venue.id}
              selectedDate={selectedDate}
              onBooking={onBooking}
            />
          ))}
        </div>
      </div>
    </motion.div>
  )
}

function EmptyVenueState() {
  return (
    <motion.div
      className="empty-venue-state"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="empty-icon">🗺️</div>
      <h3 className="empty-title">选择一个场地</h3>
      <p className="empty-desc">点击地图上的标记点查看场地详情并预约表演时间</p>
    </motion.div>
  )
}

function BookingList({ bookings }: { bookings: Booking[] }) {
  const sortedBookings = [...bookings].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  return (
    <div className="booking-list-section">
      <div className="section-header">
        <h3 className="section-title-text">我的预约</h3>
        <span className="booking-count">{bookings.length} 场</span>
      </div>

      <div className="booking-list">
        {sortedBookings.length === 0 ? (
          <div className="empty-bookings">
            <span>暂无预约</span>
          </div>
        ) : (
          sortedBookings.map((booking) => (
            <motion.div
              key={booking.id}
              className="booking-card"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <div className="booking-card-header">
                <span className="booking-venue">{booking.venueName}</span>
                <span
                  className={`booking-status ${booking.status}`}
                >
                  {booking.status === 'confirmed' ? '已确认' : booking.status === 'pending' ? '待确认' : '已取消'}
                </span>
              </div>
              <div className="booking-card-info">
                <span className="booking-date">📅 {booking.date}</span>
                <span className="booking-time">⏰ {booking.startTime} - {booking.endTime}</span>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}

function ArtistPanel({ venue, bookings, onBooking }: ArtistPanelProps) {
  return (
    <div className="artist-panel">
      <div className="panel-content">
        <AnimatePresence mode="wait">
          {venue ? (
            <VenueDetail key={venue.id} venue={venue} onBooking={onBooking} />
          ) : (
            <EmptyVenueState key="empty" />
          )}
        </AnimatePresence>
      </div>

      <div className="panel-footer">
        <BookingList bookings={bookings} />
      </div>
    </div>
  )
}

export default ArtistPanel
