import { useState, useEffect } from 'react'
import type { Book, BorrowRecord, Review } from '@/models/types'
import { fetchBorrowTimeline } from '@/api/borrowApi'
import { fetchBookReviews } from '@/api/bookApi'
import { X, BookOpen, User, Calendar, Star } from 'lucide-react'

interface BookDetailProps {
  book: Book
  onClose: () => void
}

export default function BookDetail({ book, onClose }: BookDetailProps) {
  const [records, setRecords] = useState<BorrowRecord[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetchBorrowTimeline(book.id),
      fetchBookReviews(book.id),
    ]).then(([r, rv]) => {
      setRecords(r)
      setReviews(rv)
      setLoading(false)
    })
  }, [book.id])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden mx-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="relative px-8 pt-6 pb-4 border-b border-[#f5e6d3]">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-[#f7fafc] hover:bg-[#edf2f7] transition-colors"
          >
            <X size={16} className="text-[#718096]" />
          </button>
          <div className="flex items-start gap-4">
            <div
              className="w-3 self-stretch rounded-full flex-shrink-0"
              style={{ backgroundColor: book.coverColor }}
            />
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold text-[#5c3a21] mb-1">{book.title}</h2>
              <div className="flex flex-wrap gap-3 text-sm text-[#7a4e30]">
                <span className="flex items-center gap-1"><User size={14} />{book.author}</span>
                <span className="flex items-center gap-1"><BookOpen size={14} />ISBN: {book.isbn}</span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span
                  className="text-xs px-2.5 py-1 rounded-full font-medium"
                  style={{ backgroundColor: book.coverColor + '18', color: book.coverColor }}
                >
                  {book.category}
                </span>
                {book.status === 'available' ? (
                  <span className="text-xs px-2.5 py-1 rounded-full bg-green-50 text-green-700 font-medium">在馆</span>
                ) : (
                  <span className="text-xs px-2.5 py-1 rounded-full bg-red-50 text-red-700 font-medium">借出</span>
                )}
              </div>
            </div>
          </div>
          <p className="mt-3 text-sm text-[#4a5568] leading-relaxed pl-7">{book.description}</p>
        </div>

        <div className="px-8 py-5 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 220px)' }}>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-[#5c3a21] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1">
                <h3 className="text-base font-bold text-[#5c3a21] mb-4 flex items-center gap-2">
                  <Calendar size={16} />借阅时间线
                </h3>
                {records.length === 0 ? (
                  <p className="text-sm text-[#a0aec0] py-4">暂无借阅记录</p>
                ) : (
                  <div className="relative pl-6" style={{ background: '#f7fafc', borderRadius: '8px', padding: '16px 12px 16px 28px' }}>
                    <div className="absolute left-[18px] top-4 bottom-4 w-0.5 bg-[#e2e8f0]" />
                    {records.map((record) => (
                      <div key={record.id} className="relative mb-3 last:mb-0">
                        <div
                          className="absolute -left-[16px] top-1 w-3 h-3 rounded-full border-2 border-white"
                          style={{
                            backgroundColor: record.type === 'borrow' ? '#e53e3e' : '#38a169',
                          }}
                        />
                        <div className="ml-2">
                          <div className="flex items-center gap-2">
                            <span
                              className="text-xs font-semibold px-1.5 py-0.5 rounded"
                              style={{
                                backgroundColor: record.type === 'borrow' ? '#fff5f5' : '#f0fff4',
                                color: record.type === 'borrow' ? '#e53e3e' : '#38a169',
                              }}
                            >
                              {record.type === 'borrow' ? '借出' : '归还'}
                            </span>
                            <span className="text-xs text-[#718096]">{record.borrower}</span>
                          </div>
                          <span className="text-xs text-[#a0aec0] mt-0.5 block">{record.date}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="md:w-[280px]">
                <h3 className="text-base font-bold text-[#5c3a21] mb-4 flex items-center gap-2">
                  <Star size={16} />读者评价
                </h3>
                {reviews.length === 0 ? (
                  <p className="text-sm text-[#a0aec0] py-4">暂无评价</p>
                ) : (
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                    {reviews.map((review) => (
                      <div
                        key={review.id}
                        className="rounded-lg p-3"
                        style={{ background: '#edf2f7', width: '280px' }}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-7 h-7 rounded-full bg-[#5c3a21] text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                            {review.user.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium text-[#2d3748] block truncate">{review.user}</span>
                          </div>
                        </div>
                        <div className="flex gap-0.5 mb-1.5">
                          {[1, 2, 3, 4, 5].map(star => (
                            <Star
                              key={star}
                              size={12}
                              className={star <= review.rating ? 'fill-[#d69e2e] text-[#d69e2e]' : 'text-[#cbd5e0]'}
                            />
                          ))}
                        </div>
                        <p className="text-xs text-[#4a5568] leading-relaxed">{review.comment}</p>
                        <span className="text-[10px] text-[#a0aec0] mt-1 block">{review.date}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
