import React, { useState, useEffect, useRef, useCallback } from 'react'
import Editor, { OnMount } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'
import collabManager, { User, CodeResult, UserCursor, UserSelection } from '../collab/CollaborationManager'
import OutputPanel from './OutputPanel'
import './EditorModule.css'

interface EditorModuleProps {
  files: string[]
  currentFile: string
  onFilesChange?: (files: string[]) => void
}

const EditorModule: React.FC<EditorModuleProps> = ({
  files,
  currentFile,
  onFilesChange,
}) => {
  const [code, setCode] = useState('# 数据分析项目\n# 在此编写您的R代码\n')
  const [isRunning, setIsRunning] = useState(false)
  const [result, setResult] = useState<CodeResult | null>(null)
  const [onlineUsers, setOnlineUsers] = useState<User[]>([])
  const [showOnlineList, setShowOnlineList] = useState(false)
  const [comments, setComments] = useState<Record<string, string>>({})
  const [showComments, setShowComments] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [splitPosition, setSplitPosition] = useState(60)
  const [isDragging, setIsDragging] = useState(false)
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null)
  const monacoRef = useRef<typeof monaco | null>(null)
  const decorationsRef = useRef<string[]>([])
  const containerRef = useRef<HTMLDivElement>(null)
  const isRemoteUpdateRef = useRef(false)

  useEffect(() => {
    const handleProjectState = (data: { code: string; users: User[] }) => {
      isRemoteUpdateRef.current = true
      setCode(data.code)
      if (editorRef.current) {
        editorRef.current.setValue(data.code)
      }
      setOnlineUsers(data.users)
      isRemoteUpdateRef.current = false
    }

    const handleCodeUpdate = (data: { code: string; user_id: string }) => {
      if (data.user_id !== collabManager.getUserId()) {
        isRemoteUpdateRef.current = true
        if (editorRef.current) {
          const model = editorRef.current.getModel()
          if (model) {
            model.setValue(data.code)
          }
        }
        setCode(data.code)
        isRemoteUpdateRef.current = false
      }
    }

    const handleCursorUpdate = (data: {
      user_id: string
      cursor: UserCursor
      selection: UserSelection | null
    }) => {
      setOnlineUsers((prev) =>
        prev.map((u) =>
          u.id === data.user_id
            ? { ...u, cursor: data.cursor, selection: data.selection }
            : u
        )
      )
    }

    const handleUserJoined = (data: { user: User; users: User[] }) => {
      setOnlineUsers(data.users)
    }

    const handleUserLeft = (data: { user_id: string; users: User[] }) => {
      setOnlineUsers(data.users)
    }

    const handleCodeResult = (data: { result: CodeResult; user_id: string }) => {
      if (data.user_id === collabManager.getUserId()) {
        setResult(data.result)
        setIsRunning(false)
      }
    }

    collabManager.on('project_state', handleProjectState)
    collabManager.on('code_update', handleCodeUpdate)
    collabManager.on('cursor_update', handleCursorUpdate)
    collabManager.on('user_joined', handleUserJoined)
    collabManager.on('user_left', handleUserLeft)
    collabManager.on('code_result', handleCodeResult)

    return () => {
      collabManager.off('project_state', handleProjectState)
      collabManager.off('code_update', handleCodeUpdate)
      collabManager.off('cursor_update', handleCursorUpdate)
      collabManager.off('user_joined', handleUserJoined)
      collabManager.off('user_left', handleUserLeft)
      collabManager.off('code_result', handleCodeResult)
    }
  }, [])

  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) return

    const monaco = monacoRef.current
    const otherUsers = onlineUsers.filter(
      (u) => u.id !== collabManager.getUserId()
    )

    const decorations: monaco.editor.IModelDeltaDecoration[] = otherUsers.map(
      (user) => ({
        range: new monaco.Range(
          user.cursor.line + 1,
          user.cursor.column + 1,
          user.cursor.line + 1,
          user.cursor.column + 1
        ),
        options: {
          isWholeLine: true,
          className: 'remote-cursor-line',
          glyphMarginClassName: 'remote-cursor-glyph',
          glyphMarginHoverMessage: { value: user.username },
          linesDecorationsClassName: `remote-user-line line-highlight-${user.color.replace('#', '')}`,
          minimap: {
            color: user.color,
            position: 1,
          },
        },
      })
    )

    decorationsRef.current = editorRef.current.deltaDecorations(
      decorationsRef.current,
      decorations
    )
  }, [onlineUsers])

  const handleEditorDidMount: OnMount = (editor, monacoInstance) => {
    editorRef.current = editor
    monacoRef.current = monacoInstance

    monacoInstance.editor.defineTheme('analytics-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: 'c586c0', fontStyle: 'bold' },
        { token: 'string', foreground: 'ce9178' },
        { token: 'number', foreground: 'b5cea8' },
        { token: 'comment', foreground: '6a9955', fontStyle: 'italic' },
        { token: 'function', foreground: 'dcdcaa' },
        { token: 'variable', foreground: '9cdcfe' },
        { token: 'operator', foreground: 'd4d4d4' },
      ],
      colors: {
        'editor.background': '#252526',
        'editor.foreground': '#d4d4d4',
        'editorLineNumber.foreground': '#858585',
        'editorLineNumber.activeForeground': '#c6c6c6',
        'editorCursor.foreground': '#aeafad',
        'editor.selectionBackground': '#264f78',
        'editor.lineHighlightBackground': '#2b2b2b',
        'editorGutter.background': '#252526',
        'editorOverviewRuler.border': '#1e1e1e',
        'editorBracketMatch.background': '#00640050',
        'editorBracketMatch.border': '#888',
      },
    })

    monacoInstance.editor.setTheme('analytics-dark')

    editor.onDidChangeModelContent((e) => {
      if (isRemoteUpdateRef.current) return

      const value = editor.getValue()
      setCode(value)

      const changes = e.changes.map((change) => ({
        range: {
          startLineNumber: change.range.startLineNumber,
          startColumn: change.range.startColumn,
          endLineNumber: change.range.endLineNumber,
          endColumn: change.range.endColumn,
        },
        text: change.text,
      }))

      collabManager.sendCodeChange(value, changes)
    })

    editor.onDidChangeCursorPosition((e) => {
      const position = e.position
      collabManager.sendCursorChange(
        { line: position.lineNumber - 1, column: position.column - 1 },
        null
      )
    })

    editor.onDidChangeCursorSelection((e) => {
      const selection = e.selection
      collabManager.sendCursorChange(
        {
          line: selection.positionLineNumber - 1,
          column: selection.positionColumn - 1,
        },
        {
          startLine: selection.startLineNumber - 1,
          startColumn: selection.startColumn - 1,
          endLine: selection.endLineNumber - 1,
          endColumn: selection.endColumn - 1,
        }
      )
    })
  }

  const handleRunCode = useCallback(() => {
    setIsRunning(true)
    setResult(null)
    collabManager.runCode(code)
  }, [code])

  const handleRestoreSnapshot = useCallback(
    (snapshotCode: string, snapshotResult: CodeResult) => {
      isRemoteUpdateRef.current = true
      setCode(snapshotCode)
      if (editorRef.current) {
        editorRef.current.setValue(snapshotCode)
      }
      setResult(snapshotResult)
      isRemoteUpdateRef.current = false
    },
    []
  )

  const handleSplitMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return

      const rect = containerRef.current.getBoundingClientRect()
      const y = e.clientY - rect.top
      const percentage = (y / rect.height) * 100
      setSplitPosition(Math.min(Math.max(percentage, 20), 80))
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'row-resize'
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
    }
  }, [isDragging])

  const addComment = () => {
    if (!newComment.trim()) return
    const id = 'comment_' + Date.now()
    setComments((prev) => ({ ...prev, [id]: newComment }))
    setNewComment('')
  }

  const deleteComment = (id: string) => {
    setComments((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  return (
    <div className="editor-module" ref={containerRef}>
      <div className="editor-toolbar">
        <div className="toolbar-left">
          <span className="current-file">{currentFile}</span>
          <span className="line-count">
            {code.split('\n').length} 行
          </span>
        </div>
        <div className="toolbar-right">
          <div
            className="online-users"
            onMouseEnter={() => setShowOnlineList(true)}
            onMouseLeave={() => setShowOnlineList(false)}
          >
            <div className="online-count fade-in">
              <span className="dot"></span>
              {onlineUsers.length} 人在线
            </div>
            {showOnlineList && (
              <div className="online-list fade-in">
                {onlineUsers.map((user) => (
                  <div key={user.id} className="online-user">
                    <span
                      className="user-color-dot"
                      style={{ backgroundColor: user.color }}
                    ></span>
                    <span className="user-name">
                      {user.username}
                      {user.id === collabManager.getUserId() && ' (我)'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button
            className="run-btn"
            onClick={handleRunCode}
            disabled={isRunning}
          >
            {isRunning ? (
              <>
                <span className="loading-spinner">⚙</span>
                运行中...
              </>
            ) : (
              <>▶ 运行</>
            )}
          </button>
        </div>
      </div>

      {showComments && (
        <div className="comments-panel">
          <div className="comments-header">
            <span>Markdown 注释</span>
            <button
              className="close-btn"
              onClick={() => setShowComments(false)}
            >
              ✕
            </button>
          </div>
          <div className="comment-input">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="添加 Markdown 注释..."
              rows={3}
            />
            <button onClick={addComment}>添加</button>
          </div>
          <div className="comments-list">
            {Object.entries(comments).map(([id, text]) => (
              <div key={id} className="comment-item">
                <div className="comment-text">{text}</div>
                <button
                  className="comment-delete"
                  onClick={() => deleteComment(id)}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div
        className="editor-container"
        style={{ height: `${splitPosition}%` }}
      >
        <Editor
          height="100%"
          language="r"
          value={code}
          theme="analytics-dark"
          onMount={handleEditorDidMount}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            fontFamily: "'Fira Code', 'Consolas', monospace",
            fontLigatures: true,
            lineNumbers: 'on',
            lineNumbersMinChars: 3,
            glyphMargin: true,
            folding: true,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: 'on',
            scrollBeyondLastLine: false,
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            smoothScrolling: true,
            mouseWheelZoom: true,
            formatOnPaste: true,
            bracketPairColorization: { enabled: true },
            guides: {
              bracketPairs: true,
              indentation: true,
            },
          }}
        />
      </div>

      <div
        className={`split-bar ${isDragging ? 'dragging' : ''}`}
        onMouseDown={handleSplitMouseDown}
      >
        <div className="split-handle"></div>
      </div>

      <div
        className="output-container"
        style={{ height: `${100 - splitPosition}%` }}
      >
        <OutputPanel
          result={result}
          isLoading={isRunning}
          currentCode={code}
          onRestoreSnapshot={handleRestoreSnapshot}
        />
      </div>
    </div>
  )
}

export default EditorModule
