import React, { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { Navbar } from '@/components/Navbar'
import { HomePage } from '@/pages/HomePage'
import { AdminPage } from '@/pages/AdminPage'
import { fetchAnimals, fetchAnnouncements } from '@/services/api'
import type { Animal, Announcement } from '@/types'

const PageTransition: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation()
  const [display, setDisplay] = useState(children)
  const [fadeClass, setFadeClass] = useState('page-enter')

  useEffect(() => {
    setFadeClass('page-enter')
    const timer = requestAnimationFrame(() => {
      setFadeClass('page-enter page-enter-active')
    })
    setDisplay(children)
    return () => cancelAnimationFrame(timer)
  }, [location.pathname, children])

  return <div className={fadeClass}>{display}</div>
}

const AppContent: React.FC<{
  animals: Animal[]
  announcements: Announcement[]
  loading: boolean
}> = ({ animals, announcements, loading }) => {
  return (
    <div className="app-container">
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route
            path="/"
            element={
              <PageTransition>
                <HomePage animals={animals} announcements={announcements} loading={loading} />
              </PageTransition>
            }
          />
          <Route
            path="/admin"
            element={
              <PageTransition>
                <AdminPage />
              </PageTransition>
            }
          />
        </Routes>
      </main>
    </div>
  )
}

const App: React.FC = () => {
  const [animals, setAnimals] = useState<Animal[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true)
      try {
        const [animalsData, announcementsData] = await Promise.all([
          fetchAnimals(),
          fetchAnnouncements()
        ])
        setAnimals(animalsData)
        setAnnouncements(announcementsData)
      } catch (err) {
        console.error('加载数据失败:', err)
      } finally {
        setLoading(false)
      }
    }
    loadInitialData()
  }, [])

  return (
    <BrowserRouter>
      <AppContent animals={animals} announcements={announcements} loading={loading} />
    </BrowserRouter>
  )
}

export default App
