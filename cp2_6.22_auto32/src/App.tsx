import { useState, useEffect } from 'react'
import { useApp } from '@/context/AppContext'
import PlantLibrary from '@/pages/PlantLibrary'
import PlantingPlans from '@/pages/PlantingPlans'
import GrowthAnalysis from '@/pages/GrowthAnalysis'

type Page = 'plants' | 'plans' | 'growth'

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('plants')
  const [displayPage, setDisplayPage] = useState<Page>('plants')
  const [isTransitioning, setIsTransitioning] = useState(false)
  const { loading } = useApp()

  useEffect(() => {
    if (currentPage === displayPage) return
    setIsTransitioning(true)
    const timer = setTimeout(() => {
      setDisplayPage(currentPage)
      setTimeout(() => setIsTransitioning(false), 50)
    }, 150)
    return () => clearTimeout(timer)
  }, [currentPage, displayPage])

  const navItems: { key: Page; label: string }[] = [
    { key: 'plants', label: '植物库' },
    { key: 'plans', label: '种植计划' },
    { key: 'growth', label: '生长分析' },
  ]

  const renderPage = () => {
    if (loading) {
      return <div className="loading">加载中...</div>
    }
    switch (displayPage) {
      case 'plants':
        return <PlantLibrary />
      case 'plans':
        return <PlantingPlans />
      case 'growth':
        return <GrowthAnalysis />
      default:
        return null
    }
  }

  return (
    <div>
      <nav className="navbar">
        <div className="navbar-logo">
          <span className="navbar-logo-icon">🌱</span>
          <span>GardenPlan</span>
        </div>
        <div className="navbar-nav">
          {navItems.map((item) => (
            <button
              key={item.key}
              className={`navbar-item ${currentPage === item.key ? 'active' : ''}`}
              onClick={() => setCurrentPage(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </nav>
      <main className="main-content">
        <div
          style={{
            opacity: isTransitioning ? 0 : 1,
            transform: isTransitioning ? 'translateY(10px)' : 'translateY(0)',
            transition: 'opacity 0.3s ease-in-out, transform 0.3s ease-in-out',
          }}
        >
          {renderPage()}
        </div>
      </main>
    </div>
  )
}

export default App
