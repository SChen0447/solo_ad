import { openDB, IDBPDatabase } from 'idb'
import { BrandProject, ColorPalette } from '../types'

const DB_NAME = 'brand-studio-db'
const DB_VERSION = 1

const BRAND_STORE = 'brand_projects'
const PALETTE_STORE = 'color_palettes'

let dbInstance: IDBPDatabase | null = null

async function getDB(): Promise<IDBPDatabase> {
  if (dbInstance) return dbInstance
  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(BRAND_STORE)) {
        const brandStore = db.createObjectStore(BRAND_STORE, { keyPath: 'id' })
        brandStore.createIndex('name', 'name', { unique: false })
        brandStore.createIndex('lastAccessedAt', 'lastAccessedAt', { unique: false })
      }
      if (!db.objectStoreNames.contains(PALETTE_STORE)) {
        const paletteStore = db.createObjectStore(PALETTE_STORE, { keyPath: 'id' })
        paletteStore.createIndex('createdAt', 'createdAt', { unique: false })
      }
    }
  })
  return dbInstance
}

export const brandDB = {
  async getAll(): Promise<BrandProject[]> {
    const db = await getDB()
    const result = await db.getAllFromIndex(BRAND_STORE, 'lastAccessedAt')
    return result.reverse() as BrandProject[]
  },

  async getById(id: string): Promise<BrandProject | undefined> {
    const db = await getDB()
    return (await db.get(BRAND_STORE, id)) as BrandProject | undefined
  },

  async add(project: BrandProject): Promise<string> {
    const db = await getDB()
    await db.put(BRAND_STORE, project)
    return project.id
  },

  async update(project: BrandProject): Promise<string> {
    const db = await getDB()
    await db.put(BRAND_STORE, project)
    return project.id
  },

  async delete(id: string): Promise<void> {
    const db = await getDB()
    await db.delete(BRAND_STORE, id)
  },

  async getRecent(limit: number = 4): Promise<BrandProject[]> {
    const all = await this.getAll()
    return all.slice(0, limit)
  }
}

export const paletteDB = {
  async getAll(): Promise<ColorPalette[]> {
    const db = await getDB()
    const result = await db.getAllFromIndex(PALETTE_STORE, 'createdAt')
    return result.reverse() as ColorPalette[]
  },

  async add(palette: ColorPalette): Promise<string> {
    const db = await getDB()
    await db.put(PALETTE_STORE, palette)
    return palette.id
  },

  async delete(id: string): Promise<void> {
    const db = await getDB()
    await db.delete(PALETTE_STORE, id)
  }
}
