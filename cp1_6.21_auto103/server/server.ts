import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json());

const dataDir = path.join(__dirname, '..', 'data');
const projectsFile = path.join(dataDir, 'projects.json');
const timeLogsFile = path.join(dataDir, 'timeLogs.json');

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

function readJSON<T>(filePath: string): T[] {
  ensureDataDir();
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, '[]', 'utf-8');
    return [];
  }
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as T[];
}

function writeJSON<T>(filePath: string, data: T[]): void {
  ensureDataDir();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

interface Project {
  id: string;
  name: string;
  hourlyRate: number;
  estimatedHours: number;
  clientName: string;
  createdAt: string;
}

interface TimeLog {
  id: string;
  projectId: string;
  date: string;
  hours: number;
  note: string;
  createdAt: string;
}

app.get('/api/projects', (_req, res) => {
  const projects = readJSON<Project>(projectsFile);
  res.json(projects);
});

app.post('/api/projects', (req, res) => {
  const projects = readJSON<Project>(projectsFile);
  const newProject: Project = {
    id: uuidv4(),
    name: req.body.name || '',
    hourlyRate: Number(req.body.hourlyRate) || 0,
    estimatedHours: Number(req.body.estimatedHours) || 0,
    clientName: req.body.clientName || '',
    createdAt: new Date().toISOString(),
  };
  projects.push(newProject);
  writeJSON(projectsFile, projects);
  res.status(201).json(newProject);
});

app.put('/api/projects/:id', (req, res) => {
  const projects = readJSON<Project>(projectsFile);
  const idx = projects.findIndex((p) => p.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }
  projects[idx] = {
    ...projects[idx],
    name: req.body.name ?? projects[idx].name,
    hourlyRate: req.body.hourlyRate ?? projects[idx].hourlyRate,
    estimatedHours: req.body.estimatedHours ?? projects[idx].estimatedHours,
    clientName: req.body.clientName ?? projects[idx].clientName,
  };
  writeJSON(projectsFile, projects);
  res.json(projects[idx]);
});

app.delete('/api/projects/:id', (req, res) => {
  let projects = readJSON<Project>(projectsFile);
  const idx = projects.findIndex((p) => p.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }
  const deleted = projects[idx];
  projects = projects.filter((p) => p.id !== req.params.id);
  writeJSON(projectsFile, projects);

  let timeLogs = readJSON<TimeLog>(timeLogsFile);
  timeLogs = timeLogs.filter((t) => t.projectId !== req.params.id);
  writeJSON(timeLogsFile, timeLogs);

  res.json(deleted);
});

app.get('/api/time-logs', (_req, res) => {
  const timeLogs = readJSON<TimeLog>(timeLogsFile);
  res.json(timeLogs);
});

app.post('/api/time-logs', (req, res) => {
  const timeLogs = readJSON<TimeLog>(timeLogsFile);
  const newLog: TimeLog = {
    id: uuidv4(),
    projectId: req.body.projectId || '',
    date: req.body.date || new Date().toISOString().split('T')[0],
    hours: Number(req.body.hours) || 0,
    note: req.body.note || '',
    createdAt: new Date().toISOString(),
  };
  timeLogs.push(newLog);
  writeJSON(timeLogsFile, timeLogs);
  res.status(201).json(newLog);
});

app.delete('/api/time-logs/:id', (req, res) => {
  let timeLogs = readJSON<TimeLog>(timeLogsFile);
  const idx = timeLogs.findIndex((t) => t.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: 'Time log not found' });
    return;
  }
  const deleted = timeLogs[idx];
  timeLogs = timeLogs.filter((t) => t.id !== req.params.id);
  writeJSON(timeLogsFile, timeLogs);
  res.json(deleted);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
