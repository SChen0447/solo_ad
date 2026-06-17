import { useState, useMemo } from 'react'
import type { Shelf } from '../types'
import '../styles/HomePage.css'

interface HomePageProps {
  shelves: Shelf[]
  onShelfClick: (shelfId: string) => void
  onCreateClick: () => void
}

function HomePage({ shelves, onShelfClick, onCreateClick }: HomePageProps) {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredShelves = useMemo(() => {
    if (!searchTerm.trim()) return shelves
    const term = searchTerm.toLowerCase()
    return shelves.filter(
      (s) =>
        s.name.toLowerCase().includes(term) ||
        s.description.toLowerCase().includes(term)
    )
  }, [shelves, searchTerm])

  return (
    <div className="home-page">
      <div className="home-header">
        <h1 className="page-title">我的书架</h1>
        <p className="page-subtitle">一起读书，共同成长</p>
      </div>

      <div className="search-bar-wrapper">
        <input
          type="text"
          className="search-bar"
          placeholder="搜索书架..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {filteredShelves.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📚</div>
          <h3>还没有书架</h3>
          <p>创建一个新书架，邀请好友一起读书吧</p>
          <button className="btn-primary" onClick={onCreateClick}>
            创建书架
          </button>
        </div>
      ) : (
        <div className="shelf-grid">
          {filteredShelves.map((shelf) => (
            <div
              key={shelf.id}
              className="shelf-card card"
              onClick={() => onShelfClick(shelf.id)}
            >
              <div className="shelf-card-icon">📖</div>
              <h3 className="shelf-card-title">{shelf.name}</h3>
              <p className="shelf-card-desc">{shelf.description}</p>
              <div className="shelf-card-footer">
                <span className="invite-code-label">邀请码：</span>
                <span className="invite-code">{shelf.inviteCode}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default HomePage
