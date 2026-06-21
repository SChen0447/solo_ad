import { Router, Request, Response } from 'express'
import { db, Scent } from './db'

const router = Router()

router.get('/formulas', (_req: Request, res: Response) => {
  res.json(db.getAllFormulas())
})

router.get('/formulas/:id', (req: Request, res: Response) => {
  const formula = db.getFormulaById(req.params.id)
  if (!formula) {
    res.status(404).json({ error: '配方不存在' })
    return
  }
  res.json(formula)
})

router.post('/formulas', (req: Request, res: Response) => {
  const { name, authorId, authorName, authorAvatar, scents } = req.body
  if (!name || !scents || !Array.isArray(scents)) {
    res.status(400).json({ error: '缺少必要字段' })
    return
  }
  const formula = db.createFormula({
    name,
    authorId: authorId || 'guest',
    authorName: authorName || '匿名用户',
    authorAvatar: authorAvatar || '👤',
    scents: scents as Scent[],
  })
  res.status(201).json(formula)
})

router.put('/formulas/:id', (req: Request, res: Response) => {
  const updated = db.updateFormula(req.params.id, req.body)
  if (!updated) {
    res.status(404).json({ error: '配方不存在' })
    return
  }
  res.json(updated)
})

router.delete('/formulas/:id', (req: Request, res: Response) => {
  const ok = db.deleteFormula(req.params.id)
  if (!ok) {
    res.status(404).json({ error: '配方不存在' })
    return
  }
  res.json({ success: true })
})

router.get('/posts', (_req: Request, res: Response) => {
  res.json(db.getAllPosts())
})

router.get('/posts/:id', (req: Request, res: Response) => {
  const post = db.getPostById(req.params.id)
  if (!post) {
    res.status(404).json({ error: '帖子不存在' })
    return
  }
  res.json(post)
})

router.post('/posts', (req: Request, res: Response) => {
  const { formulaId, formula, title, description, authorId, authorName, authorAvatar } = req.body
  if (!formulaId || !formula || !title) {
    res.status(400).json({ error: '缺少必要字段' })
    return
  }
  const post = db.createPost({
    formulaId,
    formula,
    title,
    description: description || '',
    authorId: authorId || 'guest',
    authorName: authorName || '匿名用户',
    authorAvatar: authorAvatar || '👤',
  })
  res.status(201).json(post)
})

router.post('/posts/:id/like', (req: Request, res: Response) => {
  const { userId } = req.body
  const post = db.toggleLikePost(req.params.id, userId || 'guest')
  if (!post) {
    res.status(404).json({ error: '帖子不存在' })
    return
  }
  res.json(post)
})

router.post('/posts/:id/comments', (req: Request, res: Response) => {
  const { authorId, authorName, content } = req.body
  if (!content) {
    res.status(400).json({ error: '评论内容不能为空' })
    return
  }
  const post = db.addComment(req.params.id, {
    authorId: authorId || 'guest',
    authorName: authorName || '匿名用户',
    content,
  })
  if (!post) {
    res.status(404).json({ error: '帖子不存在' })
    return
  }
  res.json(post)
})

router.delete('/posts/:id', (req: Request, res: Response) => {
  const ok = db.deletePost(req.params.id)
  if (!ok) {
    res.status(404).json({ error: '帖子不存在' })
    return
  }
  res.json({ success: true })
})

export default router
