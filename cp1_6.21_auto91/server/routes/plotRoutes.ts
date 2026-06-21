import { Router, Request, Response } from 'express';
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

interface Plot {
  id: string;
  name: string;
  area: number;
  orientation: string;
  soilType: 'sandy' | 'loam' | 'clay';
  createdAt: string;
}

interface PlantingRecord {
  id: string;
  plotId: string;
  cropName: string;
  family: string;
  plantingDate: string;
  expectedHarvestDate: string;
  actualHarvestDate?: string;
  yield?: number;
  notes?: string;
  cycleDays: number;
  idleDays: number;
}

interface Crop {
  name: string;
  family: string;
  companions: string;
  averageCycle: number;
}

interface RotationValidation {
  valid: boolean;
  message: string;
  recommendations: string[];
}

const getDb = (req: Request): Database.Database => {
  return (req as unknown as { db: Database.Database }).db;
};

const calculateCycleDays = (plantingDate: string, expectedHarvestDate: string): number => {
  return Math.ceil(
    (new Date(expectedHarvestDate).getTime() - new Date(plantingDate).getTime()) / (1000 * 60 * 60 * 24)
  );
};

const calculateIdleDays = (db: Database.Database, plotId: string, plantingDate: string): number => {
  const lastRecord = db.prepare(`
    SELECT actualHarvestDate FROM planting_records
    WHERE plotId = ? AND actualHarvestDate IS NOT NULL
    ORDER BY actualHarvestDate DESC LIMIT 1
  `).get(plotId) as { actualHarvestDate: string } | undefined;

  if (!lastRecord) return 0;
  return Math.ceil(
    (new Date(plantingDate).getTime() - new Date(lastRecord.actualHarvestDate).getTime()) / (1000 * 60 * 60 * 24)
  );
};

const validateRotation = (
  db: Database.Database,
  plotId: string,
  newCropFamily: string,
  newCropName: string
): RotationValidation => {
  const lastRecords = db.prepare(`
    SELECT cropName, family FROM planting_records
    WHERE plotId = ?
    ORDER BY plantingDate DESC LIMIT 2
  `).all(plotId) as { cropName: string; family: string }[];

  const recommendations: string[] = [];

  for (const record of lastRecords) {
    if (record.family === newCropFamily) {
      return {
        valid: false,
        message: `轮作规则违反：前2次种植包含${record.cropName}（同科属），请间隔至少2个周期再种植${newCropName}`,
        recommendations: []
      };
    }
  }

  const crop = db.prepare('SELECT companions FROM crops WHERE name = ?').get(newCropName) as { companions: string } | undefined;
  if (crop?.companions) {
    recommendations.push(`推荐伴生作物：${crop.companions}`);
  }

  if (lastRecords.length > 0) {
    recommendations.push(`上一次种植：${lastRecords[0].cropName}，轮作间隔合理`);
  }

  return {
    valid: true,
    message: '轮作规则验证通过',
    recommendations
  };
};

router.get('/plots', (req: Request, res: Response) => {
  const db = getDb(req);
  const plots = db.prepare('SELECT * FROM plots ORDER BY createdAt DESC').all() as Plot[];

  const plotsWithStatus = plots.map(plot => {
    const currentRecord = db.prepare(`
      SELECT * FROM planting_records
      WHERE plotId = ? AND actualHarvestDate IS NULL
      ORDER BY plantingDate DESC LIMIT 1
    `).get(plot.id) as PlantingRecord | undefined;

    const expectedHarvest = currentRecord ? new Date(currentRecord.expectedHarvestDate) : null;
    const today = new Date();
    const daysToHarvest = expectedHarvest
      ? Math.ceil((expectedHarvest.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    const needsRotationSoon = daysToHarvest !== null && daysToHarvest <= 7 && daysToHarvest >= 0;

    const progress = currentRecord
      ? Math.min(100, Math.max(0, Math.round(
          ((today.getTime() - new Date(currentRecord.plantingDate).getTime()) /
          (new Date(currentRecord.expectedHarvestDate).getTime() - new Date(currentRecord.plantingDate).getTime())) * 100
        )))
      : 0;

    return {
      ...plot,
      currentCrop: currentRecord?.cropName || null,
      currentFamily: currentRecord?.family || null,
      progress,
      daysToHarvest,
      needsRotationSoon
    };
  });

  res.json(plotsWithStatus);
});

router.post('/plots', (req: Request, res: Response) => {
  const db = getDb(req);
  const { name, area, orientation, soilType } = req.body;

  if (!name || !area || !orientation || !soilType) {
    return res.status(400).json({ error: '缺少必要字段' });
  }

  const id = uuidv4();
  const stmt = db.prepare('INSERT INTO plots (id, name, area, orientation, soilType) VALUES (?, ?, ?, ?, ?)');
  stmt.run(id, name, area, orientation, soilType);

  const newPlot = db.prepare('SELECT * FROM plots WHERE id = ?').get(id) as Plot;
  res.status(201).json(newPlot);
});

router.get('/plots/:id', (req: Request, res: Response) => {
  const db = getDb(req);
  const { id } = req.params;

  const plot = db.prepare('SELECT * FROM plots WHERE id = ?').get(id) as Plot | undefined;
  if (!plot) {
    return res.status(404).json({ error: '地块不存在' });
  }

  const records = db.prepare(`
    SELECT * FROM planting_records
    WHERE plotId = ?
    ORDER BY plantingDate DESC
  `).all(id) as PlantingRecord[];

  res.json({ ...plot, records });
});

router.put('/plots/:id', (req: Request, res: Response) => {
  const db = getDb(req);
  const { id } = req.params;
  const { name, area, orientation, soilType } = req.body;

  const plot = db.prepare('SELECT * FROM plots WHERE id = ?').get(id) as Plot | undefined;
  if (!plot) {
    return res.status(404).json({ error: '地块不存在' });
  }

  const stmt = db.prepare(`
    UPDATE plots SET name = ?, area = ?, orientation = ?, soilType = ?
    WHERE id = ?
  `);
  stmt.run(name || plot.name, area || plot.area, orientation || plot.orientation, soilType || plot.soilType, id);

  const updatedPlot = db.prepare('SELECT * FROM plots WHERE id = ?').get(id) as Plot;
  res.json(updatedPlot);
});

router.delete('/plots/:id', (req: Request, res: Response) => {
  const db = getDb(req);
  const { id } = req.params;

  const plot = db.prepare('SELECT * FROM plots WHERE id = ?').get(id) as Plot | undefined;
  if (!plot) {
    return res.status(404).json({ error: '地块不存在' });
  }

  db.prepare('DELETE FROM plots WHERE id = ?').run(id);
  res.json({ message: '地块已删除' });
});

router.get('/plots/:id/records', (req: Request, res: Response) => {
  const db = getDb(req);
  const { id } = req.params;

  const records = db.prepare(`
    SELECT * FROM planting_records
    WHERE plotId = ?
    ORDER BY plantingDate DESC
  `).all(id) as PlantingRecord[];

  res.json(records);
});

router.post('/plots/:id/records', (req: Request, res: Response) => {
  const db = getDb(req);
  const { id } = req.params;
  const { cropName, plantingDate, expectedHarvestDate, actualHarvestDate, yield: yieldAmount, notes } = req.body;

  if (!cropName || !plantingDate || !expectedHarvestDate) {
    return res.status(400).json({ error: '缺少必要字段' });
  }

  const crop = db.prepare('SELECT family FROM crops WHERE name = ?').get(cropName) as { family: string } | undefined;
  if (!crop) {
    return res.status(400).json({ error: '作物不存在' });
  }

  const validation = validateRotation(db, id, crop.family, cropName);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.message });
  }

  const recordId = uuidv4();
  const cycleDays = calculateCycleDays(plantingDate, expectedHarvestDate);
  const idleDays = calculateIdleDays(db, id, plantingDate);

  const stmt = db.prepare(`
    INSERT INTO planting_records (id, plotId, cropName, family, plantingDate, expectedHarvestDate, actualHarvestDate, yield, notes, cycleDays, idleDays)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    recordId,
    id,
    cropName,
    crop.family,
    plantingDate,
    expectedHarvestDate,
    actualHarvestDate || null,
    yieldAmount || null,
    notes || null,
    cycleDays,
    idleDays
  );

  const newRecord = db.prepare('SELECT * FROM planting_records WHERE id = ?').get(recordId) as PlantingRecord;
  res.status(201).json({ ...newRecord, validation });
});

router.put('/plots/:id/records/:recordId', (req: Request, res: Response) => {
  const db = getDb(req);
  const { id, recordId } = req.params;
  const { cropName, plantingDate, expectedHarvestDate, actualHarvestDate, yield: yieldAmount, notes } = req.body;

  const record = db.prepare('SELECT * FROM planting_records WHERE id = ? AND plotId = ?').get(recordId, id) as PlantingRecord | undefined;
  if (!record) {
    return res.status(404).json({ error: '记录不存在' });
  }

  const crop = db.prepare('SELECT family FROM crops WHERE name = ?').get(cropName || record.cropName) as { family: string } | undefined;
  if (!crop) {
    return res.status(400).json({ error: '作物不存在' });
  }

  const cycleDays = plantingDate && expectedHarvestDate
    ? calculateCycleDays(plantingDate, expectedHarvestDate)
    : record.cycleDays;

  const stmt = db.prepare(`
    UPDATE planting_records SET
      cropName = ?, family = ?, plantingDate = ?, expectedHarvestDate = ?,
      actualHarvestDate = ?, yield = ?, notes = ?, cycleDays = ?
    WHERE id = ?
  `);
  stmt.run(
    cropName || record.cropName,
    crop.family,
    plantingDate || record.plantingDate,
    expectedHarvestDate || record.expectedHarvestDate,
    actualHarvestDate !== undefined ? actualHarvestDate : record.actualHarvestDate,
    yieldAmount !== undefined ? yieldAmount : record.yield,
    notes !== undefined ? notes : record.notes,
    cycleDays,
    recordId
  );

  const updatedRecord = db.prepare('SELECT * FROM planting_records WHERE id = ?').get(recordId) as PlantingRecord;
  res.json(updatedRecord);
});

router.delete('/plots/:id/records/:recordId', (req: Request, res: Response) => {
  const db = getDb(req);
  const { id, recordId } = req.params;

  const record = db.prepare('SELECT * FROM planting_records WHERE id = ? AND plotId = ?').get(recordId, id) as PlantingRecord | undefined;
  if (!record) {
    return res.status(404).json({ error: '记录不存在' });
  }

  db.prepare('DELETE FROM planting_records WHERE id = ?').run(recordId);
  res.json({ message: '记录已删除' });
});

router.get('/crops', (req: Request, res: Response) => {
  const db = getDb(req);
  const crops = db.prepare('SELECT * FROM crops ORDER BY name').all() as Crop[];
  res.json(crops.map(c => ({ ...c, companions: c.companions.split(',') })));
});

router.post('/rotation/validate', (req: Request, res: Response) => {
  const db = getDb(req);
  const { plotId, cropName } = req.body;

  if (!plotId || !cropName) {
    return res.status(400).json({ error: '缺少必要字段' });
  }

  const crop = db.prepare('SELECT family FROM crops WHERE name = ?').get(cropName) as { family: string } | undefined;
  if (!crop) {
    return res.status(400).json({ error: '作物不存在' });
  }

  const validation = validateRotation(db, plotId, crop.family, cropName);
  res.json(validation);
});

router.get('/plots/:id/prediction', (req: Request, res: Response) => {
  const db = getDb(req);
  const { id } = req.params;

  const currentRecord = db.prepare(`
    SELECT * FROM planting_records
    WHERE plotId = ? AND actualHarvestDate IS NULL
    ORDER BY plantingDate DESC LIMIT 1
  `).get(id) as PlantingRecord | undefined;

  if (!currentRecord) {
    return res.json({
      expectedMin: 0,
      expectedMax: 0,
      bestHarvestWindow: { start: '', end: '' },
      dailyTrend: [],
      historicalData: []
    });
  }

  const plot = db.prepare('SELECT area FROM plots WHERE id = ?').get(id) as { area: number };
  const historicalRecords = db.prepare(`
    SELECT * FROM planting_records
    WHERE plotId = ? AND actualHarvestDate IS NOT NULL AND yield IS NOT NULL
    ORDER BY plantingDate DESC LIMIT 10
  `).all(id) as PlantingRecord[];

  const avgYieldPerSqm = historicalRecords.length > 0
    ? historicalRecords.reduce((sum, r) => sum + (r.yield || 0) / plot.area, 0) / historicalRecords.length
    : 2;

  const expectedMin = Math.round(avgYieldPerSqm * plot.area * 0.8);
  const expectedMax = Math.round(avgYieldPerSqm * plot.area * 1.2);

  const harvestDate = new Date(currentRecord.expectedHarvestDate);
  const bestHarvestWindow = {
    start: new Date(harvestDate.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date(harvestDate.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  };

  const dailyTrend = [];
  const plantingDate = new Date(currentRecord.plantingDate);
  const daysInCycle = Math.ceil((harvestDate.getTime() - plantingDate.getTime()) / (1000 * 60 * 60 * 24));
  const today = new Date();

  for (let i = 0; i < 7; i++) {
    const date = new Date(today.getTime() + i * 24 * 60 * 60 * 1000);
    const daysPassed = Math.ceil((date.getTime() - plantingDate.getTime()) / (1000 * 60 * 60 * 24));
    const growthProgress = Math.min(1, Math.max(0, daysPassed / daysInCycle));
    const expectedYield = expectedMin + (expectedMax - expectedMin) * Math.pow(growthProgress, 2);
    dailyTrend.push({
      date: date.toISOString().split('T')[0],
      yield: Math.round(expectedYield * 10) / 10
    });
  }

  const historicalData = [];
  for (let i = 11; i >= 0; i--) {
    const monthDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const monthStr = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
    const monthRecords = historicalRecords.filter(r => {
      const rDate = new Date(r.actualHarvestDate || '');
      return rDate.getFullYear() === monthDate.getFullYear() && rDate.getMonth() === monthDate.getMonth();
    });
    const avgYield = monthRecords.length > 0
      ? monthRecords.reduce((sum, r) => sum + (r.yield || 0), 0) / monthRecords.length
      : 0;
    historicalData.push({
      month: monthStr,
      avgYield: Math.round(avgYield * 10) / 10
    });
  }

  res.json({
    expectedMin,
    expectedMax,
    bestHarvestWindow,
    dailyTrend,
    historicalData
  });
});

router.get('/rotation/gantt', (req: Request, res: Response) => {
  const db = getDb(req);

  const plots = db.prepare('SELECT * FROM plots ORDER BY name').all() as Plot[];
  const records = db.prepare(`
    SELECT * FROM planting_records
    ORDER BY plantingDate DESC
  `).all() as PlantingRecord[];

  const ganttData = plots.map(plot => {
    const plotRecords = records.filter(r => r.plotId === plot.id);
    return {
      plotId: plot.id,
      plotName: plot.name,
      records: plotRecords.map(r => ({
        id: r.id,
        cropName: r.cropName,
        family: r.family,
        plantingDate: r.plantingDate,
        expectedHarvestDate: r.expectedHarvestDate,
        actualHarvestDate: r.actualHarvestDate,
        yield: r.yield,
        cycleDays: r.cycleDays,
        isActive: !r.actualHarvestDate
      }))
    };
  });

  res.json(ganttData);
});

export default router;
