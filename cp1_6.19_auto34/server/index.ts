import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { PopupRule, PopupRuleCreate, TrackingEvent, DailyStats } from '../src/shared/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');
const RULES_FILE = path.join(DATA_DIR, 'rules.json');
const EVENTS_FILE = path.join(DATA_DIR, 'events.json');

const app = express();
app.use(cors());
app.use(bodyParser.json());

let rules: PopupRule[] = [];
let events: TrackingEvent[] = [];

let statsCache: { date: string; data: DailyStats; timestamp: number } | null = null;
const CACHE_DURATION = 5 * 60 * 1000;

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadData() {
  ensureDataDir();
  if (fs.existsSync(RULES_FILE)) {
    try {
      rules = JSON.parse(fs.readFileSync(RULES_FILE, 'utf-8'));
    } catch {
      rules = [];
    }
  }
  if (fs.existsSync(EVENTS_FILE)) {
    try {
      events = JSON.parse(fs.readFileSync(EVENTS_FILE, 'utf-8'));
    } catch {
      events = [];
    }
  }
}

function saveRules() {
  ensureDataDir();
  fs.writeFileSync(RULES_FILE, JSON.stringify(rules, null, 2));
}

function saveEvents() {
  ensureDataDir();
  fs.writeFileSync(EVENTS_FILE, JSON.stringify(events, null, 2));
}

function getTodayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isToday(ts: number): boolean {
  const today = new Date();
  const evt = new Date(ts);
  return (
    today.getFullYear() === evt.getFullYear() &&
    today.getMonth() === evt.getMonth() &&
    today.getDate() === evt.getDate()
  );
}

function computeDailyStats(date: string): DailyStats {
  const todayEvents = events.filter((e) => {
    const d = new Date(e.timestamp);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}` === date;
  });

  const totalImpressions = todayEvents.filter((e) => e.type === 'impression').length;
  const totalClicks = todayEvents.filter((e) => e.type === 'click').length;
  const clickRate = totalImpressions > 0 ? Math.round((totalClicks / totalImpressions) * 1000) / 10 : 0;

  const byRuleMap = new Map<string, { ruleId: string; ruleTitle: string; impressions: number; clicks: number }>();

  for (const rule of rules) {
    byRuleMap.set(rule.id, {
      ruleId: rule.id,
      ruleTitle: rule.title,
      impressions: 0,
      clicks: 0
    });
  }

  for (const evt of todayEvents) {
    const entry = byRuleMap.get(evt.ruleId);
    if (entry) {
      if (evt.type === 'impression') entry.impressions++;
      if (evt.type === 'click') entry.clicks++;
    } else {
      const rule = rules.find((r) => r.id === evt.ruleId);
      if (rule) {
        byRuleMap.set(evt.ruleId, {
          ruleId: evt.ruleId,
          ruleTitle: rule.title,
          impressions: evt.type === 'impression' ? 1 : 0,
          clicks: evt.type === 'click' ? 1 : 0
        });
      }
    }
  }

  return {
    date,
    totalImpressions,
    totalClicks,
    clickRate,
    byRule: Array.from(byRuleMap.values()).sort((a, b) => b.impressions - a.impressions)
  };
}

function getCachedDailyStats(): DailyStats {
  const today = getTodayStr();
  const now = Date.now();

  if (statsCache && statsCache.date === today && now - statsCache.timestamp < CACHE_DURATION) {
    return statsCache.data;
  }

  const data = computeDailyStats(today);
  statsCache = { date: today, data, timestamp: now };
  return data;
}

loadData();

app.get('/api/rules', (req, res) => {
  res.json(rules);
});

app.get('/api/rules/:id', (req, res) => {
  const rule = rules.find((r) => r.id === req.params.id);
  if (!rule) {
    res.status(404).json({ error: 'Rule not found' });
    return;
  }
  res.json(rule);
});

app.post('/api/rules', (req, res) => {
  const body = req.body as PopupRuleCreate;
  
  if (!body.title || !body.productLink) {
    res.status(400).json({ error: 'Title and productLink are required' });
    return;
  }
  if (body.triggerType === 'dwell' && (body.triggerValue < 3 || body.triggerValue > 30)) {
    res.status(400).json({ error: 'Dwell time must be between 3 and 30 seconds' });
    return;
  }
  if (body.triggerType === 'scroll' && (body.triggerValue < 20 || body.triggerValue > 80)) {
    res.status(400).json({ error: 'Scroll percentage must be between 20 and 80' });
    return;
  }
  if (body.maxDailyShows < 1 || body.maxDailyShows > 10) {
    res.status(400).json({ error: 'maxDailyShows must be between 1 and 10' });
    return;
  }

  const newRule: PopupRule = {
    id: uuidv4(),
    title: body.title,
    subtitle: body.subtitle || '',
    productLink: body.productLink,
    bgColor: body.bgColor || '#f0f4ff',
    triggerType: body.triggerType || 'dwell',
    triggerValue: body.triggerValue || 5,
    maxDailyShows: body.maxDailyShows || 3,
    createdAt: Date.now()
  };

  rules.push(newRule);
  saveRules();
  statsCache = null;
  res.status(201).json(newRule);
});

app.put('/api/rules/:id', (req, res) => {
  const idx = rules.findIndex((r) => r.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: 'Rule not found' });
    return;
  }
  const body = req.body as Partial<PopupRuleCreate>;
  const existing = rules[idx];
  rules[idx] = { ...existing, ...body };
  saveRules();
  statsCache = null;
  res.json(rules[idx]);
});

app.delete('/api/rules/:id', (req, res) => {
  const idx = rules.findIndex((r) => r.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: 'Rule not found' });
    return;
  }
  rules.splice(idx, 1);
  saveRules();
  statsCache = null;
  res.status(204).send();
});

app.post('/api/events', (req, res) => {
  const body = req.body;
  const eventList = Array.isArray(body) ? body : [body];

  for (const evt of eventList) {
    if (!evt.ruleId || !evt.type) continue;
    const newEvent: TrackingEvent = {
      id: uuidv4(),
      ruleId: evt.ruleId,
      sessionId: evt.sessionId || 'unknown',
      timestamp: evt.timestamp || Date.now(),
      type: evt.type as 'impression' | 'click'
    };
    events.push(newEvent);
  }

  saveEvents();
  statsCache = null;
  res.status(201).json({ success: true, count: eventList.length });
});

app.get('/api/events', (req, res) => {
  const limit = typeof req.query.limit === 'string' ? parseInt(req.query.limit, 10) : 100;
  res.json(events.slice(-limit));
});

app.get('/api/stats/daily', (req, res) => {
  const stats = getCachedDailyStats();
  res.json(stats);
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export default app;
