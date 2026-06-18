import { create } from 'zustand'
import type { PuzzlePiece } from '../utils/puzzleSplitter'
import type { DragState } from '../utils/dragHandler'
import { createInitialDragState } from '../utils/dragHandler'

interface User {
  id: string
  nickname: string
  socketId: string
}

interface RemoteDrag {
  pieceId: string
  userId: string
  x: number
  y: number
  path: { x: number; y: number }[]
}

interface PuzzleState {
  mode: 'single' | 'collaborative'
  roomCode: string | null
  userId: string | null
  nickname: string
  users: User[]
  imageDataUrl: string | null
  gridSize: number
  pieces: PuzzlePiece[]
  imageWidth: number
  imageHeight: number
  offsetX: number
  offsetY: number
  dragState: DragState
  remoteDrags: Map<string, RemoteDrag>
  isComplete: boolean
  showPreview: boolean
  showAllPieces: boolean
  isAnimating: boolean
  
  setMode: (mode: 'single' | 'collaborative') => void
  setRoomCode: (code: string | null) => void
  setUserId: (id: string | null) => void
  setNickname: (name: string) => void
  setUsers: (users: User[]) => void
  setImageDataUrl: (url: string | null) => void
  setGridSize: (size: number) => void
  setPieces: (pieces: PuzzlePiece[]) => void
  setImageDimensions: (width: number, height: number, offsetX: number, offsetY: number) => void
  updatePiecePosition: (id: string, x: number, y: number, rotation?: number) => void
  placePiece: (id: string, placedBy?: string) => void
  setDragState: (state: Partial<DragState>) => void
  addRemoteDrag: (pieceId: string, userId: string, x: number, y: number) => void
  updateRemoteDrag: (pieceId: string, x: number, y: number) => void
  removeRemoteDrag: (pieceId: string) => void
  setIsComplete: (complete: boolean) => void
  setShowPreview: (show: boolean) => void
  setShowAllPieces: (show: boolean) => void
  setIsAnimating: (animating: boolean) => void
  resetPuzzle: () => void
}

export const usePuzzleStore = create<PuzzleState>((set, get) => ({
  mode: 'single',
  roomCode: null,
  userId: null,
  nickname: '玩家' + Math.floor(Math.random() * 1000),
  users: [],
  imageDataUrl: null,
  gridSize: 3,
  pieces: [],
  imageWidth: 0,
  imageHeight: 0,
  offsetX: 0,
  offsetY: 0,
  dragState: createInitialDragState(),
  remoteDrags: new Map(),
  isComplete: false,
  showPreview: true,
  showAllPieces: false,
  isAnimating: false,

  setMode: (mode) => set({ mode }),
  setRoomCode: (code) => set({ roomCode: code }),
  setUserId: (id) => set({ userId: id }),
  setNickname: (name) => set({ nickname: name }),
  setUsers: (users) => set({ users }),
  setImageDataUrl: (url) => set({ imageDataUrl: url }),
  setGridSize: (size) => set({ gridSize: size }),
  setPieces: (pieces) => set({ pieces }),
  setImageDimensions: (width, height, offsetX, offsetY) => 
    set({ imageWidth: width, imageHeight: height, offsetX, offsetY }),
  
  updatePiecePosition: (id, x, y, rotation) => {
    const { pieces } = get()
    set({
      pieces: pieces.map(p => 
        p.id === id 
          ? { ...p, x, y, rotation: rotation !== undefined ? rotation : p.rotation }
          : p
      )
    })
  },
  
  placePiece: (id, placedBy) => {
    const { pieces, userId } = get()
    set({
      pieces: pieces.map(p => 
        p.id === id 
          ? { ...p, isPlaced: true, placedBy: placedBy || userId || undefined }
          : p
      )
    })
  },
  
  setDragState: (state) => {
    const { dragState } = get()
    set({ dragState: { ...dragState, ...state } })
  },
  
  addRemoteDrag: (pieceId, userId, x, y) => {
    const { remoteDrags } = get()
    const newRemoteDrags = new Map(remoteDrags)
    newRemoteDrags.set(pieceId, {
      pieceId,
      userId,
      x,
      y,
      path: [{ x, y }]
    })
    set({ remoteDrags: newRemoteDrags })
  },
  
  updateRemoteDrag: (pieceId, x, y) => {
    const { remoteDrags } = get()
    const drag = remoteDrags.get(pieceId)
    if (drag) {
      const newRemoteDrags = new Map(remoteDrags)
      newRemoteDrags.set(pieceId, {
        ...drag,
        x,
        y,
        path: [...drag.path.slice(-50), { x, y }]
      })
      set({ remoteDrags: newRemoteDrags })
    }
  },
  
  removeRemoteDrag: (pieceId) => {
    const { remoteDrags } = get()
    const newRemoteDrags = new Map(remoteDrags)
    newRemoteDrags.delete(pieceId)
    set({ remoteDrags: newRemoteDrags })
  },
  
  setIsComplete: (complete) => set({ isComplete: complete }),
  setShowPreview: (show) => set({ showPreview: show }),
  setShowAllPieces: (show) => set({ showAllPieces: show }),
  setIsAnimating: (animating) => set({ isAnimating: animating }),
  
  resetPuzzle: () => set({
    pieces: [],
    imageDataUrl: null,
    isComplete: false,
    dragState: createInitialDragState(),
    remoteDrags: new Map()
  })
}))
