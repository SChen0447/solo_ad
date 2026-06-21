import express from 'express'
import cors from 'cors'
import inventoryRoutes from './inventory/inventoryRoutes'

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

app.use('/api', inventoryRoutes)

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() })
})

app.listen(PORT, () => {
  console.log(`🌱 Plant Breeding Server running on http://localhost:${PORT}`)
  console.log(`   API base: http://localhost:${PORT}/api`)
})
