import React, { useState, useEffect, useCallback } from 'react'
import EditorModule from './modules/editor/EditorModule'
import DataPanel from './modules/data/DataPanel'
import collabManager from './modules/collab/CollaborationManager'
import './App.css'

type ViewMode = 'editor' | 'data'

const App: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false)
  const [files, setFiles] = useState<string[]>(['main.R'])
  const [currentFile, setCurrentFile] = useState('main.R')
  const [activeView, setActiveView] = useState<ViewMode>('editor')
  const [isMobile, setIsMobile] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [projectName, setProjectName] = useState('分析项目')
  const [showNewFileModal, setShowNewFileModal] = useState(false)
  const [newFileName, setNewFileName] = useState('')

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
      if (window.innerWidth < 768) {
        setSidebarOpen(false)
      } else {
        setSidebarOpen(true)
      }
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    const connect = async () => {
      try {
        await collabManager.connect('default')
        setIsConnected(true)
      } catch (error) {
        console.error('Failed to connect:', error)
        setIsConnected(false)
      }
    }

    connect()

    return () => {
      collabManager.disconnect()
    }
  }, [])

  useEffect(() => {
    const handleFileAdded = (data: { filename: string; files: string[] }) => {
      setFiles(data.files)
    }

    const handleFileDeleted = (data: { filename: string; files: string[] }) => {
      setFiles(data.files)
      if (currentFile === data.filename && data.files.length > 0) {
        setCurrentFile(data.files[0])
      }
    }

    collabManager.on('file_added', handleFileAdded)
    collabManager.on('file_deleted', handleFileDeleted)

    return () => {
      collabManager.off('file_added', handleFileAdded)
      collabManager.off('file_deleted', handleFileDeleted)
    }
  }, [currentFile])

  const handleAddFile = useCallback(() => {
    if (!newFileName.trim()) return

    let filename = newFileName.trim()
    if (!filename.endsWith('.R') && !filename.endsWith('.r')) {
      filename += '.R'
    }

    if (files.includes(filename)) {
      alert('文件已存在')
      return
    }

    collabManager.addFile(filename)
    setCurrentFile(filename)
    setNewFileName('')
    setShowNewFileModal(false)
  }, [newFileName, files])

  const handleDeleteFile = useCallback(
    (filename: string) => {
      if (files.length <= 1) {
        alert('至少保留一个文件')
        return
      }
      if (confirm(`确定要删除 ${filename} 吗？`)) {
        collabManager.deleteFile(filename)
      }
    },
    [files.length]
  )

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen)
  }

  return (
    <div className={`app-container ${isMobile ? 'mobile' : ''}`}>
      {isMobile && (
        <header className="mobile-header">
          <button className="menu-btn" onClick={toggleMobileMenu}>
            ☰
          </button>
          <h1 className="app-title">Analytics Collab</h1>
          <div className="connection-status">
            <span className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`}></span>
          </div>
        </header>
      )}

      {isMobile && mobileMenuOpen && (
        <div className="mobile-menu-overlay" onClick={toggleMobileMenu}>
          <div className="mobile-menu" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-menu-header">
              <h2>菜单</h2>
              <button onClick={toggleMobileMenu}>✕</button>
            </div>
            <nav className="mobile-nav">
              <button
                className={`nav-item ${activeView === 'editor' ? 'active' : ''}`}
                onClick={() => {
                  setActiveView('editor')
                  toggleMobileMenu()
                }}
              >
                📝 代码编辑器
              </button>
              <button
                className={`nav-item ${activeView === 'data' ? 'active' : ''}`}
                onClick={() => {
                  setActiveView('data')
                  toggleMobileMenu()
                }}
              >
                📊 数据探索
              </button>
            </nav>
            <div className="mobile-files-section">
              <h3>文件列表</h3>
              <div className="mobile-file-list">
                {files.map((file) => (
                  <div
                    key={file}
                    className={`mobile-file-item ${currentFile === file ? 'active' : ''}`}
                    onClick={() => {
                      setCurrentFile(file)
                      setActiveView('editor')
                      toggleMobileMenu()
                    }}
                  >
                    📄 {file}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {!isMobile && sidebarOpen && (
        <aside className="sidebar">
          <div className="sidebar-header">
            <h1 className="app-logo">📊 Analytics Collab</h1>
            <div className="project-info">
              <input
                type="text"
                className="project-name-input"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
              />
              <span className={`connection-badge ${isConnected ? 'connected' : 'disconnected'}`}>
                {isConnected ? '● 已连接' : '○ 未连接'}
              </span>
            </div>
          </div>

          <nav className="sidebar-nav">
            <button
              className={`nav-item ${activeView === 'editor' ? 'active' : ''}`}
              onClick={() => setActiveView('editor')}
            >
              <span className="nav-icon">📝</span>
              <span>代码编辑器</span>
            </button>
            <button
              className={`nav-item ${activeView === 'data' ? 'active' : ''}`}
              onClick={() => setActiveView('data')}
            >
              <span className="nav-icon">📊</span>
              <span>数据探索</span>
            </button>
          </nav>

          <div className="sidebar-section">
            <div className="section-header">
              <h3>📁 文件列表</h3>
              <button
                className="add-btn"
                onClick={() => setShowNewFileModal(true)}
                title="新建文件"
              >
                +
              </button>
            </div>
            <div className="file-list">
              {files.map((file) => (
                <div
                  key={file}
                  className={`file-item ${currentFile === file ? 'active' : ''}`}
                  onClick={() => {
                    setCurrentFile(file)
                    setActiveView('editor')
                  }}
                >
                  <span className="file-icon">📄</span>
                  <span className="file-name">{file}</span>
                  <button
                    className="file-delete-btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteFile(file)
                    }}
                    title="删除文件"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="sidebar-footer">
            <div className="user-info">
              <span className="user-avatar">👤</span>
              <span className="user-name">{collabManager.getUsername()}</span>
            </div>
          </div>
        </aside>
      )}

      {!isMobile && (
        <button
          className="sidebar-toggle"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          title={sidebarOpen ? '收起侧边栏' : '展开侧边栏'}
        >
          {sidebarOpen ? '◀' : '▶'}
        </button>
      )}

      <main className={`main-content ${!sidebarOpen && !isMobile ? 'expanded' : ''}`}>
        {activeView === 'editor' && (
          <EditorModule
            files={files}
            currentFile={currentFile}
            onFilesChange={setFiles}
          />
        )}
        {activeView === 'data' && <DataPanel projectId="default" />}
      </main>

      {showNewFileModal && (
        <div className="modal-overlay" onClick={() => setShowNewFileModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>新建文件</h3>
              <button onClick={() => setShowNewFileModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <input
                type="text"
                placeholder="输入文件名 (例如: analysis.R)"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddFile()
                  }
                }}
                autoFocus
              />
            </div>
            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={() => setShowNewFileModal(false)}
              >
                取消
              </button>
              <button className="btn-primary" onClick={handleAddFile}>
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
