import express from 'express'
import cors from 'cors'
import experimentsRouter from './routes/experiments.js'
import attachmentsRouter from './routes/attachments.js'

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.use('/api/experiments', experimentsRouter)
app.use('/api/attachments', attachmentsRouter)

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: '实验笔记服务运行正常' })
})

app.listen(PORT, () => {
  console.log(`服务已启动: http://localhost:${PORT}`)
})
