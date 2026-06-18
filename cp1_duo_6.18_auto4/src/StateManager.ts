import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import type { BoardElement, UserInfo, WSMessage, ToolType, ElementType, Point } from './types'
import { PRESET_COLORS, AVATAR_COLORS, TEXT_FONT_SIZE, TEXT_COLOR } from './types'

interface WhiteboardState {
  elements: BoardElement[]
  users: UserInfo[]
  currentUserId: string
  currentUserName: string
  currentUserColor: string
  currentTool: ToolType
  currentColor: string
  currentLineWidth: number
  connected: boolean
  summary: string
  summaryOpen: boolean
  pendingOps: WSMessage[]

  addElement: (element: BoardElement) => void
  updateElement: (id: string, updates: Partial<BoardElement>) => void
  deleteElement: (id: string) => void
  setTool: (tool: ToolType) => void
  setColor: (color: string) => void
  setLineWidth: (width: number) => void
  setConnected: (connected: boolean) => void
  setSummary: (summary: string) => void
  setSummaryOpen: (open: boolean) => void
  setUsers: (users: UserInfo[]) => void
  addUser: (user: UserInfo) => void
  removeUser: (userId: string) => void
  applyRemoteMessage: (msg: WSMessage) => void
  applySync: (elements: BoardElement[], users: UserInfo[]) => void
  addPendingOp: (msg: WSMessage) => void
  clearPendingOps: () => void
  getPendingOps: () => WSMessage[]
  initUser: (name: string) => void
  createElement: (type: ElementType, x: number, y: number, extra?: Partial<BoardElement>) => BoardElement
}

const useStore = create<WhiteboardState>((set, get) => ({
  elements: [],
  users: [],
  currentUserId: uuidv4(),
  currentUserName: '',
  currentUserColor: AVATAR_COLORS[0],
  currentTool: 'pen',
  currentColor: PRESET_COLORS[7],
  currentLineWidth: 2,
  connected: false,
  summary: '',
  summaryOpen: false,
  pendingOps: [],

  addElement: (element) =>
    set((state) => ({ elements: [...state.elements, element] })),

  updateElement: (id, updates) =>
    set((state) => ({
      elements: state.elements.map((el) =>
        el.id === id ? { ...el, ...updates } : el
      ),
    })),

  deleteElement: (id) =>
    set((state) => ({
      elements: state.elements.filter((el) => el.id !== id),
    })),

  setTool: (tool) => set({ currentTool: tool }),
  setColor: (color) => set({ currentColor: color }),
  setLineWidth: (width) => set({ currentLineWidth: width }),
  setConnected: (connected) => set({ connected }),
  setSummary: (summary) => set({ summary }),
  setSummaryOpen: (open) => set({ summaryOpen: open }),
  setUsers: (users) => set({ users }),
  addUser: (user) =>
    set((state) => {
      if (state.users.find((u) => u.id === user.id)) return state
      return { users: [...state.users, user] }
    }),
  removeUser: (userId) =>
    set((state) => ({ users: state.users.filter((u) => u.id !== userId) })),

  applyRemoteMessage: (msg) => {
    switch (msg.type) {
      case 'add':
        if (msg.element) {
          set((state) => {
            if (state.elements.find((el) => el.id === msg.element!.id)) return state
            return { elements: [...state.elements, msg.element!] }
          })
        }
        break
      case 'update':
        if (msg.element) {
          set((state) => ({
            elements: state.elements.map((el) =>
              el.id === msg.element!.id ? { ...el, ...msg.element! } : el
            ),
          }))
        }
        break
      case 'delete':
        if (msg.element) {
          set((state) => ({
            elements: state.elements.filter((el) => el.id !== msg.element!.id),
          }))
        }
        break
      case 'join':
        if (msg.user) get().addUser(msg.user)
        break
      case 'leave':
        if (msg.userId) get().removeUser(msg.userId)
        break
    }
  },

  applySync: (elements, users) => set({ elements, users }),

  addPendingOp: (msg) =>
    set((state) => ({ pendingOps: [...state.pendingOps, msg] })),
  clearPendingOps: () => set({ pendingOps: [] }),
  getPendingOps: () => get().pendingOps,

  initUser: (name) => {
    const colorIndex = Math.floor(Math.random() * AVATAR_COLORS.length)
    set({
      currentUserName: name,
      currentUserColor: AVATAR_COLORS[colorIndex],
    })
  },

  createElement: (type, x, y, extra) => {
    const state = get()
    const base: BoardElement = {
      id: uuidv4(),
      type,
      x,
      y,
      color: type === 'text' ? TEXT_COLOR : state.currentColor,
      lineWidth: state.currentLineWidth,
      userId: state.currentUserId,
      createdAt: Date.now(),
      opacity: 0,
      fontSize: TEXT_FONT_SIZE,
      ...extra,
    }
    return base
  },
}))

export default useStore
