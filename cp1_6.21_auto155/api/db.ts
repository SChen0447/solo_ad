import Database from 'better-sqlite3'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const db = new Database(path.join(__dirname, 'petcare.db'))

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('owner', 'caregiver'))
  );

  CREATE TABLE IF NOT EXISTS pets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    breed TEXT NOT NULL,
    age INTEGER NOT NULL,
    personality TEXT NOT NULL,
    vaccine TEXT NOT NULL CHECK(vaccine IN ('已打全', '部分', '未打')),
    ownerId TEXT NOT NULL,
    FOREIGN KEY (ownerId) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    petId TEXT NOT NULL,
    startTime TEXT NOT NULL,
    endTime TEXT NOT NULL,
    location TEXT NOT NULL,
    duration INTEGER NOT NULL,
    reward INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'assigned', 'completed')),
    ownerId TEXT NOT NULL,
    caregiverId TEXT,
    FOREIGN KEY (petId) REFERENCES pets(id),
    FOREIGN KEY (ownerId) REFERENCES users(id),
    FOREIGN KEY (caregiverId) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS evaluations (
    id TEXT PRIMARY KEY,
    taskId TEXT NOT NULL,
    caregiverId TEXT NOT NULL,
    ownerId TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
    comment TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    FOREIGN KEY (taskId) REFERENCES tasks(id),
    FOREIGN KEY (caregiverId) REFERENCES users(id),
    FOREIGN KEY (ownerId) REFERENCES users(id)
  );
`)

const seedCaregivers = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?').get('caregiver') as { count: number }
if (seedCaregivers.count === 0) {
  const insertUser = db.prepare('INSERT INTO users (id, name, password, role) VALUES (?, ?, ?, ?)')
  const insertPet = db.prepare('INSERT INTO pets (id, name, breed, age, personality, vaccine, ownerId) VALUES (?, ?, ?, ?, ?, ?, ?)')
  const insertTask = db.prepare('INSERT INTO tasks (id, petId, startTime, endTime, location, duration, reward, status, ownerId, caregiverId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
  const insertEval = db.prepare('INSERT INTO evaluations (id, taskId, caregiverId, ownerId, rating, comment, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)')

  const transaction = db.transaction(() => {
    const caregivers = [
      { id: 'cg1', name: '小王' },
      { id: 'cg2', name: '阿李' },
      { id: 'cg3', name: '张姐' },
      { id: 'cg4', name: '赵哥' },
      { id: 'cg5', name: '刘阿姨' },
    ]
    for (const cg of caregivers) {
      insertUser.run(cg.id, cg.name, '123456', 'caregiver')
    }

    const owners = [
      { id: 'ow1', name: '小明' },
      { id: 'ow2', name: '小红' },
      { id: 'ow3', name: '大刚' },
    ]
    for (const ow of owners) {
      insertUser.run(ow.id, ow.name, '123456', 'owner')
    }

    const pets = [
      { id: 'pet1', name: '豆豆', breed: '金毛', age: 3, personality: '活泼,粘人', vaccine: '已打全', ownerId: 'ow1' },
      { id: 'pet2', name: '球球', breed: '柯基', age: 2, personality: '活泼,独立', vaccine: '已打全', ownerId: 'ow1' },
      { id: 'pet3', name: '咪咪', breed: '布偶猫', age: 1, personality: '安静,粘人', vaccine: '部分', ownerId: 'ow2' },
      { id: 'pet4', name: '团子', breed: '英短', age: 4, personality: '安静,独立', vaccine: '已打全', ownerId: 'ow2' },
      { id: 'pet5', name: '旺财', breed: '柴犬', age: 2, personality: '活泼,护食', vaccine: '已打全', ownerId: 'ow3' },
    ]
    for (const pet of pets) {
      insertPet.run(pet.id, pet.name, pet.breed, pet.age, pet.personality, pet.vaccine, pet.ownerId)
    }

    const tasks = [
      { id: 'task1', petId: 'pet1', startTime: '2026-06-22 09:00', endTime: '2026-06-22 17:00', location: '朝阳区望京SOHO', duration: 8, reward: 200, status: 'completed', ownerId: 'ow1', caregiverId: 'cg1' },
      { id: 'task2', petId: 'pet3', startTime: '2026-06-23 10:00', endTime: '2026-06-23 14:00', location: '海淀区中关村', duration: 4, reward: 120, status: 'completed', ownerId: 'ow2', caregiverId: 'cg2' },
      { id: 'task3', petId: 'pet2', startTime: '2026-06-24 08:00', endTime: '2026-06-24 12:00', location: '西城区金融街', duration: 4, reward: 100, status: 'completed', ownerId: 'ow1', caregiverId: 'cg1' },
      { id: 'task4', petId: 'pet5', startTime: '2026-06-25 14:00', endTime: '2026-06-25 18:00', location: '东城区王府井', duration: 4, reward: 150, status: 'completed', ownerId: 'ow3', caregiverId: 'cg3' },
      { id: 'task5', petId: 'pet4', startTime: '2026-06-26 09:00', endTime: '2026-06-26 13:00', location: '丰台区方庄', duration: 4, reward: 80, status: 'completed', ownerId: 'ow2', caregiverId: 'cg4' },
      { id: 'task6', petId: 'pet1', startTime: '2026-06-27 10:00', endTime: '2026-06-27 12:00', location: '朝阳区三里屯', duration: 2, reward: 60, status: 'completed', ownerId: 'ow1', caregiverId: 'cg5' },
      { id: 'task7', petId: 'pet3', startTime: '2026-06-28 15:00', endTime: '2026-06-28 18:00', location: '海淀区五道口', duration: 3, reward: 90, status: 'assigned', ownerId: 'ow2', caregiverId: 'cg1' },
      { id: 'task8', petId: 'pet5', startTime: '2026-06-29 09:00', endTime: '2026-06-29 11:00', location: '朝阳区国贸', duration: 2, reward: 50, status: 'pending', ownerId: 'ow3', caregiverId: null },
      { id: 'task9', petId: 'pet2', startTime: '2026-06-30 14:00', endTime: '2026-06-30 18:00', location: '西城区西单', duration: 4, reward: 120, status: 'pending', ownerId: 'ow1', caregiverId: null },
      { id: 'task10', petId: 'pet4', startTime: '2026-07-01 10:00', endTime: '2026-07-01 15:00', location: '东城区东直门', duration: 5, reward: 160, status: 'pending', ownerId: 'ow2', caregiverId: null },
    ]
    for (const task of tasks) {
      insertTask.run(task.id, task.petId, task.startTime, task.endTime, task.location, task.duration, task.reward, task.status, task.ownerId, task.caregiverId)
    }

    const evals = [
      { id: 'eval1', taskId: 'task1', caregiverId: 'cg1', ownerId: 'ow1', rating: 5, comment: '小王非常负责，豆豆和他玩得很开心，下次还找他！', createdAt: '2026-06-22T18:00:00' },
      { id: 'eval2', taskId: 'task2', caregiverId: 'cg2', ownerId: 'ow2', rating: 4, comment: '阿李对猫咪很温柔，咪咪没有应激反应，很不错', createdAt: '2026-06-23T14:30:00' },
      { id: 'eval3', taskId: 'task3', caregiverId: 'cg1', ownerId: 'ow1', rating: 5, comment: '第二次找小王了，一如既往的靠谱，球球也很喜欢他', createdAt: '2026-06-24T12:30:00' },
      { id: 'eval4', taskId: 'task4', caregiverId: 'cg3', ownerId: 'ow3', rating: 4, comment: '张姐很有经验，遛狗时间控制得很好', createdAt: '2026-06-25T18:30:00' },
      { id: 'eval5', taskId: 'task5', caregiverId: 'cg4', ownerId: 'ow2', rating: 3, comment: '赵哥还行，不过来得稍晚了一点', createdAt: '2026-06-26T13:30:00' },
      { id: 'eval6', taskId: 'task6', caregiverId: 'cg5', ownerId: 'ow1', rating: 4, comment: '刘阿姨人很和蔼，照顾得很细致', createdAt: '2026-06-27T12:30:00' },
    ]
    for (const ev of evals) {
      insertEval.run(ev.id, ev.taskId, ev.caregiverId, ev.ownerId, ev.rating, ev.comment, ev.createdAt)
    }
  })

  transaction()
}

export interface User {
  id: string
  name: string
  password: string
  role: 'owner' | 'caregiver'
}

export interface Pet {
  id: string
  name: string
  breed: string
  age: number
  personality: string
  vaccine: string
  ownerId: string
}

export interface Task {
  id: string
  petId: string
  startTime: string
  endTime: string
  location: string
  duration: number
  reward: number
  status: string
  ownerId: string
  caregiverId: string | null
}

export interface Evaluation {
  id: string
  taskId: string
  caregiverId: string
  ownerId: string
  rating: number
  comment: string
  createdAt: string
}

export function registerUser(name: string, password: string, role: string): User | null {
  try {
    const id = uuidv4()
    db.prepare('INSERT INTO users (id, name, password, role) VALUES (?, ?, ?, ?)').run(id, name, password, role)
    return { id, name, password, role } as User
  } catch {
    return null
  }
}

export function loginUser(name: string, password: string): User | null {
  const row = db.prepare('SELECT * FROM users WHERE name = ? AND password = ?').get(name, password) as User | undefined
  return row || null
}

export function getUserById(id: string): User | null {
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined
  return row || null
}

export function getPetsByOwner(ownerId: string): Pet[] {
  return db.prepare('SELECT * FROM pets WHERE ownerId = ?').all(ownerId) as Pet[]
}

export function addPet(pet: Omit<Pet, 'id'>): Pet {
  const id = uuidv4()
  db.prepare('INSERT INTO pets (id, name, breed, age, personality, vaccine, ownerId) VALUES (?, ?, ?, ?, ?, ?, ?)').run(id, pet.name, pet.breed, pet.age, pet.personality, pet.vaccine, pet.ownerId)
  return { id, ...pet }
}

export function updatePet(id: string, data: Partial<Pet>): Pet | null {
  const existing = db.prepare('SELECT * FROM pets WHERE id = ?').get(id) as Pet | undefined
  if (!existing) return null
  const updated = { ...existing, ...data }
  db.prepare('UPDATE pets SET name = ?, breed = ?, age = ?, personality = ?, vaccine = ? WHERE id = ?').run(updated.name, updated.breed, updated.age, updated.personality, updated.vaccine, id)
  return updated
}

export function deletePet(id: string): boolean {
  const result = db.prepare('DELETE FROM pets WHERE id = ?').run(id)
  return result.changes > 0
}

export function getAllTasks(): any[] {
  return db.prepare(`
    SELECT t.*, p.name as petName, p.breed as petBreed, p.age as petAge,
      o.name as ownerName,
      c.name as caregiverName
    FROM tasks t
    LEFT JOIN pets p ON t.petId = p.id
    LEFT JOIN users o ON t.ownerId = o.id
    LEFT JOIN users c ON t.caregiverId = c.id
    ORDER BY t.startTime DESC
  `).all()
}

export function getHotTasks(): any[] {
  return db.prepare(`
    SELECT t.*, p.name as petName, p.breed as petBreed, p.age as petAge,
      o.name as ownerName,
      c.name as caregiverName
    FROM tasks t
    LEFT JOIN pets p ON t.petId = p.id
    LEFT JOIN users o ON t.ownerId = o.id
    LEFT JOIN users c ON t.caregiverId = c.id
    WHERE t.status = 'pending'
    ORDER BY t.startTime ASC
    LIMIT 10
  `).all()
}

export function createTask(task: Omit<Task, 'id'>): Task {
  const id = uuidv4()
  db.prepare('INSERT INTO tasks (id, petId, startTime, endTime, location, duration, reward, status, ownerId, caregiverId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(id, task.petId, task.startTime, task.endTime, task.location, task.duration, task.reward, task.status, task.ownerId, task.caregiverId)
  return { id, ...task }
}

export function assignTask(taskId: string, caregiverId: string): Task | null {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId) as Task | undefined
  if (!task || task.status !== 'pending') return null
  db.prepare('UPDATE tasks SET status = ?, caregiverId = ? WHERE id = ?').run('assigned', caregiverId, taskId)
  task.status = 'assigned'
  task.caregiverId = caregiverId
  return task
}

export function completeTask(taskId: string): Task | null {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId) as Task | undefined
  if (!task || task.status !== 'assigned') return null
  db.prepare('UPDATE tasks SET status = ? WHERE id = ?').run('completed', taskId)
  task.status = 'completed'
  return task
}

export function addEvaluation(evalData: Omit<Evaluation, 'id'>): Evaluation {
  const id = uuidv4()
  db.prepare('INSERT INTO evaluations (id, taskId, caregiverId, ownerId, rating, comment, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)').run(id, evalData.taskId, evalData.caregiverId, evalData.ownerId, evalData.rating, evalData.comment, evalData.createdAt)
  return { id, ...evalData }
}

export function getEvaluationsByCaregiver(caregiverId: string): any[] {
  return db.prepare(`
    SELECT e.*, o.name as ownerName, p.name as petName, t.startTime as serviceTime
    FROM evaluations e
    LEFT JOIN users o ON e.ownerId = o.id
    LEFT JOIN tasks t ON e.taskId = t.id
    LEFT JOIN pets p ON t.petId = p.id
    WHERE e.caregiverId = ?
    ORDER BY e.createdAt DESC
  `).all(caregiverId)
}

export function getTopCaregivers(limit: number = 5): any[] {
  return db.prepare(`
    SELECT u.id, u.name,
      COALESCE(AVG(e.rating), 0) as avgRating,
      COUNT(DISTINCT t.id) as totalOrders,
      (SELECT e2.comment FROM evaluations e2 WHERE e2.caregiverId = u.id ORDER BY e2.createdAt DESC LIMIT 1) as recentComment
    FROM users u
    LEFT JOIN tasks t ON t.caregiverId = u.id AND t.status = 'completed'
    LEFT JOIN evaluations e ON e.caregiverId = u.id
    WHERE u.role = 'caregiver'
    GROUP BY u.id, u.name
    ORDER BY avgRating DESC, totalOrders DESC
    LIMIT ?
  `).all(limit)
}

export function getCaregiverStats(caregiverId: string): any {
  return db.prepare(`
    SELECT u.id, u.name,
      COALESCE(AVG(e.rating), 0) as avgRating,
      COUNT(DISTINCT t.id) as totalOrders,
      (SELECT e2.comment FROM evaluations e2 WHERE e2.caregiverId = u.id ORDER BY e2.createdAt DESC LIMIT 1) as recentComment
    FROM users u
    LEFT JOIN tasks t ON t.caregiverId = u.id AND t.status = 'completed'
    LEFT JOIN evaluations e ON e.caregiverId = u.id
    WHERE u.id = ?
    GROUP BY u.id, u.name
  `).get(caregiverId)
}

export function getCaregiverDetail(caregiverId: string): any {
  const caregiver = db.prepare('SELECT * FROM users WHERE id = ? AND role = ?').get(caregiverId, 'caregiver') as User | undefined
  if (!caregiver) return null
  const stats = getCaregiverStats(caregiverId)
  const evaluations = getEvaluationsByCaregiver(caregiverId)
  return { ...caregiver, ...stats, evaluations }
}

export function getTaskById(taskId: string): any {
  return db.prepare(`
    SELECT t.*, p.name as petName, p.breed as petBreed, p.age as petAge, p.personality as petPersonality, p.vaccine as petVaccine,
      o.name as ownerName,
      c.name as caregiverName
    FROM tasks t
    LEFT JOIN pets p ON t.petId = p.id
    LEFT JOIN users o ON t.ownerId = o.id
    LEFT JOIN users c ON t.caregiverId = c.id
    WHERE t.id = ?
  `).get(taskId)
}

export function getEvaluationByTask(taskId: string): Evaluation | null {
  return db.prepare('SELECT * FROM evaluations WHERE taskId = ?').get(taskId) as Evaluation | undefined || null
}

export default db
