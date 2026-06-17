/**
 * App.tsx - 主应用容器组件
 * 
 * 调用关系 & 数据流向（核心架构）：
 * ┌──────────────────────────────────────────────────────────────┐
 * │                         App.tsx                              │
 * │  ┌─────────────────────────────────────────────────────────┐ │
 * │  │ 全局状态管理                                             │ │
 * │  │ - currentShelfId: 当前选中的书架ID (null = 首页)        │ │
 * │  │ - shelves: 书架列表 (来自 apiClient.getShelves())       │ │
 * │  │ - currentMember: 当前登录成员 (localStorage 持久化)     │ │
 * │  │ - mobileMenuOpen: 移动端汉堡菜单开关                    │ │
 * │  │ - isMobile: 屏幕宽度 < 768px 检测 (useEffect + resize)  │ │
 * │  └─────────────────────────────────────────────────────────┘ │
 * │                              │                               │
 * │              ┌───────────────┴───────────────┐               │
 * │              ▼                               ▼               │
 * │  【首页】HomePage.tsx             【书架详情】               │
 * │  props: { shelves,                         ├─ BookShelf.tsx   │
 * │          onShelfClick,                     │   props: {      │
 * │          onCreateClick }                   │   shelfId,      │
 * │              │                             │   currentMember │
 * │              ▼                             │  }              │
 * │   点击书架卡片                              ├─ WordCloud.tsx  │
 * │   handleShelfClick(id)                     │   props: {      │
 * │   → setCurrentShelfId(id)                  │   shelfId       │
 * │              │                             │  }              │
 * │              └─────────────────────────────┘                │
 * │                                                              │
 * │  通过 apiClient 调用后端（统一入口在 apiClient.ts）：         │
 * │  - GET  /api/shelves              → 首页书架列表             │
 * │  - GET  /api/shelves/:id          → 当前书架详情（导航显示）  │
 * │  - POST /api/shelves              → 创建书架                 │
 * │  - POST /api/shelves/join         → 凭邀请码加入书架         │
 * │                                                              │
 * │  子组件列表：                                                │
 * │  - HomePage.tsx  → 书架网格 + 搜索框                        │
 * │  - BookShelf.tsx → 书籍卡片 + 进度曲线图 + 更新按钮         │
 * │  - WordCloud.tsx → 讨论热词词云 + 讨论模态框                │
 * │  - Modal.tsx     → 通用模态框（创建/加入/详情）             │
 * └──────────────────────────────────────────────────────────────┘
 */

import { useState, useEffect } from 'react'
import { apiClient } from './apiClient'
import type { Shelf, Member } from './types'
import HomePage from './components/HomePage'
import BookShelf from './components/BookShelf'
import WordCloud from './components/WordCloud'
import Modal from './components/Modal'
import './styles/App.css'

// 移动端响应式断点
const MOBILE_BREAKPOINT = 768

function App() {
  // === 路由 & 页面状态 ===
  // 当前书架ID，null 表示显示首页
  const [currentShelfId, setCurrentShelfId] = useState<string | null>(null)
  // 书架列表数据（通过 apiClient.getShelves() 获取）
  const [shelves, setShelves] = useState<Shelf[]>([])
  // 当前登录成员（通过 localStorage 持久化，刷新页面不丢失）
  const [currentMember, setCurrentMember] = useState<Member | null>(null)
  // 当前选中书架的详情（用于导航栏显示）
  const [currentShelf, setCurrentShelf] = useState<Shelf | null>(null)

  // === 模态框显示状态 ===
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)

  // === 加入书架表单数据 ===
  const [joinNickname, setJoinNickname] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [joinError, setJoinError] = useState('')

  // === 创建书架表单数据 ===
  const [newShelfName, setNewShelfName] = useState('')
  const [newShelfDesc, setNewShelfDesc] = useState('')
  const [createError, setCreateError] = useState('')

  // === 移动端响应式状态 ===
  // 是否为移动端（窗口宽度 < 768px）
  const [isMobile, setIsMobile] = useState<boolean>(
    typeof window !== 'undefined' ? window.innerWidth < MOBILE_BREAKPOINT : false
  )
  // 汉堡菜单是否展开（仅移动端生效）
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  // 遮罩层（导航栏展开时显示，点击收起）
  const [showOverlay, setShowOverlay] = useState(false)

  // ========== 初始化 & 副作用 ==========

  /**
   * 组件首次挂载时：
   * 1. 加载书架列表 → apiClient.getShelves() → GET /api/shelves
   * 2. 从 localStorage 恢复登录状态
   * 3. 监听窗口 resize 事件，检测是否切换到移动端
   */
  useEffect(() => {
    loadShelves()
    const savedMember = localStorage.getItem('bookClubMember')
    if (savedMember) {
      setCurrentMember(JSON.parse(savedMember))
    }

    // 响应式：窗口大小变化时检测移动端
    const handleResize = () => {
      const mobile = window.innerWidth < MOBILE_BREAKPOINT
      setIsMobile(mobile)
      // 切换到桌面端时自动收起移动菜单和遮罩
      if (!mobile) {
        setMobileMenuOpen(false)
        setShowOverlay(false)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  /**
   * currentShelfId 变化时：
   * - 有值：通过 apiClient.getShelf(id) 获取书架详情 → 导航栏显示当前书架名
   * - null：清空当前书架详情
   */
  useEffect(() => {
    if (currentShelfId) {
      apiClient.getShelf(currentShelfId).then(setCurrentShelf).catch(console.error)
    } else {
      setCurrentShelf(null)
    }
  }, [currentShelfId])

  /**
   * mobileMenuOpen 变化时同步遮罩层显示状态
   */
  useEffect(() => {
    setShowOverlay(mobileMenuOpen && isMobile)
  }, [mobileMenuOpen, isMobile])

  // ========== 数据加载函数 ==========

  /**
   * 加载所有书架列表
   * API: GET /api/shelves → apiClient.getShelves()
   */
  const loadShelves = async () => {
    try {
      const data = await apiClient.getShelves()
      setShelves(data)
    } catch (err) {
      console.error('Failed to load shelves:', err)
    }
  }

  // ========== 交互处理函数 ==========

  /**
   * 凭邀请码加入书架
   * API: POST /api/shelves/join → apiClient.joinShelf()
   * 成功后：保存成员信息 + 自动跳转到该书架详情页
   */
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

  /**
   * 创建新书架
   * API: POST /api/shelves → apiClient.createShelf()
   * 成功后：添加到书架列表（无需刷新）
   */
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

  /**
   * 点击书架卡片 → 跳转到书架详情页
   * 移动端：同时自动收起汉堡菜单
   */
  const handleShelfClick = (shelfId: string) => {
    setCurrentShelfId(shelfId)
    setMobileMenuOpen(false)
    setShowOverlay(false)
  }

  /**
   * 点击返回/Logo → 回到首页书架列表
   */
  const handleBackToHome = () => {
    setCurrentShelfId(null)
  }

  /**
   * 切换汉堡菜单的展开/收起状态
   */
  const toggleMobileMenu = () => {
    setMobileMenuOpen((prev) => !prev)
  }

  /**
   * 根据昵称生成随机头像背景色（8种主题色循环）
   */
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

  // ========== 渲染 ==========

  return (
    <div className={`app ${isMobile ? 'is-mobile' : 'is-desktop'}`}>
      {/* 左侧导航栏（桌面端固定220px，移动端从左侧滑入覆盖层） */}
      <aside
        className={`sidebar 
          ${isMobile ? 'sidebar-mobile' : 'sidebar-desktop'} 
          ${mobileMenuOpen ? 'open' : ''}
        `}
      >
        {/* Logo：点击返回首页 */}
        <div className="logo" onClick={handleBackToHome}>
          <span className="logo-text">读书会</span>
        </div>

        {/* 导航菜单 */}
        <nav className="nav">
          <div
            className={`nav-item ${!currentShelfId ? 'active' : ''}`}
            onClick={() => {
              handleBackToHome()
              setMobileMenuOpen(false)
            }}
          >
            <span>📚 书架列表</span>
          </div>
          {/* 当前在书架详情页时，额外显示当前书架名称导航项 */}
          {currentShelfId && currentShelf && (
            <div className="nav-item active-shelf">
              <span>📖 {currentShelf.name}</span>
            </div>
          )}
        </nav>

        {/* 侧边栏底部操作按钮 */}
        <div className="sidebar-actions">
          <button
            className="btn-secondary full-width"
            onClick={() => {
              setShowCreateModal(true)
              setMobileMenuOpen(false)
            }}
          >
            + 创建书架
          </button>
          <button
            className="btn-primary full-width"
            onClick={() => {
              setShowJoinModal(true)
              setMobileMenuOpen(false)
            }}
          >
            加入书架
          </button>
        </div>

        {/* 当前成员信息卡片 */}
        {currentMember && (
          <div className="member-info">
            <div className="avatar" style={{ backgroundColor: getAvatarColor(currentMember.nickname) }}>
              {currentMember.nickname.charAt(0)}
            </div>
            <span>{currentMember.nickname}</span>
          </div>
        )}

        {/* 移动端：侧边栏内的关闭按钮（右上角） */}
        {isMobile && (
          <button
            className="sidebar-close-btn"
            onClick={() => {
              setMobileMenuOpen(false)
              setShowOverlay(false)
            }}
            aria-label="关闭菜单"
          >
            ×
          </button>
        )}
      </aside>

      {/* 移动端遮罩层：点击遮罩关闭侧边栏 */}
      {showOverlay && (
        <div
          className="sidebar-overlay"
          onClick={() => {
            setMobileMenuOpen(false)
            setShowOverlay(false)
          }}
        />
      )}

      {/* 主内容区域 */}
      <main className="main-content">
        {/* 移动端：顶部汉堡菜单按钮（仅 isMobile 时显示） */}
        <button
          className={`mobile-menu-btn ${isMobile ? 'visible' : 'hidden'}`}
          onClick={toggleMobileMenu}
          aria-label={mobileMenuOpen ? '关闭菜单' : '打开菜单'}
        >
          {mobileMenuOpen ? '✕' : '☰'}
        </button>

        {/* 路由：根据 currentShelfId 切换页面 */}
        {!currentShelfId ? (
          // === 首页：书架网格 + 搜索框 ===
          <HomePage
            shelves={shelves}
            onShelfClick={handleShelfClick}
            onCreateClick={() => setShowCreateModal(true)}
          />
        ) : (
          // === 书架详情页：进度曲线 + 书籍卡片 + 词云 ===
          <div className="shelf-detail-page">
            <button className="back-btn" onClick={handleBackToHome}>
              ← 返回书架列表
            </button>
            {/* BookShelf 接收 shelfId + currentMember，内部自行调用 API */}
            <BookShelf shelfId={currentShelfId} currentMember={currentMember} />
            {/* WordCloud 接收 shelfId，内部自行调用 API 加载词云数据 */}
            <WordCloud shelfId={currentShelfId} />
          </div>
        )}
      </main>

      {/* === 加入书架模态框 === */}
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

      {/* === 创建书架模态框 === */}
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

export default App
