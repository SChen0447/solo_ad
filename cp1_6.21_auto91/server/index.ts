import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';
import plotRoutes from './routes/plotRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const db = new Database(path.join(__dirname, '..', 'garden.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS plots (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    area REAL NOT NULL,
    orientation TEXT NOT NULL,
    soilType TEXT NOT NULL CHECK(soilType IN ('sandy', 'loam', 'clay')),
    createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS planting_records (
    id TEXT PRIMARY KEY,
    plotId TEXT NOT NULL,
    cropName TEXT NOT NULL,
    family TEXT NOT NULL CHECK(family IN ('solanaceae', 'brassicaceae', 'fabaceae', 'cucurbitaceae', 'apiaceae', 'chenopodiaceae', 'asteraceae')),
    plantingDate TEXT NOT NULL,
    expectedHarvestDate TEXT NOT NULL,
    actualHarvestDate TEXT,
    yield REAL,
    notes TEXT,
    cycleDays INTEGER,
    idleDays INTEGER,
    FOREIGN KEY (plotId) REFERENCES plots(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS crops (
    name TEXT PRIMARY KEY,
    family TEXT NOT NULL,
    companions TEXT,
    averageCycle INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_records_plotId ON planting_records(plotId);
  CREATE INDEX IF NOT EXISTS idx_records_date ON planting_records(plantingDate);
`);

const cropData = [
  { name: '番茄', family: 'solanaceae', companions: '胡萝卜,洋葱,生菜', averageCycle: 90 },
  { name: '茄子', family: 'solanaceae', companions: '豆类,辣椒,菠菜', averageCycle: 100 },
  { name: '辣椒', family: 'solanaceae', companions: '番茄,茄子,罗勒', averageCycle: 85 },
  { name: '土豆', family: 'solanaceae', companions: '白菜,胡萝卜,洋葱', averageCycle: 120 },
  { name: '白菜', family: 'brassicaceae', companions: '土豆,芹菜,洋葱', averageCycle: 70 },
  { name: '西兰花', family: 'brassicaceae', companions: '土豆,胡萝卜,洋葱', averageCycle: 90 },
  { name: '花椰菜', family: 'brassicaceae', companions: '豆类,甜菜,芹菜', averageCycle: 85 },
  { name: '萝卜', family: 'brassicaceae', companions: '番茄,辣椒,菠菜', averageCycle: 45 },
  { name: '大豆', family: 'fabaceae', companions: '玉米,土豆,白菜', averageCycle: 110 },
  { name: '豌豆', family: 'fabaceae', companions: '胡萝卜,白萝卜,生菜', averageCycle: 75 },
  { name: '四季豆', family: 'fabaceae', companions: '土豆,黄瓜,白菜', averageCycle: 65 },
  { name: '蚕豆', family: 'fabaceae', companions: '小麦,土豆,白菜', averageCycle: 95 },
  { name: '黄瓜', family: 'cucurbitaceae', companions: '豆类,玉米,白菜', averageCycle: 60 },
  { name: '南瓜', family: 'cucurbitaceae', companions: '玉米,豆类,萝卜', averageCycle: 110 },
  { name: '西瓜', family: 'cucurbitaceae', companions: '玉米,豆类,花生', averageCycle: 100 },
  { name: '甜瓜', family: 'cucurbitaceae', companions: '玉米,向日葵,豆类', averageCycle: 90 },
  { name: '胡萝卜', family: 'apiaceae', companions: '番茄,豌豆,洋葱', averageCycle: 80 },
  { name: '芹菜', family: 'apiaceae', companions: '白菜,番茄,豆类', averageCycle: 95 },
  { name: '菠菜', family: 'chenopodiaceae', companions: '茄子,萝卜,草莓', averageCycle: 45 },
  { name: '生菜', family: 'asteraceae', companions: '番茄,胡萝卜,豌豆', averageCycle: 50 },
];

const insertCrop = db.prepare('INSERT OR IGNORE INTO crops (name, family, companions, averageCycle) VALUES (?, ?, ?, ?)');
const transaction = db.transaction((crops: typeof cropData) => {
  for (const crop of crops) {
    insertCrop.run(crop.name, crop.family, crop.companions, crop.averageCycle);
  }
});
transaction(cropData);

const samplePlots = [
  { id: uuidv4(), name: '东一号地块', area: 50, orientation: '东向', soilType: 'loam' },
  { id: uuidv4(), name: '南二号地块', area: 40, orientation: '南向', soilType: 'sandy' },
  { id: uuidv4(), name: '西三号地块', area: 60, orientation: '西向', soilType: 'clay' },
  { id: uuidv4(), name: '北四号地块', area: 45, orientation: '北向', soilType: 'loam' },
  { id: uuidv4(), name: '中五号地块', area: 55, orientation: '东南向', soilType: 'sandy' },
];

const plotCount = db.prepare('SELECT COUNT(*) as count FROM plots').get() as { count: number };
if (plotCount.count === 0) {
  const insertPlot = db.prepare('INSERT INTO plots (id, name, area, orientation, soilType) VALUES (?, ?, ?, ?, ?)');
  const plotTransaction = db.transaction((plots: typeof samplePlots) => {
    for (const plot of plots) {
      insertPlot.run(plot.id, plot.name, plot.area, plot.orientation, plot.soilType);
    }
  });
  plotTransaction(samplePlots);

  const today = new Date();
  const sampleRecords = [
    {
      plotId: samplePlots[0].id,
      cropName: '番茄',
      family: 'solanaceae',
      plantingDate: new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      expectedHarvestDate: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      yield: null,
    },
    {
      plotId: samplePlots[1].id,
      cropName: '白菜',
      family: 'brassicaceae',
      plantingDate: new Date(today.getTime() - 40 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      expectedHarvestDate: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      yield: null,
    },
    {
      plotId: samplePlots[2].id,
      cropName: '黄瓜',
      family: 'cucurbitaceae',
      plantingDate: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      expectedHarvestDate: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      yield: null,
    },
    {
      plotId: samplePlots[3].id,
      cropName: '豌豆',
      family: 'fabaceae',
      plantingDate: new Date(today.getTime() - 50 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      expectedHarvestDate: new Date(today.getTime() + 25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      yield: null,
    },
    {
      plotId: samplePlots[4].id,
      cropName: '胡萝卜',
      family: 'apiaceae',
      plantingDate: new Date(today.getTime() - 70 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      expectedHarvestDate: new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      yield: null,
    },
  ];

  const insertRecord = db.prepare(`
    INSERT INTO planting_records (id, plotId, cropName, family, plantingDate, expectedHarvestDate, actualHarvestDate, yield, notes, cycleDays, idleDays)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const recordTransaction = db.transaction((records: typeof sampleRecords) => {
    for (const record of records) {
      const cycleDays = Math.ceil(
        (new Date(record.expectedHarvestDate).getTime() - new Date(record.plantingDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      insertRecord.run(
        uuidv4(),
        record.plotId,
        record.cropName,
        record.family,
        record.plantingDate,
        record.expectedHarvestDate,
        null,
        null,
        null,
        cycleDays,
        0
      );
    }
  });
  recordTransaction(sampleRecords);
}

app.use((req, _res, next) => {
  (req as unknown as { db: Database.Database }).db = db;
  next();
});

app.use('/api', plotRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
