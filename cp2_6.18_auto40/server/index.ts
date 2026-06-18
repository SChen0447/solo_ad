import express, { Request, Response } from 'express'
import cors from 'cors'
import {
  getAllQuotes,
  getQuotesByStatus,
  getQuoteById,
  createQuote,
  updateQuoteStatus,
  QuoteStatus,
  seedMockData,
  QuoteItem
} from './data'

const app = express()
const PORT = 3000

app.use(cors())
app.use(express.json())

seedMockData()

app.get('/api/quotes', (req: Request, res: Response) => {
  try {
    const { status } = req.query
    let quotes
    if (status && Object.values(QuoteStatus).includes(status as QuoteStatus)) {
      quotes = getQuotesByStatus(status as QuoteStatus)
    } else {
      quotes = getAllQuotes()
    }
    res.json(quotes)
  } catch (error) {
    res.status(500).json({ error: '获取报价列表失败' })
  }
})

app.get('/api/quotes/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const quote = getQuoteById(id)
    if (!quote) {
      res.status(404).json({ error: '报价单不存在' })
      return
    }
    res.json(quote)
  } catch (error) {
    res.status(500).json({ error: '获取报价详情失败' })
  }
})

interface CreateQuoteBody {
  customerName: string
  items: Omit<QuoteItem, 'id'>[]
}

app.post('/api/quotes', (req: Request, res: Response) => {
  try {
    const { customerName, items }: CreateQuoteBody = req.body
    if (!customerName || !items || items.length === 0) {
      res.status(400).json({ error: '客户名称和商品条目不能为空' })
      return
    }
    const newQuote = createQuote(customerName, items)
    res.status(201).json(newQuote)
  } catch (error) {
    res.status(500).json({ error: '创建报价单失败' })
  }
})

interface UpdateStatusBody {
  status: QuoteStatus
}

app.patch('/api/quotes/:id/status', (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { status }: UpdateStatusBody = req.body

    if (!Object.values(QuoteStatus).includes(status)) {
      res.status(400).json({ error: '无效的状态值' })
      return
    }

    const updatedQuote = updateQuoteStatus(id, status)
    if (!updatedQuote) {
      res.status(404).json({ error: '报价单不存在' })
      return
    }
    res.json(updatedQuote)
  } catch (error) {
    res.status(500).json({ error: '更新状态失败' })
  }
})

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`)
})
