import express from 'express'
import apiRouter from './api'

const app = express()
const PORT = 3001

app.use(express.json())

app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type')
  next()
})

app.use('/api', apiRouter)

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: Date.now() })
})

app.listen(PORT, () => {
  console.log(`[server] API server running at http://localhost:${PORT}`)
})
