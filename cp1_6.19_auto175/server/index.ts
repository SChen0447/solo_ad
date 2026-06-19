import express from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import {
  getAllRetrospectives,
  getRetrospectiveById,
  createRetrospective,
  updateRetrospective,
  deleteRetrospective,
  addScore,
  addReflection,
  deleteReflection,
  getAllKeywords,
  getRetrospectiveKeywords,
} from './data.ts'

const app = express()
const PORT = 3001

app.use(cors())
app.use(bodyParser.json())

app.get('/api/retrospectives', (_req, res) => {
  const retros = getAllRetrospectives()
  res.json(retros)
})

app.get('/api/retrospectives/:id', (req, res) => {
  const retro = getRetrospectiveById(req.params.id)
  if (retro) {
    res.json(retro)
  } else {
    res.status(404).json({ error: 'Retrospective not found' })
  }
})

app.post('/api/retrospectives', (req, res) => {
  const { projectName, phases, date } = req.body
  if (!projectName || !phases || !date) {
    return res.status(400).json({ error: 'Missing required fields' })
  }
  const newRetro = createRetrospective({ projectName, phases, date })
  res.status(201).json(newRetro)
})

app.put('/api/retrospectives/:id', (req, res) => {
  const updated = updateRetrospective(req.params.id, req.body)
  if (updated) {
    res.json(updated)
  } else {
    res.status(404).json({ error: 'Retrospective not found' })
  }
})

app.delete('/api/retrospectives/:id', (req, res) => {
  const deleted = deleteRetrospective(req.params.id)
  if (deleted) {
    res.json({ success: true })
  } else {
    res.status(404).json({ error: 'Retrospective not found' })
  }
})

app.post('/api/retrospectives/:id/scores', (req, res) => {
  const { phase, score } = req.body
  if (!phase || score === undefined) {
    return res.status(400).json({ error: 'Missing phase or score' })
  }
  if (score < 1 || score > 10) {
    return res.status(400).json({ error: 'Score must be between 1 and 10' })
  }
  const newScore = addScore(req.params.id, phase, score)
  if (newScore) {
    res.json(newScore)
  } else {
    res.status(404).json({ error: 'Retrospective not found' })
  }
})

app.post('/api/retrospectives/:id/reflections', (req, res) => {
  const { content } = req.body
  if (!content || content.length > 200) {
    return res.status(400).json({ error: 'Content must be between 1 and 200 characters' })
  }
  const newReflection = addReflection(req.params.id, content)
  if (newReflection) {
    res.status(201).json(newReflection)
  } else {
    res.status(404).json({ error: 'Retrospective not found' })
  }
})

app.delete('/api/retrospectives/:id/reflections/:reflectionId', (req, res) => {
  const deleted = deleteReflection(req.params.id, req.params.reflectionId)
  if (deleted) {
    res.json({ success: true })
  } else {
    res.status(404).json({ error: 'Reflection not found' })
  }
})

app.get('/api/keywords', (_req, res) => {
  const keywords = getAllKeywords()
  res.json(keywords)
})

app.get('/api/retrospectives/:id/keywords', (req, res) => {
  const keywords = getRetrospectiveKeywords(req.params.id)
  res.json(keywords)
})

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})
