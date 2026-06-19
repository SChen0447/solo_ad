import React from 'react'
import type { Announcement } from '@/types'

interface AnnouncementBarProps {
  announcements: Announcement[]
}

export const AnnouncementBar: React.FC<AnnouncementBarProps> = ({ announcements }) => {
  if (!announcements.length) return null

  const content = announcements.map((a, idx) => (
    <span className="announcement-item" key={a.id}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2l2.39 4.84L20 7.27l-4 3.9.94 5.5L12 14.77 7.06 16.67 8 11.17l-4-3.9 5.61-.43L12 2z" />
      </svg>
      {a.content}
      {idx < announcements.length - 1 && <span style={{ marginLeft: 40 }} />}
    </span>
  ))

  return (
    <div className="announcement-bar">
      <div className="announcement-content" style={{ animationDuration: `${announcements.length * 8}s` }}>
        {content}
        {content}
      </div>
    </div>
  )
}
