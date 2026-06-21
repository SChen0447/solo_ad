import type { Book } from '@/models/types'

interface BookCardProps {
  book: Book
  onClick: (book: Book) => void
}

export default function BookCard({ book, onClick }: BookCardProps) {
  return (
    <div
      onClick={() => onClick(book)}
      className="relative w-[200px] bg-white rounded-xl shadow-md cursor-pointer
                 transition-all duration-200 hover:-translate-y-1.5 hover:shadow-xl
                 overflow-hidden flex flex-col"
      style={{ borderRadius: '12px' }}
    >
      <div
        className="absolute left-0 top-0 bottom-0 w-1"
        style={{ backgroundColor: book.coverColor }}
      />
      <div className="pl-4 pr-3 pt-4 pb-2 flex-1 flex flex-col">
        <h3 className="text-sm font-bold text-[#5c3a21] leading-tight mb-1 line-clamp-2">
          {book.title}
        </h3>
        <p className="text-xs text-[#7a4e30] mb-2 truncate">{book.author}</p>
        <span
          className="inline-block text-xs px-2 py-0.5 rounded-full self-start mb-2"
          style={{
            backgroundColor: book.coverColor + '18',
            color: book.coverColor,
          }}
        >
          {book.category}
        </span>
      </div>
      <div className="px-3 pb-3">
        {book.status === 'available' ? (
          <span className="inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full bg-green-50 text-green-700">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5" />
            在馆
          </span>
        ) : (
          <span className="inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full bg-red-50 text-red-700">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1.5" />
            借出
          </span>
        )}
      </div>
    </div>
  )
}
