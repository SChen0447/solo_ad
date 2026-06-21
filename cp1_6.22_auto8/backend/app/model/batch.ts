import { Application } from 'egg';

module.exports = (app: Application) => {
  const db = app.sqlite3;

  const createTable();

  async function createTable() {
    try {
      await db.exec(`
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
    } catch (err) {
      console.error('Failed to create table:', err);
    }
  }

  return {
    async findAll(offset = 0, limit = 20, filters = {}) {
      let sql = 'SELECT * FROM batches WHERE 1=1';
      const params: any[] = [];

      if (filters.beanId) {
        sql += ' AND beanId = ?';
        params.push(filters.beanId);
      }

      sql += ' ORDER BY createdAt DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const rows = await db.all(sql, params);
      return rows.map(row => ({
        ...row,
        curveData: JSON.parse(row.curveData),
        flavors: JSON.parse(row.flavors),
      }));
    },

    async findById(id: number) {
      const row = await db.get('SELECT * FROM batches WHERE id = ?', [id]);
      if (!row) return null;
      return {
        ...row,
        curveData: JSON.parse(row.curveData),
        flavors: JSON.parse(row.flavors),
      };
    },

    async create(data: any) {
      const { beanId, date, duration, inTemp, outTemp, curveData, flavors, notes = '' } = data;
      const result = await db.run(
        'INSERT INTO batches (beanId, date, duration, inTemp, outTemp, curveData, flavors, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [beanId, date, duration, inTemp, outTemp, JSON.stringify(curveData), JSON.stringify(flavors), notes]
      );
      return this.findById(result.lastID);
    },

    async findByIds(ids: number[]) {
      const placeholders = ids.map(() => '?').join(',');
      const rows = await db.all(`SELECT * FROM batches WHERE id IN (${placeholders})`, ids);
      return rows.map(row => ({
        ...row,
        curveData: JSON.parse(row.curveData),
        flavors: JSON.parse(row.flavors),
      }));
    },
  };
};
