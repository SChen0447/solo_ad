import { useState } from 'react'
import { Artist, Review } from '../types'
import { motion, AnimatePresence } from 'framer-motion'
import ReviewSection from './ReviewSection'

interface ArtistMiniProfileProps {
  artist: Artist
  reviews: Review[]
  onClose: () => void
  onAddReview: (artistId: string, rating: number, comment: string) => Promise<boolean>
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const month = date.getMonth() + 1
  const day = date.getDate()
  const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return `${month}月${day}日 ${weekDays[date.getDay()]}`
}

function ArtistMiniProfile({
  artist,
  reviews,
  onClose,
  onAddReview,
}: ArtistMiniProfileProps) {
  const [activeTab, setActiveTab] = useState<'shows' | 'reviews'>('shows')

  return (
    <motion.div
      className="artist-profile-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="artist-profile-modal"
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="close-btn" onClick={onClose}>
          ✕
        </button>

        <div className="artist-profile-header">
          <motion.img
            src={artist.avatar}
            alt={artist.name}
            className="artist-profile-avatar"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
          />
          <motion.h2
            className="artist-profile-name"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {artist.name}
          </motion.h2>
        </div>

        <div className="artist-profile-bio">
          <p>{artist.bio}</p>
        </div>

        <div className="artist-social-links">
          {artist.socialLinks.map((link, index) => (
            <motion.a
              key={link.platform}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="social-link"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.05 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {link.platform}
            </motion.a>
          ))}
        </div>

        <div className="profile-tabs">
          <button
            className={`profile-tab ${activeTab === 'shows' ? 'active' : ''}`}
            onClick={() => setActiveTab('shows')}
          >
            近期演出
          </button>
          <button
            className={`profile-tab ${activeTab === 'reviews' ? 'active' : ''}`}
            onClick={() => setActiveTab('reviews')}
          >
            观众评价 ({reviews.length})
          </button>
        </div>

        <div className="profile-tab-content">
          <AnimatePresence mode="wait">
            {activeTab === 'shows' ? (
              <motion.div
                key="shows"
                className="upcoming-shows"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
              >
                {artist.upcomingShows.length === 0 ? (
                  <p className="no-shows">暂无演出安排</p>
                ) : (
                  artist.upcomingShows.map((show, index) => (
                    <motion.div
                      key={index}
                      className="show-item"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <div className="show-time">
                        <span className="show-date">{formatDate(show.date)}</span>
                        <span className="show-hours">{show.startTime} - {show.endTime}</span>
                      </div>
                      <span className="show-venue">{show.venueName}</span>
                    </motion.div>
                  ))
                )}
              </motion.div>
            ) : (
              <motion.div
                key="reviews"
                className="reviews-tab"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <ReviewSection
                  reviews={reviews}
                  artistId={artist.id}
                  onAddReview={onAddReview}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default ArtistMiniProfile
