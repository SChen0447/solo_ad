import { Router, type Request, type Response } from 'express'
import {
  getAllWorkshops,
  getWorkshopById,
  createWorkshop,
  updateWorkshop,
  registerForWorkshop,
  getRegistrationByCode,
  getHistoryByContact,
  sendFeedback,
  submitFeedback,
} from '../services/workshopService.js'

const router = Router()

router.get('/workshops', async (req: Request, res: Response): Promise<void> => {
  try {
    const workshops = await getAllWorkshops()
    res.json({ success: true, data: workshops })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取工坊列表失败' })
  }
})

router.get('/workshops/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const workshop = await getWorkshopById(req.params.id)
    if (!workshop) {
      res.status(404).json({ success: false, error: '工坊不存在' })
      return
    }
    res.json({ success: true, data: workshop })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取工坊详情失败' })
  }
})

router.post('/workshops', async (req: Request, res: Response): Promise<void> => {
  try {
    const workshop = await createWorkshop(req.body)
    res.status(201).json({ success: true, data: workshop })
  } catch (error) {
    res.status(500).json({ success: false, error: '创建工坊失败' })
  }
})

router.put('/workshops/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const workshop = await updateWorkshop(req.params.id, req.body)
    if (!workshop) {
      res.status(404).json({ success: false, error: '工坊不存在' })
      return
    }
    res.json({ success: true, data: workshop })
  } catch (error) {
    res.status(500).json({ success: false, error: '更新工坊失败' })
  }
})

router.post('/workshops/:id/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { participantCount, materialKitOrders, participants } = req.body
    const result = await registerForWorkshop(
      req.params.id,
      participantCount,
      materialKitOrders,
      participants
    )
    if (!result.success) {
      res.status(400).json({ success: false, error: result.error })
      return
    }
    res.status(201).json({ success: true, confirmationCode: result.confirmationCode })
  } catch (error) {
    res.status(500).json({ success: false, error: '报名失败' })
  }
})

router.get('/registrations/:code', async (req: Request, res: Response): Promise<void> => {
  try {
    const registration = await getRegistrationByCode(req.params.code)
    if (!registration) {
      res.status(404).json({ success: false, error: '报名记录不存在' })
      return
    }
    res.json({ success: true, data: registration })
  } catch (error) {
    res.status(500).json({ success: false, error: '查询报名记录失败' })
  }
})

router.get('/history', async (req: Request, res: Response): Promise<void> => {
  try {
    const contact = req.query.contact as string
    if (!contact) {
      res.status(400).json({ success: false, error: '请提供联系方式' })
      return
    }
    const history = await getHistoryByContact(contact)
    res.json({ success: true, data: history })
  } catch (error) {
    res.status(500).json({ success: false, error: '查询历史记录失败' })
  }
})

router.post('/workshops/:id/feedback', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await sendFeedback(req.params.id)
    res.json({ success: true, sentCount: result.sentCount })
  } catch (error) {
    res.status(500).json({ success: false, error: '发送反馈邀请失败' })
  }
})

router.post('/feedback', async (req: Request, res: Response): Promise<void> => {
  try {
    const feedback = await submitFeedback(req.body)
    res.status(201).json({ success: true, data: feedback })
  } catch (error) {
    res.status(500).json({ success: false, error: '提交反馈失败' })
  }
})

export default router
