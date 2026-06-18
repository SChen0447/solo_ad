import { Router, Request, Response } from 'express'
import { addExchangeRequest, getRecommendations, updateUserCredit } from '../store'
import type { ExchangeRequest } from '../store'

const router = Router()

router.post('/request', (req: Request, res: Response) => {
  try {
    const requestData = req.body as Omit<ExchangeRequest, 'id' | 'status' | 'createdAt'>

    if (!requestData.fromUserId || !requestData.toUserId || !requestData.fromItemId || !requestData.toItemId) {
      return res.status(400).json({ error: '缺少必要字段' })
    }

    if (!requestData.reason || requestData.reason.trim().length < 5) {
      return res.status(400).json({ error: '请填写交换理由（至少5个字符）' })
    }

    if (!requestData.contactTime) {
      return res.status(400).json({ error: '请选择期望