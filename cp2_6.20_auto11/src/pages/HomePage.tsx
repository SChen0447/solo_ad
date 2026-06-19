import React from 'react'
import { AnnouncementBar } from '@/components/AnnouncementBar'
import { AnimalList } from '@/components/AnimalList'
import type { Animal, Announcement } from '@/types'

interface HomePageProps {
  animals: Animal[]
  announcements: Announcement[]
  loading: boolean
}

export const HomePage: React.FC<HomePageProps> = ({ animals, announcements, loading }) => {
  return (
    <div className="home-container">
      <AnnouncementBar announcements={announcements} />
      <AnimalList animals={animals} loading={loading} />
    </div>
  )
}
