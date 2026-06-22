import express from 'express'
import cors from 'cors'
import { getPresetStars, calcStarParams, IStarInputParams, IStarParams } from '../data/starData'

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

app.get('/api/stars', (_req, res) => {
  try {
    const stars = getPresetStars()
    res.json(stars)
  } catch (error) {
    res.status(500).json({ error: '获取恒星预设列表失败' })
  }
})

app.post('/api/star/params', (req, res) => {
  try {
    const { mass, temp, age } = req.body as IStarInputParams

    if (mass === undefined || temp === undefined || age === undefined) {
      return res.status(400).json({ error: '缺少必要参数：mass, temp, age' })
    }

    const result = calcStarParams(mass, temp, age)

    if ('error' in result) {
      return res.status(400).json({ error: result.error })
    }

    res.json(result as IStarParams)
  } catch (error) {
    res.status(500).json({ error: '计算恒星参数时发生错误' })
  }
})

app.listen(PORT, () => {
  console.log(`恒星模拟后端服务运行在 http://localhost:${PORT}`)
})
