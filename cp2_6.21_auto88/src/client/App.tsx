import { useState } from 'react'
import CardGrid from './CardGrid'
import BattleArena from './BattleArena'
import StatsDashboard from './StatsDashboard'

type Tab = 'cards' | 'battle' | 'stats'

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('cards')

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'cards', label: '牌组收藏', icon: '🃏' },
    { key: 'battle', label: '对战竞技', icon: '⚔️' },
    { key: 'stats', label: '战绩统计', icon: '📊' }
  ]

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">🎲 骰子卡牌对战</h1>
        <nav className="nav-tabs">
          {tabs.map(tab => (
            <button
              key={tab.key}
              className={`nav-tab ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
            </button>
          ))}
        </nav>
      </header>

      <main className="app-main">
        {activeTab === 'cards' && <CardGrid />}
        {activeTab === 'battle' && <BattleArena />}
        {activeTab === 'stats' && <StatsDashboard />}
      </main>

      <style>{`
        .app {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }
        .app-header {
          background: rgba(30, 41, 59, 0.95);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid #334155;
          padding: 16px 24px;
          position: sticky;
          top: 0;
          z-index: 100;
        }
        .app-title {
          font-size: 40px;
          font-weight: bold;
          color: #F59E0B;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
          text-align: center;
          margin: 0 0 16px 0;
          letter-spacing: 2px;
        }
        .nav-tabs {
          display: flex;
          justify-content: center;
          gap: 8px;
        }
        .nav-tab {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 120px;
          height: 44px;
          padding: 0 24px;
          border-radius: 22px;
          background: transparent;
          color: #9CA3AF;
          font-size: 15px;
          font-weight: 500;
          transition: all 0.3s ease;
        }
        .nav-tab:hover {
          color: #E5E7EB;
          background: rgba(255,255,255,0.05);
        }
        .nav-tab.active {
          background: linear-gradient(135deg, #F59E0B, #D97706);
          color: #1E293B;
          font-weight: 600;
        }
        .nav-tab.active:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
        }
        .tab-icon {
          font-size: 18px;
        }
        .app-main {
          flex: 1;
          padding: 20px;
        }
        @media (max-width: 600px) {
          .app-title {
            font-size: 28px;
          }
          .nav-tab {
            min-width: 100px;
            height: 40px;
            padding: 0 16px;
            font-size: 14px;
          }
          .tab-label {
            display: none;
          }
          .tab-icon {
            font-size: 20px;
          }
        }
      `}</style>
    </div>
  )
}
