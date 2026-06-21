import express, { Request, Response } from 'express'
import cors from 'cors'
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = 4000

app.use(cors())
app.use(express.json({ limit: '50mb' }))

const scenesDir = path.join(__dirname, '..', 'data', 'scenes')
if (!fs.existsSync(scenesDir)) {
  fs.mkdirSync(scenesDir, { recursive: true })
}

interface Building {
  id: string
  position: { x: number; y: number; z: number }
  size: { x: number; y: number; z: number }
  color: string
}

interface SceneData {
  id?: string
  name?: string
  buildings: Building[]
  date: number
  time: number
  cameraPosition?: { x: number; y: number; z: number }
  createdAt?: string
}

interface SunPosition {
  azimuth: number
  altitude: number
  x: number
  y: number
  z: number
}

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'Shadow Analyzer Server Running' })
})

function calculateSunPosition(dayOfYear: number, hourOfDay: number, lat: number = 39.9): SunPosition {
  const declination = 23.45 * Math.sin((360 / 365) * (dayOfYear - 81) * Math.PI / 180)
  const hourAngle = 15 * (hourOfDay - 12)
  
  const latRad = lat * Math.PI / 180
  const decRad = declination * Math.PI / 180
  const haRad = hourAngle * Math.PI / 180
  
  const sinAltitude = Math.sin(latRad) * Math.sin(decRad) + Math.cos(latRad) * Math.cos(decRad) * Math.cos(haRad)
  const altitude = Math.asin(Math.max(-1, Math.min(1, sinAltitude)))
  
  let azimuth: number
  if (Math.abs(altitude - Math.PI / 2) < 0.001) {
    azimuth = 0
  } else {
    const cosAzimuth = (Math.sin(decRad) - Math.sin(altitude) * Math.sin(latRad)) / (Math.cos(altitude) * Math.cos(latRad))
    azimuth = Math.acos(Math.max(-1, Math.min(1, cosAzimuth)))
    if (hourOfDay > 12) {
      azimuth = 2 * Math.PI - azimuth
    }
  }
  
  const distance = 30
  const x = distance * Math.cos(altitude) * Math.sin(azimuth)
  const y = distance * Math.sin(altitude)
  const z = distance * Math.cos(altitude) * Math.cos(azimuth)
  
  return {
    azimuth: azimuth * 180 / Math.PI,
    altitude: altitude * 180 / Math.PI,
    x, y, z
  }
}

app.post('/api/sun-position', (req: Request, res: Response) => {
  const { dayOfYear, hourOfDay, latitude = 39.9 } = req.body
  if (dayOfYear === undefined || hourOfDay === undefined) {
    return res.status(400).json({ error: 'dayOfYear and hourOfDay are required' })
  }
  const position = calculateSunPosition(dayOfYear, hourOfDay, latitude)
  res.json(position)
})

interface ShadowDataPoint {
  hour: number
  coveragePercent: number
  coverageArea: number
}

function calculateShadowForBuilding(
  building: Building,
  sunPos: SunPosition,
  groundArea: { minX: number; maxX: number; minZ: number; maxZ: number }
): { area: number } {
  if (sunPos.altitude <= 0) return { area: 0 }
  
  const shadowLength = building.size.y / Math.tan(sunPos.altitude * Math.PI / 180)
  const angleRad = sunPos.azimuth * Math.PI / 180
  
  const dx = shadowLength * Math.sin(angleRad)
  const dz = shadowLength * Math.cos(angleRad)
  
  const halfW = building.size.x / 2
  const halfD = building.size.z / 2
  
  const corners = [
    { x: building.position.x - halfW, z: building.position.z - halfD },
    { x: building.position.x + halfW, z: building.position.z - halfD },
    { x: building.position.x + halfW, z: building.position.z + halfD },
    { x: building.position.x - halfW, z: building.position.z + halfD },
  ]
  
  const projectedCorners = corners.map(c => ({
    x: c.x + dx,
    z: c.z + dz,
  }))
  
  const allCorners = [...corners, ...projectedCorners]
  const minX = Math.max(groundArea.minX, Math.min(...allCorners.map(c => c.x)))
  const maxX = Math.min(groundArea.maxX, Math.max(...allCorners.map(c => c.x)))
  const minZ = Math.max(groundArea.minZ, Math.min(...allCorners.map(c => c.z)))
  const maxZ = Math.min(groundArea.maxZ, Math.max(...allCorners.map(c => c.z)))
  
  const area = Math.max(0, (maxX - minX) * (maxZ - minZ))
  return { area }
}

app.post('/api/shadow-analysis', (req: Request, res: Response) => {
  const { buildings, dayOfYear, groundBounds } = req.body
  if (!buildings || !Array.isArray(buildings)) {
    return res.status(400).json({ error: 'buildings array is required' })
  }
  
  const defaultBounds = { minX: -30, maxX: 30, minZ: -30, maxZ: 30 }
  const bounds = groundBounds || defaultBounds
  const totalArea = (bounds.maxX - bounds.minX) * (bounds.maxZ - bounds.minZ)
  
  const results: ShadowDataPoint[] = []
  for (let hour = 6; hour <= 19; hour++) {
    const sunPos = calculateSunPosition(dayOfYear, hour)
    let totalShadow = 0
    
    buildings.forEach((building: Building) => {
      const shadow = calculateShadowForBuilding(building, sunPos, bounds)
      totalShadow += shadow.area
    })
    
    const overlapFactor = 0.85
    const adjustedShadow = Math.min(totalArea, totalShadow * overlapFactor)
    
    results.push({
      hour,
      coveragePercent: parseFloat(((adjustedShadow / totalArea) * 100).toFixed(2)),
      coverageArea: parseFloat(adjustedShadow.toFixed(2)),
    })
  }
  
  const avgCoverage = parseFloat(
    (results.reduce((sum, r) => sum + r.coveragePercent, 0) / results.length).toFixed(2)
  )
  
  res.json({
    hourly: results,
    averageCoverage: avgCoverage,
    totalArea: parseFloat(totalArea.toFixed(2)),
  })
})

app.post('/api/scenes', (req: Request, res: Response) => {
  const sceneData: SceneData = req.body
  const id = uuidv4()
  const filename = `${id}.json`
  const filepath = path.join(scenesDir, filename)
  
  const dataToSave = {
    ...sceneData,
    id,
    createdAt: new Date().toISOString(),
  }
  
  try {
    fs.writeFileSync(filepath, JSON.stringify(dataToSave, null, 2))
    res.json({ id, filename, message: 'Scene saved successfully' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to save scene' })
  }
})

app.get('/api/scenes/:id', (req: Request, res: Response) => {
  const { id } = req.params
  const filepath = path.join(scenesDir, `${id}.json`)
  
  if (!fs.existsSync(filepath)) {
    return res.status(404).json({ error: 'Scene not found' })
  }
  
  try {
    const data = fs.readFileSync(filepath, 'utf-8')
    res.json(JSON.parse(data))
  } catch (err) {
    res.status(500).json({ error: 'Failed to load scene' })
  }
})

app.get('/api/scenes', (_req: Request, res: Response) => {
  try {
    const files = fs.readdirSync(scenesDir).filter(f => f.endsWith('.json'))
    const scenes = files.map(f => {
      const filepath = path.join(scenesDir, f)
      try {
        const data = JSON.parse(fs.readFileSync(filepath, 'utf-8'))
        return {
          id: data.id,
          name: data.name || 'Unnamed Scene',
          createdAt: data.createdAt,
          buildingCount: data.buildings?.length || 0,
        }
      } catch {
        return null
      }
    }).filter(Boolean)
    
    res.json(scenes)
  } catch (err) {
    res.status(500).json({ error: 'Failed to list scenes' })
  }
})

app.get('/api/report/:id', (req: Request, res: Response) => {
  const { id } = req.params
  const filepath = path.join(scenesDir, `${id}.json`)
  
  if (!fs.existsSync(filepath)) {
    return res.status(404).json({ error: 'Scene not found' })
  }
  
  try {
    const sceneData: SceneData = JSON.parse(fs.readFileSync(filepath, 'utf-8'))
    const analysisResult = {
      sceneId: sceneData.id,
      sceneName: sceneData.name || 'Unnamed Scene',
      buildingCount: sceneData.buildings.length,
      date: sceneData.date,
      time: sceneData.time,
      reportGeneratedAt: new Date().toISOString(),
      buildings: sceneData.buildings.map(b => ({
        id: b.id,
        position: b.position,
        size: b.size,
        volume: b.size.x * b.size.y * b.size.z,
      })),
    }
    
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', `attachment; filename="report-${id}.json"`)
    res.json(analysisResult)
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate report' })
  }
})

app.listen(PORT, () => {
  console.log(`[Server] Shadow Analyzer API running on http://localhost:${PORT}`)
})

export { app }
