import express from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { addDays, format, isAfter, isBefore, startOfDay, differenceInDays } from 'date-fns'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = 3001
const DATA_DIR = path.join(__dirname, 'data')
const PLANTS_FILE = path.join(DATA_DIR, 'plants.json')
const TASKS_FILE = path.join(DATA_DIR, 'tasks.json')

app.use(cors())
app.use(bodyParser.json())

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

const readJSONFile = (filePath) => {
  if (!fs.existsSync(filePath)) {
    return []
  }
  try {
    const data = fs.readFileSync(filePath, 'utf8')
    return JSON.parse(data)
  } catch {
    return []
  }
}

const writeJSONFile = (filePath, data) => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8')
}

const generateTasksForPlant = (plant, existingTasks = []) => {
  const tasks = []
  const today = startOfDay(new Date())
  const futureLimit = addDays(today, 30)

  const plantExistingTasks = existingTasks.filter(t => t.plantId === plant.id)

  if (plant.waterFrequency > 0) {
    let nextWaterDate = plant.lastWatered ? addDays(startOfDay(new Date(plant.lastWatered)), plant.waterFrequency) : today
    while (isBefore(nextWaterDate, futureLimit) || nextWaterDate.getTime() === futureLimit.getTime()) {
      const existingTask = plantExistingTasks.find(
        t => t.type === 'water' && format(new Date(t.date), 'yyyy-MM-dd') === format(nextWaterDate, 'yyyy-MM-dd')
      )
      if (!existingTask) {
        tasks.push({
          id: uuidv4(),
          plantId: plant.id,
          plantName: plant.name,
          type: 'water',
          typeLabel: '浇水',
          date: format(nextWaterDate, 'yyyy-MM-dd'),
          completed: false,
          note: '',
          createdAt: new Date().toISOString()
        })
      }
      nextWaterDate = addDays(nextWaterDate, plant.waterFrequency)
    }
  }

  if (plant.fertilizeFrequency > 0) {
    let nextFertilizeDate = plant.lastFertilized ? addDays(startOfDay(new Date(plant.lastFertilized)), plant.fertilizeFrequency) : today
    while (isBefore(nextFertilizeDate, futureLimit) || nextFertilizeDate.getTime() === futureLimit.getTime()) {
      const existingTask = plantExistingTasks.find(
        t => t.type === 'fertilize' && format(new Date(t.date), 'yyyy-MM-dd') === format(nextFertilizeDate, 'yyyy-MM-dd')
      )
      if (!existingTask) {
        tasks.push({
          id: uuidv4(),
          plantId: plant.id,
          plantName: plant.name,
          type: 'fertilize',
          typeLabel: '施肥',
          date: format(nextFertilizeDate, 'yyyy-MM-dd'),
          completed: false,
          note: '',
          createdAt: new Date().toISOString()
        })
      }
      nextFertilizeDate = addDays(nextFertilizeDate, plant.fertilizeFrequency)
    }
  }

  if (plant.repotDate) {
    const repotDate = startOfDay(new Date(plant.repotDate))
    if (isAfter(repotDate, today) || repotDate.getTime() === today.getTime()) {
      const existingTask = plantExistingTasks.find(
        t => t.type === 'repot' && format(new Date(t.date), 'yyyy-MM-dd') === format(repotDate, 'yyyy-MM-dd')
      )
      if (!existingTask) {
        tasks.push({
          id: uuidv4(),
          plantId: plant.id,
          plantName: plant.name,
          type: 'repot',
          typeLabel: '换盆',
          date: format(repotDate, 'yyyy-MM-dd'),
          completed: false,
          note: '',
          createdAt: new Date().toISOString()
        })
      }
    }
  }

  return tasks
}

const updatePlantLastCareDates = (plant, task) => {
  const updatedPlant = { ...plant }
  if (task.type === 'water' && task.completed) {
    updatedPlant.lastWatered = task.date
  } else if (task.type === 'fertilize' && task.completed) {
    updatedPlant.lastFertilized = task.date
  } else if (task.type === 'repot' && task.completed) {
    updatedPlant.lastRepotted = task.date
  }
  return updatedPlant
}

app.get('/plants', (req, res) => {
  const plants = readJSONFile(PLANTS_FILE)
  const plantsWithNextCare = plants.map(plant => {
    const tasks = readJSONFile(TASKS_FILE)
    const plantTasks = tasks.filter(t => t.plantId === plant.id && !t.completed)
    const today = startOfDay(new Date())
    
    let minDays = Infinity
    plantTasks.forEach(task => {
      const taskDate = startOfDay(new Date(task.date))
      const days = differenceInDays(taskDate, today)
      if (days < minDays) {
        minDays = days
      }
    })
    
    return {
      ...plant,
      nextCareDays: minDays === Infinity ? null : minDays
    }
  })
  res.json(plantsWithNextCare)
})

app.post('/plants', (req, res) => {
  const plants = readJSONFile(PLANTS_FILE)
  const tasks = readJSONFile(TASKS_FILE)
  
  const newPlant = {
    id: uuidv4(),
    ...req.body,
    createdAt: new Date().toISOString()
  }
  
  plants.push(newPlant)
  writeJSONFile(PLANTS_FILE, plants)
  
  const newTasks = generateTasksForPlant(newPlant, tasks)
  const updatedTasks = [...tasks, ...newTasks]
  writeJSONFile(TASKS_FILE, updatedTasks)
  
  res.status(201).json(newPlant)
})

app.put('/plants/:id', (req, res) => {
  const plants = readJSONFile(PLANTS_FILE)
  const tasks = readJSONFile(TASKS_FILE)
  const index = plants.findIndex(p => p.id === req.params.id)
  
  if (index === -1) {
    return res.status(404).json({ error: 'Plant not found' })
  }
  
  const updatedPlant = {
    ...plants[index],
    ...req.body,
    updatedAt: new Date().toISOString()
  }
  
  plants[index] = updatedPlant
  
  const filteredTasks = tasks.filter(t => t.plantId !== req.params.id || t.completed)
  const newTasks = generateTasksForPlant(updatedPlant, filteredTasks)
  const updatedTasks = [...filteredTasks, ...newTasks]
  
  writeJSONFile(PLANTS_FILE, plants)
  writeJSONFile(TASKS_FILE, updatedTasks)
  
  res.json(updatedPlant)
})

app.delete('/plants/:id', (req, res) => {
  let plants = readJSONFile(PLANTS_FILE)
  let tasks = readJSONFile(TASKS_FILE)
  
  plants = plants.filter(p => p.id !== req.params.id)
  tasks = tasks.filter(t => t.plantId !== req.params.id)
  
  writeJSONFile(PLANTS_FILE, plants)
  writeJSONFile(TASKS_FILE, tasks)
  
  res.status(204).send()
})

app.get('/tasks', (req, res) => {
  const tasks = readJSONFile(TASKS_FILE)
  const today = format(new Date(), 'yyyy-MM-dd')
  
  const sortedTasks = tasks.sort((a, b) => {
    if (a.date === b.date) {
      if (a.completed === b.completed) return 0
      return a.completed ? 1 : -1
    }
    return new Date(a.date) - new Date(b.date)
  })
  
  const result = {
    today: sortedTasks.filter(t => t.date === today),
    future: sortedTasks.filter(t => t.date > today),
    history: sortedTasks.filter(t => t.date < today || (t.date === today && t.completed))
  }
  
  res.json(result)
})

app.get('/plants/:id/tasks', (req, res) => {
  const tasks = readJSONFile(TASKS_FILE)
  const plantTasks = tasks.filter(t => t.plantId === req.params.id)
  
  const sortedTasks = plantTasks.sort((a, b) => {
    return new Date(b.date) - new Date(a.date)
  })
  
  res.json(sortedTasks)
})

app.put('/tasks/:id', (req, res) => {
  const tasks = readJSONFile(TASKS_FILE)
  const plants = readJSONFile(PLANTS_FILE)
  const index = tasks.findIndex(t => t.id === req.params.id)
  
  if (index === -1) {
    return res.status(404).json({ error: 'Task not found' })
  }
  
  const wasCompleted = tasks[index].completed
  const updatedTask = {
    ...tasks[index],
    ...req.body,
    updatedAt: new Date().toISOString()
  }
  
  tasks[index] = updatedTask
  
  if (!wasCompleted && updatedTask.completed) {
    const plantIndex = plants.findIndex(p => p.id === updatedTask.plantId)
    if (plantIndex !== -1) {
      plants[plantIndex] = updatePlantLastCareDates(plants[plantIndex], updatedTask)
      
      const newTasks = generateTasksForPlant(plants[plantIndex], tasks)
      const updatedTasks = [...tasks, ...newTasks]
      writeJSONFile(TASKS_FILE, updatedTasks)
      writeJSONFile(PLANTS_FILE, plants)
      
      return res.json(updatedTask)
    }
  }
  
  writeJSONFile(TASKS_FILE, tasks)
  writeJSONFile(PLANTS_FILE, plants)
  
  res.json(updatedTask)
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
