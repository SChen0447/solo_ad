import { useState, useEffect } from 'react'
import { apiClient } from './apiClient'
import type { Shelf, Member } from './types'
import HomePage from './components/HomePage'
import BookShelf from './components/BookShelf'
import WordCloud from './components/WordCloud'
import Modal from './components/Modal'
import './styles/App.css'

function App() {
  const [currentShelfId, setCurrentShelfId] = useState<string | null>(null)
  const [shelves, setShelves] = useState<Shelf[]>([])
  const [currentMember, setCurrentMember] = useState<Member | null>(null)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const [joinNickname, setJoinNickname] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [joinError, setJoinError] = useState('')

  const [newShelfName, setNewShelfName] = useState('')
  const [newShelfDesc, setNewShelfDesc] = useState('')
  const [createError, setCreateError] = useState('')

  const [currentShelf, setCurrentShelf] = useState<Shelf | null>(null)

  useEffect(() => {
    loadShelves()
    const savedMember = localStorage.getItem('bookClubMember')
    if (savedMember) {
      setCurrentMember(JSON.parse(savedMember))
    }
  }, [])

  useEffect(() => {
    if (currentShelfId) {
      apiClient.getShelf(currentShelfId).then(setCurrentShelf).catch(console.error)
    } else {
      setCurrentShelf(null)
    }
  }, [currentShelfId])

  const loadShelves = async () => {
    try {
      const data = await apiClient.getShelves()
      setShelves(data)
    } catch (err) {
      console.error('Failed to load shelves:', err)
    }
  }

  const handleJoinShelf = async () => {
    setJoinError('')
    try {
      const result = await apiClient.joinShelf({
        inviteCode: joinCode,
        nickname: joinNickname,
      })
      setCurrentMember(result.member)
      localStorage.setItem('bookClubMember', JSON.stringify(result.member))
      setCurrentShelfId(result.shelf.id)
      setShowJoinModal(false)
      setJoinCode('')
      setJoinNickname('')
      loadShelves()
    } catch (err: any) {
      setJoinError(err.message)
    }
  }

  const handleCreateShelf = async () => {
    setCreateError('')
    try {
      const newShelf = await apiClient.createShelf({
        name: newShelfName,
        description: newShelfDesc,
      })
      setShelves(prev => [...prev, newShelf])
      setShowCreateModal(false)
      setNewShelfName('')
      setNewShelfDesc('')
      setCreateError('')
    } catch (err: any) {
      setCreateError(err.message)
    }
  }

  const handleShelfClick = (shelfId: string) => {
    setCurrentShelfId(shelfId)
    setMobileMenuOpen(false)
  }

  const handleBackToHome = () => {
    setCurrentShelfId(null)
  }

  return (
    <div className="app">
      <aside className={`sidebar ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="logo" onClick={handleBackToHome}>
          <span className="logo-text">读书会</span>
        </div>
        <nav className="nav">
          <div className="nav-item active" onClick={handleBackToHome}>
            <span>📚 书架列表</span>
          </div>
          {currentShelfId && currentShelf && (
            <div className="nav-item active-shelf">
              <span>📖 {currentShelf.name}</span>
            </div>
          )}
        </nav>
        <div className="sidebar-actions">
          <button className="btn-secondary full-width" onClick={() => setShowCreateModal(true)}>
            + 创建书架
          </button>
          <button className="btn-primary full-width" onClick={() => setShowJoinModal(true)}>
            加入书架
          </button>
        </div>
        {currentMember && (
          <div className="member-info">
            <div className="avatar" style={{ backgroundColor: getAvatarColor(currentMember.nickname) }}>
              {currentMember.nickname.charAt(0)}
            </div>
            <span>{currentMember.nickname}</span>
          </div>
        )}
      </aside>

      <main className="main-content">
        <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          ☰
        </button>
        {!currentShelfId ? (
          <HomePage
            shelves={shelves}
            onShelfClick={handleShelfClick}
            onCreateClick={() => setShowCreateModal(true)}
          />
        ) : (
          <div className="shelf-detail-page">
            <button className="back-btn" onClick={handleBackToHome}>
              ← 返回书架列表
            </button>
            <BookShelf shelfId={currentShelfId} currentMember={currentMember} />
            <WordCloud shelfId={currentShelfId} />
          </div>
        )}
      </main>

      <Modal isOpen={showJoinModal} onClose={() => setShowJoinModal(false)} title="加入书架">
        <div className="form-group">
          <label>昵称</label>
          <input
            type="text"
            value={joinNickname}
            onChange={(e) => setJoinNickname(e.target.value)}
            placeholder="请输入你的昵称"
          />
        </div>
        <div className="form-group">
          <label>邀请码</label>
          <input
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            placeholder="请输入6位邀请码"
            maxLength={6}
          />
        </div>
        {joinError && <p className="error-text">{joinError}</p>}
        <div className="modal-actions">
          <button className="btn-secondary" onClick={() => setShowJoinModal(false)}>取消</button>
          <button className="btn-primary" onClick={handleJoinShelf}>加入</button>
        </div>
      </Modal>

      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="创建书架">
        <div className="form-group">
          <label>书架名称</label>
          <input
            type="text"
            value={newShelfName}
            onChange={(e) => setNewShelfName(e.target.value)}
            placeholder="请输入书架名称"
          />
        </div>
        <div className="form-group">
          <label>书架描述</label>
          <textarea
            value={newShelfDesc}
            onChange={(e) => setNewShelfDesc(e.target.value)}
            placeholder="简单描述一下这个书架..."
            rows={3}
          />
        </div>
        {createError && <p className="error-text">{createError}</p>}
        <div className="modal-actions">
          <button className="btn-secondary" onClick={() => setShowCreateModal(false)}>取消</button>
          <button className="btn-primary" onClick={handleCreateShelf}>创建</button>
        </div>
      </Modal>
    </div>
  )
}

function getAvatarColor(name: string): string {
  const colors = [
    '#6a11cb', '#2575fc', '#ff6b6b', '#51cf66',
    '#f59f00', '#845ef7', '#22b8cf', '#f06595'
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

export default App
