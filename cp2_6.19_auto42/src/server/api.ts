import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { dataStore } from './dataStore.js';

const app = express();
app.use(cors());
app.use(express.json());

const uploadDir = path.resolve('uploads');
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + '-' + file.originalname);
  },
});
const upload = multer({ storage });

app.use('/uploads', express.static(uploadDir));

app.get('/api/experiments', (_req, res) => {
  const experiments = dataStore.getAllExperiments();
  const result = experiments.map((exp) => {
    const progress = dataStore.getExperimentProgress(exp.id);
    return { ...exp, progress };
  });
  res.json(result);
});

app.post('/api/experiments', (req, res) => {
  const { name, date, leader, description } = req.body;
  if (!name || !date || !leader) {
    res.status(400).json({ error: 'name, date, leader are required' });
    return;
  }
  const experiment = dataStore.createExperiment({ name, date, leader, description: description || '' });
  const progress = dataStore.getExperimentProgress(experiment.id);
  res.status(201).json({ ...experiment, progress });
});

app.get('/api/experiments/:id', (req, res) => {
  const experiment = dataStore.getExperiment(req.params.id);
  if (!experiment) { res.status(404).json({ error: 'Not found' }); return; }
  const progress = dataStore.getExperimentProgress(experiment.id);
  res.json({ ...experiment, progress });
});

app.put('/api/experiments/:id', (req, res) => {
  const experiment = dataStore.updateExperiment(req.params.id, req.body);
  if (!experiment) { res.status(404).json({ error: 'Not found' }); return; }
  res.json(experiment);
});

app.delete('/api/experiments/:id', (req, res) => {
  const ok = dataStore.deleteExperiment(req.params.id);
  if (!ok) { res.status(404).json({ error: 'Not found' }); return; }
  res.json({ success: true });
});

app.get('/api/experiments/:expId/steps', (req, res) => {
  const steps = dataStore.getStepsByExperiment(req.params.expId);
  res.json(steps);
});

app.post('/api/experiments/:expId/steps', (req, res) => {
  const { name, startTime, endTime, expectedResult, actualResult } = req.body;
  if (!name) { res.status(400).json({ error: 'name is required' }); return; }
  const step = dataStore.createStep({
    experimentId: req.params.expId,
    name,
    startTime: startTime || '',
    endTime: endTime || '',
    expectedResult: expectedResult || '',
    actualResult: actualResult || '',
  });
  res.status(201).json(step);
});

app.put('/api/steps/:id', (req, res) => {
  const step = dataStore.updateStep(req.params.id, req.body);
  if (!step) { res.status(404).json({ error: 'Not found' }); return; }
  res.json(step);
});

app.delete('/api/steps/:id', (req, res) => {
  const ok = dataStore.deleteStep(req.params.id);
  if (!ok) { res.status(404).json({ error: 'Not found' }); return; }
  res.json({ success: true });
});

app.post('/api/steps/batch-delete', (req, res) => {
  const { ids } = req.body as { ids: string[] };
  if (!ids || !Array.isArray(ids)) { res.status(400).json({ error: 'ids array required' }); return; }
  const count = dataStore.deleteSteps(ids);
  res.json({ deleted: count });
});

app.put('/api/experiments/:expId/steps/reorder', (req, res) => {
  const { stepIds } = req.body as { stepIds: string[] };
  if (!stepIds || !Array.isArray(stepIds)) { res.status(400).json({ error: 'stepIds array required' }); return; }
  const steps = dataStore.reorderSteps(req.params.expId, stepIds);
  res.json(steps);
});

app.post('/api/steps/:stepId/attachments', upload.single('file'), (req, res) => {
  if (!req.file) { res.status(400).json({ error: 'No file uploaded' }); return; }
  const attachment = {
    id: Date.now().toString(),
    filename: req.file.filename,
    originalName: req.file.originalname,
    mimetype: req.file.mimetype,
    path: `/uploads/${req.file.filename}`,
  };
  const step = dataStore.addAttachment(req.params.stepId, attachment);
  if (!step) { res.status(404).json({ error: 'Step not found' }); return; }
  res.status(201).json(attachment);
});

app.get('/api/steps/:stepId/records', (req, res) => {
  const records = dataStore.getRecordsByStep(req.params.stepId);
  res.json(records);
});

app.post('/api/steps/:stepId/records', (req, res) => {
  const { type, label, value, enumOptions } = req.body;
  if (!type || !label) { res.status(400).json({ error: 'type and label are required' }); return; }
  const record = dataStore.createDataRecord({
    stepId: req.params.stepId,
    type,
    label,
    value: value || '',
    enumOptions: type === 'enum' ? enumOptions : undefined,
  });
  res.status(201).json(record);
});

app.put('/api/records/:id', (req, res) => {
  const record = dataStore.updateDataRecord(req.params.id, req.body);
  if (!record) { res.status(404).json({ error: 'Not found' }); return; }
  res.json(record);
});

app.delete('/api/records/:id', (req, res) => {
  const ok = dataStore.deleteDataRecord(req.params.id);
  if (!ok) { res.status(404).json({ error: 'Not found' }); return; }
  res.json({ success: true });
});

app.get('/api/experiments/:expId/report-data', (req, res) => {
  const experiment = dataStore.getExperiment(req.params.expId);
  if (!experiment) { res.status(404).json({ error: 'Not found' }); return; }
  const steps = dataStore.getStepsByExperiment(req.params.expId);
  const stepsWithRecords = steps.map((step) => ({
    ...step,
    records: dataStore.getRecordsByStep(step.id),
  }));
  res.json({ experiment, steps: stepsWithRecords });
});

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
