import { Application } from 'egg';
import * as sqlite3 from 'sqlite3';
import * as path from 'path';

export default (app: Application) => {
  const dbPath = path.join(app.baseDir, '..', app.config.dbPath || 'coffee_roast.db');
  const db = new sqlite3.Database(dbPath);

  db.serialize(() => {
    db.run(`
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
    `, (err) => {
      if (err) {
        console.error('Failed to create table:', err.message);
      } else {
        console.log('Database initialized successfully');
      }
    });
  });

  app.db = db;
};
