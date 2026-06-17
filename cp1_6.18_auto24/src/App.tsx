import { useState, useCallback } from 'react'
import { useBookList } from './hooks/useBookList'
import { Column } from './components/Column'
import { Sidebar } from './components/Sidebar'
import { SearchBar } from './components/SearchBar'
import { AddBookModal } from './components/AddBookModal'
import { StatsPanel } from './components/StatsPanel'
import { BookStatus, BookType } from './types'

function App() {
  const {
    booksByStatus,
    stats,
    searchKeyword,
    setSearchKeyword,
    filterType,
    setFilterType,
    filterRating,
    setFilterRating,
    addBook,
    removeBook,
    updateBookStatus,
  } = useBookList()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isStatsOpen, setIsStatsOpen] = useState(false)
  const [draggedBookId, setDraggedBookId] = useState<string | null>(null)

  const handleDragStart = useCallback((e: React.DragEvent, bookId: string) => {
    setDraggedBookId(bookId)
    e.dataTransfer.setData('bookId', bookId)
    e.dataTransfer.effectAllowed = 'move'
  }, [])

  const handleDragEnd = useCallback(() => {
    setDraggedBookId(null)
  }, [])

  const handleDrop = useCallback((bookId: string, targetStatus: BookStatus) => {
    if (bookId && draggedBookId === bookId) {
      updateBookStatus(bookId, targetStatus)
    }
  }, [draggedBookId, updateBookStatus])

  const handleAddBook = (bookData: {
    title: string
    author: string
    type: BookType
    status: BookStatus
    rating: number
    note: string
  }) => {
    addBook(bookData)
  }

  const handleSidebarAdd = () => {
    setIsModalOpen(true)
  }

  const handleSidebarStats = () => {
    setIsStatsOpen(prev => !prev)
  }

  const handleSidebarSettings = () => {
    alert('设置功能开发中...')
  }

  return (
    <div className="app-container">
      <Sidebar
        onAddClick={handleSidebarAdd}
        onStatsClick={handleSidebarStats}
        onSettingsClick={handleSidebarSettings}
      />

      <div className="main-content">
        <header className="app-header">
          <h1 className="app-title">我的阅读清单</h1>
          <p className="app-subtitle">记录每一次阅读，见证成长的轨迹</p>
        </header>

        <SearchBar
          searchKeyword={searchKeyword}
          onSearchChange={setSearchKeyword}
          filterType={filterType}
          onFilterTypeChange={setFilterType}
          filterRating={filterRating}
          onFilterRatingChange={setFilterRating}
        />

        <div className="kanban-board">
          <Column
            status="wishlist"
            books={booksByStatus.wishlist}
            searchKeyword={searchKeyword}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDrop={handleDrop}
            onDeleteBook={removeBook}
          />
          <Column
            status="reading"
            books={booksByStatus.reading}
            searchKeyword={searchKeyword}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDrop={handleDrop}
            onDeleteBook={removeBook}
          />
          <Column
            status="finished"
            books={booksByStatus.finished}
            searchKeyword={searchKeyword}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDrop={handleDrop}
            onDeleteBook={removeBook}
          />
        </div>
      </div>

      <AddBookModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleAddBook}
      />

      <StatsPanel
        isOpen={isStatsOpen}
        onToggle={() => setIsStatsOpen(prev => !prev)}
        total={stats.total}
        avgRating={stats.avgRating}
        thisMonthAdded={stats.thisMonthAdded}
        last7Days={stats.last7Days}
        wishlistCount={stats.wishlistCount}
        readingCount={stats.readingCount}
        finishedCount={stats.finishedCount}
      />
    </div>
  )
}

export default App
