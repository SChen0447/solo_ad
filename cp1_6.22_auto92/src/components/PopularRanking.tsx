import type { Book } from '@/models/types'
import { TrendingUp } from 'lucide-react'

interface PopularRankingProps {
  books: Book[]
  onBookClick: (book: Book) => void
}

const rankColors = ['#d69e2e', '#a0aec0', '#d68a2e', '#718096', '#718096']

export default function PopularRanking({ books, onBookClick }: PopularRankingProps) {
  return (
    <div className="bg-white rounded-xl shadow-md p-5">
      <h3 className="text-base font-bold text-[#5c3a21] mb-4 flex items-center gap-2">
        <TrendingUp size={18} className="text-[#d69e2e]" />
        热门排行
      </h3>
      <div className="space-y-3">
        {books.map((book, index) => (
          <div
            key={book.id}
            onClick={() => onBookClick(book)}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <span
              className="text-2xl font-black w-8 text-center flex-shrink-0"
              style={{ color: rankColors[index] || '#718096' }}
            >
              {index + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#2d3748] group-hover:text-[#5c3a21] truncate transition-colors">
                {book.title}
              </p>
              <p className="text-xs text-[#718096]">借阅 {book.borrowCount} 次</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
