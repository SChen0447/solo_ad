import { useState, useEffect, useCallback } from 'react'
import RetroList from './components/RetroList'
import RetroDetail from './components/RetroDetail'
import type { Retrospective } from './types'

type View = 'list' | 'detail'

export default function App() {
  const [view, setView] = useState<View>('list')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [retros, setRetros] = useState<Retrospective[]>([])
  const [showModal, setShowModal] = useState(false)
  const [newProject, setNewProject] = useState({
    projectName: '',
    date: new Date().toISOString().split('T')[0],
  })
  const [loading, setLoading] = useState(true)

  const fetchRetros = useCallback(async () => {
    try {
      const res = await fetch('/api/retrospectives')
      const data = await res.json()
      setRetros(data)
    } catch (err) {
      console.error('Failed to fetch retrospectives:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRetros()
  }, [fetchRetros])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newProject.projectName.trim()) return

    try {
      const res = await fetch('/api/retrospectives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName: newProject.projectName,
          phases: ['需求分析', '开发', '测试', '上线'],
          date: newProject.date,
        }),
      })
      const newRetro = await res.json()
      setRetros(prev => [newRetro, ...prev])
      setShowModal(false)
      setNewProject({ projectName: '', date: new Date().toISOString().split('T')[0] })
    } catch (err) {
      console.error('Failed to create retrospective:', err)
    }
  }

  const handleSelect = (id: string) => {
    setSelectedId(id)
    setView('detail')
  }

  const handleBack = () => {
    setView('list')
    setSelectedId(null)
    fetchRetros()
  }

  if (loading) {
    return (
      <div style={styles.loading}>
        <div style={styles.spinner}></div>
        <p style={{ marginTop: '16px', color: '#e0e0e0' }}>加载中...</p>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <header style={styles.header} className="no-print">
        <h1 style={styles.title}>团队复盘看板</h1>
        {view === 'list' && (
          <button
            style={styles.createBtn}
            className="btn-pulse"
            onClick={() => setShowModal(true)}
          >
            + 新建复盘
          </button>
        )}
      </header>

      <main style={styles.main}>
        {view === 'list' ? (
          <RetroList retros={retros} onSelect={handleSelect} />
        ) : (
          selectedId && (
            <RetroDetail
              id={selectedId}
              onBack={handleBack}
              onUpdate={fetchRetros}
            />
          )
        )}
      </main>

      <nav style={styles.bottomNav} className="no-print">
        <button
          style={styles.fab}
          className="btn-pulse"
          onClick={() => view === 'list' ? setShowModal(true) : handleBack()}
        >
          {view === 'list' ? '+' : '←'}
        </button>
      </nav>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content flip-in" onClick={e => e.stopPropagation()}>
            <h2 style={{ marginBottom: '24px', color: '#e0e0e0' }}>新建复盘</h2>
            <form onSubmit={handleCreate}>
              <div style={{ marginBottom: '16px' }}>
                <label style={styles.label}>项目名称</label>
                <input
                  type="text"
                  value={newProject.projectName}
                  onChange={e => setNewProject({ ...newProject, projectName: e.target.value })}
                  style={styles.input}
                  placeholder="请输入项目名称"
                  maxLength={50}
                  autoFocus
                />
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label style={styles.label}>日期</label>
                <input
                  type="date"
                  value={newProject.date}
                  onChange={e => setNewProject({ ...newProject, date: e.target.value })}
                  style={styles.input}
                />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  style={{ ...styles.btn, ...styles.btnSecondary }}
                  className="btn-pulse"
                  onClick={() => setShowModal(false)}
                >
                  取消
                </button>
                <button
                  type="submit"
                  style={{ ...styles.btn, ...styles.btnPrimary }}
                  className="btn-pulse"
                  disabled={!newProject.projectName.trim()}
                >
                  创建
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  header: {
    padding: '20px 32px',
    backgroundColor: '#16213e',
    borderBottom: '1px solid #0f3460',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: '24px',
    fontWeight: 600,
    color: '#e0e0e0',
  },
  createBtn: {
    padding: '10px 20px',
    backgroundColor: '#e94560',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'background-color 0.2s',
  },
  main: {
    flex: 1,
    padding: '32px',
    paddingBottom: '100px',
  },
  bottomNav: {
    position: 'fixed' as const,
    bottom: '24px',
    right: '24px',
    zIndex: 100,
  },
  fab: {
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    backgroundColor: '#e94560',
    color: 'white',
    border: 'none',
    fontSize: '28px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 20px rgba(233, 69, 96, 0.4)',
  },
  loading: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid #16213e',
    borderTop: '3px solid #e94560',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    color: '#a0a0a0',
    fontSize: '14px',
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    backgroundColor: '#1a1a2e',
    border: '1px solid #0f3460',
    borderRadius: '8px',
    color: '#e0e0e0',
    fontSize: '14px',
    transition: 'box-shadow 0.2s',
  },
  btn: {
    flex: 1,
    padding: '12px 24px',
    borderRadius: '8px',
    border: 'none',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  },
  btnPrimary: {
    backgroundColor: '#e94560',
    color: 'white',
  },
  btnSecondary: {
    backgroundColor: 'transparent',
    color: '#a0a0a0',
    border: '1px solid #0f3460',
  },
}
