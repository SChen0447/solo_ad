import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { Database } from './types.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const defaultData: Database = {
  users: [],
  products: [],
  orders: [],
  reviews: []
};

const dbFilePath = path.join(__dirname, 'db.json');
const adapter = new JSONFile<Database>(dbFilePath);
const db = new Low<Database>(adapter, defaultData);

await db.read();

if (!db.data) {
  db.data = defaultData;
  await db.write();
}

export default db;
