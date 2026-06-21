import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DATA_DIR = path.resolve(__dirname, '..', 'data')

export function readJSONFile<T>(filename: string): T {
  const filePath = path.join(DATA_DIR, filename)
  const rawData = fs.readFileSync(filePath, 'utf-8')
  return JSON.parse(rawData) as T
}

export function writeJSONFile<T>(filename: string, data: T): void {
  const filePath = path.join(DATA_DIR, filename)
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
}
