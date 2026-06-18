import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import {
  Pencil,
  Square,
  Circle,
  Type,
  Move,
  Trash2,
  FileText,
  Menu,
  AlertTriangle,
} from 'lucide-react'
import useStore from './StateManager'
import CanvasHandler, { type Viewport } from './CanvasHandler'
import { getWebSocketConnection } from './WebSocketConnection'
import SummaryPanel from './SummaryPanel'
import type { ToolType, WSMessage } from './types'
import { PRESET_COLORS, LINE_WIDTHS, AVATAR_COLORS } from './types'

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const canvasWrapRef = useRef<HTMLDivElement>(null)
  const handlerRef = useRef<CanvasHandler | null>(null)
  const [viewport, setViewport] = useState<Viewport>({ offsetX: 0, offsetY: 0, scale: 1 })
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [nameDialogOpen, setNameDialogOpen] = useState(true)
  const [tempName, setTempName] = useState('')
  const [hoverColorIdx, setHoverColorIdx] = useState(-1)
  const [hoverWidthIdx, setHoverWidthIdx] = useState(-1)

  const {
    currentTool,
    setTool,
    currentColor,
    setColor,
    currentLineWidth,
    setLineWidth,
    elements,
    summaryOpen,
    setSummaryOpen,
    users,
    connected,
    currentUserId,
    currentUserName,
    initUser,
    applyRemoteMessage,
    applySync,
    setUsers,
    addUser,
  } = useStore()

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    const onChange = (e: MediaQueryListEvent) => {
      setSidebarCollapsed(e.matches)
      if (!e.matches) setMobileSidebarOpen(false)
    }
    setSidebarCollapsed(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const sortedUsers = useMemo(() => {
    return users.slice().sort((a, b) => a.id.localeCompare(b.id))
  }, [users])

  // 初始化 canvas handler
  useEffect(() => {
    if (!canvasRef.current || !canvasWrapRef.current) return
    const wrap = canvasWrapRef.current
    const handler = new CanvasHandler(canvasRef.current, (v) => setViewport(v))
    handlerRef.current = handler
    const resize = () => {
      const rect = wrap.getBoundingClientRect()
      handler.resize(rect.width, rect.height)
    }
    resize()
    handler.start()
    window.addEventListener('resize', resize)
    return () => {
      window.removeEventListener('resize', resize)
      handler.dispose()
    }
  }, [])

  // 连接 WebSocket
  useEffect(() => {
    if (!currentUserName) return
    const ws = getWebSocketConnection()
    const onMessage = (msg: WSMessage) => {
      if (msg.type === 'init') {
        if (msg.elements && msg.users) applySync(msg.elements, msg.users)
        return
      }
      if (msg.type === 'sync') {
        if (msg.elements) {
          const allUsers = [
            ...new Map(
              [...(msg.users || []), ...users].map((u) => [u.id, u])
            ).values(),
          ]
          applySync(msg.elements, allUsers.length > 0 ? allUsers : users)
        }
        return
      }
      if (msg.type === 'join' && msg.user) {
        addUser(msg.user)
        return
      }
      if (msg.type === 'leave') {
        useStore.getState().removeUser(msg.userId!)
        return
      }
      applyRemoteMessage(msg)
    }
    ws.connect(onMessage)
    return () => ws.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserName])

  const handleNameSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      const name = tempName.trim() || `用户${Math.floor(Math.random() * 1000)}`
      initUser(name)
      setNameDialogOpen(false)
    },
    [initUser, tempName]
  )

  const tools: { key: ToolType; label: string; Icon: typeof Pencil }[] = [
    { key: 'pen', label: '画笔', Icon: Pencil },
    { key: 'rect', label: '矩形', Icon: Square },
    { key: 'ellipse', label: '椭圆', Icon: Circle },
    { key: 'text', label: '文本', Icon: Type },
  ]

  const resetCanvas = () => {
    if (!confirm('确定清空当前画布所有内容吗？此操作不可恢复。')) return
    const store = useStore.getState()
    const ws = getWebSocketConnection()
    for (const el of store.elements) {
      ws.send({ type: 'delete', element: el, userId: el.userId })
    }
    store.applySync([], store.users)
  }

  const resetViewport = () => {
    const wrap = canvasWrapRef.current
    const h = handlerRef.current
    if (!wrap || !h) return
    h.setViewport({ offsetX: wrap.clientWidth / 2, offsetY: wrap.clientHeight / 2, scale: 1 })
  }

  // 获取用户名首字（中文取首字，英文取首字母大写）
  const getInitial = (name: string): string => {
    if (!name) return '?'
    const ch = name.trim().charAt(0)
    return ch.toUpperCase()
  }

  // 为用户稳定分配颜色
  const getUserColor = (userId: string): string => {
    let hash = 0
    for (let i = 0; i < userId.length; i++) {
      hash = (hash * 31 + userId.charCodeAt(i)) | 0
    }
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
  }

  // 当前自己的显示颜色（如果已在store中分配则直接使用）
  const myColor = useStore.getState().currentUserColor || getUserColor(currentUserId)

  return (
    <div className="fixed inset-0 overflow-hidden bg-white font-sans text-gray-800 select-none">
      {/* 连接警告条 */}
      {!connected && !nameDialogOpen && (
        <div
          className="absolute top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 py-2 text-white text-sm shadow-lg"
          style={{ background: '#ff4d4d' }}
        >
          <AlertTriangle size={16} />
          <span>连接已断开，正在重试...</span>
        </div>
      )}

      {/* 左侧工具栏 */}
      <aside
        className={`absolute top-16 left-4 z-30 transition-all duration-300 ease-out flex flex-col items-center ${
          mobileSidebarOpen ? 'translate-x-0' : ''
        }`}
        style={{
          transform: sidebarCollapsed && !mobileSidebarOpen ? 'translateX(-140%)' : 'translateX(0)',
        }}
      >
        <div
          className="flex flex-col gap-3 p-3 rounded-xl shadow-lg"
          style={{
            background: '#ffffff',
            border: '1px solid rgba(0,0,0,0.06)',
          }}
        >
          {tools.map(({ key, label, Icon }) => {
            const isActive = currentTool === key
            return (
              <button
                key={key}
                title={label}
                onClick={() => setTool(key)}
                className="relative w-11 h-11 flex items-center justify-center rounded-lg transition-all duration-200 hover:-translate-y-0.5 group"
                style={{
                  background: isActive ? '#e6f0ff' : '#f8f9fa',
                  border: isActive ? '2px solid #4da6ff' : '2px solid transparent',
                  color: isActive ? '#2d7ad6' : '#444',
                }}
              >
                <Icon size={20} strokeWidth={isActive ? 2.3 : 2} />
                {sidebarCollapsed && mobileSidebarOpen && (
                  <span
                    className="absolute left-full ml-2 px-2 py-1 rounded text-xs whitespace-nowrap text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                    style={{ background: '#333' }}
                  >
                    {label}
                  </span>
                )}
              </button>
            )
          })}

          <div className="h-px bg-gray-200 my-1" />

          {/* 线宽选择 */}
          <div className="flex flex-col gap-1.5 items-center">
            {LINE_WIDTHS.map((w, i) => {
              const isActive = currentLineWidth === w
              return (
                <button
                  key={w}
                  title={`线条粗细 ${w}px`}
                  onClick={() => setLineWidth(w)}
                  onMouseEnter={() => setHoverWidthIdx(i)}
                  onMouseLeave={() => setHoverWidthIdx(-1)}
                  className="w-11 h-8 flex items-center justify-center rounded-lg transition-all duration-200 hover:-translate-y-0.5"
                  style={{
                    background:
                      isActive || hoverWidthIdx === i ? '#e6f0ff' : 'transparent',
                    border: isActive ? '2px solid #4da6ff' : '2px solid transparent',
                  }}
                >
                  <div
                    style={{
                      width: 22,
                      height: w,
                      background: currentColor,
                      borderRadius: 999,
                      color: '#333',
                    }}
                  />
                </button>
              )
            })}
          </div>

          <div className="h-px bg-gray-200 my-1" />

          {/* 颜色预设 */}
          <div className="grid grid-cols-2 gap-1.5 place-items-center">
            {PRESET_COLORS.map((c, i) => {
              const isActive = currentColor === c
              return (
                <button
                  key={c}
                  title={c}
                  onClick={() => setColor(c)}
                  onMouseEnter={() => setHoverColorIdx(i)}
                  onMouseLeave={() => setHoverColorIdx(-1)}
                  className="w-7 h-7 rounded-full transition-all duration-200 hover:-translate-y-0.5"
                  style={{
                    background: c,
                    boxShadow:
                      isActive || hoverColorIdx === i
                        ? `0 0 0 2px #fff, 0 0 0 4px #4da6ff`
                        : '0 0 0 1px rgba(0,0,0,0.08) inset',
                    transform:
                      isActive || hoverColorIdx === i ? 'scale(1.08)' : 'scale(1)',
                  }}
                />
              )
            })}
          </div>

          <div className="h-px bg-gray-200 my-1" />

          <button
            title="平移画布 (Space+Drag / 中键 / Shift+Drag)"
            onClick={() => {
              handlerRef.current?.setMode('pan')
              setTimeout(() => handlerRef.current?.setMode('draw'), 0)
              // 仅作提示，实际操作通过中键/Shift
            }}
            className="w-11 h-11 flex items-center justify-center rounded-lg transition-all duration-200 hover:-translate-y-0.5"
            style={{ background: '#f8f9fa', color: '#444' }}
          >
            <Move size={20} />
          </button>

          <button
            title="回到初始视口"
            onClick={resetViewport}
            className="w-11 h-11 flex items-center justify-center rounded-lg transition-all duration-200 hover:-translate-y-0.5"
            style={{ background: '#f8f9fa', color: '#444' }}
          >
            <div className="text-xs font-medium">1:1</div>
          </button>

          <button
            title="清空画布"
            onClick={resetCanvas}
            className="w-11 h-11 flex items-center justify-center rounded-lg transition-all duration-200 hover:-translate-y-0.5"
            style={{ background: '#fff5f5', color: '#ff4d4d' }}
          >
            <Trash2 size={20} />
          </button>
        </div>
      </aside>

      {/* 移动端侧栏切换按钮 */}
      {sidebarCollapsed && (
        <button
          onClick={() => setMobileSidebarOpen((s) => !s)}
          className="absolute top-16 left-4 z-30 w-11 h-11 flex items-center justify-center rounded-xl shadow-lg bg-white text-gray-700 transition-all duration-200 hover:-translate-y-0.5"
          style={{
            border: '1px solid rgba(0,0,0,0.06)',
            transform: mobileSidebarOpen ? 'translateX(110px)' : 'translateX(0)',
          }}
        >
          <Menu size={20} />
        </button>
      )}

      {/* 顶部头像栏 */}
      <header
        className="absolute top-4 left-0 right-0 z-20 flex items-center justify-between px-4 md:px-6 pointer-events-none"
        style={{ marginTop: connected ? 0 : 36 }}
      >
        <div className="flex items-center gap-2 pointer-events-auto">
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-xl shadow-md"
            style={{
              background: '#ffffffee',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(0,0,0,0.05)',
            }}
          >
            <div
              className="w-4 h-4 rounded-full"
              style={{
                background: '#f5f0e8',
                border: '2px solid #e0d8c8',
              }}
            />
            <span className="font-semibold text-[15px] tracking-wide text-gray-800">
              绘记白板
            </span>
            <span className="text-xs text-gray-500 ml-1 hidden md:inline">
              · 共 {elements.length} 个元素
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 pointer-events-auto">
          <div
            className="flex items-center -space-x-3"
            style={{ paddingRight: sortedUsers.length > 0 ? 12 : 0 }}
          >
            {/* 自己的头像 */}
            <div
              className="flex flex-col items-center gap-1"
              title={`${currentUserName}（我）`}
            >
              <div
                className="flex items-center justify-center rounded-full font-bold text-white shadow-md"
                style={{
                  width: 48,
                  height: 48,
                  background: myColor,
                  border: '2.5px solid #fff',
                  fontSize: 18,
                }}
              >
                {getInitial(currentUserName)}
              </div>
              <span className="text-[11px] text-gray-600 font-medium bg-white/80 rounded px-1.5">
                {currentUserName}
              </span>
            </div>

            {/* 其他用户 */}
            {sortedUsers
              .filter((u) => u.id !== currentUserId)
              .map((u) => (
                <div
                  key={u.id}
                  className="flex flex-col items-center gap-1"
                  title={u.name}
                >
                  <div
                    className="flex items-center justify-center rounded-full font-bold text-white shadow-md"
                    style={{
                      width: 48,
                      height: 48,
                      background: u.color || getUserColor(u.id),
                      border: '2.5px solid #fff',
                      fontSize: 18,
                    }}
                  >
                    {getInitial(u.name)}
                  </div>
                  <span className="text-[11px] text-gray-600 font-medium bg-white/80 rounded px-1.5">
                    {u.name}
                  </span>
                </div>
              ))}
          </div>

          <button
            onClick={() => setSummaryOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-white shadow-md transition-all duration-200 hover:-translate-y-0.5"
            style={{ background: '#4da6ff' }}
          >
            <FileText size={18} />
            <span className="hidden sm:inline">生成纪要</span>
          </button>
        </div>
      </header>

      {/* 视口信息（右下） */}
      <div className="absolute bottom-4 right-4 z-20 text-[12px] text-gray-500 px-3 py-1.5 rounded-lg bg-white/70 backdrop-blur">
        缩放 {Math.round(viewport.scale * 100)}%
      </div>

      {/* Canvas */}
      <div
        ref={canvasWrapRef}
        className="absolute inset-0"
        onWheel={(e) => {
          e.preventDefault()
          handlerRef.current?.handleWheel(e as any)
        }}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 touch-none"
          onPointerDown={(e) => handlerRef.current?.handlePointerDown(e as any)}
          onPointerMove={(e) => handlerRef.current?.handlePointerMove(e as any)}
          onPointerUp={(e) => handlerRef.current?.handlePointerUp(e as any)}
          onPointerLeave={(e) => handlerRef.current?.handlePointerUp(e as any)}
          onDoubleClick={(e) => handlerRef.current?.handleDoubleClick(e as any)}
          style={{
            cursor:
              currentTool === 'text'
                ? 'text'
                : currentTool === 'pen'
                  ? 'crosshair'
                  : 'crosshair',
          }}
        />
      </div>

      {/* 纪要面板 */}
      {summaryOpen && <SummaryPanel onClose={() => setSummaryOpen(false)} />}

      {/* 昵称输入对话框 */}
      {nameDialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)' }}
        >
          <form
            onSubmit={handleNameSubmit}
            className="w-[92vw] max-w-md p-7 rounded-2xl shadow-2xl"
            style={{ background: '#fff' }}
          >
            <h2 className="text-xl font-bold mb-1 text-gray-800">欢迎加入绘记白板</h2>
            <p className="text-sm text-gray-500 mb-5">
              请输入您的昵称，以便其他协作者识别您的身份。
            </p>
            <label className="block mb-2 text-sm font-medium text-gray-700">
              您的昵称
            </label>
            <input
              autoFocus
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              placeholder="例如：小明"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-[#4da6ff] transition-all text-[15px]"
              maxLength={16}
            />
            <button
              type="submit"
              className="mt-6 w-full py-3 rounded-xl font-semibold text-white transition-all duration-200 hover:-translate-y-0.5"
              style={{ background: '#4da6ff' }}
            >
              进入白板
            </button>
            <p className="text-xs text-gray-400 text-center mt-3">
              提示：请在 <code>node server.js</code> 启动后再加入协作
            </p>
          </form>
        </div>
      )}
    </div>
  )
}
