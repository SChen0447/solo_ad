import { Router, Request, Response } from 'express'
import { addItem, getItems } from '../store'
import type { Item, ItemCategory } from '../store'

const router = Router()

router.post('/', (req: Request, res: Response) => {
  try {
    const itemData = req.body as Omit<Item, 'id' | 'createdAt'>

    if (!itemData.title || !itemData.category || !itemData.description) {
      return res.status(400).json({ error: '缺少必要字段' })
    }

    const validCategories: ItemCategory[] = ['electronics', 'books', 'home', 'clothing', 'other']
    if (!validCategories.includes(itemData.category as ItemCategory)) {
      return res.status(400).json({ error: '无效的物品类别' })
    }

    if (itemData.condition < 1 || itemData.condition > 5) {
      return res.status(400).json({ error: '新旧程度必须在1-5之间' })
    }

    const newItem = addItem(itemData)
    res.status(201).json(newItem)
  } catch (error) {
    console.error('Error adding item:', error)
    res.status(500).json({ error: '服务器内部错误' })
  }
})

router.get('/', (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 12
    const search = req.query.search as string
    const category = req.query.category as string

    const result = getItems({ page, limit, search, category })

    setTimeout(() => {
      res.json(result)
    }, 100)
  } catch (error) {
    console.error('Error getting items:', error)
    res.status(500).json({ error: '服务器内部错误' })
  }
})

export default router
