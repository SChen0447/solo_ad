import { useReducer, useEffect, useState } from 'react'
import { Venue, Booking, User, Artist, Review } from './types'
import { venueApi, bookingApi, artistApi, reviewApi } from './services/api'
import { mockUser } from './data/mockData'
import MapView from './components/MapView'
import ArtistPanel from './components/ArtistPanel'
import ArtistMiniProfile from './components/ArtistMiniProfile'
import ReviewSection from './components/ReviewSection'
import { motion, AnimatePresence } from 'framer-motion'

interface AppState {
  user: User
  venues: Venue[]
  bookings: Booking[]
  selectedVenueId: string | null
  todayPerformances: Booking[]
  showTodayLayer: boolean
  selectedArtist: Artist | null
  showArtistProfile: boolean
  reviews: Review[]
}

type Action =
  | { type: 'SET_VENUES'; payload: Venue[] }
  | { type: 'SET_BOOKINGS'; payload: Booking[] }
  | { type: 'SELECT_VENUE'; payload: string | null }
  | { type: 'ADD_BOOKING'; payload: Booking }
  | { type: 'SET_TODAY_PERFORMANCES'; payload: Booking[] }
  | { type: 'TOGGLE_TODAY_LAYER' }
  | { type: 'SET_SELECTED_ARTIST'; payload: Artist | null }
  | { type: 'SET_SHOW_ARTIST_PROFILE'; payload: boolean }
  | { type: 'SET_REVIEWS'; payload: Review[] }
  | { type: 'ADD_REVIEW'; payload: Review }

const initialState: AppState = {
  user: mockUser,
  venues: [],
  bookings: [],
  selectedVenueId: null,
  todayPerformances: [],
  showTodayLayer: false,
  selectedArtist: null,
  showArtistProfile: false,
  reviews: [],
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_VENUES':
      return { ...state, venues: action.payload }
    case 'SET_BOOKINGS':
      return { ...state, bookings: action.payload }
    case 'SELECT_VENUE':
      return { ...state, selectedVenueId: action.payload }
    case 'ADD_BOOKING':
      return { ...state, bookings: [...state.bookings, action.payload] }
    case 'SET_TODAY_PERFORMANCES':
      return { ...state, todayPerformances: action.payload }
    case 'TOGGLE_TODAY_LAYER':
      return { ...state, showTodayLayer: !state.showTodayLayer }
    case 'SET_SELECTED_ARTIST':
      return { ...state, selectedArtist: action.payload }
    case 'SET_SHOW_ARTIST_PROFILE':
      return { ...state, showArtistProfile: action.payload }
    case 'SET_REVIEWS':
      return { ...state, reviews: action.payload }
    case 'ADD_REVIEW':
      return { ...state, reviews: [...state.reviews, action.payload] }
    default:
      return state
  }
}

function App() {
  const [state, dispatch] = useReducer(reducer, initialState)
  const [isMobile, setIsMobile] = useState(false)
  const [showMobilePanel, setShowMobilePanel] = useState(false)
  const [notification, setNotification] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success',
  })

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const [venues, bookings, performances] = await Promise.all([
      venueApi.getVenues(),
      bookingApi.getUserBookings(),
      bookingApi.getTodayPerformances(),
    ])
    dispatch({ type: 'SET_VENUES', payload: venues })
    dispatch({ type: 'SET_BOOKINGS', payload: bookings })
    dispatch({ type: 'SET_TODAY_PERFORMANCES', payload: performances })
  }

  const handleVenueClick = (venueId: string) => {
    dispatch({ type: 'SELECT_VENUE', payload: venueId })
    if (isMobile) {
      setShowMobilePanel(true)
    }
  }

  const handleBooking = async (venueId: string, timeSlotId: string, date: string) => {
    const result = await bookingApi.createBooking(venueId, timeSlotId, date)
    if (result.success && result.booking) {
      dispatch({ type: 'ADD_BOOKING', payload: result.booking })
      showNotification('预约成功！', 'success')
    } else {
      showNotification(result.message, 'error')
    }
    return result.success
  }

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ show: true, message, type })
    setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 3000)
  }

  const handleArtistClick = async (artistId: string) => {
    const artist = await artistApi.getArtist(artistId)
    if (artist) {
      dispatch({ type: 'SET_SELECTED_ARTIST', payload: artist })
      dispatch({ type: 'SET_SHOW_ARTIST_PROFILE', payload: true })
      const reviews = await reviewApi.getArtistReviews(artistId)
      dispatch({ type: 'SET_REVIEWS', payload: reviews })
    }
  }

  const handleCloseArtistProfile = () => {
    dispatch({ type: 'SET_SHOW_ARTIST_PROFILE', payload: false })
  }

  const handleAddReview = async (artistId: string, rating: number, comment: string) => {
    const result = await reviewApi.addReview(artistId, rating, comment)
    if (result.success && result.review) {
      dispatch({ type: 'ADD_REVIEW', payload: result.review })
      showNotification('评价提交成功！', 'success')
    }
    return result.success
  }

  const selectedVenue = state.venues.find((v) => v.id === state.selectedVenueId) || null

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="app-logo">🎭 Street Stage</div>
        <div className="user-menu">
          <div className="user-avatar-wrapper">
            <img src={state.user.avatar} alt={state.user.name} className="user-avatar" />
            <span className="user-name">{state.user.name}</span>
            <span className="user-role">{state.user.role === 'artist' ? '艺人' : '观众'}</span>
          </div>
        </div>
      </header>

      <main className="main-content">
        <div className="map-container">
          <MapView
            venues={state.venues}
            selectedVenueId={state.selectedVenueId}
            onVenueClick={handleVenueClick}
            onBooking={handleBooking}
            todayPerformances={state.todayPerformances}
            showTodayLayer={state.showTodayLayer}
            onToggleTodayLayer={() => dispatch({ type: 'TOGGLE_TODAY_LAYER' })}
            onArtistClick={handleArtistClick}
          />
        </div>

        {!isMobile && (
          <div className="side-panel">
            <ArtistPanel
              venue={selectedVenue}
              bookings={state.bookings}
              onBooking={handleBooking}
            />
          </div>
        )}

        <AnimatePresence>
          {isMobile && showMobilePanel && (
            <motion.div
              className="mobile-panel"
              initial={{ y: '80%' }}
              animate={{ y: 0 }}
              exit={{ y: '80%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              <div className="mobile-panel-handle" onClick={() => setShowMobilePanel(false)} />
              <ArtistPanel
                venue={selectedVenue}
                bookings={state.bookings}
                onBooking={handleBooking}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {state.showArtistProfile && state.selectedArtist && (
          <ArtistMiniProfile
            artist={state.selectedArtist}
            reviews={state.reviews}
            onClose={handleCloseArtistProfile}
            onAddReview={handleAddReview}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {notification.show && (
          <motion.div
            className={`notification ${notification.type}`}
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            {notification.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default App
