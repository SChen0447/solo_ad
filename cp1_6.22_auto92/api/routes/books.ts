import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { store } from '../store.js'
import type { Book, BookCategory } from '../store.js'

const categoryColors: Record<BookCategory, string> = {
  '文学': '#3182ce',
  '科技': '#38a169',
  '历史': '#dd6b20',
  '艺术': '#805ad5',
  '生活': '#d53f8c',
}

router.get('/', (req: Request, res: Response): void => {
  let books = [...store.books]
  const { category, status } = req.query
  if (category && category !== '全部') {
    books = books.filter(b => b.category === category)
  }
  if (status) {
    books = books.filter(b => b.status === status)
  }
  res.json(books)
})

router.get('/search', (req: Request, res: Response): void => {
  const q = (req.query.q as string || '').toLowerCase().trim()
  if (!q) {
    res.json([])
    return
  }
  const results = store.books.filter(b =>
    b.title.toLowerCase().includes(q) ||
    b.author.toLowerCase().includes(q) ||
    b.isbn.includes(q)
  )
  res.json(results)
})

router.get('/popular', (_req: Request, res: Response): void => {
  const popular = [...store.books]
    .sort((a, b) => b.borrowCount - a.borrowCount)
    .slice(0, 5)
  res.json(popular)
})

router.get('/:id', (req: Request, res: Response): void => {
  const book = store.books.find(b => b.id === req.params.id)
  if (!book) {
    res.status(404).json({ error: '书籍未找到' })
    return
  }
  res.json(book)
})

router.post('/', (req: Request, res: Response): void => {
  const { title, author, isbn, category, description } = req.body
  if (!title || !author || !isbn || !category) {
    res.status(400).json({ error: '缺少必填字段' })
    return
  }
  const newBook: Book = {
    id: uuidv4(),
    title,
    author,
    isbn,
    category,
    description: description || '',
    status: 'available',
    borrowCount: 0,
    lastBorrower: '',
    coverColor: categoryColors[category as BookCategory] || '#718096',
  }
  store.books.push(newBook)
  res.status(201).json(newBook)
})

router.patch('/:id/status', (req: Request, res: Response): void => {
  const book = store.books.find(b => b.id === req.params.id)
  if (!book) {
    res.status(404).json({ error: '书籍未找到' })
    return
  }
  const { status, borrower } = req.body
  if (!['available', 'borrowed'].includes(status)) {
    res.status(400).json({ error: '无效状态' })
    return
  }
  book.status = status
  if (status === 'borrowed' && borrower) {
    book.borrowCount += 1
    book.lastBorrower = borrower
  }
  res.json(book)
})

router.get('/:id/reviews', (req: Request, res: Response): void => {
  const reviews = store.reviews
    .filter(r => r.bookId === req.params.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5)
  res.json(reviews)
})

export default Router().use('/books', router)
