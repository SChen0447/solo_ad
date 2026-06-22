import express from 'express'
import { WebSocketServer, WebSocket } from 'ws'
import { STARS, CONSTELLATIONS, Star, Constellation } from './starData'

const PORT = 3000

interface LRUCacheItem {
  key: string
  data: VisibleConstellationData
  timestamp: number
}

interface ControlParams {
  latitude: number
  time: number
  date: string
}

interface VisibleStar {
  id: number
  x: number
  y: number
  z: number
  brightness: number
  colorTemp: number
  altitude: number
}

interface VisibleConstellation {
  id: string
  name: string
  chineseName: string
  story: string
  fullStory: string
  starIds: number[]
  lines: [number, number][]
  mainStarId: number
  visible: boolean
}

interface VisibleConstellationData {
  constellations: VisibleConstellation[]
  timestamp: number
}

class LRUCache {
  private map: Map<string, LRUCacheItem>
  private maxSize: number
  private ttl: number

  constructor(maxSize = 50, ttl = 10000) {
    this.map = new Map()
    this.maxSize = maxSize
    this.ttl = ttl
  }

  get(key: string): VisibleConstellationData | null {
    const item = this.map.get(key)
    if (!item) return null

    const now = Date.now()
    if (now - item.timestamp > this.ttl) {
      this.map.delete(key)
      return null
    }

    this.map.delete(key)
    this.map.set(key, item)
    return item.data
  }

  set(key: string, data: VisibleConstellationData): void {
    if (this.map.has(key)) {
      this.map.delete(key)
    }

    if (this.map.size >= this.maxSize) {
      const firstKey = this.map.keys().next().value
      if (firstKey) {
        this.map.delete(firstKey)
      }
    }

    this.map.set(key, {
      key,
      data,
      timestamp: Date.now(),
    })
  }

  size(): number {
    return this.map.size
  }
}

const cache = new LRUCache(50, 10000)

function raDecToXYZ(ra: number, dec: number, radius: number): { x: number; y: number; z: number } {
  const raRad = (ra / 24) * Math.PI * 2 - Math.PI / 2
  const decRad = (dec / 180) * Math.PI

  const x = radius * Math.cos(decRad) * Math.cos(raRad)
  const y = radius * Math.sin(decRad)
  const z = radius * Math.cos(decRad) * Math.sin(raRad)

  return { x, y, z }
}

function rotateAroundY(x: number, y: number, z: number, angle: number): { x: number; y: number; z: number } {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  return {
    x: x * cos + z * sin,
    y,
    z: -x * sin + z * cos,
  }
}

function rotateAroundX(x: number, y: number, z: number, angle: number): { x: number; y: number; z: number } {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  return {
    x,
    y: y * cos - z * sin,
    z: y * sin + z * cos,
  }
}

function calculateSiderealTime(date: string, time: number): number {
  const d = new Date(date)
  const j2000 = new Date('2000-01-01T12:00:00Z')
  const daysSinceJ2000 = (d.getTime() - j2000.getTime()) / (1000 * 60 * 60 * 24)

  let gst = 18.697374558 + 24.06570982441908 * daysSinceJ2000
  gst += time
  gst = gst % 24
  if (gst < 0) gst += 24

  return gst
}

function calculateVisibleStars(latitude: number, siderealTime: number): Map<number, VisibleStar> {
  const visibleStars = new Map<number, VisibleStar>()
  const radius = 800

  for (const star of STARS) {
    const { x, y, z } = raDecToXYZ(star.ra, star.dec, radius)

    const rotY = rotateAroundY(x, y, z, -(siderealTime / 24) * Math.PI * 2)
    const latRad = (latitude / 180) * Math.PI
    const rotX = rotateAroundX(rotY.x, rotY.y, rotY.z, latRad - Math.PI / 2)

    const altitude = Math.asin(rotX.y / radius) * (180 / Math.PI)

    if (altitude > -10) {
      visibleStars.set(star.id, {
        id: star.id,
        x: rotX.x,
        y: rotX.y,
        z: rotX.z,
        brightness: star.brightness,
        colorTemp: star.colorTemp,
        altitude,
      })
    }
  }

  return visibleStars
}

function calculateVisibleConstellations(latitude: number, time: number, date: string): VisibleConstellationData {
  const key = `${latitude.toFixed(1)}_${time.toFixed(2)}_${date}`

  const cached = cache.get(key)
  if (cached) {
    return cached
  }

  const siderealTime = calculateSiderealTime(date, time)
  const visibleStars = calculateVisibleStars(latitude, siderealTime)

  const constellations: VisibleConstellation[] = CONSTELLATIONS.map((c) => {
    let visibleCount = 0
    for (const starId of c.starIds) {
      if (visibleStars.has(starId)) {
        visibleCount++
      }
    }
    const visible = visibleCount >= Math.ceil(c.starIds.length * 0.5)

    return {
      ...c,
      visible,
    }
  })

  const data: VisibleConstellationData = {
    constellations,
    timestamp: Date.now(),
  }

  cache.set(key, data)

  return data
}

const app = express()

app.use(express.json())

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', cacheSize: cache.size() })
})

const server = app.listen(PORT, () => {
  console.log(`Express server running on port ${PORT}`)
})

const wss = new WebSocketServer({ server })

interface ClientMessage {
  type: string
  latitude?: number
  time?: number
  date?: string
  cameraPosition?: { x: number; y: number; z: number }
  zoom?: number
}

wss.on('connection', (ws: WebSocket) => {
  console.log('Client connected')

  ws.on('message', (data: string) => {
    try {
      const message: ClientMessage = JSON.parse(data)

      if (message.type === 'control' && message.latitude !== undefined && message.time !== undefined && message.date) {
        const startTime = Date.now()
        const result = calculateVisibleConstellations(message.latitude, message.time, message.date)
        const latency = Date.now() - startTime

        ws.send(
          JSON.stringify({
            type: 'constellations',
            data: result,
            latency,
            cached: latency < 5,
          })
        )
      }

      if (message.type === 'camera') {
      }
    } catch (error) {
      console.error('Error processing message:', error)
    }
  })

  ws.on('close', () => {
    console.log('Client disconnected')
  })

  ws.send(
    JSON.stringify({
      type: 'welcome',
      message: 'Connected to planetarium server',
    })
  )
})

console.log(`Virtual Planetarium server starting on port ${PORT}`)
