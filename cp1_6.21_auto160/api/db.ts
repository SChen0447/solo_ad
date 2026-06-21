import sqlite3 from 'sqlite3'

const db = new sqlite3.Database('./workshop.db', (err) => {
  if (err) {
    console.error('Database connection error:', err.message)
  } else {
    console.log('Connected to SQLite database')
    initTables()
  }
})

function initTables() {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      date TEXT NOT NULL,
      duration INTEGER NOT NULL,
      maxSlots INTEGER NOT NULL,
      fee REAL NOT NULL DEFAULT 0,
      description TEXT DEFAULT '',
      coverImage TEXT DEFAULT '',
      createdAt TEXT DEFAULT (datetime('now'))
    )`)

    db.run(`CREATE TABLE IF NOT EXISTS enrollments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      courseId INTEGER NOT NULL,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL,
      skillLevel TEXT NOT NULL CHECK(skillLevel IN ('beginner', 'intermediate', 'advanced')),
      createdAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (courseId) REFERENCES courses(id)
    )`)

    db.run(`CREATE TABLE IF NOT EXISTS materials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      courseId INTEGER NOT NULL,
      name TEXT NOT NULL,
      estimatedUsage REAL NOT NULL,
      unit TEXT NOT NULL,
      FOREIGN KEY (courseId) REFERENCES courses(id)
    )`)

    db.get('SELECT COUNT(*) as count FROM courses', (err, row: { count: number }) => {
      if (!err && row.count === 0) {
        seedData()
      }
    })
  })
}

function seedData() {
  const courses = [
    ['手工陶艺入门', '2026-07-05T14:00', 120, 15, 128, '从揉泥到拉坯，体验手作陶艺的乐趣，完成属于自己的第一个陶艺作品。', ''],
    ['编织艺术工坊', '2026-07-12T10:00', 90, 12, 88, '学习基础编织技法，制作一条精美手工围巾，感受线与针的温暖。', ''],
    ['木工手作体验', '2026-07-19T09:00', 150, 10, 168, '使用传统木工工具，亲手打磨一件实用木器，感受木与手的对话。', ''],
    ['皮艺手作课堂', '2026-07-26T14:00', 120, 8, 198, '从裁切到缝制，完成一个手工皮具卡包，体验皮革工艺的精致。', ''],
  ]

  const courseStmt = db.prepare('INSERT INTO courses (name, date, duration, maxSlots, fee, description, coverImage) VALUES (?, ?, ?, ?, ?, ?, ?)')
  for (const c of courses) {
    courseStmt.run(...c)
  }
  courseStmt.finalize()

  const materials = [
    [1, '陶土', 2, 'kg'],
    [1, '釉料', 0.5, 'kg'],
    [1, '修坯工具', 1, '套'],
    [2, '毛线', 3, '卷'],
    [2, '编织针', 1, '副'],
    [3, '木板', 1, '块'],
    [3, '砂纸', 3, '张'],
    [3, '木工胶', 1, '瓶'],
    [4, '植鞣革', 0.5, 'sqft'],
    [4, '缝线', 2, 'm'],
    [4, '铆钉', 4, '个'],
  ]

  const materialStmt = db.prepare('INSERT INTO materials (courseId, name, estimatedUsage, unit) VALUES (?, ?, ?, ?)')
  for (const m of materials) {
    materialStmt.run(...m)
  }
  materialStmt.finalize()

  const enrollments = [
    [1, '张小明', '13800138001', 'zhangxm@example.com', 'beginner'],
    [1, '李芳', '13900139002', 'lifang@example.com', 'intermediate'],
    [2, '王大伟', '13700137003', 'wangdw@example.com', 'beginner'],
    [3, '赵敏', '13600136004', 'zhaomin@example.com', 'advanced'],
    [4, '陈思远', '13500135005', 'chensy@example.com', 'intermediate'],
  ]

  const enrollStmt = db.prepare('INSERT INTO enrollments (courseId, name, phone, email, skillLevel) VALUES (?, ?, ?, ?, ?)')
  for (const e of enrollments) {
    enrollStmt.run(...e)
  }
  enrollStmt.finalize()

  console.log('Seed data inserted')
}

export const dbRun = (sql: string, params: unknown[] = []): Promise<{ lastID: number; changes: number }> => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err)
      else resolve({ lastID: this.lastID, changes: this.changes })
    })
  })
}

export const dbGet = <T = unknown>(sql: string, params: unknown[] = []): Promise<T> => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err)
      else resolve(row as T)
    })
  })
}

export const dbAll = <T = unknown>(sql: string, params: unknown[] = []): Promise<T[]> => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err)
      else resolve(rows as T[])
    })
  })
}

export default db
