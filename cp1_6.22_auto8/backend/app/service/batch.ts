import { Service } from 'egg';
import * as sqlite3 from 'sqlite3';
import * as path from 'path';
import { Database } from 'sqlite3';

interface Batch {
  id: number;
  userId: number;
  beanId: string;
  date: string;
  duration: number;
  inTemp: number;
  outTemp: number;
  curveData: any;
  flavors: any;
  notes: string;
  createdAt: string;
}

class BatchService extends Service {
  private db: Database;

  constructor(ctx: any) {
    super(ctx);
    const dbPath = path.join(this.app.baseDir, '..', this.config.dbPath || 'coffee_roast.db');
    this.db = new sqlite3.Database(dbPath);
    this.initTable();
  }

  private initTable() {
    this.db.serialize(() => {
      this.db.run(`
        CREATE TABLE IF NOT EXISTS batches (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId INTEGER DEFAULT 1,
          beanId TEXT NOT NULL,
          date TEXT NOT NULL,
          duration INTEGER NOT NULL,
          inTemp REAL NOT NULL,
          outTemp REAL NOT NULL,
          curveData TEXT NOT NULL,
          flavors TEXT NOT NULL,
          notes TEXT DEFAULT '',
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
    });
  }

  private rowToBatch(row: any): Batch {
    return {
      ...row,
      curveData: JSON.parse(row.curveData),
      flavors: JSON.parse(row.flavors),
    };
  }

  async findAll(offset = 0, limit = 20, filters: { beanId?: string } = {}): Promise<Batch[]> {
    return new Promise((resolve, reject) => {
      let sql = 'SELECT * FROM batches WHERE 1=1';
      const params: any[] = [];

      if (filters.beanId) {
        sql += ' AND beanId = ?';
        params.push(filters.beanId);
      }

      sql += ' ORDER BY createdAt DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows.map(row => this.rowToBatch(row)));
        }
      });
    });
  }

  async findById(id: number): Promise<Batch | null> {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM batches WHERE id = ?', [id], (err, row) => {
        if (err) {
          reject(err);
        } else if (!row) {
          resolve(null);
        } else {
          resolve(this.rowToBatch(row));
        }
      });
    });
  }

  async create(data: Omit<Batch, 'id' | 'userId' | 'createdAt'>): Promise<Batch> {
    return new Promise((resolve, reject) => {
      const { beanId, date, duration, inTemp, outTemp, curveData, flavors, notes } = data;
      this.db.run(
        'INSERT INTO batches (beanId, date, duration, inTemp, outTemp, curveData, flavors, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [beanId, date, duration, inTemp, outTemp, JSON.stringify(curveData), JSON.stringify(flavors), notes || ''],
        function(err) {
          if (err) {
            reject(err);
          } else {
            const id = this.lastID;
            this.findById(id).then(batch => resolve(batch!)).catch(reject);
          }
        }
      );
    });
  }

  async findByIds(ids: number[]): Promise<Batch[]> {
    return new Promise((resolve, reject) => {
      if (ids.length === 0) {
        resolve([]);
        return;
      }
      const placeholders = ids.map(() => '?').join(',');
      this.db.all(`SELECT * FROM batches WHERE id IN (${placeholders})`, ids, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows.map(row => this.rowToBatch(row)));
        }
      });
    });
  }
}

export default BatchService;
