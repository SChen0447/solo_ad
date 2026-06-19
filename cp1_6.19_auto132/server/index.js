const express = require('express')
const cors = require('cors')
const fs = require('fs')
const path = require('path')

const app = express()
const PORT = 3001
const DATA_DIR = path.join(__dirname, 'data')
const DATA_FILE = path.join(DATA_DIR, 'graph.json')

app.use(cors())
app.use(express.json({ limit: '10mb' }))

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
  if (!fs.existsSync(DATA_FILE)) {
    const defaultData = {
      nodes: [],
      edges: []
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(defaultData, null, 2), 'utf8')
  }
}

function readGraphData() {
  ensureDataDir()
  const raw = fs.readFileSync(DATA_FILE, 'utf8')
  return JSON.parse(raw)
}

function writeGraphData(data) {
  ensureDataDir()
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8')
}

function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

app.get('/api/graph', (req, res) => {
  try {
    const data = readGraphData()
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: 'Failed to read graph data', details: err.message })
  }
})

app.put('/api/graph', (req, res) => {
  try {
    const { nodes, edges } = req.body
    if (!Array.isArray(nodes) || !Array.isArray(edges)) {
      return res.status(400).json({ error: 'Invalid data format: nodes and edges must be arrays' })
    }
    writeGraphData({ nodes, edges })
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: 'Failed to write graph data', details: err.message })
  }
})

app.post('/api/nodes', (req, res) => {
  try {
    const { title, description, color, x, y } = req.body
    if (!title || typeof title !== 'string') {
      return res.status(400).json({ error: 'Node title is required' })
    }
    const data = readGraphData()
    const newNode = {
      id: generateId('node'),
      title: title.substring(0, 20),
      description: description ? description.substring(0, 200) : '',
      color: color || '#4a6fa5',
      x: typeof x === 'number' ? x : Math.random() * 600 + 100,
      y: typeof y === 'number' ? y : Math.random() * 400 + 100,
      createdAt: Date.now()
    }
    data.nodes.push(newNode)
    writeGraphData(data)
    res.status(201).json(newNode)
  } catch (err) {
    res.status(500).json({ error: 'Failed to create node', details: err.message })
  }
})

app.get('/api/nodes', (req, res) => {
  try {
    const data = readGraphData()
    res.json(data.nodes)
  } catch (err) {
    res.status(500).json({ error: 'Failed to get nodes', details: err.message })
  }
})

app.put('/api/nodes/:id', (req, res) => {
  try {
    const { id } = req.params
    const { title, description, color, x, y } = req.body
    const data = readGraphData()
    const nodeIndex = data.nodes.findIndex(n => n.id === id)
    if (nodeIndex === -1) {
      return res.status(404).json({ error: 'Node not found' })
    }
    const node = data.nodes[nodeIndex]
    if (title !== undefined) node.title = String(title).substring(0, 20)
    if (description !== undefined) node.description = String(description).substring(0, 200)
    if (color !== undefined) node.color = color
    if (x !== undefined) node.x = Number(x)
    if (y !== undefined) node.y = Number(y)
    data.nodes[nodeIndex] = node
    writeGraphData(data)
    res.json(node)
  } catch (err) {
    res.status(500).json({ error: 'Failed to update node', details: err.message })
  }
})

app.delete('/api/nodes/:id', (req, res) => {
  try {
    const { id } = req.params
    const data = readGraphData()
    const nodeIndex = data.nodes.findIndex(n => n.id === id)
    if (nodeIndex === -1) {
      return res.status(404).json({ error: 'Node not found' })
    }
    data.nodes.splice(nodeIndex, 1)
    data.edges = data.edges.filter(e => e.source !== id && e.target !== id)
    writeGraphData(data)
    res.json({ success: true, removedEdges: data.edges.length })
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete node', details: err.message })
  }
})

app.post('/api/edges', (req, res) => {
  try {
    const { source, target, label } = req.body
    if (!source || !target) {
      return res.status(400).json({ error: 'Source and target are required' })
    }
    if (source === target) {
      return res.status(400).json({ error: 'Cannot create self-loop edge' })
    }
    const data = readGraphData()
    const sourceExists = data.nodes.some(n => n.id === source)
    const targetExists = data.nodes.some(n => n.id === target)
    if (!sourceExists || !targetExists) {
      return res.status(404).json({ error: 'Source or target node not found' })
    }
    const duplicate = data.edges.find(e => e.source === source && e.target === target)
    if (duplicate) {
      return res.status(409).json({ error: 'Edge already exists' })
    }
    const newEdge = {
      id: generateId('edge'),
      source,
      target,
      label: label || '属于',
      createdAt: Date.now()
    }
    data.edges.push(newEdge)
    writeGraphData(data)
    res.status(201).json(newEdge)
  } catch (err) {
    res.status(500).json({ error: 'Failed to create edge', details: err.message })
  }
})

app.get('/api/edges', (req, res) => {
  try {
    const data = readGraphData()
    res.json(data.edges)
  } catch (err) {
    res.status(500).json({ error: 'Failed to get edges', details: err.message })
  }
})

app.put('/api/edges/:id', (req, res) => {
  try {
    const { id } = req.params
    const { label } = req.body
    const data = readGraphData()
    const edgeIndex = data.edges.findIndex(e => e.id === id)
    if (edgeIndex === -1) {
      return res.status(404).json({ error: 'Edge not found' })
    }
    if (label !== undefined) data.edges[edgeIndex].label = label
    writeGraphData(data)
    res.json(data.edges[edgeIndex])
  } catch (err) {
    res.status(500).json({ error: 'Failed to update edge', details: err.message })
  }
})

app.delete('/api/edges/:id', (req, res) => {
  try {
    const { id } = req.params
    const data = readGraphData()
    const edgeIndex = data.edges.findIndex(e => e.id === id)
    if (edgeIndex === -1) {
      return res.status(404).json({ error: 'Edge not found' })
    }
    data.edges.splice(edgeIndex, 1)
    writeGraphData(data)
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete edge', details: err.message })
  }
})

app.post('/api/graph/import', (req, res) => {
  try {
    const { nodes, edges } = req.body
    if (!Array.isArray(nodes) || !Array.isArray(edges)) {
      return res.status(400).json({ error: 'Invalid import format' })
    }
    const validNodes = nodes.map(n => ({
      id: n.id || generateId('node'),
      title: String(n.title || '未命名').substring(0, 20),
      description: String(n.description || '').substring(0, 200),
      color: n.color || '#4a6fa5',
      x: typeof n.x === 'number' ? n.x : Math.random() * 600 + 100,
      y: typeof n.y === 'number' ? n.y : Math.random() * 400 + 100,
      createdAt: n.createdAt || Date.now()
    }))
    const nodeIds = new Set(validNodes.map(n => n.id))
    const validEdges = edges.filter(e => nodeIds.has(e.source) && nodeIds.has(e.target) && e.source !== e.target)
      .map(e => ({
        id: e.id || generateId('edge'),
        source: e.source,
        target: e.target,
        label: e.label || '属于',
        createdAt: e.createdAt || Date.now()
      }))
    writeGraphData({ nodes: validNodes, edges: validEdges })
    res.json({ nodes: validNodes, edges: validEdges })
  } catch (err) {
    res.status(500).json({ error: 'Failed to import graph', details: err.message })
  }
})

ensureDataDir()
app.listen(PORT, () => {
  console.log(`Knowledge Graph Server running at http://localhost:${PORT}`)
})
