import React, { useState, useEffect } from 'react'
import RetroBoard from './components/RetroBoard'
import ReportPanel from './components/ReportPanel'
import type { Card } from './api'
import { getCards } from './api'

function hashStringToColor(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash) % 360
  return `hsl(${hue}, 60%, 55%)`
}

const App: React.FC = () => {
  const [team, setTeam] = useState('')
  const [nickname, setNickname] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [cards, setCards] = useState<Card[]>([])
  const [showReport, setShowReport] = useState(false)
  const [loginTeam, setLoginTeam] = useState('')
  const [loginNickname, setLoginNickname] = useState('')

  useEffect(() => {
    if (isLoggedIn && team) {
      const fetchCards = async () => {
        try {
          const data = await getCards(team)
          setCards(data)
        } catch (err) {
          console.error('Failed to fetch cards:', err)
        }
      }
      fetchCards()
    }
  }, [isLoggedIn, team])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (loginTeam.trim() && loginNickname.trim()) {
      setTeam(loginTeam.trim())
      setNickname(loginNickname.trim())
      setIsLoggedIn(true)
    }
  }

  const handleCardAdded = (newCard: Card) => {
    setCards(prev => [newCard, ...prev])
  }

  const handleCardUpdated = (updatedCard: Card) => {
    setCards(prev =>
      prev.map(card => (card.id === updatedCard.id ? updatedCard : card))
    )
  }

  const getMembers = (): string[] => {
    const memberSet = new Set<string>()
    if (nickname) {
      memberSet.add(nickname)
    }
    cards.forEach(card => memberSet.add(card.author))
    return Array.from(memberSet)
  }

  if (!isLoggedIn) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: '#f8fafc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '40px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
            width: '100%',
            maxWidth: '400px'
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
            <h1
              style={{
                margin: 0,
                fontSize: '28px',
                fontWeight: 700,
                color: '#1e293b'
              }}
            >
              敏捷复盘看板
            </h1>
            <p
              style={{
                marginTop: '8px',
                color: '#64748b',
                fontSize: '14px'
              }}
            >
              异步协作，高效复盘
            </p>
          </div>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '20px' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#334155'
                }}
              >
                团队名
              </label>
              <input
                type="text"
                value={loginTeam}
                onChange={(e) => setLoginTeam(e.target.value)}
                placeholder="输入团队名称"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.3s, box-shadow 0.3s'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#6366f1'
                  e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#d1d5db'
                  e.target.style.boxShadow = 'none'
                }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#334155'
                }}
              >
                昵称
              </label>
              <input
                type="text"
                value={loginNickname}
                onChange={(e) => setLoginNickname(e.target.value)}
                placeholder="输入你的昵称"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.3s, box-shadow 0.3s'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#6366f1'
                  e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#d1d5db'
                  e.target.style.boxShadow = 'none'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={!loginTeam.trim() || !loginNickname.trim()}
              style={{
                width: '100%',
                padding: '14px',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 600,
                cursor: loginTeam.trim() && loginNickname.trim() ? 'pointer' : 'not-allowed',
                opacity: loginTeam.trim() && loginNickname.trim() ? 1 : 0.5,
                transition: 'opacity 0.2s, transform 0.2s'
              }}
              onMouseEnter={(e) => {
                if (loginTeam.trim() && loginNickname.trim()) {
                  e.currentTarget.style.transform = 'translateY(-1px)'
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              进入看板
            </button>
          </form>
        </div>
      </div>
    )
  }

  const members = getMembers()

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#f8fafc'
      }}
    >
      <nav
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '64px',
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          zIndex: 100
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '24px' }}>📋</span>
          <h1
            style={{
              margin: 0,
              fontSize: '22px',
              fontWeight: 700,
              color: 'white'
            }}
          >
            {team}
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {members.map((member, index) => (
              <div
                key={member}
                title={member}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: hashStringToColor(member),
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  marginLeft: index > 0 ? '-8px' : '0',
                  border: '2px solid white',
                  transition: 'transform 0.2s',
                  zIndex: members.length - index
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.1)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)'
                }}
              >
                {member.charAt(0).toUpperCase()}
              </div>
            ))}
            <span
              style={{
                color: 'rgba(255,255,255,0.8)',
                fontSize: '13px',
                marginLeft: '4px'
              }}
            >
              {members.length} 人
            </span>
          </div>

          <button
            onClick={() => setShowReport(true)}
            style={{
              padding: '8px 16px',
              backgroundColor: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              backdropFilter: 'blur(4px)',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.3)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)'
            }}
          >
            📊 生成报告
          </button>
        </div>
      </nav>

      <main style={{ paddingTop: '64px' }}>
        <RetroBoard
          team={team}
          author={nickname}
          cards={cards}
          onCardAdded={handleCardAdded}
          onCardUpdated={handleCardUpdated}
        />
      </main>

      {showReport && (
        <ReportPanel
          team={team}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  )
}

export default App
