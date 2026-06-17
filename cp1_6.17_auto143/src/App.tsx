import { useState, useEffect, useCallback } from 'react'
import EditorPanel from './editor/EditorPanel'
import VersionHistory from './collab/VersionHistory'
import CollabManager, { User, CursorPosition, VersionRecord, ConflictData } from './collab/CollabManager'
import './styles/app.css'

const USER_COLORS = ['#2C3E50', '#27AE60', '#E74C3C', '#8E44AD', '#A0522D']
const USER_NAMES = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry', 'Ivy', 'Jack']

function App() {
  const [content, setContent] = useState<string>('# 欢迎使用 Markdown 协作编辑器\n\n开始输入您的文档内容...\n\n## 特性\n\n- 实时协作编辑\n- Markdown 实时渲染\n- 版本历史回溯\n\n```js\nconsole.log("Hello, World!");\n```')
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [cursors, setCursors] = useState<Record<string, CursorPosition>>({})
  const [versions, setVersions] = useState<VersionRecord[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [previewVersion, setPreviewVersion] = useState<VersionRecord | null>(null)
  const [collabManager, setCollabManager] = useState<CollabManager | null>(null)
  const [conflict, setConflict] = useState<ConflictData | null>(null)
  const [isReadOnly, setIsReadOnly] = useState(false)

  useEffect(() => {
    const randomColor = USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)]
    const randomName = USER_NAMES[Math.floor(Math.random() * USER_NAMES.length)]
    const userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
    
    const user: User = {
      id: userId,
      name: randomName,
      color: randomColor
    }
    
    setCurrentUser(user)
    
    const manager = new CollabManager(user, {
      onContentChange: (newContent) => {
        setContent(newContent)
      },
      onUsersChange: (newUsers) => {
        setUsers(newUsers)
      },
      onCursorChange: (userId, cursor) => {
        setCursors(prev => ({ ...prev, [userId]: cursor }))
      },
      onVersionsChange: (newVersions) => {
        setVersions(newVersions)
      },
      onConflict: (conflictData) => {
        setConflict(conflictData)
      }
    })
    
    setCollabManager(manager)
    manager.connect()
    
    return () => {
      manager.disconnect()
    }
  }, [])

  const handleContentChange = useCallback((newContent: string) => {
    if (isReadOnly) return
    setContent(newContent)
    collabManager?.sendContentChange(newContent)
  }, [collabManager, isReadOnly])

  const handleCursorChange = useCallback((cursor: CursorPosition) => {
    if (isReadOnly) return
    collabManager?.sendCursorChange(cursor)
  }, [collabManager, isReadOnly])

  const handleSaveVersion = useCallback(() => {
    collabManager?.saveVersion(content)
  }, [collabManager, content])

  const handlePreviewVersion = useCallback((version: VersionRecord | null) => {
    setPreviewVersion(version)
    setIsReadOnly(version !== null)
  }, [])

  const handleRollbackVersion = useCallback((version: VersionRecord) => {
    collabManager?.rollbackVersion(version)
    setPreviewVersion(null)
    setIsReadOnly(false)
    setShowHistory(false)
  }, [collabManager])

  const handleResolveConflict = useCallback((choice: 'ours' | 'theirs' | 'merged', mergedContent?: string) => {
    if (!conflict) return
    let finalContent = ''
    if (choice === 'ours') {
      finalContent = conflict.ourContent
    } else if (choice === 'theirs') {
      finalContent = conflict.theirContent
    } else if (mergedContent) {
      finalContent = mergedContent
    }
    setContent(finalContent)
    collabManager?.sendContentChange(finalContent)
    setConflict(null)
  }, [conflict, collabManager])

  const handleExportHTML = useCallback(() => {
    collabManager?.exportHTML(content)
  }, [collabManager, content])

  const handleExportPDF = useCallback(() => {
    collabManager?.exportPDF()
  }, [collabManager])

  const displayContent = previewVersion ? previewVersion.content : content

  return (
    <div className="app-container">
      <header className="toolbar">
        <div className="toolbar-left">
          <span className="app-title">📝 Markdown 协作编辑器</span>
          {isReadOnly && <span className="readonly-badge">只读预览模式</span>}
        </div>
        <div className="toolbar-center">
          <button className="toolbar-btn" onClick={() => setShowHistory(!showHistory)}>
            📜 历史版本
          </button>
          <button className="toolbar-btn" onClick={handleSaveVersion} disabled={isReadOnly}>
            💾 保存版本
          </button>
          <button className="toolbar-btn" onClick={handleExportHTML}>
            📄 导出 HTML
          </button>
          <button className="toolbar-btn" onClick={handleExportPDF}>
            🖨️ 导出 PDF
          </button>
        </div>
        <div className="toolbar-right">
          {users.filter(u => u.id !== currentUser?.id).map(user => (
            <div
              key={user.id}
              className="user-avatar"
              style={{ backgroundColor: user.color }}
              title={user.name}
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
          ))}
          {currentUser && (
            <div
              className="user-avatar current-user"
              style={{ backgroundColor: currentUser.color }}
              title={`${currentUser.name} (我)`}
            >
              {currentUser.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </header>

      <main className="main-content">
        <EditorPanel
          content={displayContent}
          onContentChange={handleContentChange}
          onCursorChange={handleCursorChange}
          users={users}
          cursors={cursors}
          currentUserId={currentUser?.id || ''}
          isReadOnly={isReadOnly}
        />

        <VersionHistory
          visible={showHistory}
          versions={versions}
          previewVersion={previewVersion}
          currentContent={content}
          onClose={() => setShowHistory(false)}
          onPreview={handlePreviewVersion}
          onRollback={handleRollbackVersion}
        />
      </main>

      {conflict && (
        <div className="conflict-dialog-overlay">
          <div className="conflict-dialog">
            <h3>⚠️ 检测到编辑冲突</h3>
            <p>您和 {conflict.otherUser.name} 同时编辑了同一段落</p>
            <div className="conflict-content">
              <div className="conflict-side">
                <h4>您的版本</h4>
                <pre>{conflict.ourContent.substring(Math.max(0, conflict.conflictStart - 50), Math.min(conflict.ourContent.length, conflict.conflictEnd + 50))}</pre>
              </div>
              <div className="conflict-side">
                <h4>{conflict.otherUser.name} 的版本</h4>
                <pre>{conflict.theirContent.substring(Math.max(0, conflict.conflictStart - 50), Math.min(conflict.theirContent.length, conflict.conflictEnd + 50))}</pre>
              </div>
            </div>
            <div className="conflict-actions">
              <button className="toolbar-btn" onClick={() => handleResolveConflict('ours')}>保留我的版本</button>
              <button className="toolbar-btn" onClick={() => handleResolveConflict('theirs')}>保留对方版本</button>
              <button className="toolbar-btn primary" onClick={() => handleResolveConflict('theirs')}>自动合并</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
