import { useState, useRef, useEffect, useCallback } from 'react'
import type { Book, BookCategory } from '@/models/types'
import { searchBooks } from '@/api/bookApi'
import { Search, Filter } from 'lucide-react'

interface SearchBarProps {
  onSearch: (query: string) => void
  onCategoryChange: (category: string) => void
  selectedCategory: string
}

const categories: string[] = ['全部', '文学', '科技', '历史', '艺术', '生活']

export default function SearchBar({ onSearch, onCategoryChange, selectedCategory }: SearchBarProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Book[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([])
      setShowDropdown(false)
      onSearch('')
      return
    }
    const data = await searchBooks(q)
    setResults(data.slice(0, 6))
    setShowDropdown(true)
    onSearch(q)
  }, [onSearch])

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => doSearch(query), 200)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [query, doSearch])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
        setShowCategoryDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={containerRef} className="flex items-center gap-3 w-full max-w-xl">
      <div className="relative flex-1">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7a4e30]" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="搜索书名、作者或ISBN..."
            className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-[#d4c4b0] text-sm text-[#5c3a21] placeholder-[#b8a898] outline-none focus:border-[#7a4e30] focus:ring-2 focus:ring-[#7a4e30]/20 transition-all"
            style={{ background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(6px)' }}
          />
        </div>
        {showDropdown && results.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-[#e2e8f0] overflow-hidden z-40">
            {results.map(book => (
              <div
                key={book.id}
                className="flex items-center h-10 px-3 hover:bg-[#f5e6d3] cursor-pointer transition-colors"
                onClick={() => {
                  setQuery(book.title)
                  setShowDropdown(false)
                  onSearch(book.title)
                }}
              >
                <span className="text-sm text-[#2d3748] truncate">{book.title}</span>
                <span className="text-xs text-[#718096] ml-2 flex-shrink-0">{book.author}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="relative">
        <button
          onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
          className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg border border-[#d4c4b0] text-sm text-[#5c3a21] hover:bg-[#7a4e30] hover:text-white transition-all"
          style={{ background: showCategoryDropdown ? '#7a4e30' : 'rgba(255,255,255,0.6)', backdropFilter: 'blur(6px)', color: showCategoryDropdown ? 'white' : '#5c3a21' }}
        >
          <Filter size={14} />
          {selectedCategory === '全部' ? '全部分类' : selectedCategory}
        </button>
        {showCategoryDropdown && (
          <div className="absolute top-full right-0 mt-1 bg-white rounded-lg shadow-lg border border-[#e2e8f0] overflow-hidden z-40 min-w-[120px]">
            {categories.map(cat => (
              <div
                key={cat}
                className={`px-4 py-2 text-sm cursor-pointer hover:bg-[#f5e6d3] transition-colors ${selectedCategory === cat ? 'bg-[#f5e6d3] text-[#5c3a21] font-medium' : 'text-[#4a5568]'}`}
                onClick={() => {
                  onCategoryChange(cat)
                  setShowCategoryDropdown(false)
                }}
              >
                {cat}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
