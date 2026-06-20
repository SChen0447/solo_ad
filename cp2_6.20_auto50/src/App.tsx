import { Routes, Route, useLocation } from 'react-router-dom'
import DocList from './components/DocList'
import DocEditor from './components/DocEditor'
import SearchBar from './components/SearchBar'
import { useApp, CATEGORIES } from './data/store'
import { useState, useEffect } from 'react'

export default function App() {
  const location = useLocation()
  const { state, toggleSidebar } = useApp()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])

  const groupedCount: Record<string, number> = {}
  CATEGORIES.forEach((c) => (groupedCount[c] = 0))
  state.documents.forEach((d) => {
    groupedCount[d.category] = (groupedCount[d.category] || 0) + 1
  })

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-inner">
          <div className="header-left">
            <button
              className="icon-btn sidebar-toggle desktop-only"
              onClick={toggleSidebar}
              title="切换导航"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>
            <button
              className="icon-btn mobile-only"
              onClick={() => setMobileMenuOpen((v) => !v)}
              title="菜单"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>
            <div className="brand">
              <div className="brand-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 7V3.5L18.5 9H13z"/>
                </svg>
              </div>
              <span className="brand-text">团队知识库</span>
            </div>
          </div>

          <SearchBar />

          <div className="header-right">
            <div className="user-chip">
              <div className="user-avatar">{state.currentUser.avatar}</div>
              <span className="user-name desktop-only">{state.currentUser.name}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="app-body">
        <aside
          className={`app-sidebar ${state.sidebarCollapsed ? 'collapsed' : ''} ${mobileMenuOpen ? 'mobile-open' : ''}`}
        >
          <div className="sidebar-scroll">
            <div className="sidebar-section-title">
              {state.sidebarCollapsed ? '📚' : '文档分类'}
            </div>
            <nav className="category-list">
              <a href="#/" className="category-item all-docs">
                <span className="category-icon">📄</span>
                {!state.sidebarCollapsed && (
                  <span className="category-meta">
                    <span>全部文档</span>
                    <span className="count">{state.documents.length}</span>
                  </span>
                )}
              </a>
              {CATEGORIES.map((cat) => (
                <a key={cat} href={`#/?cat=${encodeURIComponent(cat)}`} className="category-item">
                  <span className="category-icon">
                    {cat === '前端开发' ? '🎨' :
                     cat === '后端开发' ? '⚙️' :
                     cat === '数据库' ? '🗄️' :
                     cat === '运维部署' ? '🚀' :
                     cat === '产品设计' ? '✏️' :
                     cat === '测试质量' ? '🧪' :
                     cat === '架构设计' ? '🏛️' : '🤝'}
                  </span>
                  {!state.sidebarCollapsed && (
                    <span className="category-meta">
                      <span>{cat}</span>
                      <span className="count">{groupedCount[cat] || 0}</span>
                    </span>
                  )}
                </a>
              ))}
            </nav>

            <div className="sidebar-section-title" style={{ marginTop: 28 }}>
              {state.sidebarCollapsed ? '📌' : '最近更新'}
            </div>
            <nav className="category-list">
              {state.documents
                .slice()
                .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
                .slice(0, 6)
                .map((d) => (
                  <a key={d.id} href={`#/doc/${d.id}`} className="category-item recent">
                    <span className="category-dot" style={{ background: pickColor(d.category) }} />
                    {!state.sidebarCollapsed && (
                      <span className="category-meta">
                        <span className="recent-title">{d.title}</span>
                        <span className="recent-time">{d.updatedAt.slice(5, 10)}</span>
                      </span>
                    )}
                  </a>
                ))}
            </nav>
          </div>
        </aside>

        {mobileMenuOpen && (
          <div className="sidebar-backdrop mobile-only" onClick={() => setMobileMenuOpen(false)} />
        )}

        <main className={`app-main page-transition-${location.pathname.startsWith('/doc/') ? 'editor' : 'list'}`}>
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<DocList />} />
            <Route path="/doc/:id" element={<DocEditor />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

function pickColor(cat: string): string {
  const COLORS = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6']
  let hash = 0
  for (let i = 0; i < cat.length; i++) hash = cat.charCodeAt(i) + ((hash << 5) - hash)
  return COLORS[Math.abs(hash) % COLORS.length]
}
