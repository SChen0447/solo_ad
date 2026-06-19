import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.resolve(__dirname, '../data');

export async function readJson<T>(filename: string): Promise<T[]> {
  const filePath = path.join(dataDir, filename);
  const data = await fs.promises.readFile(filePath, 'utf-8');
  return JSON.parse(data) as T[];
}

export async function writeJson<T>(filename: string, data: T[]): Promise<void> {
  const filePath = path.join(dataDir, filename);
  await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}
