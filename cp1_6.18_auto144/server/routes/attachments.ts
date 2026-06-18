import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { experiments, TextAttachment, ImageAttachment, Attachment } from './experiments.js'

const router = Router()

router.post('/text/:experimentId', (req, res) => {
  const { experimentId } = req.params
  const { title, content } = req.body
  const experiment = experiments.find(exp => exp.id === experimentId)
  if (!experiment) {
    res.status(404).json({ error: '实验不存在' })
    return
  }
  const now = new Date().toISOString()
  const newAttachment: TextAttachment = {
    id: `att-${uuidv4()}`,
    type: 'text',
    title: title || '文本结果',
    content: content || '',
    annotations: [],
    createdAt: now
  }
  experiment.attachments.push(newAttachment)
  experiment.timeline.push({
    id: `tl-${uuidv4()}`,
    type: 'upload',
    userId: experiment.creator.id,
    userName: experiment.creator.name,
    userAvatar: experiment.creator.avatar,
    description: `上传了文本结果：${title || '文本结果'}`,
    createdAt: now
  })
  experiment.updatedAt = now
  res.status(201).json(newAttachment)
})

router.post('/image/:experimentId', (req, res) => {
  const { experimentId } = req.params
  const { filename, url, thumbnail, width, height } = req.body
  const experiment = experiments.find(exp => exp.id === experimentId)
  if (!experiment) {
    res.status(404).json({ error: '实验不存在' })
    return
  }
  const now = new Date().toISOString()
  const newAttachment: ImageAttachment = {
    id: `att-${uuidv4()}`,
    type: 'image',
    filename: filename || 'image.jpg',
    url: url || '',
    thumbnail: thumbnail || url || '',
    width: width || 800,
    height: height || 600,
    createdAt: now
  }
  experiment.attachments.push(newAttachment)
  experiment.timeline.push({
    id: `tl-${uuidv4()}`,
    type: 'upload',
    userId: experiment.creator.id,
    userName: experiment.creator.name,
    userAvatar: experiment.creator.avatar,
    description: `上传了图片：${filename || 'image.jpg'}`,
    createdAt: now
  })
  experiment.updatedAt = now
  res.status(201).json(newAttachment)
})

router.post('/:attachmentId/annotations', (req, res) => {
  const { attachmentId } = req.params
  const { content, lineIndex, userName, userAvatar } = req.body
  let found = false
  for (const exp of experiments) {
    const att = exp.attachments.find(a => a.id === attachmentId)
    if (att && att.type === 'text') {
      const now = new Date().toISOString()
      const annotation = {
        id: `ann-${uuidv4()}`,
        userId: 'user-1',
        userName: userName || '当前用户',
        userAvatar: userAvatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=current',
        content,
        lineIndex,
        createdAt: now
      }
      att.annotations.push(annotation)
      exp.updatedAt = now
      res.status(201).json(annotation)
      found = true
      break
    }
  }
  if (!found) {
    res.status(404).json({ error: '附件不存在' })
  }
})

router.delete('/:attachmentId', (req, res) => {
  const { attachmentId } = req.params
  let found = false
  for (const exp of experiments) {
    const index = exp.attachments.findIndex(a => a.id === attachmentId)
    if (index !== -1) {
      exp.attachments.splice(index, 1)
      exp.updatedAt = new Date().toISOString()
      res.json({ success: true })
      found = true
      break
    }
  }
  if (!found) {
    res.status(404).json({ error: '附件不存在' })
  }
})

export default router
