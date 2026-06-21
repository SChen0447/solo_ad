import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { store } from '../store.js'
import type { BorrowRecord } from '../store.js'

const router = Router()

router.get('/:bookId', (req: Request, res: Response): void => {
  const records = store.borrowRecords
    .filter(r => r.bookId === req.params.bookId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  res.json(records)
})

router.post('/borrow', (req: Request, res: Response): void => {
  const { bookId, borrower } = req.body
  if (!bookId || !borrower) {
    res.status(400).json({ error: '缺少必填字段' })
    return
  }
  const book = store.books.find(b => b.id === bookId)
  if (!book) {
    res.status(404).json({ error: '书籍未找到' })
    return
  }
  if (book.status === 'borrowed') {
    res.status(400).json({ error: '书籍已被借出' })
    return
  }
  const record: BorrowRecord = {
    id: uuidv4(),
    bookId,
    borrower,
    type: 'borrow',
    date: new Date().toISOString().split('T')[0],
  }
  store.borrowRecords.push(record)
  book.status = 'borrowed'
  book.borrowCount += 1
  book.lastBorrower = borrower
  res.status(201).json(record)
})

router.post('/return', (req: Request, res: Response): void => {
  const { bookId } = req.body
  if (!bookId) {
    res.status(400).json({ error: '缺少必填字段' })
    return
  }
  const book = store.books.find(b => b.id === bookId)
  if (!book) {
    res.status(404).json({ error: '书籍未找到' })
    return
  }
  if (book.status === 'available') {
    res.status(400).json({ error: '书籍已在馆内' })
    return
  }
  const record: BorrowRecord = {
    id: uuidv4(),
    bookId,
    borrower: book.lastBorrower,
    type: 'return',
    date: new Date().toISOString().split('T')[0],
  }
  store.borrowRecords.push(record)
  book.status = 'available'
  res.status(201).json(record)
})

export default Router().use('/borrows', router)
