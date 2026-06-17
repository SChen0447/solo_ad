import { useEffect, useState } from 'react'
import { useKanbanStore } from './store/useKanbanStore'
import MatrixBoard from './components/MatrixBoard'
import Sidebar from './components/Sidebar'
import CardModal from './components/CardModal'
import CardDetailPanel from './components/CardDetailPanel'
import './styles/App.css'

function App() {
  const { fetchCards, initSocket, selectedCardId } = useKanbanStore()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCard, setEditingCard] = useState<any>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    initSocket()
    fetchCards()
  }, [])

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 900)
      if (window.innerWidth < 900) {
        setSidebarOpen(false)
      }
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const handleAddCard = () => {
    setEditingCard(null)
    setIsModalOpen(true)
  }

  const handleEditCard = (card: any) => {
    setEditingCard(card)
    setIsModalOpen(true)
  }

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-left">
          {isMobile && (
            <button className="menu-toggle" onClick={toggleSidebar}>
              ☰
            </button>
          )}
          <h1 className="app-title">需求优先级矩阵</h1>
        </div>
        <button className="add-btn" onClick={handleAddCard}>
          +
        </button>
      </header>

      <div className="main-content">
        <div className="matrix-wrapper">
          <MatrixBoard onEditCard={handleEditCard} />
        </div>

        {(sidebarOpen || !isMobile) && (
          <Sidebar
            onEditCard={handleEditCard}
            onClose={() => setSidebarOpen(false)}
            isMobile={isMobile}
          />
        )}
      </div>

      {isModalOpen && (
        <CardModal
          card={editingCard}
          onClose={() => setIsModalOpen(false)}
        />
      )}

      {selectedCardId && (
        <CardDetailPanel />
      )}

      {isMobile && sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}
    </div>
  )
}

export default App
