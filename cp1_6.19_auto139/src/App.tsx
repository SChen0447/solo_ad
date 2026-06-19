import { useEffect, useState, useRef, useCallback } from 'react'
import BoardList from './components/Board'
import Canvas from './components/Canvas'
import CardEditor from './components/CardEditor'
import {
  getAllBoards,
  getBoard,
  createBoard as apiCreateBoard,
  addCard as apiAddCard,
  updateCard as apiUpdateCard,
  deleteCard as apiDeleteCard,
  exportBoardJson,
  importBoard as apiImportBoard,
} from './services/drawboardService'
import type { Board, Card, CardType, CardContent } from './types'

export default function App() {
  const [boards, setBoards] = useState<Board[]>([])
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null)
  const [activeBoard, setActiveBoard] = useState<Board | null>(null)
  const [editingCard, setEditingCard] = useState<Card | null>(null)
  const [isEditingNew, setIsEditingNew] = useState(false)
  const [newCardType, setNewCardType] = useState<CardType>('text')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadBoards = useCallback(async () => {
    try {
      const data = await getAllBoards()
      setBoards(data)
    } catch (e) {
      console.error('加载画板失败', e)
    }
  }, [])

  const enterBoard = useCallback(async (id: string) => {
    try {
      const board = await getBoard(id)
      setActiveBoard(board)
      setActiveBoardId(id)
    } catch (e) {
      console.error('加载画板详情失败', e)
    }
  }, [])

  const leaveBoard = () => {
    setActiveBoard(null)
    setActiveBoardId(null)
    setEditingCard(null)
  }

  const handleCreateBoard = async (name: string, themeColor: string) => {
    try {
      const b = await apiCreateBoard(name, themeColor)
      setBoards(prev => [b, ...prev])
      setActiveBoard(b)
      setActiveBoardId(b.id)
    } catch (e) {
      console.error('创建画板失败', e)
    }
  }

  const handleAddCard = async (type: CardType, content: CardContent) => {
    if (!activeBoard) return
    const centerX = Math.round((window.innerWidth - 200) / 2 - 50)
    const centerY = Math.round((window.innerHeight - 150) / 2 - 100)
    let x = centerX
    let y = centerY
    activeBoard.cards.forEach(c => {
      const overlap = Math.abs(c.x - x) < 200 && Math.abs(c.y - y) < 150
      if (overlap) {
        x += 30
        y += 30
      }
    })
    try {
      const card = await apiAddCard(activeBoard.id, type, content, x, y)
      setActiveBoard(prev =>
        prev ? { ...prev, cards: [...prev.cards, card] } : prev
      )
      setEditingCard(card)
      setIsEditingNew(true)
    } catch (e) {
      console.error('添加卡片失败', e)
    }
  }

  const handleUpdateCard = async (cardId: string, content: CardContent) => {
    if (!activeBoard) return
    try {
      const updated = await apiUpdateCard(activeBoard.id, cardId, { content })
      setActiveBoard(prev =>
        prev
          ? {
              ...prev,
              cards: prev.cards.map(c => (c.id === cardId ? updated : c)),
            }
          : prev
      )
      setEditingCard(null)
      setIsEditingNew(false)
      setActiveBoard(prev => {
        if (!prev) return prev
        const cards = prev.cards.map(c =>
          c.id === cardId
            ? { ...c, content: updated.content, updatedAt: Date.now(), _flash: true } as Card & { _flash?: boolean }
            : c
        )
        return { ...prev, cards: cards as Card[] }
      })
    } catch (e) {
      console.error('更新卡片失败', e)
    }
  }

  const handleUpdateCardPosition = async (
    cardId: string,
    x: number,
    y: number,
    localOnly = false
  ) => {
    if (!activeBoard) return
    setActiveBoard(prev =>
      prev
        ? {
            ...prev,
            cards: prev.cards.map(c => (c.id === cardId ? { ...c, x, y } : c)),
          }
        : prev
    )
    if (!localOnly) {
      try {
        await apiUpdateCard(activeBoard.id, cardId, { x, y })
      } catch (e) {
        console.error('更新位置失败', e)
      }
    }
  }

  const handleDeleteCard = async (cardId: string) => {
    if (!activeBoard) return
    try {
      await apiDeleteCard(activeBoard.id, cardId)
      setActiveBoard(prev =>
        prev
          ? {
              ...prev,
              cards: prev.cards.filter(c => c.id !== cardId),
            }
          : prev
      )
    } catch (e) {
      console.error('删除卡片失败', e)
    }
  }

  const handleExport = async () => {
    if (activeBoardId) {
      try {
        await exportBoardJson(activeBoardId)
      } catch (e) {
        console.error('导出失败', e)
      }
    }
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      if (data.board) {
        const imported = await apiImportBoard(data)
        await loadBoards()
        setActiveBoard(imported)
        setActiveBoardId(imported.id)
      } else {
        alert('JSON格式不正确')
      }
    } catch (err) {
      console.error(err)
      alert('导入失败，请检查文件格式')
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  useEffect(() => {
    loadBoards()
  }, [loadBoards])

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-title">
          <svg className="icon" viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
          灵感画板
        </div>
      </header>

      {!activeBoard ? (
        <>
          <BoardList
            boards={boards}
            onEnter={enterBoard}
            onCreate={handleCreateBoard}
          />
          <footer className="app-footer">
            <button className="btn btn-ghost" onClick={handleImportClick}>
              <svg className="icon" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              导入画板
            </button>
            <input
              type="file"
              accept="application/json"
              ref={fileInputRef}
              className="import-file-input"
              onChange={handleFileChange}
            />
          </footer>
        </>
      ) : (
        <Canvas
          board={activeBoard}
          onBack={leaveBoard}
          onAddCard={(type) => setNewCardType(type)}
          onCardClick={(card) => { setEditingCard(card); setIsEditingNew(false) }}
          onCardPositionChange={handleUpdateCardPosition}
          onDeleteCard={handleDeleteCard}
          onExport={handleExport}
        />
      )}

      {editingCard && (
        <CardEditor
          card={editingCard}
          isNew={isEditingNew}
          onClose={() => { setEditingCard(null); setIsEditingNew(false) }}
          onSave={(content) => handleUpdateCard(editingCard.id, content)}
        />
      )}

      {!editingCard && activeBoard && newCardType && (
        <CardEditor
          card={{
            id: 'new',
            type: newCardType,
            content:
              newCardType === 'text'
                ? { title: '', body: '' }
                : newCardType === 'image'
                ? { url: '', caption: '' }
                : { name: '', color: '#533483' },
            x: 0,
            y: 0,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }}
          isNew={true}
          autoCreate={true}
          onClose={() => { setEditingCard(null); setIsEditingNew(false); (setNewCardType as any)(null) }}
          onSave={(content) => {
            handleAddCard(newCardType, content)
            ;(setNewCardType as any)(null)
          }}
        />
      )}
    </div>
  )
}
