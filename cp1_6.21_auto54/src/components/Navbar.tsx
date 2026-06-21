import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../App'
import { useApi } from '../hooks/useApi'
import type { SearchResult } from '../types'

export default function Navbar() {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null)
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const { groupId } = useParams<{ groupId: string }>()
  const navigate = useNavigate()
  const { state, currentMemberId, dispatch, refreshSplitData, refreshReminders } = useApp()
  const api = useApi()
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const searchContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSearchResults(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!searchQuery || !groupId) {
      setSearchResults(null)
      setShowSearchResults(false)
      return
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await api.search(groupId, searchQuery)
        setSearchResults(results)
        setShowSearchResults(true)
      } catch (err) {
        console.error('Search failed:', err)
      }
    }, 200)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery, groupId, api])

  const handleSearchResultClick = (type: 'subscription' | 'member', id: string) => {
    setShowSearchResults(false)
    setSearchQuery('')
    
    if (type === 'subscription') {
      navigate(`/group/${groupId}/subscription/${id}`)
    } else {
      const sub = state.group?.subscriptions.find(s => 
        s.members.some(m => m.memberId === id)
      )
      if (sub) {
        navigate(`/group/${groupId}/subscription/${sub.id}`)
      }
    }
  }

  const handleExport = async () => {
    if (!groupId) return
    try {
      await api.exportBills(groupId)
    } catch (err: any) {
      alert(err.message || '导出失败')
    }
  }

  const currentMember = state.group?.members.find(m => m.id === currentMemberId)

  const getBannerGradient = () => {
    if (!state.reminders.length) return 'rgba(255, 255, 255, 0.85)'
    const minDays = Math.min(...state.reminders.map(r => r.daysUntil))
    const maxReminderDays = Math.max(...state.reminders.map(r => r.reminderDays))
    const ratio = Math.min(1, (maxReminderDays - minDays) / maxReminderDays)
    const r = Math.round(255)
    const g = Math.round(255 - ratio * 100)
    const b = Math.round(150 - ratio * 150)
    return `linear-gradient(90deg, rgba(255, 255, 200, 0.95) 0%, rgba(${r}, ${g}, ${b}, 0.95) 100%)`
  }

  const handleRenew = async (subscriptionId: string) => {
    if (!groupId || !currentMemberId) {
      alert('请先登录')
      return
    }
    try {
      const payment = await api.markAsRenewed(groupId, subscriptionId, currentMemberId)
      dispatch({ type: 'ADD_PAYMENT', payload: { subscriptionId, payment } })
      await refreshReminders(groupId)
      await refreshSplitData(groupId)
    } catch (err: any) {
      alert(err.message || '操作失败')
    }
  }

  return (
    <>
      <nav className="navbar glass">
        <div className="navbar-title">📋 订阅管家</div>
        
        <button 
          className="hamburger-btn"
          onClick={() => setShowMobileMenu(!showMobileMenu)}
        >
          ☰
        </button>

        <div className="navbar-actions">
          <div className="search-container" ref={searchContainerRef}>
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="search-input form-input"
              placeholder="搜索订阅或成员..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchResults && setShowSearchResults(true)}
            />
            {showSearchResults && searchResults && (
              <div className="search-results glass">
                {searchResults.subscriptions.length === 0 && searchResults.members.length === 0 ? (
                  <div className="search-result-item">
                    <span>未找到结果</span>
                  </div>
                ) : (
                  <>
                    {searchResults.subscriptions.map((result) => (
                      <div
                        key={`sub-${result.id}`}
                        className="search-result-item"
                        onClick={() => handleSearchResultClick('subscription', result.id)}
                      >
                        <span className="search-result-icon">{result.icon}</span>
                        <div>
                          <div style={{ fontWeight: 500 }}>{result.name}</div>
                          <div style={{ fontSize: 12, color: '#64748b' }}>订阅服务</div>
                        </div>
                      </div>
                    ))}
                    {searchResults.members.map((result) => (
                      <div
                        key={`member-${result.id}`}
                        className="search-result-item"
                        onClick={() => handleSearchResultClick('member', result.id)}
                      >
                        <span className="search-result-icon">
                          <img src={result.avatar} alt="" style={{ width: 24, height: 24, borderRadius: '50%' }} />
                        </span>
                        <div>
                          <div style={{ fontWeight: 500 }}>{result.name}</div>
                          <div style={{ fontSize: 12, color: '#64748b' }}>成员</div>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>

          {currentMember && (
            <div className="member-avatar" title={currentMember.name}>
              <img src={currentMember.avatar} alt={currentMember.name} />
            </div>
          )}

          <button className="btn btn-primary btn-sm" onClick={handleExport}>
            📤 导出账单
          </button>
        </div>
      </nav>

      <div className={`mobile-menu ${showMobileMenu ? 'active' : ''}`}>
        <div className="navbar-actions">
          <div className="search-container" ref={searchContainerRef}>
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="search-input form-input"
              placeholder="搜索订阅或成员..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchResults && setShowSearchResults(true)}
            />
          </div>

          {currentMember && (
            <div className="member-avatar" title={currentMember.name}>
              <img src={currentMember.avatar} alt={currentMember.name} />
            </div>
          )}

          <button className="btn btn-primary btn-sm" onClick={handleExport}>
            📤 导出账单
          </button>
        </div>
      </div>

      {state.reminders.length > 0 && (
        <div className="reminder-banner glass" style={{ background: getBannerGradient() }}>
          <div className="reminder-content">
            {[...state.reminders, ...state.reminders].map((reminder, idx) => (
              <div key={`${reminder.subscriptionId}-${idx}`} className="reminder-item">
                <span style={{ fontSize: 20 }}>{reminder.icon}</span>
                <span style={{ fontWeight: 500 }}>{reminder.name}</span>
                <span>
                  还有 <span className="reminder-days">{reminder.daysUntil}</span> 天续费
                </span>
                <span style={{ fontWeight: 600, color: '#667eea' }}>¥{reminder.monthlyFee}</span>
                <button
                  className="btn btn-success btn-sm"
                  onClick={() => handleRenew(reminder.subscriptionId)}
                  style={{ marginLeft: 8 }}
                >
                  ✓ 我已续费
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
