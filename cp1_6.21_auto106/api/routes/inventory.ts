import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { readJSONFile, writeJSONFile } from '../utils/fileStorage.js'
import type { InventoryItem } from '../../shared/types.js'

const router = Router()
const INVENTORY_FILE = 'inventory.json'

router.get('/', (_req: Request, res: Response) => {
  try {
    const items = readJSONFile<InventoryItem[]>(INVENTORY_FILE)
    res.json(items)
  } catch (error) {
    res.status(500).json({ success: false, error: '读取库存数据失败' })
  }
})

router.post('/', (req: Request, res: Response) => {
  try {
    const { name, category, quantity, unit, purchaseDate, expiryDate } = req.body

    if (!name || !category || quantity == null || !unit || !purchaseDate || !expiryDate) {
      res.status(400).json({ success: false, error: '缺少必要字段' })
      return
    }

    const items = readJSONFile<InventoryItem[]>(INVENTORY_FILE)
    const newItem: InventoryItem = {
      id: uuidv4(),
      name,
      category,
      quantity: Number(quantity),
      unit,
      purchaseDate,
      expiryDate,
      handled: false,
    }

    items.push(newItem)
    writeJSONFile(INVENTORY_FILE, items)
    res.status(201).json(newItem)
  } catch (error) {
    res.status(500).json({ success: false, error: '添加食材失败' })
  }
})

router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const items = readJSONFile<InventoryItem[]>(INVENTORY_FILE)
    const idx = items.findIndex((item) => item.id === id)

    if (idx === -1) {
      res.status(404).json({ success: false, error: '食材不存在' })
      return
    }

    items[idx] = { ...items[idx], ...req.body, id: items[idx].id }
    writeJSONFile(INVENTORY_FILE, items)
    res.json(items[idx])
  } catch (error) {
    res.status(500).json({ success: false, error: '更新食材失败' })
  }
})

router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const items = readJSONFile<InventoryItem[]>(INVENTORY_FILE)
    const filtered = items.filter((item) => item.id !== id)

    if (filtered.length === items.length) {
      res.status(404).json({ success: false, error: '食材不存在' })
      return
    }

    writeJSONFile(INVENTORY_FILE, filtered)
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ success: false, error: '删除食材失败' })
  }
})

router.put('/:id/handle', (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const items = readJSONFile<InventoryItem[]>(INVENTORY_FILE)
    const idx = items.findIndex((item) => item.id === id)

    if (idx === -1) {
      res.status(404).json({ success: false, error: '食材不存在' })
      return
    }

    items[idx].handled = true
    writeJSONFile(INVENTORY_FILE, items)
    res.json(items[idx])
  } catch (error) {
    res.status(500).json({ success: false, error: '标记处理失败' })
  }
})

export default router
