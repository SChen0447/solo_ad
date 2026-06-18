import { create } from 'zustand'
import * as THREE from 'three'

export interface Bubble {
  id: string
  text: string
  position: THREE.Vector3
  velocity: THREE.Vector3
  radius: number
  color: string
  isNew: boolean
  spawnPosition: THREE.Vector3 | null
  spawnProgress: number
}

export interface Connection {
  from: string
  to: string
  similarity: number
}

interface BubbleState {
  bubbles: Bubble[]
  connections: Connection[]
  selectedBubbleId: string | null
  highlightedBubbleId: string | null
  editingBubbleId: string | null
  isReorganizing: boolean
  addBubble: (text: string, spawnPos: THREE.Vector3) => void
  updateBubbleText: (id: string, text: string) => void
  updateBubblePosition: (id: string, position: THREE.Vector3) => void
  updateBubbleVelocity: (id: string, velocity: THREE.Vector3) => void
  setSelectedBubble: (id: string | null) => void
  setHighlightedBubble: (id: string | null) => void
  setEditingBubble: (id: string | null) => void
  setSpawnProgress: (id: string, progress: number) => void
  clearIsNewFlag: (id: string) => void
  reorganizeBubbles: () => void
  setIsReorganizing: (value: boolean) => void
  updateConnections: () => void
}

const BUBBLE_COLORS = ['#d4a5ff', '#a5c9ff', '#ffb3ba', '#c1ffb3', '#ffe99a']

const DEFAULT_TEXTS = [
  '星光洒满了沉睡的湖面',
  '时间在指尖悄然流逝',
  '每一个字都是一颗星',
  '思想在虚空中漂浮',
  '诗意从气泡中升起',
  '宇宙是一首未完成的诗',
  '我们都是文字的孩子',
  '梦境与现实的边界模糊',
  '气泡承载着灵魂的重量',
  '语言之外是无尽的沉默'
]

function generateId(): string {
  return Math.random().toString(36).substring(2, 11)
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = []
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }
  return matrix[b.length][a.length]
}

function calculateSimilarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length)
  if (maxLen === 0) return 1
  const distance = levenshteinDistance(a, b)
  return 1 - distance / maxLen
}

function fibonacciSphere(samples: number, radius: number): THREE.Vector3[] {
  const points: THREE.Vector3[] = []
  const phi = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < samples; i++) {
    const y = 1 - (i / (samples - 1)) * 2
    const r = Math.sqrt(1 - y * y) * radius
    const theta = phi * i
    const x = Math.cos(theta) * r
    const z = Math.sin(theta) * r
    points.push(new THREE.Vector3(x, y * radius, z))
  }
  return points
}

function createInitialBubbles(): Bubble[] {
  const positions = fibonacciSphere(10, 3)
  return DEFAULT_TEXTS.map((text, i) => ({
    id: generateId(),
    text,
    position: positions[i],
    velocity: new THREE.Vector3(0, 0, 0),
    radius: 0.4 + Math.random() * 0.4,
    color: BUBBLE_COLORS[i % BUBBLE_COLORS.length],
    isNew: false,
    spawnPosition: null,
    spawnProgress: 1
  }))
}

function calculateConnections(bubbles: Bubble[]): Connection[] {
  const connections: Connection[] = []
  for (let i = 0; i < bubbles.length; i++) {
    for (let j = i + 1; j < bubbles.length; j++) {
      const similarity = calculateSimilarity(bubbles[i].text, bubbles[j].text)
      if (similarity >= 0.3 && similarity <= 0.8) {
        const distance = bubbles[i].position.distanceTo(bubbles[j].position)
        if (distance <= 1.5) {
          connections.push({
            from: bubbles[i].id,
            to: bubbles[j].id,
            similarity
          })
        }
      }
    }
  }
  return connections
}

function simulatedAnnealing(
  bubbles: Bubble[],
  iterations: number = 50,
  convergenceThreshold: number = 0.01
): Bubble[] {
  const result = bubbles.map(b => ({
    ...b,
    position: b.position.clone(),
    velocity: new THREE.Vector3(0, 0, 0)
  }))
  const targetRadius = 3 + result.length * 0.1
  let temperature = 1.0
  const coolingRate = 0.95

  for (let iter = 0; iter < iterations; iter++) {
    const spherePoints = fibonacciSphere(result.length, targetRadius)
    let maxMove = 0
    for (let i = 0; i < result.length; i++) {
      const targetPos = spherePoints[i]
      const currentPos = result[i].position
      const moveAmount = targetPos.clone().sub(currentPos).multiplyScalar(0.1 * temperature)
      currentPos.add(moveAmount)
      maxMove = Math.max(maxMove, moveAmount.length())
    }
    for (let i = 0; i < result.length; i++) {
      for (let j = i + 1; j < result.length; j++) {
        const dist = result[i].position.distanceTo(result[j].position)
        const minDist = result[i].radius + result[j].radius + 0.2
        if (dist < minDist) {
          const pushDir = result[j].position.clone().sub(result[i].position).normalize()
          const pushAmount = (minDist - dist) * 0.5
          result[i].position.sub(pushDir.clone().multiplyScalar(pushAmount))
          result[j].position.add(pushDir.multiplyScalar(pushAmount))
        }
      }
    }
    temperature *= coolingRate
    if (maxMove < convergenceThreshold) break
  }
  return result
}

export const useBubbleStore = create<BubbleState>((set, get) => ({
  bubbles: createInitialBubbles(),
  connections: calculateConnections(createInitialBubbles()),
  selectedBubbleId: null,
  highlightedBubbleId: null,
  editingBubbleId: null,
  isReorganizing: false,

  addBubble: (text: string, spawnPos: THREE.Vector3) => {
    const bubbles = get().bubbles
    const center = new THREE.Vector3(0, 0, 0)
    bubbles.forEach(b => center.add(b.position))
    if (bubbles.length > 0) center.divideScalar(bubbles.length)
    const dir = center.clone().sub(spawnPos).normalize()
    const targetPos = center.clone().add(dir.clone().multiplyScalar(2))
    const newBubble: Bubble = {
      id: generateId(),
      text,
      position: targetPos,
      velocity: new THREE.Vector3(0, 0, 0),
      radius: 0.4 + Math.random() * 0.4,
      color: BUBBLE_COLORS[Math.floor(Math.random() * BUBBLE_COLORS.length)],
      isNew: true,
      spawnPosition: spawnPos.clone(),
      spawnProgress: 0
    }
    const allBubbles = [...bubbles, newBubble]
    const minDist = newBubble.radius + 0.2
    for (const other of allBubbles) {
      if (other.id === newBubble.id) continue
      const dist = newBubble.position.distanceTo(other.position)
      if (dist < minDist) {
        const pushDir = newBubble.position.clone().sub(other.position).normalize()
        newBubble.position.add(pushDir.multiplyScalar((minDist - dist) * 0.5))
      }
    }
    set({
      bubbles: allBubbles,
      connections: calculateConnections(allBubbles)
    })
  },

  updateBubbleText: (id: string, text: string) => {
    const bubbles = get().bubbles.map(b =>
      b.id === id ? { ...b, text } : b
    )
    set({
      bubbles,
      connections: calculateConnections(bubbles)
    })
  },

  updateBubblePosition: (id: string, position: THREE.Vector3) => {
    set(state => ({
      bubbles: state.bubbles.map(b =>
        b.id === id ? { ...b, position: position.clone() } : b
      )
    }))
  },

  updateBubbleVelocity: (id: string, velocity: THREE.Vector3) => {
    set(state => ({
      bubbles: state.bubbles.map(b =>
        b.id === id ? { ...b, velocity: velocity.clone() } : b
      )
    }))
  },

  setSelectedBubble: (id: string | null) => {
    set({ selectedBubbleId: id })
  },

  setHighlightedBubble: (id: string | null) => {
    set({ highlightedBubbleId: id })
  },

  setEditingBubble: (id: string | null) => {
    set({ editingBubbleId: id })
  },

  setSpawnProgress: (id: string, progress: number) => {
    set(state => ({
      bubbles: state.bubbles.map(b =>
        b.id === id ? { ...b, spawnProgress: progress } : b
      )
    }))
  },

  clearIsNewFlag: (id: string) => {
    set(state => ({
      bubbles: state.bubbles.map(b =>
        b.id === id ? { ...b, isNew: false, spawnPosition: null, spawnProgress: 1 } : b
      )
    }))
  },

  reorganizeBubbles: () => {
    const { bubbles } = get()
    const reorganized = simulatedAnnealing(bubbles, 50, 0.01)
    set({
      bubbles: reorganized,
      connections: calculateConnections(reorganized),
      isReorganizing: true
    })
  },

  setIsReorganizing: (value: boolean) => {
    set({ isReorganizing: value })
  },

  updateConnections: () => {
    const { bubbles } = get()
    set({ connections: calculateConnections(bubbles) })
  }
}))
