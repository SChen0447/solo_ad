import { useState } from 'react'
import PlantsPage from './pages/PlantsPage'
import CommunityPage from './pages/CommunityPage'
import ProfilePage from './pages/ProfilePage'

type Tab = 'plants' | 'community' | 'profile'

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('plants')

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'plants', label: '植物', icon: '🌿' },
    { key: 'community', label: '社区', icon: '💬' },
    { key: 'profile', label: '我的', icon: '👤' }
  ]

  return (
    <div className="app">
      <div className="page-content">
        <div
          className={`page-transition ${
            activeTab === 'plants' ? 'active' : ''
          }`}
        >
          {activeTab === 'plants' && <PlantsPage />}
        </div>
        <div
          className={`page-transition ${
            activeTab === 'community' ? 'active' : ''
          }`}
        >
          {activeTab === 'community' && <CommunityPage />}
        </div>
        <div
          className={`page-transition ${
            activeTab === 'profile' ? 'active' : ''
          }`}
        >
          {activeTab === 'profile' && <ProfilePage />}
        </div>
      </div>

      <nav className="bottom-nav">
        {tabs.map(tab => (
          <button
            key={tab.key}
            className={`nav-item ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <span className="nav-icon">{tab.icon}</span>
            <span className="nav-label">{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}

export default App
