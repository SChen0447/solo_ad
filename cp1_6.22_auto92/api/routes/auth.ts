import { Router, type Request, type Response } from 'express'
import { store } from '../store.js'

const router = Router()

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { password } = req.body
  if (password === store.adminPassword) {
    res.json({ success: true, token: store.authToken })
  } else {
    res.status(401).json({ success: false, error: '密码错误' })
  }
})

router.post('/verify', async (req: Request, res: Response): Promise<void> => {
  const { token } = req.body
  if (token === store.authToken) {
    res.json({ success: true })
  } else {
    res.status(401).json({ success: false, error: '无效令牌' })
  }
})

export default router
