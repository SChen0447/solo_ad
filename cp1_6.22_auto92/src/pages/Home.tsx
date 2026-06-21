import { useState, useEffect } from 'react'
import type { Book } from '@/models/types'
import { fetchBooks, fetchPopularBooks } from '@/api/bookApi'
import BookCard from '@/components/BookCard'
import BookDetail from '@/components/BookDetail'
import SearchBar from '@/components/SearchBar'
import PopularRanking from '@/components/PopularRanking'
import { Library, Settings } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function Home() {
  const [books, setBooks] = useState<Book[]>([])
  const [popularBooks, setPopularBooks] = useState<Book[]>([])
  const [selectedBook, setSelectedBook] = useState<Book | null>(null)
  const [category, setCategory] = useState('全部')
  const [searchQuery, setSearchQuery] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    fetchBooks({ category: category === '全部' ? undefined : category }).then(setBooks)
    fetchPopularBooks().then(setPopularBooks)
  }, [category])

  const filteredBooks = searchQuery
    ? books.filter(b =>
        b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.isbn.includes(searchQuery)
      )
    : books

  return (
    <div className="min-h-screen" style={{ background: '#f5e6d3' }}>
      <header className="bg-[#5c3a21] text-white shadow-lg">
        <div className="max-w-[1200px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Library size={28} className="text-[#d69e2e]" />
              <div>
                <h1 className="text-xl font-bold">社区图书馆</h1>
                <div className="h-0.5 w-16 bg-[#d69e2e] mt-0.5 rounded-full" />
              </div>
            </div>
            <button
              onClick={() => navigate('/admin')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-[#7a4e30] hover:bg-[#8b6040] transition-all duration-300"
            >
              <Settings size={14} />
              管理后台
            </button>
          </div>
          <SearchBar
            onSearch={setSearchQuery}
            onCategoryChange={setCategory}
            selectedCategory={category}
          />
        </div>
      </header>

      <div className="max-w-[1200px] mx-auto px-6 py-6">
        <div className="flex gap-6">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[#5c3a21]">
                书架
                <span className="text-sm font-normal text-[#7a4e30] ml-2">
                  共 {filteredBooks.length} 本
                </span>
              </h2>
            </div>
            <div className="flex flex-wrap gap-3">
              {filteredBooks.map(book => (
                <BookCard
                  key={book.id}
                  book={book}
                  onClick={setSelectedBook}
                />
              ))}
            </div>
            {filteredBooks.length === 0 && (
              <div className="text-center py-16">
                <Library size={48} className="mx-auto text-[#b8a898] mb-3" />
                <p className="text-[#7a4e30]">没有找到匹配的书籍</p>
              </div>
            )}
          </div>

          <div className="w-[260px] flex-shrink-0 hidden lg:block">
            <PopularRanking books={popularBooks} onBookClick={setSelectedBook} />
          </div>
        </div>

        <div className="lg:hidden mt-6">
          <PopularRanking books={popularBooks} onBookClick={setSelectedBook} />
        </div>
      </div>

      {selectedBook && (
        <BookDetail book={selectedBook} onClose={() => setSelectedBook(null)} />
      )}
    </div>
  )
}
