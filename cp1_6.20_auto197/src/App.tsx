import React, { useState, useEffect } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import confetti from 'canvas-confetti'
import DesignUploader from './components/DesignUploader'
import VersionTimeline from './components/VersionTimeline'
import ComponentDetail from './components/ComponentDetail'
import type { ComponentVersion, Component } from './types'

const App: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [components, setComponents] = useState<Component[]>([])
  const [selectedComponent, setSelectedComponent] = useState<string>('')
  const [versions, setVersions] = useState<ComponentVersion[]>([])
  const [newComponentName, setNewComponentName] = useState('')
  const [showNewInput, setShowNewInput] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    const checkWidth = () => {
      setSidebarCollapsed(window.innerWidth < 768)
    }
    checkWidth()
    window.addEventListener('resize', checkWidth)
    return () => window.removeEventListener('resize', checkWidth)
  }, [])

  useEffect(() => {
    loadComponents()
  }, [])

  useEffect(() => {
    if (selectedComponent) {
      loadVersions(selectedComponent)
    } else {
      setVersions([])
    }
  }, [selectedComponent])

  const loadComponents = async () => {
    try {
      const res = await axios.get('/api/components')
      setComponents(res.data)
      if (res.data.length > 0 && !selectedComponent) {
        setSelectedComponent(res.data[0].name)
        navigate('/')
      }
    } catch (err) {
      setComponents([
        { name: 'Button组件', latestColor: '#4A90D9', versionCount: 3 },
        { name: '导航栏组件', latestColor: '#1E1E2E', versionCount: 2 },
        { name: '卡片组件', latestColor: '#FF6B6B', versionCount: 4 }
      ])
      setSelectedComponent('Button组件')
    }
  }

  const loadVersions = async (compName: string) => {
    try {
      const res = await axios.get(`/api/versions?componentName=${encodeURIComponent(compName)}`)
      setVersions(res.data)
    } catch (err) {
      setVersions(generateMockVersions(compName))
    }
  }

  const generateMockVersions = (compName: string): ComponentVersion[] => {
    const count = Math.floor(Math.random() * 3) + 2
    const mocks: ComponentVersion[] = []
    for (let i = 0; i < count; i++) {
      mocks.push({
        id: `${compName}-v${i + 1}`,
        componentName: compName,
        version: i + 1,
        imageUrl: `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${encodeURIComponent(`UI component ${compName} version ${i + 1} clean design`)}&image_size=square`,
        uploadDate: new Date(Date.now() - i * 86400000).toISOString(),
        colors: [
          { hex: '#4A90D9', percentage: 0.45 },
          { hex: '#FFFFFF', percentage: 0.35 },
          { hex: '#1E1E2E', percentage: 0.2 }
        ],
        fonts: [
          { name: 'Inter', confidence: 0.92, sampleText: 'Sample Text' },
          { name: 'SF Pro Display', confidence: 0.78, sampleText: 'Hello World' }
        ]
      })
    }
    return mocks
  }

  const handleUploadComplete = (version: ComponentVersion) => {
    setVersions((prev) => [version, ...prev])
    setComponents((prev) => {
      const existing = prev.find((c) => c.name === version.componentName)
      if (existing) {
        return prev.map((c) =>
          c.name === version.componentName
            ? { ...c, latestColor: version.colors[0]?.hex || c.latestColor, versionCount: c.versionCount + 1 }
            : c
        )
      }
      return [...prev, { name: version.componentName, latestColor: version.colors[0]?.hex || '#4A90D9', versionCount: 1 }]
    })
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } })
  }

  const handleDelete = (componentName: string, versionId: string) => {
    setVersions((prev) => prev.filter((v) => v.id !== versionId))
  }

  const handleCreateComponent = () => {
    if (!newComponentName.trim()) return
    setSelectedComponent(newComponentName.trim())
    setNewComponentName('')
    setShowNewInput(false)
    setComponents((prev) => [
      ...prev,
      { name: newComponentName.trim(), latestColor: '#4A90D9', versionCount: 0 }
    ])
  }

  const isDetailPage = location.pathname.startsWith('/component/')

  return (
    <div className={`app-layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <aside className="sidebar">
        <div className="sidebar-header">
          <span className="sidebar-icon">🎨</span>
          {!sidebarCollapsed && <h1 className="sidebar-title">样式对比平台</h1>}
        </div>

        <div className="sidebar-components-label">
          {!sidebarCollapsed && <span>组件列表</span>}
          {!sidebarCollapsed && (
            <motion.button
              className="btn-icon"
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowNewInput(!showNewInput)}
              title="新建组件"
            >
              +
            </motion.button>
          )}
        </div>

        {showNewInput && !sidebarCollapsed && (
          <div className="new-component-input">
            <input
              type="text"
              value={newComponentName}
              onChange={(e) => setNewComponentName(e.target.value)}
              placeholder="组件名称"
              onKeyDown={(e) => e.key === 'Enter' && handleCreateComponent()}
              autoFocus
            />
            <motion.button
              className="btn-primary btn-small"
              whileTap={{ scale: 0.95 }}
              onClick={handleCreateComponent}
            >
              创建
            </motion.button>
          </div>
        )}

        <nav className="sidebar-nav">
          {components.map((comp) => (
            <motion.div
              key={comp.name}
              className={`nav-item ${selectedComponent === comp.name && !isDetailPage ? 'active' : ''}`}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                setSelectedComponent(comp.name)
                navigate('/')
              }}
              title={sidebarCollapsed ? comp.name : undefined}
            >
              <span
                className="nav-dot"
                style={{ backgroundColor: comp.latestColor }}
              />
              {!sidebarCollapsed && (
                <>
                  <span className="nav-name">{comp.name}</span>
                  <span className="nav-count">{comp.versionCount}</span>
                </>
              )}
            </motion.div>
          ))}
        </nav>
      </aside>

      <main className="main-content">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route
              path="/"
              element={
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="home-view"
                >
                  <DesignUploader
                    componentName={selectedComponent}
                    onUploadComplete={handleUploadComplete}
                  />
                  <VersionTimeline
                    versions={versions}
                    componentName={selectedComponent}
                  />
                </motion.div>
              }
            />
            <Route
              path="/component/:componentName/:versionId"
              element={
                <ComponentDetail versions={versions} onDelete={handleDelete} />
              }
            />
          </Routes>
        </AnimatePresence>
      </main>
    </div>
  )
}

export default App
