import Database from 'better-sqlite3'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const dbPath = path.join(__dirname, '..', 'data', 'music.db')

import fs from 'fs'
const dataDir = path.join(__dirname, '..', 'data')
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

const db = new Database(dbPath)

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    avatar TEXT
  );

  CREATE TABLE IF NOT EXISTS albums (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    name TEXT NOT NULL,
    releaseDate TEXT NOT NULL,
    cover TEXT,
    createdAt TEXT NOT NULL,
    FOREIGN KEY (userId) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS songs (
    id TEXT PRIMARY KEY,
    albumId TEXT NOT NULL,
    name TEXT NOT NULL,
    duration REAL DEFAULT 0,
    audioUrl TEXT,
    createdAt TEXT NOT NULL,
    FOREIGN KEY (albumId) REFERENCES albums(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    songId TEXT NOT NULL,
    nickname TEXT NOT NULL,
    content TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    FOREIGN KEY (songId) REFERENCES songs(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS likes (
    id TEXT PRIMARY KEY,
    songId TEXT NOT NULL,
    sessionId TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    FOREIGN KEY (songId) REFERENCES songs(id) ON DELETE CASCADE,
    UNIQUE(songId, sessionId)
  );

  CREATE TABLE IF NOT EXISTS plays (
    id TEXT PRIMARY KEY,
    songId TEXT NOT NULL,
    playedAt TEXT NOT NULL,
    FOREIGN KEY (songId) REFERENCES songs(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_songs_albumId ON songs(albumId);
  CREATE INDEX IF NOT EXISTS idx_comments_songId ON comments(songId);
  CREATE INDEX IF NOT EXISTS idx_likes_songId ON likes(songId);
  CREATE INDEX IF NOT EXISTS idx_plays_songId ON plays(songId);
  CREATE INDEX IF NOT EXISTS idx_plays_playedAt ON plays(playedAt);
`)

const initUser = db.prepare('SELECT id FROM users WHERE username = ?')
const existingUser = initUser.get('indie_artist')
if (!existingUser) {
  db.prepare('INSERT INTO users (id, username, password, avatar) VALUES (?, ?, ?, ?)').run(
    uuidv4(), 'indie_artist', 'music2024', null
  )
}

export interface User {
  id: string
  username: string
  password: string
  avatar: string | null
}

export interface Album {
  id: string
  userId: string
  name: string
  releaseDate: string
  cover: string | null
  createdAt: string
  songCount?: number
}

export interface Song {
  id: string
  albumId: string
  name: string
  duration: number
  audioUrl: string | null
  createdAt: string
  playCount?: number
  likeCount?: number
}

export interface Comment {
  id: string
  songId: string
  nickname: string
  content: string
  createdAt: string
}

export const database = {
  login(username: string, password: string): User | null {
    const row = db.prepare('SELECT * FROM users WHERE username = ? AND password = ?').get(username, password) as User | undefined
    return row || null
  },

  getUser(userId: string): User | null {
    const row = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as User | undefined
    return row || null
  },

  getAlbums(userId: string): Album[] {
    const rows = db.prepare(`
      SELECT a.*, COUNT(s.id) as songCount
      FROM albums a
      LEFT JOIN songs s ON s.albumId = a.id
      WHERE a.userId = ?
      GROUP BY a.id
      ORDER BY a.createdAt DESC
    `).all(userId) as Album[]
    return rows
  },

  getAlbumById(id: string): Album | null {
    const row = db.prepare('SELECT * FROM albums WHERE id = ?').get(id) as Album | undefined
    return row || null
  },

  createAlbum(userId: string, name: string, releaseDate: string, cover: string | null): Album {
    const id = uuidv4()
    const createdAt = new Date().toISOString()
    db.prepare('INSERT INTO albums (id, userId, name, releaseDate, cover, createdAt) VALUES (?, ?, ?, ?, ?, ?)').run(
      id, userId, name, releaseDate, cover, createdAt
    )
    return { id, userId, name, releaseDate, cover, createdAt }
  },

  updateAlbum(id: string, name: string, releaseDate: string, cover: string | null): Album | null {
    const album = this.getAlbumById(id)
    if (!album) return null
    const finalCover = cover !== null ? cover : album.cover
    db.prepare('UPDATE albums SET name = ?, releaseDate = ?, cover = ? WHERE id = ?').run(
      name, releaseDate, finalCover, id
    )
    return { ...album, name, releaseDate, cover: finalCover }
  },

  deleteAlbum(id: string): boolean {
    const album = this.getAlbumById(id)
    if (!album) return false
    if (album.cover) {
      const coverPath = path.join(__dirname, '..', album.cover.replace(/^\//, ''))
      if (fs.existsSync(coverPath)) fs.unlinkSync(coverPath)
    }
    const songs = db.prepare('SELECT * FROM songs WHERE albumId = ?').all(id) as Song[]
    for (const song of songs) {
      if (song.audioUrl) {
        const audioPath = path.join(__dirname, '..', song.audioUrl.replace(/^\//, ''))
        if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath)
      }
    }
    db.prepare('DELETE FROM albums WHERE id = ?').run(id)
    return true
  },

  getSongsByAlbum(albumId: string): Song[] {
    const rows = db.prepare(`
      SELECT s.*,
        COALESCE(p.playCount, 0) as playCount,
        COALESCE(l.likeCount, 0) as likeCount
      FROM songs s
      LEFT JOIN (SELECT songId, COUNT(*) as playCount FROM plays GROUP BY songId) p ON p.songId = s.id
      LEFT JOIN (SELECT songId, COUNT(*) as likeCount FROM likes GROUP BY songId) l ON l.songId = s.id
      WHERE s.albumId = ?
      ORDER BY s.createdAt ASC
    `).all(albumId) as Song[]
    return rows
  },

  getSongById(id: string): Song | null {
    const row = db.prepare(`
      SELECT s.*,
        COALESCE(p.playCount, 0) as playCount,
        COALESCE(l.likeCount, 0) as likeCount
      FROM songs s
      LEFT JOIN (SELECT songId, COUNT(*) as playCount FROM plays GROUP BY songId) p ON p.songId = s.id
      LEFT JOIN (SELECT songId, COUNT(*) as likeCount FROM likes GROUP BY songId) l ON l.songId = s.id
      WHERE s.id = ?
    `).get(id) as Song | undefined
    return row || null
  },

  getAllSongs(): Song[] {
    const rows = db.prepare(`
      SELECT s.*,
        COALESCE(p.playCount, 0) as playCount,
        COALESCE(l.likeCount, 0) as likeCount
      FROM songs s
      LEFT JOIN (SELECT songId, COUNT(*) as playCount FROM plays GROUP BY songId) p ON p.songId = s.id
      LEFT JOIN (SELECT songId, COUNT(*) as likeCount FROM likes GROUP BY songId) l ON l.songId = s.id
      ORDER BY s.createdAt DESC
    `).all() as Song[]
    return rows
  },

  createSong(albumId: string, name: string, duration: number, audioUrl: string | null): Song {
    const id = uuidv4()
    const createdAt = new Date().toISOString()
    db.prepare('INSERT INTO songs (id, albumId, name, duration, audioUrl, createdAt) VALUES (?, ?, ?, ?, ?, ?)').run(
      id, albumId, name, duration, audioUrl, createdAt
    )
    return { id, albumId, name, duration, audioUrl, createdAt, playCount: 0, likeCount: 0 }
  },

  updateSong(id: string, name: string, audioUrl: string | null): Song | null {
    const song = this.getSongById(id)
    if (!song) return null
    const finalAudioUrl = audioUrl !== null ? audioUrl : song.audioUrl
    db.prepare('UPDATE songs SET name = ?, audioUrl = ? WHERE id = ?').run(name, finalAudioUrl, id)
    return { ...song, name, audioUrl: finalAudioUrl }
  },

  deleteSong(id: string): boolean {
    const song = this.getSongById(id)
    if (!song) return false
    if (song.audioUrl) {
      const audioPath = path.join(__dirname, '..', song.audioUrl.replace(/^\//, ''))
      if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath)
    }
    db.prepare('DELETE FROM songs WHERE id = ?').run(id)
    return true
  },

  getComments(songId: string): Comment[] {
    return db.prepare('SELECT * FROM comments WHERE songId = ? ORDER BY createdAt DESC').all(songId) as Comment[]
  },

  addComment(songId: string, nickname: string, content: string): Comment {
    const id = uuidv4()
    const createdAt = new Date().toISOString()
    db.prepare('INSERT INTO comments (id, songId, nickname, content, createdAt) VALUES (?, ?, ?, ?, ?)').run(
      id, songId, nickname, content, createdAt
    )
    return { id, songId, nickname, content, createdAt }
  },

  toggleLike(songId: string, sessionId: string): { liked: boolean; likeCount: number } {
    const existing = db.prepare('SELECT * FROM likes WHERE songId = ? AND sessionId = ?').get(songId, sessionId) as { id: string } | undefined
    if (existing) {
      db.prepare('DELETE FROM likes WHERE id = ?').run(existing.id)
    } else {
      const id = uuidv4()
      const createdAt = new Date().toISOString()
      db.prepare('INSERT INTO likes (id, songId, sessionId, createdAt) VALUES (?, ?, ?, ?)').run(
        id, songId, sessionId, createdAt
      )
    }
    const likeCount = (db.prepare('SELECT COUNT(*) as count FROM likes WHERE songId = ?').get(songId) as { count: number }).count
    return { liked: !existing, likeCount }
  },

  getLikeStatus(songId: string, sessionId: string): { liked: boolean; likeCount: number } {
    const existing = db.prepare('SELECT * FROM likes WHERE songId = ? AND sessionId = ?').get(songId, sessionId)
    const likeCount = (db.prepare('SELECT COUNT(*) as count FROM likes WHERE songId = ?').get(songId) as { count: number }).count
    return { liked: !!existing, likeCount }
  },

  recordPlay(songId: string): number {
    const id = uuidv4()
    const playedAt = new Date().toISOString()
    db.prepare('INSERT INTO plays (id, songId, playedAt) VALUES (?, ?, ?)').run(id, songId, playedAt)
    const playCount = (db.prepare('SELECT COUNT(*) as count FROM plays WHERE songId = ?').get(songId) as { count: number }).count
    return playCount
  },

  getPlaysTrend(days: number = 7): { date: string; count: number }[] {
    const rows = db.prepare(`
      SELECT DATE(playedAt) as date, COUNT(*) as count
      FROM plays
      WHERE playedAt >= datetime('now', '-' || ? || ' days')
      GROUP BY DATE(playedAt)
      ORDER BY date ASC
    `).all(days) as { date: string; count: number }[]

    const result: { date: string; count: number }[] = []
    const now = new Date()
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      const found = rows.find(r => r.date === dateStr)
      result.push({ date: dateStr, count: found ? found.count : 0 })
    }
    return result
  },

  getTopSongs(limit: number = 5): { song: Song; playCount: number }[] {
    const rows = db.prepare(`
      SELECT s.*, COALESCE(p.playCount, 0) as playCount
      FROM songs s
      LEFT JOIN (SELECT songId, COUNT(*) as playCount FROM plays GROUP BY songId) p ON p.songId = s.id
      ORDER BY playCount DESC
      LIMIT ?
    `).all(limit) as (Song & { playCount: number })[]
    return rows.map(r => ({ song: r, playCount: r.playCount }))
  },

  getSummary(): { totalPlays: number; totalLikes: number; totalComments: number } {
    const totalPlays = (db.prepare('SELECT COUNT(*) as count FROM plays').get() as { count: number }).count
    const totalLikes = (db.prepare('SELECT COUNT(*) as count FROM likes').get() as { count: number }).count
    const totalComments = (db.prepare('SELECT COUNT(*) as count FROM comments').get() as { count: number }).count
    return { totalPlays, totalLikes, totalComments }
  }
}

export default db
