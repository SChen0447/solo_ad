import express from 'express'
import cors from 'cors'
import { v4 as uuidv4 } from 'uuid'

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

let plants = [
  {
    id: '1',
    name: '生菜',
    category: 'leaf',
    maturityDays: 45,
    waterFrequency: 2,
    fertilizeFrequency: 10,
    imageUrl: 'https://images.unsplash.com/photo-1622205313172-8c1fedd55070?w=400',
  },
  {
    id: '2',
    name: '番茄',
    category: 'fruit',
    maturityDays: 90,
    waterFrequency: 3,
    fertilizeFrequency: 14,
    imageUrl: 'https://images.unsplash.com/photo-1592841200221-a6898f307baa?w=400',
  },
  {
    id: '3',
    name: '胡萝卜',
    category: 'root',
    maturityDays: 70,
    waterFrequency: 4,
    fertilizeFrequency: 20,
    imageUrl: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=400',
  },
]

let plans = [
  {
    id: 'p1',
    plantId: '1',
    plantName: '生菜',
    category: 'leaf',
    maturityDays: 45,
    waterFrequency: 2,
    fertilizeFrequency: 10,
    sowDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    potCount: 3,
    completedTasks: [],
  },
]

let growthRecords = [
  {
    id: 'g1',
    planId: 'p1',
    date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    photoUrl: 'https://images.unsplash.com/photo-1622205313172-8c1fedd55070?w=300',
    height: 5,
    leafCount: 4,
    notes: '刚发芽，状态良好',
  },
  {
    id: 'g2',
    planId: 'p1',
    date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    photoUrl: 'https://images.unsplash.com/photo-1622205313172-8c1fedd55070?w=300',
    height: 10,
    leafCount: 8,
    notes: '生长迅速，叶片翠绿',
  },
  {
    id: 'g3',
    planId: 'p1',
    date: new Date().toISOString().split('T')[0],
    photoUrl: 'https://images.unsplash.com/photo-1622205313172-8c1fedd55070?w=300',
    height: 15,
    leafCount: 12,
    notes: '继续稳定生长',
  },
]

app.get('/api/plants', (req, res) => {
  res.json(plants)
})

app.post('/api/plants', (req, res) => {
  const plant = {
    id: uuidv4(),
    ...req.body,
  }
  plants.push(plant)
  res.status(201).json(plant)
})

app.get('/api/plants/:id', (req, res) => {
  const plant = plants.find((p) => p.id === req.params.id)
  if (!plant) {
    return res.status(404).json({ error: 'Plant not found' })
  }
  res.json(plant)
})

app.put('/api/plants/:id', (req, res) => {
  const index = plants.findIndex((p) => p.id === req.params.id)
  if (index === -1) {
    return res.status(404).json({ error: 'Plant not found' })
  }
  plants[index] = { ...plants[index], ...req.body }
  res.json(plants[index])
})

app.delete('/api/plants/:id', (req, res) => {
  const index = plants.findIndex((p) => p.id === req.params.id)
  if (index === -1) {
    return res.status(404).json({ error: 'Plant not found' })
  }
  plants.splice(index, 1)
  res.json({ success: true })
})

app.get('/api/plans', (req, res) => {
  res.json(plans)
})

app.post('/api/plans', (req, res) => {
  const plan = {
    id: uuidv4(),
    completedTasks: [],
    ...req.body,
  }
  plans.push(plan)
  res.status(201).json(plan)
})

app.get('/api/plans/:id', (req, res) => {
  const plan = plans.find((p) => p.id === req.params.id)
  if (!plan) {
    return res.status(404).json({ error: 'Plan not found' })
  }
  res.json(plan)
})

app.put('/api/plans/:id', (req, res) => {
  const index = plans.findIndex((p) => p.id === req.params.id)
  if (index === -1) {
    return res.status(404).json({ error: 'Plan not found' })
  }
  plans[index] = { ...plans[index], ...req.body }
  res.json(plans[index])
})

app.delete('/api/plans/:id', (req, res) => {
  const index = plans.findIndex((p) => p.id === req.params.id)
  if (index === -1) {
    return res.status(404).json({ error: 'Plan not found' })
  }
  plans.splice(index, 1)
  res.json({ success: true })
})

app.get('/api/records', (req, res) => {
  const { planId } = req.query
  if (planId) {
    const filtered = growthRecords.filter((r) => r.planId === planId)
    return res.json(filtered)
  }
  res.json(growthRecords)
})

app.post('/api/records', (req, res) => {
  const record = {
    id: uuidv4(),
    ...req.body,
  }
  growthRecords.push(record)
  res.status(201).json(record)
})

app.delete('/api/records/:id', (req, res) => {
  const index = growthRecords.findIndex((r) => r.id === req.params.id)
  if (index === -1) {
    return res.status(404).json({ error: 'Record not found' })
  }
  growthRecords.splice(index, 1)
  res.json({ success: true })
})

app.listen(PORT, () => {
  console.log(`GardenPlan server running on port ${PORT}`)
})
