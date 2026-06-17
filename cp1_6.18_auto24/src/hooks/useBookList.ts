import { useState, useMemo, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { Book, BookStatus, BookType } from '../types'

const initialBooks: Book[] = [
  {
    id: uuidv4(),
    title: '深入理解计算机系统',
    author: 'Randal E. Bryant',
    type: 'book',
    status: 'reading',
    rating: 5,
    note: '经典的计算机系统入门教材，深入浅出地讲解了计算机底层原理。',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-02-01'),
  },
  {
    id: uuidv4(),
    title: '设计模式：可复用面向对象软件的基础',
    author: 'Erich Gamma',
    type: 'book',
    status: 'finished',
    rating: 5,
    note: '23种设计模式的经典著作，值得反复研读。',
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-25'),
  },
  {
    id: uuidv4(),
    title: 'React Hooks 最佳实践',
    author: 'Dan Abramov',
    type: 'article',
    status: 'wishlist',
    rating: 0,
    note: '',
    createdAt: new Date('2024-02-10'),
    updatedAt: new Date('2024-02-10'),
  },
  {
    id: uuidv4(),
    title: 'Attention Is All You Need',
    author: 'Vaswani et al.',
    type: 'paper',
    status: 'finished',
    rating: 4,
    note: 'Transformer架构的开山之作，影响了整个NLP领域。',
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-20'),
  },
  {
    id: uuidv4(),
    title: '人类简史',
    author: '尤瓦尔·赫拉利',
    type: 'book',
    status: 'reading',
    rating: 4,
    note: '从认知革命到科学革命，梳理了人类发展的宏大历史脉络。',
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-15'),
  },
  {
    id: uuidv4(),
    title: '代码整洁之道',
    author: 'Robert C. Martin',
    type: 'book',
    status: 'wishlist',
    rating: 0,
    note: '',
    createdAt: new Date('2024-02-20'),
    updatedAt: new Date('2024-02-20'),
  },
  {
    id: uuidv4(),
    title: '前端工程化实践指南',
    author: '张三',
    type: 'article',
    status: 'finished',
    rating: 3,
    note: '介绍了现代前端工程化的各种工具和最佳实践。',
    createdAt: new Date('2024-02-05'),
    updatedAt: new Date('2024-02-12'),
  },
]

export function useBookList() {
  const [books, setBooks] = useState<Book[]>(initialBooks)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [filterType, setFilterType] = useState<BookType | 'all'>('all')
  const [filterRating, setFilterRating] = useState<[number, number]>([0, 5])

  const addBook = useCallback((bookData: Omit<Book, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date()
    const newBook: Book = {
      ...bookData,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
    }
    setBooks(prev => [newBook, ...prev])
    return newBook
  }, [])

  const removeBook = useCallback((id: string) => {
    setBooks(prev => prev.filter(book => book.id !== id))
  }, [])

  const updateBookStatus = useCallback((id: string, status: BookStatus) => {
    setBooks(prev =>
      prev.map(book =>
        book.id === id ? { ...book, status, updatedAt: new Date() } : book
      )
    )
  }, [])

  const updateBook = useCallback((id: string, updates: Partial<Book>) => {
    setBooks(prev =>
      prev.map(book =>
        book.id === id ? { ...book, ...updates, updatedAt: new Date() } : book
      )
    )
  }, [])

  const filteredBooks = useMemo(() => {
    return books.filter(book => {
      if (filterType !== 'all' && book.type !== filterType) return false
      if (book.rating < filterRating[0] || book.rating > filterRating[1]) return false
      if (searchKeyword) {
        const keyword = searchKeyword.toLowerCase()
        return (
          book.title.toLowerCase().includes(keyword) ||
          book.author.toLowerCase().includes(keyword) ||
          book.note.toLowerCase().includes(keyword)
        )
      }
      return true
    })
  }, [books, searchKeyword, filterType, filterRating])

  const booksByStatus = useMemo(() => {
    return {
      wishlist: filteredBooks.filter(book => book.status === 'wishlist'),
      reading: filteredBooks.filter(book => book.status === 'reading'),
      finished: filteredBooks.filter(book => book.status === 'finished'),
    }
  }, [filteredBooks])

  const stats = useMemo(() => {
    const total = books.length
    const finishedBooks = books.filter(b => b.status === 'finished' && b.rating > 0)
    const avgRating = finishedBooks.length > 0
      ? finishedBooks.reduce((sum, b) => sum + b.rating, 0) / finishedBooks.length
      : 0

    const now = new Date()
    const thisMonth = now.getMonth()
    const thisYear = now.getFullYear()
    const thisMonthAdded = books.filter(
      b => b.createdAt.getMonth() === thisMonth && b.createdAt.getFullYear() === thisYear
    ).length

    const last7Days: { date: string; count: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      date.setHours(0, 0, 0, 0)
      const nextDate = new Date(date)
      nextDate.setDate(nextDate.getDate() + 1)
      const count = books.filter(
        b => b.createdAt >= date && b.createdAt < nextDate
      ).length
      last7Days.push({
        date: date.toLocaleDateString('zh-CN', { weekday: 'short' }),
        count,
      })
    }

    return {
      total,
      avgRating,
      thisMonthAdded,
      last7Days,
      wishlistCount: books.filter(b => b.status === 'wishlist').length,
      readingCount: books.filter(b => b.status === 'reading').length,
      finishedCount: books.filter(b => b.status === 'finished').length,
    }
  }, [books])

  return {
    books: filteredBooks,
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
    updateBook,
  }
}
