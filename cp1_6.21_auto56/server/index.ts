import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { v4 as uuidv4 } from 'uuid'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DATA_FILE = path.join(__dirname, 'data.json')

interface Property {
  id: string
  name: string
  rent: number
  area: number
  layout: string
  floor: string
  orientation: string
  decoration: string
  metroWalkTime: number
  images: string[]
}

interface Weights {
  rent: number
  area: number
  layout: number
  floor: number
  orientation: number
  decoration: number
  metroWalkTime: number
}

interface ComparisonList {
  id: string
  name: string
  propertyIds: string[]
}

interface DataStore {
  properties: Property[]
  weights: Weights
  comparisonLists: ComparisonList[]
  activeListId: string | null
}

const defaultWeights: Weights = {
  rent: 8,
  area: 7,
  layout: 6,
  floor: 5,
  orientation: 5,
  decoration: 5,
  metroWalkTime: 7,
}

const sampleProperties: Property[] = [
  {
    id: uuidv4(),
    name: '阳光花园A栋',
    rent: 4500,
    area: 55,
    layout: '一居',
    floor: '中层/18层',
    orientation: '南',
    decoration: '精装修',
    metroWalkTime: 8,
    images: [],
  },
  {
    id: uuidv4(),
    name: '翠湖天地B座',
    rent: 5200,
    area: 68,
    layout: '两居',
    floor: '高层/25层',
    orientation: '东南',
    decoration: '豪华装修',
    metroWalkTime: 12,
    images: [],
  },
  {
    id: uuidv4(),
    name: '新城国际C区',
    rent: 3800,
    area: 42,
    layout: '开间',
    floor: '低层/12层',
    orientation: '东',
    decoration: '简装',
    metroWalkTime: 5,
    images: [],
  },
]

function loadData(): DataStore {
  if (!fs.existsSync(DATA_FILE)) {
    const listId = uuidv4()
    const initialData: DataStore = {
      properties: sampleProperties,
      weights: defaultWeights,
      comparisonLists: [
        { id: listId, name: '我的比较列表', propertyIds: sampleProperties.map((p) => p.id) },
      ],
      activeListId: listId,
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2))
    return initialData
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'))
}

function saveData(data: DataStore) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2))
}

const app = express()
const PORT = 3002

app.use(cors())
app.use(express.json({ limit: '10mb' }))

app.get('/api/properties', (req, res) => {
  const data = loadData()
  res.json(data.properties)
})

app.post('/api/properties', (req, res) => {
  const data = loadData()
  const newProperty: Property = {
    id: uuidv4(),
    ...req.body,
    images: req.body.images || [],
  }
  data.properties.push(newProperty)
  if (data.activeListId) {
    const activeList = data.comparisonLists.find((l) => l.id === data.activeListId)
    if (activeList) activeList.propertyIds.push(newProperty.id)
  }
  saveData(data)
  res.status(201).json(newProperty)
})

app.put('/api/properties/:id', (req, res) => {
  const data = loadData()
  const idx = data.properties.findIndex((p) => p.id === req.params.id)
  if (idx === -1) {
    res.status(404).json({ error: '房源不存在' })
    return
  }
  data.properties[idx] = { ...data.properties[idx], ...req.body, id: req.params.id }
  saveData(data)
  res.json(data.properties[idx])
})

app.delete('/api/properties/:id', (req, res) => {
  const data = loadData()
  data.properties = data.properties.filter((p) => p.id !== req.params.id)
  data.comparisonLists.forEach((list) => {
    list.propertyIds = list.propertyIds.filter((id) => id !== req.params.id)
  })
  saveData(data)
  res.status(204).send()
})

app.get('/api/weights', (req, res) => {
  const data = loadData()
  res.json(data.weights)
})

app.put('/api/weights', (req, res) => {
  const data = loadData()
  data.weights = { ...data.weights, ...req.body }
  saveData(data)
  res.json(data.weights)
})

app.get('/api/comparison-lists', (req, res) => {
  const data = loadData()
  res.json(data.comparisonLists)
})

app.post('/api/comparison-lists', (req, res) => {
  const data = loadData()
  const newList: ComparisonList = {
    id: uuidv4(),
    name: req.body.name || '新比较列表',
    propertyIds: req.body.propertyIds || [],
  }
  data.comparisonLists.push(newList)
  data.activeListId = newList.id
  saveData(data)
  res.status(201).json(newList)
})

app.put('/api/comparison-lists/:id', (req, res) => {
  const data = loadData()
  const idx = data.comparisonLists.findIndex((l) => l.id === req.params.id)
  if (idx === -1) {
    res.status(404).json({ error: '列表不存在' })
    return
  }
  data.comparisonLists[idx] = { ...data.comparisonLists[idx], ...req.body }
  saveData(data)
  res.json(data.comparisonLists[idx])
})

app.delete('/api/comparison-lists/:id', (req, res) => {
  const data = loadData()
  data.comparisonLists = data.comparisonLists.filter((l) => l.id !== req.params.id)
  if (data.activeListId === req.params.id) {
    data.activeListId = data.comparisonLists[0]?.id || null
  }
  saveData(data)
  res.status(204).send()
})

app.get('/api/active-list', (req, res) => {
  const data = loadData()
  if (!data.activeListId) {
    res.json(null)
    return
  }
  const activeList = data.comparisonLists.find((l) => l.id === data.activeListId)
  if (!activeList) {
    res.json(null)
    return
  }
  const properties = data.properties.filter((p) => activeList.propertyIds.includes(p.id))
  res.json({ ...activeList, properties })
})

app.put('/api/active-list/:id', (req, res) => {
  const data = loadData()
  const list = data.comparisonLists.find((l) => l.id === req.params.id)
  if (!list) {
    res.status(404).json({ error: '列表不存在' })
    return
  }
  data.activeListId = req.params.id
  saveData(data)
  const properties = data.properties.filter((p) => list.propertyIds.includes(p.id))
  res.json({ ...list, properties })
})

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`)
})
