import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import { dbRun, dbGet, dbAll } from './db.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.get('/api/courses', async (_req: Request, res: Response) => {
  try {
    const courses = await dbAll<any>('SELECT * FROM courses ORDER BY date ASC')
    const enriched = await Promise.all(
      courses.map(async (c) => {
        const countRow = await dbGet<{ cnt: number }>(
          'SELECT COUNT(*) as cnt FROM enrollments WHERE courseId = ?',
          [c.id]
        )
        return { ...c, enrolledCount: countRow?.cnt ?? 0 }
      })
    )
    res.json(enriched)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch courses' })
  }
})

app.post('/api/courses', async (req: Request, res: Response) => {
  try {
    const { name, date, duration, maxSlots, fee, description, coverImage, materials } = req.body
    const result = await dbRun(
      'INSERT INTO courses (name, date, duration, maxSlots, fee, description, coverImage) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, date, duration, maxSlots, fee, description || '', coverImage || '']
    )
    if (materials && Array.isArray(materials)) {
      for (const m of materials) {
        await dbRun(
          'INSERT INTO materials (courseId, name, estimatedUsage, unit) VALUES (?, ?, ?, ?)',
          [result.lastID, m.name, m.estimatedUsage, m.unit]
        )
      }
    }
    const course = await dbGet<any>('SELECT * FROM courses WHERE id = ?', [result.lastID])
    res.status(201).json(course)
  } catch (err) {
    res.status(500).json({ error: 'Failed to create course' })
  }
})

app.get('/api/courses/:id', async (req: Request, res: Response) => {
  try {
    const course = await dbGet<any>('SELECT * FROM courses WHERE id = ?', [req.params.id])
    if (!course) {
      res.status(404).json({ error: 'Course not found' })
      return
    }
    const enrollments = await dbAll<any>(
      'SELECT * FROM enrollments WHERE courseId = ? ORDER BY createdAt ASC',
      [req.params.id]
    )
    const materials = await dbAll<any>(
      'SELECT * FROM materials WHERE courseId = ?',
      [req.params.id]
    )
    course.enrolledCount = enrollments.length
    res.json({ ...course, enrollments, materials })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch course' })
  }
})

app.post('/api/enrollments', async (req: Request, res: Response) => {
  try {
    const { courseId, name, phone, email, skillLevel } = req.body
    const course = await dbGet<any>('SELECT * FROM courses WHERE id = ?', [courseId])
    if (!course) {
      res.status(404).json({ error: 'Course not found' })
      return
    }
    const countRow = await dbGet<{ cnt: number }>(
      'SELECT COUNT(*) as cnt FROM enrollments WHERE courseId = ?',
      [courseId]
    )
    if (countRow.cnt >= course.maxSlots) {
      res.status(400).json({ error: 'Course is full' })
      return
    }
    const result = await dbRun(
      'INSERT INTO enrollments (courseId, name, phone, email, skillLevel) VALUES (?, ?, ?, ?, ?)',
      [courseId, name, phone, email, skillLevel]
    )
    const enrollment = await dbGet<any>('SELECT * FROM enrollments WHERE id = ?', [result.lastID])
    res.status(201).json(enrollment)
  } catch (err) {
    res.status(500).json({ error: 'Failed to create enrollment' })
  }
})

app.get('/api/enrollments/:courseId', async (req: Request, res: Response) => {
  try {
    const enrollments = await dbAll<any>(
      'SELECT * FROM enrollments WHERE courseId = ? ORDER BY createdAt ASC',
      [req.params.courseId]
    )
    res.json(enrollments)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch enrollments' })
  }
})

app.delete('/api/enrollments/:id', async (req: Request, res: Response) => {
  try {
    const enrollment = await dbGet<any>('SELECT * FROM enrollments WHERE id = ?', [req.params.id])
    if (!enrollment) {
      res.status(404).json({ error: 'Enrollment not found' })
      return
    }
    await dbRun('DELETE FROM enrollments WHERE id = ?', [req.params.id])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete enrollment' })
  }
})

app.get('/api/stats', async (_req: Request, res: Response) => {
  try {
    const courseRow = await dbGet<{ cnt: number }>('SELECT COUNT(*) as cnt FROM courses')
    const enrollRow = await dbGet<{ cnt: number }>('SELECT COUNT(*) as cnt FROM enrollments')
    const materialRow = await dbGet<{ cnt: number }>('SELECT COUNT(DISTINCT courseId) as cnt FROM materials')
    res.json({
      totalCourses: courseRow?.cnt ?? 0,
      totalEnrollments: enrollRow?.cnt ?? 0,
      pendingMaterialKits: materialRow?.cnt ?? 0,
    })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' })
  }
})

app.get('/api/materials/:courseId', async (req: Request, res: Response) => {
  try {
    const materials = await dbAll<any>(
      'SELECT * FROM materials WHERE courseId = ?',
      [req.params.courseId]
    )
    const countRow = await dbGet<{ cnt: number }>(
      'SELECT COUNT(*) as cnt FROM enrollments WHERE courseId = ?',
      [req.params.courseId]
    )
    const enrollCount = countRow?.cnt ?? 0
    const summary = materials.map((m: any) => ({
      ...m,
      totalQuantity: m.estimatedUsage * enrollCount,
      enrollCount,
    }))
    res.json(summary)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch materials' })
  }
})

app.get('/api/export-csv/:courseId', async (req: Request, res: Response) => {
  try {
    const course = await dbGet<any>('SELECT * FROM courses WHERE id = ?', [req.params.courseId])
    if (!course) {
      res.status(404).json({ error: 'Course not found' })
      return
    }
    const materials = await dbAll<any>(
      'SELECT * FROM materials WHERE courseId = ?',
      [req.params.courseId]
    )
    const countRow = await dbGet<{ cnt: number }>(
      'SELECT COUNT(*) as cnt FROM enrollments WHERE courseId = ?',
      [req.params.courseId]
    )
    const enrollCount = countRow?.cnt ?? 0

    const BOM = '\uFEFF'
    let csv = BOM + '材料名称,人均用量,单位,报名人数,总需求量\n'
    for (const m of materials) {
      csv += `${m.name},${m.estimatedUsage},${m.unit},${enrollCount},${m.estimatedUsage * enrollCount}\n`
    }

    const encodedName = encodeURIComponent(`${course.name}_材料清单.csv`)
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedName}`)
    res.send(csv)
  } catch (err) {
    res.status(500).json({ error: 'Failed to export CSV' })
  }
})

app.use('/api/health', (_req: Request, res: Response) => {
  res.json({ success: true, message: 'ok' })
})

app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Server error:', error)
  res.status(500).json({ success: false, error: 'Server internal error' })
})

app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'API not found' })
})

export default app
