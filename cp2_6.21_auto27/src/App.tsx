import { useState } from 'react'
import DiyPerfumeWorkspace from './components/DiyPerfumeWorkspace'
import CommunityFeed from './components/CommunityFeed'
import { ScentItem } from './hooks/usePerfumeFormula'

type ViewType = 'community' | 'workspace'

interface PendingFormula {
  name: string
  scents: ScentItem[]
}

export default function App() {
  const [currentView, setCurrentView] = useState<ViewType>('community')
  const [pendingFormula, setPendingFormula] = useState<PendingFormula | null>(null)

  const handleSaveToCommunity = (formula: PendingFormula) => {
    setPendingFormula(formula)
    setCurrentView('community')
  }

  const handleClearPendingFormula = () => {
    setPendingFormula(null)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FFF8E1' }}>
      <nav
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: 56,
          background: 'rgba(255, 255, 255, 0.75)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(255, 204, 128, 0.3)',
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            cursor: 'pointer',
          }}
          onClick={() => setCurrentView('community')}
        >
          <span style={{ fontSize: 24 }}>🌸</span>
          <h1
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: '#4E342E',
              letterSpacing: 0.5,
            }}
          >
            DIY香氛工作室
          </h1>
        </div>

        <div style={{ flex: 1 }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => setCurrentView('community')}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              background: currentView === 'community' ? '#FFE0B2' : 'transparent',
              color: currentView === 'community' ? '#5D4037' : '#8D6E63',
              fontSize: 14,
              fontWeight: currentView === 'community' ? 600 : 500,
              transition: 'all 0.2s',
            }}
          >
            社区
          </button>

          {currentView === 'community' ? (
            <button
              onClick={() => setCurrentView('workspace')}
              style={{
                padding: '8px 18px',
                borderRadius: 8,
                background: 'linear-gradient(135deg, #FF8A65 0%, #FF6F00 100%)',
                color: '#FFFFFF',
                fontSize: 14,
                fontWeight: 600,
                boxShadow: '0 4px 12px rgba(255, 138, 101, 0.3)',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'
                ;(e.currentTarget as HTMLButtonElement).style.boxShadow =
                  '0 6px 16px rgba(255, 138, 101, 0.4)'
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'
                ;(e.currentTarget as HTMLButtonElement).style.boxShadow =
                  '0 4px 12px rgba(255, 138, 101, 0.3)'
              }}
            >
              调香台
            </button>
          ) : (
            <button
              onClick={() => setCurrentView('community')}
              style={{
                padding: '8px 18px',
                borderRadius: 8,
                background: '#EFEBE9',
                color: '#5D4037',
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              返回社区
            </button>
          )}
        </div>
      </nav>

      <div style={{ paddingTop: 56 }}>
        {currentView === 'workspace' ? (
          <DiyPerfumeWorkspace onSaveToCommunity={handleSaveToCommunity} />
        ) : (
          <CommunityFeed
            pendingFormula={pendingFormula}
            onClearPendingFormula={handleClearPendingFormula}
          />
        )}
      </div>
    </div>
  )
}
