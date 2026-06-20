import { useState } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import DocList from './components/DocList'
import DocEditor from './components/DocEditor'
import SearchBar from './components/SearchBar'
import { useStore, CATEGORIES } from './data/store'

const globalStyles = `
  @keyframes slideInRight {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes slideUp {
    from { transform: translateY(100%); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  @keyframes slideDown {
    from { transform: translateY(0); opacity: 1; }
    to { transform: translateY(20px); opacity: 0; }
  }
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  @keyframes popIn {
    0% { transform: scale(0); opacity: 0; }
    60% { transform: scale(1.15); }
    100% { transform: scale(1); opacity: 1; }
  }
  @keyframes noise {
    0%, 100% { transform: translate(0, 0); }
    10% { transform: translate(-1%, -2%); }
    30% { transform: translate(3%, -1%); }
    50% { transform: translate(-2%, 2%); }
    70% { transform: translate(2%, 3%); }
    90% { transform: translate(-3%, 1%); }
  }
  .page-transition {
    animation: slideInRight 0.3s cubic-bezier(0.22, 1, 0.36, 1);
  }
  .fade-in {
    animation: fadeIn 0.2s ease-out;
  }
  .slide-up {
    animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .pop-in {
    animation: popIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  }
`

function AppShell({ children }: { children: React.ReactNode }) {
  const [navCollapsed, setNavCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { state, categories } = useStore()

  const docsByCategory = categories.map(cat => ({
    category: cat,
    docs: state.documents.filter(d => d.category === cat)
  }))

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC' }}>
      <style>{globalStyles}</style>
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: 'rgba(255,255,255,0.9)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid #E2E8F0',
          padding: '12px 0'
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            <button
              className="mobile-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={{
                display: 'none',
                width: 36, height: 36,
                borderRadius: 8,
                border: 'none',
                background: '#F1F5F9',
                cursor: 'pointer',
                fontSize: 18,
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ☰
            </button>
            <div
              onClick={() => navigate('/')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
                userSelect: 'none'
              }}
            >
              <div
                style={{
                  width: 36, height: 36,
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, #2563EB, #10B981)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 700,
                  fontSize: 16
                }}
              >
                K
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 600, color: '#0F172A', lineHeight: 1.2 }}>知识库</div>
                <div style={{ fontSize: 11, color: '#64748B' }}>Mini Team Wiki</div>
              </div>
            </div>
          </div>

          <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
            <SearchBar />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <button
              onClick={() => {
                const randomCategory = categories[Math.floor(Math.random() * categories.length)]
                const { addDocument } = useStore()
              }}
              style={{
                display: 'none'
              }}
            />
            <div
              style={{
                width: 36, height: 36,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #2563EB, #8B5CF6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 600,
                fontSize: 14
              }}
            >
              {state.currentUser.name.charAt(0)}
            </div>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex' }}>
        <aside
          className="desktop-sidebar"
          style={{
            width: navCollapsed ? 72 : 260,
            flexShrink: 0,
            padding: '24px 0',
            transition: 'width 0.25s ease',
            borderRight: location.pathname === '/' ? '1px solid #E2E8F0' : 'none',
            display: location.pathname === '/' ? 'block' : 'none'
          }}
        >
          <div style={{ padding: '0 16px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 16,
                padding: navCollapsed ? '0 4px' : '0 8px'
              }}
            >
              {!navCollapsed && (
                <span style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  文档分类
                </span>
              )}
              <button
                onClick={() => setNavCollapsed(!navCollapsed)}
                style={{
                  width: 28, height: 28,
                  borderRadius: 6,
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  color: '#64748B',
                  fontSize: 14,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#F1F5F9'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {navCollapsed ? '→' : '←'}
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {docsByCategory.map(({ category, docs }) => (
                <div key={category} style={{ marginBottom: 4 }}>
                  <button
                    onClick={() => navigate('/')}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: navCollapsed ? '10px 12px' : '8px 12px',
                      borderRadius: 8,
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s',
                      overflow: 'hidden'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#F1F5F9'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div
                      style={{
                        width: 6, height: 6,
                        borderRadius: 2,
                        background: CATEGORIES.indexOf(category) < 5
                          ? ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'][CATEGORIES.indexOf(category)]
                          : '#64748B',
                        flexShrink: 0
                      }}
                    />
                    {!navCollapsed && (
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: '#334155' }}>{category}</div>
                        <div style={{ fontSize: 11, color: '#94A3B8' }}>{docs.length} 篇文档</div>
                      </div>
                    )}
                  </button>
                  {!navCollapsed && docs.slice(0, 3).map(doc => (
                    <button
                      key={doc.id}
                      onClick={() => navigate(`/doc/${doc.id}`)}
                      style={{
                        width: '100%',
                        marginLeft: 18,
                        padding: '6px 12px',
                        borderRadius: 6,
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontSize: 12,
                        color: '#64748B',
                        transition: 'all 0.15s',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#F1F5F9'; e.currentTarget.style.color = '#334155' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748B' }}
                    >
                      {doc.title}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </aside>

        <main
          className="mobile-menu-overlay"
          style={{
            flex: 1,
            minWidth: 0,
            position: 'relative',
            zIndex: mobileMenuOpen ? 1 : 0
          }}
        >
          <div key={location.pathname} className="page-transition">
            {children}
          </div>
        </main>
      </div>

      <style>{`
        @media (max-width: 1023px) {
          .desktop-sidebar { display: none !important; }
        }
        @media (max-width: 767px) {
          .mobile-toggle { display: flex !important; }
        }
      `}</style>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<AppShell><DocList /></AppShell>} />
      <Route path="/doc/:id" element={<AppShell><DocEditor /></AppShell>} />
      <Route path="*" element={<AppShell><DocList /></AppShell>} />
    </Routes>
  )
}
