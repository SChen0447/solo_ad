import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import { Venue, Booking, TimeSlot } from '../types'
import { motion, AnimatePresence } from 'framer-motion'
import { mockArtists } from '../data/mockData'

interface MapViewProps {
  venues: Venue[]
  selectedVenueId: string | null
  onVenueClick: (venueId: string) => void
  onBooking: (venueId: string, timeSlotId: string, date: string) => Promise<boolean>
  todayPerformances: Booking[]
  showTodayLayer: boolean
  onToggleTodayLayer: () => void
  onArtistClick: (artistId: string) => void
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

function createColoredIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      width: 24px;
      height: 24px;
      background-color: ${color};
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      transform: translate(-50%, -50%);
    "></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  })
}

function createPerformanceIcon(color: string, artistName: string): L.DivIcon {
  return L.divIcon({
    className: 'performance-marker',
    html: `<div style="
      width: 32px;
      height: 32px;
      background: linear-gradient(135deg, ${color}, #8b5cf6);
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 12px rgba(139,92,246,0.4);
      transform: translate(-50%, -50%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 14px;
      font-weight: bold;
    ">🎵</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  })
}

function MapController({ center }: { center: [number, number] }) {
  const map = useMap()
  useEffect(() => {
    map.setView(center, 13)
  }, [center, map])
  return null
}

function TimeSlotButton({
  slot,
  venueId,
  onBooking,
}: {
  slot: TimeSlot
  venueId: string
  onBooking: (venueId: string, timeSlotId: string, date: string) => Promise<boolean>
}) {
  const [isBooking, setIsBooking] = useState(false)

  const handleClick = async () => {
    if (!slot.available || isBooking) return
    setIsBooking(true)
    const today = new Date().toISOString().split('T')[0]
    const success = await onBooking(venueId, slot.id, today)
    setIsBooking(false)
  }

  return (
    <motion.button
      className={`time-slot-btn ${slot.available ? 'available' : 'booked'}`}
      onClick={handleClick}
      whileTap={slot.available ? { scale: 0.95 } : {}}
      transition={{ duration: 0.2 }}
      disabled={!slot.available || isBooking}
    >
      {slot.startTime} - {slot.endTime}
      {!slot.available && <span className="booked-label">已预约</span>}
    </motion.button>
  )
}

function VenuePopup({
  venue,
  onBooking,
}: {
  venue: Venue
  onBooking: (venueId: string, timeSlotId: string, date: string) => Promise<boolean>
}) {
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)

  return (
    <motion.div
      className="venue-popup"
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.25, ease: [0.34, 1.56, 0.64, 1] }}
    >
      <img src={venue.photo} alt={venue.name} className="venue-popup-photo" />
      <div className="venue-popup-content">
        <div className="venue-popup-header">
          <h3 className="venue-popup-name">{venue.name}</h3>
          <span
            className="venue-type-badge"
            style={{ backgroundColor: venueTypeColors[venue.type] + '20', color: venueTypeColors[venue.type] }}
          >
            {venueTypeLabels[venue.type]}
          </span>
        </div>
        <p className="venue-popup-address">📍 {venue.address}</p>
        <div className="venue-popup-timeslots">
          <p className="timeslots-title">可用时间段</p>
          <div className="timeslots-grid">
            {venue.timeSlots.map((slot) => (
              <TimeSlotButton
                key={slot.id}
                slot={slot}
                venueId={venue.id}
                onBooking={onBooking}
              />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function PerformancePopup({
  booking,
  onArtistClick,
}: {
  booking: Booking
  onArtistClick: (artistId: string) => void
}) {
  const artist = mockArtists.find((a) => a.id === booking.artistId)

  return (
    <motion.div
      className="performance-popup"
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.25, ease: [0.34, 1.56, 0.64, 1] }}
    >
      <div className="performance-popup-header">
        <span className="performance-label">🎵 今日表演</span>
      </div>
      <div className="performance-artist">
        <img
          src={artist?.avatar}
          alt={booking.artistName}
          className="performance-artist-avatar"
        />
        <div>
          <h4 className="performance-artist-name">{booking.artistName}</h4>
          <p className="performance-time">{booking.startTime} - {booking.endTime}</p>
        </div>
      </div>
      <p className="performance-venue">📍 {booking.venueName}</p>
      <button
        className="view-artist-btn"
        onClick={() => onArtistClick(booking.artistId)}
      >
        查看艺人主页 →
      </button>
    </motion.div>
  )
}

function MapView({
  venues,
  selectedVenueId,
  onVenueClick,
  onBooking,
  todayPerformances,
  showTodayLayer,
  onToggleTodayLayer,
  onArtistClick,
}: MapViewProps) {
  const center: [number, number] = [31.2304, 121.4737]

  const venuePositionMap = new Map<string, [number, number]>()
  venues.forEach((v) => {
    venuePositionMap.set(v.id, [v.lat, v.lng])
  })

  const getVenueByPerformance = (booking: Booking): Venue | undefined => {
    return venues.find((v) => v.id === booking.venueId)
  }

  return (
    <div className="map-wrapper">
      <MapContainer
        center={center}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />

        {venues.map((venue) => (
          <Marker
            key={venue.id}
            position={[venue.lat, venue.lng]}
            icon={createColoredIcon(venueTypeColors[venue.type])}
            eventHandlers={{
              click: () => onVenueClick(venue.id),
            }}
          >
            <Popup closeButton={false} maxWidth={260} minWidth={220}>
              <VenuePopup venue={venue} onBooking={onBooking} />
            </Popup>
          </Marker>
        ))}

        <AnimatePresence>
          {showTodayLayer &&
            todayPerformances.map((booking) => {
              const venue = getVenueByPerformance(booking)
              if (!venue) return null
              return (
                <Marker
                  key={`perf-${booking.id}`}
                  position={[venue.lat, venue.lng]}
                  icon={createPerformanceIcon('#f97316', booking.artistName)}
                >
                  <Popup closeButton={false} maxWidth={260}>
                    <PerformancePopup
                      booking={booking}
                      onArtistClick={onArtistClick}
                    />
                  </Popup>
                </Marker>
              )
            })}
        </AnimatePresence>
      </MapContainer>

      <motion.button
        className={`today-toggle ${showTodayLayer ? 'active' : ''}`}
        onClick={onToggleTodayLayer}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        transition={{ duration: 0.2 }}
      >
        🎵 今日表演
      </motion.button>

      <div className="map-legend">
        <div className="legend-title">场地类型</div>
        <div className="legend-items">
          {Object.entries(venueTypeColors).map(([type, color]) => (
            <div key={type} className="legend-item">
              <span
                className="legend-dot"
                style={{ backgroundColor: color }}
              />
              <span>{venueTypeLabels[type]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default MapView
