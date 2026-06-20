import { useState, useEffect, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation, Link } from 'react-router-dom';
import DocList from './components/DocList';
import DocEditor from './components/DocEditor';
import SearchBar from './components/SearchBar';
import { useApp, Document, formatDate } from './data/store';

function Sidebar({
  collapsed,
  onToggle,
  documents,
}: {
  collapsed: boolean;
  onToggle: () => void;
  documents: Document[];
}) {
  const categories = Array.from(new Set(documents.map((d) => d.category)));

  return (
    <aside
      style={{
        width: collapsed ? '64px' : '260px',
        transition: 'width 0.25s ease',
        background: '#F8FAFC',
        borderRight: '1px solid #E2E8F0',
        height: '100vh',
        position: 'sticky',
        top: 0,
        overflow: 'hidden',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          padding: collapsed ? '16px 12px' : '20px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: collapsed ? 0 : '10px',
          borderBottom: '1px solid #E2E8F0',
          justifyContent: collapsed ? 'center' : 'space-between',
        }}
      >
        {!collapsed && <span style={{ fontSize: '24px' }}>📚</span>}
        {collapsed && <span style={{ fontSize: '20px' }}>📚</span>}
        {!collapsed && (
          <span
            style={{
              fontWeight: 600,
              fontSize: '18px',
              color: '#0F172A',
              flex: 1,
            }}
          >
            知识库
          </span>
        )}
        <button
          onClick={onToggle}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px 8px',
            borderRadius: '6px',
            color: '#64748B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: collapsed ? '18px' : '14px',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#E2E8F0';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          {collapsed ? '→' : '←'}
        </button>
      </div>

      <nav style={{ flex: 1, overflowY: 'auto', padding: collapsed ? '8px 4px' : '12px 8px' }}>
        {categories.map((cat) => (
          <div key={cat} style={{ marginBottom: collapsed ? '8px' : '4px' }}>
            <div
              style={{
                padding: collapsed ? '8px 4px' : '8px 12px',
                fontSize: collapsed ? '10px' : '11px',
                fontWeight: 600,
                color: '#94A3B8',
                textTransform: 'uppercase' as const,
                letterSpacing: '0.5px',
                textAlign: collapsed ? 'center' : 'left',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {collapsed ? cat.charAt(0) : cat}
            </div>
            {!collapsed &&
              documents
                .filter((d) => d.category === cat)
                .slice(0, 8)
                .map((doc) => (
                  <Link
                    key={doc.id}
                    to={`/doc/${doc.id}`}
                    style={{
                      display: 'block',
                      padding: '8px 12px 8px 20px',
                      fontSize: '13px',
                      color: '#475569',
                      textDecoration: 'none',
                      borderRadius: '6px',
                      marginBottom: '2px',
                      borderLeft: `3px solid transparent`,
                      transition: 'all 0.15s',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#EFF6FF';
                      e.currentTarget.style.borderLeftColor = doc.categoryColor;
                      e.currentTarget.style.color = '#2563EB';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.borderLeftColor = 'transparent';
                      e.currentTarget.style.color = '#475569';
                    }}
                  >
                    {doc.title}
                  </Link>
                ))}
          </div>
        ))}
      </nav>

      <div
        style={{
          padding: collapsed ? '12px 8px' : '16px',
          borderTop: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          gap: collapsed ? 0 : '10px',
          justifyContent: collapsed ? 'center' : 'flex-start',
        }}
      >
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #2563EB, #8B5CF6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            flexShrink: 0,
          }}
        >
          {useApp().state.currentUser.avatar}
        </div>
        {!collapsed && (
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: '#0F172A',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {useApp().state.currentUser.name}
            </div>
            <div style={{ fontSize: '11px', color: '#64748B' }}>在线</div>
          </div>
        )}
      </div>
    </aside>
  );
}

function MobileMenu({
  open,
  onClose,
  documents,
}: {
  open: boolean;
  onClose: () => void;
  documents: Document[];
}) {
  const navigate = useNavigate();
  const categories = Array.from(new Set(documents.map((d) => d.category)));

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.5)',
        zIndex: 100,
        opacity: open ? 1 : 0,
        pointerEvents: open ? 'auto' : 'none',
        transition: 'opacity 0.25s',
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          bottom: 0,
          width: '280px',
          background: '#FFFFFF',
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.3s ease',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: '20px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}>📚</span>
            <span style={{ fontWeight: 600, fontSize: '18px', color: '#0F172A' }}>知识库</span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              color: '#64748B',
              padding: '4px',
            }}
          >
            ✕
          </button>
        </div>
        <nav style={{ padding: '12px 16px' }}>
          <Link
            to="/"
            onClick={onClose}
            style={{
              display: 'block',
              padding: '12px 16px',
              fontSize: '14px',
              fontWeight: 600,
              color: '#2563EB',
              textDecoration: 'none',
              borderRadius: '8px',
              background: '#EFF6FF',
              marginBottom: '8px',
            }}
          >
            🏠 全部文档
          </Link>
          {categories.map((cat) => (
            <div key={cat} style={{ marginBottom: '16px' }}>
              <div
                style={{
                  padding: '8px 4px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#94A3B8',
                }}
              >
                {cat}
              </div>
              {documents
                .filter((d) => d.category === cat)
                .slice(0, 10)
                .map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => {
                      navigate(`/doc/${doc.id}`);
                      onClose();
                    }}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      padding: '10px 12px',
                      fontSize: '13px',
                      color: '#475569',
                      background: 'none',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {doc.title}
                  </button>
                ))}
            </div>
          ))}
        </nav>
      </div>
    </div>
  );
}

function Header({
  onMenuClick,
  showMenuButton,
}: {
  onMenuClick: () => void;
  showMenuButton: boolean;
}) {
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #F1F5F9',
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
        }}
      >
        {showMenuButton && (
          <button
            onClick={onMenuClick}
            style={{
              background: 'none',
              border: 'none',
              padding: '8px',
              cursor: 'pointer',
              borderRadius: '8px',
              fontSize: '18px',
              color: '#475569',
            }}
          >
            ☰
          </button>
        )}
        <SearchBar />
      </div>
    </header>
  );
}

function HomePage({ docs }: { docs: Document[] }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [animating, setAnimating] = useState(false);

  const handleCardClick = (id: string) => {
    setAnimating(true);
    setTimeout(() => {
      navigate(`/doc/${id}`);
    }, 300);
  };

  return (
    <div
      style={{
        transform: animating ? 'translateX(100%)' : 'translateX(0)',
        opacity: animating ? 0 : 1,
        transition: 'transform 0.3s ease, opacity 0.3s ease',
      }}
    >
      <div
        style={{
          padding: '24px 20px 32px',
          maxWidth: '1200px',
          margin: '0 auto',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '24px',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div>
            <h1
              style={{
                fontSize: '28px',
                fontWeight: 600,
                color: '#0F172A',
                margin: 0,
                marginBottom: '6px',
              }}
            >
              全部文档
            </h1>
            <p style={{ margin: 0, color: '#64748B', fontSize: '14px' }}>
              共 {docs.length} 篇文档 · 最近更新 {formatDate(docs[0]?.updatedAt || new Date().toISOString())}
            </p>
          </div>
          <button
            onClick={() => {
              useApp().addDocument('新文档', '# 新文档\n\n开始编写内容...', '前端开发');
            }}
            style={{
              padding: '10px 20px',
              background: '#2563EB',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#1D4ED8';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#2563EB';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            + 新建文档
          </button>
        </div>
        <DocList documents={docs} onCardClick={handleCardClick} />
      </div>
    </div>
  );
}

function DocPage() {
  const location = useLocation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => {
      setMounted(true);
    });
  }, [location.key]);

  return (
    <div
      style={{
        transform: mounted ? 'translateX(0)' : 'translateX(-100%)',
        opacity: mounted ? 1 : 0,
        transition: 'transform 0.3s ease, opacity 0.3s ease',
      }}
    >
      <DocEditor />
    </div>
  );
}

export default function App() {
  const { state } = useApp();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const locationRef = useRef(useLocation());

  useEffect(() => {
    const checkSize = () => {
      const w = window.innerWidth;
      setIsMobile(w < 768);
      setIsTablet(w >= 768 && w < 1024);
    };
    checkSize();
    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
  }, []);

  const showSidebar = !isMobile && !isTablet;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#FFFFFF' }}>
      {showSidebar && (
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((c) => !c)}
          documents={state.documents}
        />
      )}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <Header
          onMenuClick={() => setMobileMenuOpen(true)}
          showMenuButton={isMobile || isTablet}
        />
        <main style={{ flex: 1 }}>
          <Routes>
            <Route path="/" element={<HomePage docs={state.documents} />} />
            <Route path="/doc/:id" element={<DocPage />} />
          </Routes>
        </main>
      </div>
      <MobileMenu
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        documents={state.documents}
      />
    </div>
  );
}
