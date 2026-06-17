import React, { useEffect, useState } from 'react'
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAppContext } from './context/AppContext'
import { fetchMaterials, fetchSchedules } from './api'
import MaterialEditor from './components/MaterialEditor'
import CalendarView from './components/CalendarView'
import PlatformPreview from './components/PlatformPreview'
import MaterialList from './components/MaterialList'

type NavKey = 'materials' | 'calendar' | 'preview'

const IconCalendar = () => (
  <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
)

const IconEdit = () => (
  <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
)

const IconEye = () => (
  <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)

const navItems: { key: NavKey; label: string; path: string; icon: React.FC }[] = [
  { key: 'materials', label: '素材管理', path: '/materials', icon: IconEdit },
  { key: 'calendar', label: '排期日历', path: '/calendar', icon: IconCalendar },
  { key: 'preview', label: '平台预览', path: '/preview', icon: IconEye },
]

const Sidebar: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()

  const activeKey = navItems.find(item => location.pathname.startsWith(item.path))?.key || 'materials'

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">内容管理平台</div>
      <nav className="sidebar-nav">
        {navItems.map(item => {
          const Icon = item.icon
          return (
            <div
              key={item.key}
              className={`nav-item ${activeKey === item.key ? 'active' : ''}`}
              onClick={() => navigate(item.path)}
            >
              <Icon />
              <span>{item.label}</span>
            </div>
          )
        })}
      </nav>
    </aside>
  )
}

const MobileTabBar: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()

  const activeKey = navItems.find(item => location.pathname.startsWith(item.path))?.key || 'materials'

  return (
    <div className="mobile-tab-bar">
      {navItems.map(item => {
        const Icon = item.icon
        return (
          <div
            key={item.key}
            className={`nav-item ${activeKey === item.key ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
          >
            <Icon />
            <span>{item.label}</span>
          </div>
        )
      })}
    </div>
  )
}

const MaterialsPage: React.FC = () => {
  const { selectedMaterialId } = useAppContext()

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden', gap: '16px', padding: '16px' }}>
      <div style={{ width: '320px', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
        <MaterialList />
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>
        {selectedMaterialId ? (
          <MaterialEditor materialId={selectedMaterialId} />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#7F8C8D' }}>
            请从左侧选择素材，或创建新素材
          </div>
        )}
      </div>
    </div>
  )
}

const CalendarPage: React.FC = () => {
  const { selectedScheduleId, schedules, materials } = useAppContext()
  const selectedSchedule = schedules.find(s => s.id === selectedScheduleId)
  const selectedMaterial = selectedSchedule
    ? materials.find(m => m.id === selectedSchedule.materialId)
    : null

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden', gap: '16px', padding: '16px' }}>
      <div style={{ flex: 1, overflow: 'auto' }}>
        <CalendarView />
      </div>
      <div style={{ width: '380px', flexShrink: 0, overflow: 'auto' }}>
        {selectedMaterial ? (
          <PlatformPreview material={selectedMaterial} />
        ) : (
          <div className="card" style={{ padding: '24px', textAlign: 'center', color: '#7F8C8D' }}>
            点击日历中的排期项查看平台预览
          </div>
        )}
      </div>
    </div>
  )
}

const PreviewPage: React.FC = () => {
  const { materials, selectedMaterialId, selectMaterial } = useAppContext()
  const selectedMaterial = materials.find(m => m.id === selectedMaterialId) || materials[0]

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden', gap: '16px', padding: '16px' }}>
      <div style={{ width: '260px', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
        <div className="card shadow-md" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div className="card-header">选择素材</div>
          <div style={{ overflow: 'auto' }}>
            {materials.map(m => (
              <div
                key={m.id}
                className={`material-list-item ${selectedMaterial?.id === m.id ? 'selected' : ''}`}
                onClick={() => selectMaterial(m.id)}
              >
                <div style={{ fontWeight: 500, fontSize: 14, marginBottom: 4 }}>{m.title || '无标题'}</div>
                <div style={{ fontSize: 12, color: '#7F8C8D' }}>{m.content.slice(0, 30)}...</div>
              </div>
            ))}
            {materials.length === 0 && (
              <div style={{ padding: '24px', textAlign: 'center', color: '#7F8C8D', fontSize: 13 }}>
                暂无素材
              </div>
            )}
          </div>
        </div>
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>
        {selectedMaterial ? (
          <PlatformPreview material={selectedMaterial} />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#7F8C8D' }}>
            暂无素材可预览
          </div>
        )}
      </div>
    </div>
  )
}

const App: React.FC = () => {
  const { setMaterials, setSchedules, setIsLoading, setError } = useAppContext()
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      try {
        const [materials, schedules] = await Promise.all([
          fetchMaterials(),
          fetchSchedules(),
        ])
        setMaterials(materials)
        setSchedules(schedules)
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载数据失败')
      } finally {
        setIsLoading(false)
        setInitialized(true)
      }
    }
    loadData()
  }, [setMaterials, setSchedules, setIsLoading, setError])

  if (!initialized) return null

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Navigate to="/materials" replace />} />
          <Route path="/materials" element={<MaterialsPage />} />
          <Route path="/materials/:id" element={<MaterialsPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/preview" element={<PreviewPage />} />
          <Route path="*" element={<Navigate to="/materials" replace />} />
        </Routes>
      </main>
      <MobileTabBar />
    </div>
  )
}

export default App
