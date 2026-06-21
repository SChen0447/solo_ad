import { Router, type Request, type Response } from 'express'
import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import { database } from '../database.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const uploadsDir = path.join(__dirname, '..', 'uploads')
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir)
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname)
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`
    cb(null, uniqueName)
  }
})

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024
  },
  fileFilter: (_req, file, cb) => {
    const imageTypes = ['image/jpeg', 'image/png']
    const audioTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/x-m4a', 'audio/mp3']
    const allTypes = [...imageTypes, ...audioTypes]
    if (allTypes.includes(file.mimetype) || file.fieldname === 'audio') {
      cb(null, true)
    } else if (file.fieldname === 'cover' && !imageTypes.includes(file.mimetype)) {
      cb(new Error('封面仅支持 JPG/PNG 格式'))
    } else {
      cb(null, true)
    }
  }
})

const router = Router()

router.post('/login', (req: Request, res: Response): void => {
  const { username, password } = req.body
  if (!username || !password) {
    res.status(400).json({ success: false, error: '请输入用户名和密码' })
    return
  }
  const user = database.login(username, password)
  if (!user) {
    res.status(401).json({ success: false, error: '用户名或密码错误' })
    return
  }
  res.json({ success: true, user: { id: user.id, username: user.username, avatar: user.avatar } })
})

router.get('/albums', (_req: Request, res: Response): void => {
  const user = database.getUser('1')
  if (!user) {
    res.status(404).json({ success: false, error: '用户不存在' })
    return
  }
  const albums = database.getAlbums(user.id)
  res.json(albums)
})

router.post('/albums', upload.single('cover'), (req: Request, res: Response): void => {
  const { name, releaseDate } = req.body
  if (!name || !releaseDate) {
    res.status(400).json({ success: false, error: '请填写专辑名和发行日期' })
    return
  }
  const user = database.getUser('1')
  if (!user) {
    res.status(404).json({ success: false, error: '用户不存在' })
    return
  }
  const cover = req.file ? `/uploads/${req.file.filename}` : null
  const album = database.createAlbum(user.id, name, releaseDate, cover)
  res.json(album)
})

router.put('/albums/:id', upload.single('cover'), (req: Request, res: Response): void => {
  const { id } = req.params
  const { name, releaseDate } = req.body
  if (!name || !releaseDate) {
    res.status(400).json({ success: false, error: '请填写专辑名和发行日期' })
    return
  }
  const cover = req.file ? `/uploads/${req.file.filename}` : null
  const album = database.updateAlbum(id, name, releaseDate, cover)
  if (!album) {
    res.status(404).json({ success: false, error: '专辑不存在' })
    return
  }
  res.json(album)
})

router.delete('/albums/:id', (req: Request, res: Response): void => {
  const { id } = req.params
  const success = database.deleteAlbum(id)
  if (!success) {
    res.status(404).json({ success: false, error: '专辑不存在' })
    return
  }
  res.json({ success: true })
})

router.get('/albums/:albumId/songs', (req: Request, res: Response): void => {
  const { albumId } = req.params
  const songs = database.getSongsByAlbum(albumId)
  res.json(songs)
})

router.post('/albums/:albumId/songs', upload.single('audio'), (req: Request, res: Response): void => {
  const { albumId } = req.params
  const { name, duration } = req.body
  if (!name) {
    res.status(400).json({ success: false, error: '请填写歌曲名称' })
    return
  }
  const audioUrl = req.file ? `/uploads/${req.file.filename}` : null
  const parsedDuration = duration ? parseFloat(duration) : 0
  const song = database.createSong(albumId, name, parsedDuration, audioUrl)
  res.json(song)
})

router.put('/songs/:id', upload.single('audio'), (req: Request, res: Response): void => {
  const { id } = req.params
  const { name } = req.body
  const audioUrl = req.file ? `/uploads/${req.file.filename}` : null
  const song = database.updateSong(id, name || '', audioUrl)
  if (!song) {
    res.status(404).json({ success: false, error: '歌曲不存在' })
    return
  }
  res.json(song)
})

router.delete('/songs/:id', (req: Request, res: Response): void => {
  const { id } = req.params
  const success = database.deleteSong(id)
  if (!success) {
    res.status(404).json({ success: false, error: '歌曲不存在' })
    return
  }
  res.json({ success: true })
})

router.get('/songs', (_req: Request, res: Response): void => {
  const songs = database.getAllSongs()
  res.json(songs)
})

router.get('/songs/:songId', (req: Request, res: Response): void => {
  const { songId } = req.params
  const song = database.getSongById(songId)
  if (!song) {
    res.status(404).json({ success: false, error: '歌曲不存在' })
    return
  }
  const album = database.getAlbumById(song.albumId)
  res.json({ ...song, album })
})

router.get('/songs/:songId/comments', (req: Request, res: Response): void => {
  const { songId } = req.params
  const comments = database.getComments(songId)
  res.json(comments)
})

router.post('/songs/:songId/comments', (req: Request, res: Response): void => {
  const { songId } = req.params
  const { nickname, content } = req.body
  if (!nickname || !content) {
    res.status(400).json({ success: false, error: '请填写昵称和留言内容' })
    return
  }
  if (content.length > 200) {
    res.status(400).json({ success: false, error: '留言内容不能超过200字' })
    return
  }
  const comment = database.addComment(songId, nickname, content)
  res.json(comment)
})

router.post('/songs/:songId/like', (req: Request, res: Response): void => {
  const { songId } = req.params
  let sessionId = req.headers['x-session-id'] as string || req.body?.sessionId
  if (!sessionId) {
    sessionId = req.ip || Math.random().toString(36).substring(2)
  }
  const result = database.toggleLike(songId, sessionId)
  res.json(result)
})

router.get('/songs/:songId/like-status', (req: Request, res: Response): void => {
  const { songId } = req.params
  const sessionId = req.headers['x-session-id'] as string || req.query.sessionId as string || ''
  const result = database.getLikeStatus(songId, sessionId)
  res.json(result)
})

router.post('/songs/:songId/play', (req: Request, res: Response): void => {
  const { songId } = req.params
  const playCount = database.recordPlay(songId)
  res.json({ playCount })
})

router.get('/stats/plays-trend', (_req: Request, res: Response): void => {
  const trend = database.getPlaysTrend(7)
  res.json(trend)
})

router.get('/stats/top-songs', (_req: Request, res: Response): void => {
  const topSongs = database.getTopSongs(5)
  res.json(topSongs)
})

router.get('/stats/summary', (_req: Request, res: Response): void => {
  const summary = database.getSummary()
  res.json(summary)
})

export default router
