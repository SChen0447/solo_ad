import express, { Request, Response } from 'express'
import cors from 'cors'
import Database from 'better-sqlite3'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = 3001

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}))
app.use(express.json())

const dbPath = path.join(__dirname, '..', 'drift-bottle.db')
const db = new Database(dbPath)

db.exec(`
  CREATE TABLE IF NOT EXISTS posts (
    id TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    author TEXT NOT NULL,
    tags TEXT NOT NULL,
    likes INTEGER DEFAULT 0,
    liked_by TEXT DEFAULT '[]',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL,
    author TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
  );
`)

interface Post {
  id: string
  content: string
  author: string
  tags: string[]
  likes: number
  likedBy: string[]
  createdAt: number
  updatedAt: number
}

interface Comment {
  id: string
  postId: string
  author: string
  content: string
  createdAt: number
}

interface PostRow {
  id: string
  content: string
  author: string
  tags: string
  likes: number
  liked_by: string
  created_at: number
  updated_at: number
}

interface CommentRow {
  id: string
  post_id: string
  author: string
  content: string
  created_at: number
}

const rowToPost = (row: PostRow): Post => ({
  id: row.id,
  content: row.content,
  author: row.author,
  tags: JSON.parse(row.tags),
  likes: row.likes,
  likedBy: JSON.parse(row.liked_by),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

const rowToComment = (row: CommentRow): Comment => ({
  id: row.id,
  postId: row.post_id,
  author: row.author,
  content: row.content,
  createdAt: row.created_at,
})

app.get('/api/posts', (req: Request, res: Response) => {
  const { tag, sort = 'newest' } = req.query

  let query = 'SELECT * FROM posts'
  const params: string[] = []

  if (tag && tag !== 'all') {
    query += ' WHERE tags LIKE ?'
    params.push(`%"${tag}"%`)
  }

  if (sort === 'newest') {
    query += ' ORDER BY created_at DESC'
  } else if (sort === 'oldest') {
    query += ' ORDER BY created_at ASC'
  } else if (sort === 'likes') {
    query += ' ORDER BY likes DESC'
  }

  const rows = db.prepare(query).all(...params) as PostRow[]
  const posts = rows.map(rowToPost)

  res.json(posts)
})

app.post('/api/posts', (req: Request, res: Response) => {
  const { content, author, tags } = req.body

  if (!content || !author) {
    return res.status(400).json({ error: '内容和作者不能为空' })
  }

  if (content.length > 140) {
    return res.status(400).json({ error: '内容不能超过140字' })
  }

  if (!Array.isArray(tags) || tags.length < 0 || tags.length > 3) {
    return res.status(400).json({ error: '标签数量必须在0-3个之间' })
  }

  const id = uuidv4()
  const now = Date.now()

  db.prepare(`
    INSERT INTO posts (id, content, author, tags, likes, liked_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, 0, '[]', ?, ?)
  `).run(id, content, author, JSON.stringify(tags), now, now)

  const row = db.prepare('SELECT * FROM posts WHERE id = ?').get(id) as PostRow
  const post = rowToPost(row)

  res.status(201).json(post)
})

app.put('/api/posts/:id', (req: Request, res: Response) => {
  const { id } = req.params
  const { content, tags } = req.body

  const row = db.prepare('SELECT * FROM posts WHERE id = ?').get(id) as PostRow | undefined
  if (!row) {
    return res.status(404).json({ error: '帖子不存在' })
  }

  if (content && content.length > 140) {
    return res.status(400).json({ error: '内容不能超过140字' })
  }

  if (tags && (!Array.isArray(tags) || tags.length < 0 || tags.length > 3)) {
    return res.status(400).json({ error: '标签数量必须在0-3个之间' })
  }

  const now = Date.now()
  const newContent = content !== undefined ? content : row.content
  const newTags = tags !== undefined ? JSON.stringify(tags) : row.tags

  db.prepare(`
    UPDATE posts SET content = ?, tags = ?, updated_at = ? WHERE id = ?
  `).run(newContent, newTags, now, id)

  const updatedRow = db.prepare('SELECT * FROM posts WHERE id = ?').get(id) as PostRow
  const post = rowToPost(updatedRow)

  res.json(post)
})

app.delete('/api/posts/:id', (req: Request, res: Response) => {
  const { id } = req.params

  const row = db.prepare('SELECT * FROM posts WHERE id = ?').get(id) as PostRow | undefined
  if (!row) {
    return res.status(404).json({ error: '帖子不存在' })
  }

  db.prepare('DELETE FROM comments WHERE post_id = ?').run(id)
  db.prepare('DELETE FROM posts WHERE id = ?').run(id)

  res.status(204).send()
})

app.post('/api/posts/:id/like', (req: Request, res: Response) => {
  const { id } = req.params
  const { userId } = req.body

  if (!userId) {
    return res.status(400).json({ error: '用户ID不能为空' })
  }

  const row = db.prepare('SELECT * FROM posts WHERE id = ?').get(id) as PostRow | undefined
  if (!row) {
    return res.status(404).json({ error: '帖子不存在' })
  }

  const likedBy: string[] = JSON.parse(row.liked_by)
  const isLiked = likedBy.includes(userId)

  let newLikedBy: string[]
  let newLikes: number

  if (isLiked) {
    newLikedBy = likedBy.filter((uid) => uid !== userId)
    newLikes = row.likes - 1
  } else {
    newLikedBy = [...likedBy, userId]
    newLikes = row.likes + 1
  }

  db.prepare(`
    UPDATE posts SET likes = ?, liked_by = ? WHERE id = ?
  `).run(newLikes, JSON.stringify(newLikedBy), id)

  const updatedRow = db.prepare('SELECT * FROM posts WHERE id = ?').get(id) as PostRow
  const post = rowToPost(updatedRow)

  res.json({ post, liked: !isLiked })
})

app.get('/api/posts/:id/comments', (req: Request, res: Response) => {
  const { id } = req.params

  const rows = db.prepare('SELECT * FROM comments WHERE post_id = ? ORDER BY created_at ASC').all(id) as CommentRow[]
  const comments = rows.map(rowToComment)

  res.json(comments)
})

app.post('/api/posts/:id/comments', (req: Request, res: Response) => {
  const { id } = req.params
  const { author, content } = req.body

  if (!author || !content) {
    return res.status(400).json({ error: '作者和内容不能为空' })
  }

  const postRow = db.prepare('SELECT * FROM posts WHERE id = ?').get(id) as PostRow | undefined
  if (!postRow) {
    return res.status(404).json({ error: '帖子不存在' })
  }

  const commentId = uuidv4()
  const now = Date.now()

  db.prepare(`
    INSERT INTO comments (id, post_id, author, content, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(commentId, id, author, content, now)

  const row = db.prepare('SELECT * FROM comments WHERE id = ?').get(commentId) as CommentRow
  const comment = rowToComment(row)

  res.status(201).json(comment)
})

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`)
})
