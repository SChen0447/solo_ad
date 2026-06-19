import express, { Request, Response } from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { dataStore } from './dataStore';
import type { DataRecord } from '../types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({ storage });

app.use('/uploads', express.static(uploadsDir));

app.get('/api/experiments', (_req: Request, res: Response) => {
  const experiments = dataStore.getExperiments();
  res.json(experiments);
});

app.post('/api/experiments', (req: Request, res: Response) => {
  const { name, date, leader, description } = req.body;
  if (!name || !date || !leader) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const exp = dataStore.createExperiment({ name, date, leader, description: description || '' });
  res.status(201).json(exp);
});

app.put('/api/experiments/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const exp = dataStore.updateExperiment(id, req.body);
  if (!exp) {
    return res.status(404).json({ error: 'Experiment not found' });
  }
  res.json(exp);
});

app.delete('/api/experiments/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const success = dataStore.deleteExperiment(id);
  if (!success) {
    return res.status(404).json({ error: 'Experiment not found' });
  }
  res.json({ success: true });
});

app.put('/api/experiments/reorder', (req: Request, res: Response) => {
  const { ids } = req.body;
  if (!Array.isArray(ids)) {
    return res.status(400).json({ error: 'Invalid ids' });
  }
  dataStore.reorderExperiments(ids);
  res.json({ success: true });
});

app.get('/api/experiments/:expId/steps', (req: Request, res: Response) => {
  const { expId } = req.params;
  const steps = dataStore.getStepsByExperiment(expId);
  res.json(steps);
});

app.post('/api/experiments/:expId/steps', (req: Request, res: Response) => {
  const { expId } = req.params;
  const { name, startTime, endTime, expectedResult, actualResult } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Missing step name required' });
  }
  const step = dataStore.createStep({
    experimentId: expId,
    name,
    startTime: startTime || '',
    endTime: endTime || '',
    expectedResult: expectedResult || '',
    actualResult: actualResult || ''
  });
  res.status(201).json(step);
});

app.put('/api/steps/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const step = dataStore.updateStep(id, req.body);
  if (!step) {
    return res.status(404).json({ error: 'Step not found' });
  }
  res.json(step);
});

app.delete('/api/steps/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const success = dataStore.deleteStep(id);
  if (!success) {
    return res.status(404).json({ error: 'Step not found' });
  }
  res.json({ success: true });
});

app.post('/api/steps/batch-delete', (req: Request, res: Response) => {
  const { ids } = req.body;
  if (!Array.isArray(ids)) {
    return res.status(400).json({ error: 'Invalid ids' });
  }
  dataStore.batchDeleteSteps(ids);
  res.json({ success: true });
});

app.put('/api/experiments/:expId/steps/reorder', (req: Request, res: Response) => {
  const { expId } = req.params;
  const { ids } = req.body;
  if (!Array.isArray(ids)) {
    return res.status(400).json({ error: 'Invalid ids' });
  }
  dataStore.reorderSteps(expId, ids);
  res.json({ success: true });
});

app.post('/api/steps/:id/attachments', upload.single('file'), (req: Request, res: Response) => {
  const { id } = req.params;
  const file = req.file;
  if (!file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const attachment = dataStore.addAttachment(id, {
    filename: file.filename,
    originalName: file.originalname,
    mimetype: file.mimetype,
    path: file.path,
    url: `/uploads/${file.filename}`
  });
  if (!attachment) {
    return res.status(404).json({ error: 'Step not found' });
  }
  res.status(201).json(attachment);
});

app.delete('/api/steps/:id/attachments/:attId', (req: Request, res: Response) => {
  const { id, attId } = req.params;
  const attachment = dataStore.getAttachment(attId);
  if (attachment && fs.existsSync(attachment.path)) {
    fs.unlinkSync(attachment.path);
  }
  const success = dataStore.deleteAttachment(id, attId);
  if (!success) {
    return res.status(404).json({ error: 'Attachment not found' });
  }
  res.json({ success: true });
});

app.get('/api/steps/:stepId/records', (req: Request, res: Response) => {
  const { stepId } = req.params;
  const records = dataStore.getRecordsByStep(stepId);
  res.json(records);
});

app.post('/api/steps/:stepId/records', (req: Request, res: Response) => {
  const { stepId } = req.params;
  const { type, value, timestamp, enumOptions } = req.body;
  if (!type || value === undefined || value === null) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const validTypes = ['numeric', 'text', 'boolean', 'enum'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: 'Invalid record type' });
  }
  const recordData: Omit<DataRecord, 'id' | 'timestamp'> & { timestamp?: string } = {
    stepId,
    type: type as DataRecord['type'],
    value: String(value)
  };
  if (timestamp) {
    recordData.timestamp = timestamp;
  }
  if (enumOptions) {
    recordData.enumOptions = enumOptions;
  }
  const record = dataStore.createRecord(recordData);
  res.status(201).json(record);
});

app.put('/api/records/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const record = dataStore.updateRecord(id, req.body);
  if (!record) {
    return res.status(404).json({ error: 'Record not found' });
  }
  res.json(record);
});

app.delete('/api/records/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const success = dataStore.deleteRecord(id);
  if (!success) {
    return res.status(404).json({ error: 'Record not found' });
  }
  res.json({ success: true });
});

function generateLineChartSVG(records: DataRecord[]): string {
  const numericRecords = records.filter(r => r.type === 'numeric');
  if (numericRecords.length === 0) return '';

  const width = 600;
  const height = 300;
  const padding = { top: 30, right: 20, bottom: 40, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const values = numericRecords.map(r => parseFloat(r.value));
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;
  const yTicks = 5;

  const points = numericRecords.map((r, i) => {
    const x = padding.left + (i / (numericRecords.length - 1 || 1)) * chartWidth;
    const y = padding.top + chartHeight - ((parseFloat(r.value) - minVal) / range) * chartHeight;
    return { x, y, value: r.value, time: r.timestamp };
  });

  let pathD = '';
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (i === 0) {
      pathD += `M ${p.x} ${p.y}`;
    } else {
      const prev = points[i - 1];
      const cp1x = prev.x + (p.x - prev.x) / 3;
      const cp1y = prev.y;
      const cp2x = p.x - (p.x - prev.x) / 3;
      const cp2y = p.y;
      pathD += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p.x} ${p.y}`;
    }
  }

  let yAxisLines = '';
  for (let i = 0; i <= yTicks; i++) {
    const y = padding.top + (i / yTicks) * chartHeight;
    const val = maxVal - (i / yTicks) * range;
    yAxisLines += `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="#3D3572" stroke-width="1" stroke-dasharray="4,4"/>`;
    yAxisLines += `<text x="${padding.left - 10}" y="${y + 4}" fill="#B0A8D8" font-size="11" text-anchor="end">${val.toFixed(1)}</text>`;
  }

  let xLabels = '';
  points.forEach((p, i) => {
    if (i % Math.max(1, Math.floor(points.length / 6)) === 0) {
      const time = new Date(p.time).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
      xLabels += `<text x="${p.x}" y="${height - padding.bottom + 20}" fill="#B0A8D8" font-size="11" text-anchor="middle">${time}</text>`;
    }
  });

  let circles = '';
  points.forEach(p => {
    circles += `<circle cx="${p.x}" cy="${p.y}" r="5" fill="#FFB300" stroke="#2F2860" stroke-width="2"/>`;
  });

  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" style="background: #2F2860; border-radius: 8px;">
      <defs>
        <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#FFB300" stop-opacity="0.3"/>
          <stop offset="100%" stop-color="#FFB300" stop-opacity="0"/>
        </linearGradient>
      </defs>
      ${yAxisLines}
      <line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${height - padding.bottom}" stroke="#5A4F9A" stroke-width="2"/>
      <line x1="${padding.left}" y1="${height - padding.bottom}" x2="${width - padding.right}" y2="${height - padding.bottom}" stroke="#5A4F9A" stroke-width="2"/>
      ${xLabels}
      <path d="${pathD} L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${points[0].x} ${padding.top + chartHeight} Z" fill="url(#lineGradient)"/>
      <path d="${pathD}" fill="none" stroke="#FFB300" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      ${circles}
      <text x="${width / 2}" y="20" fill="#E0E0E0" font-size="14" font-weight="600" text-anchor="middle">数值趋势图</text>
    </svg>
  `;
}

app.post('/api/experiments/:id/report', (req: Request, res: Response) => {
  const { id } = req.params;
  const { conclusion } = req.body;
  const exp = dataStore.getExperiment(id);
  if (!exp) {
    return res.status(404).json({ error: 'Experiment not found' });
  }
  const steps = dataStore.getStepsByExperiment(id);
  const recordsByStep: Record<string, DataRecord[]> = {};
  const allNumericRecords: DataRecord[] = [];

  steps.forEach(step => {
    const records = dataStore.getRecordsByStep(step.id);
    recordsByStep[step.id] = records;
    records.filter(r => r.type === 'numeric').forEach(r => allNumericRecords.push(r));
  });

  const stepCount = steps.length;
  const completedCount = steps.filter(s => s.completed).length;
  const progress = stepCount > 0 ? Math.round((completedCount / stepCount) * 100) : 0;

  const stats = (() => {
    if (allNumericRecords.length === 0) return null;
    const nums = allNumericRecords.map(r => parseFloat(r.value));
    return {
      avg: nums.reduce((a, b) => a + b, 0) / nums.length,
      max: Math.max(...nums),
      min: Math.min(...nums)
    };
  })();

  const stepsHtml = steps.map((step, idx) => {
    const records = recordsByStep[step.id] || [];
    const numericRecords = records.filter(r => r.type === 'numeric');
    const chartSvg = numericRecords.length >= 2 ? generateLineChartSVG(numericRecords) : '';

    const recordsHtml = records.map(r => {
      const time = new Date(r.timestamp).toLocaleString('zh-CN');
      if (r.type === 'numeric') {
        return `<tr><td>${time}</td><td>${r.type}</td><td>${r.value}</td></tr>`;
      }
      return `<tr><td>${time}</td><td>${r.type}</td><td>${r.value}</td></tr>`;
    }).join('');

    const tableHtml = records.length > 0 ? `
      <h4 style="color:#FFB300;margin-top:20px;">数据记录</h4>
      <table style="width:100%;border-collapse:collapse;margin-top:12px;">
        <thead><tr style="background:#3D3572;">
          <th style="padding:10px;text-align:left;border:1px solid #5A4F9A;">时间</th>
          <th style="padding:10px;text-align:left;border:1px solid #5A4F9A;">类型</th>
          <th style="padding:10px;text-align:left;border:1px solid #5A4F9A;">数值</th>
        </tr></thead>
        <tbody>${recordsHtml}</tbody>
      </table>
    ` : '';

    const attachmentsHtml = step.attachments.map(
      a => a.mimetype.startsWith('image/')
        ? `<div style="margin:10px;"><img src="${a.url}" alt="${a.originalName}" style="max-width:300px;border-radius:8px;"/></div>`
        : `<div style="margin:10px;"><a href="${a.url}" style="color:#FFB300;">📎 ${a.originalName}</a></div>`
    ).join('');

    return `
      <section id="step-${idx + 1}" style="page-break-inside:avoid;margin-bottom:30px;">
        <h2 style="color:#E0E0E0;border-bottom:2px solid #FFB300;padding-bottom:8px;">步骤 ${idx + 1}: ${step.name}</h2>
        <p style="color:#B0A8D8;margin:8px 0;">
          <strong>开始时间:</strong> ${new Date(step.startTime).toLocaleString('zh-CN')}<br/>
          <strong>结束时间:</strong> ${new Date(step.endTime).toLocaleString('zh-CN')}
        </p>
        <div style="background:#3D3572;padding:16px;border-radius:8px;margin:12px 0;">
          <p style="color:#E0E0E0;margin:4px 0;"><strong style="color:#FFB300;">预期结果:</strong> ${step.expectedResult || '无'}</p>
          <p style="color:#E0E0E0;margin:4px 0;"><strong style="color:#FFB300;">实际结果:</strong> ${step.actualResult || '待填写'}</p>
        </div>
        ${step.attachments.length > 0 ? `<div><h4 style="color:#FFB300;margin-top:16px;">附件</h4>${attachmentsHtml}</div>` : ''}
        ${tableHtml}
        ${chartSvg ? `<div style="margin-top:20px;text-align:center;">${chartSvg}</div>` : ''}
      </section>
    `;
  }).join('');

  const tocHtml = steps.map((_s, idx) => `
    <li style="margin:8px 0;">
      <a href="#step-${idx + 1}" style="color:#E0E0E0;text-decoration:none;">步骤 ${idx + 1}: ${_s.name}</a>
    </li>
  `).join('');

  const summaryHtml = stats ? `
    <section id="analysis" style="page-break-inside:avoid;margin-bottom:30px;">
      <h2 style="color:#E0E0E0;border-bottom:2px solid #FFB300;padding-bottom:8px;">数据分析小结</h2>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:20px;">
        <div style="background:#3D3572;padding:20px;border-radius:12px;text-align:center;">
          <div style="font-size:28px;font-weight:700;color:#FFB300;">${stats.avg.toFixed(2)}</div>
          <div style="color:#B0A8D8;margin-top:4px;">平均值</div>
        </div>
        <div style="background:#3D3572;padding:20px;border-radius:12px;text-align:center;">
          <div style="font-size:28px;font-weight:700;color:#4CAF50;">${stats.max.toFixed(2)}</div>
          <div style="color:#B0A8D8;margin-top:4px;">最大值</div>
        </div>
        <div style="background:#3D3572;padding:20px;border-radius:12px;text-align:center;">
          <div style="font-size:28px;font-weight:700;color:#F44336;">${stats.min.toFixed(2)}</div>
          <div style="color:#B0A8D8;margin-top:4px;">最小值</div>
        </div>
      </div>
    </section>
  ` : '';

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>实验报告 - ${exp.name}</title>
  <style>
    * { margin:0;padding:0;box-sizing:border-box;}
    body {
      font-family: 'Source Sans 3', -apple-system, BlinkMacSystemFont, sans-serif;
      background: linear-gradient(135deg, #1A1535 0%, #2A2355 100%);
      color: #E0E0E0;
      line-height: 1.6;
      min-height: 100vh;
    }
    .report-container { max-width: 900px; margin: 0 auto; padding: 40px 20px; }
    .cover {
      background: linear-gradient(135deg, #2A2355 0%, #4A3F8A 50%, #2A2355 100%);
      min-height: 400px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      border-radius: 16px;
      padding: 60px 40px;
      margin-bottom: 40px;
    }
    .cover h1 { font-size: 36px; font-weight: 700; color: #FFB300; margin-bottom: 20px; }
    .cover .meta { font-size: 18px; color: #B0A8D8; margin: 8px 0; }
    .toc { background: #2F2860; padding: 24px; border-radius: 12px; margin-bottom: 30px; }
    .toc h2 { color: #FFB300; margin-bottom: 16px; }
    .toc ol { list-style: decimal inside; }
    .toc a:hover { text-decoration: underline; }
    .toc a { display: inline-block; position: relative; }
    .toc a::after { content: ''; position: absolute; width: 0; height: 2px; bottom: -2px; left: 0; background: #FFB300; transition: width 0.3s; }
    .toc a:hover::after { width: 100%; }
    .conclusion-section { background: #2F2860; padding: 24px; border-radius: 12px; margin-top: 20px; }
    .conclusion-section h2 { color: #FFB300; margin-bottom: 12px; }
    table { width: 100%; }
    th { color: #FFB300; }
    td { padding: 10px; border: 1px solid #5A4F9A; color: #E0E0E0; }
    tbody tr:nth-child(even) { background: rgba(255,255,255,0.03); }
    @media print {
      body { background: white; color: black; }
      .cover { background: linear-gradient(135deg, #2A2355 0%, #4A3F8A 50%, #2A2355 100%); color: #E0E0E0 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .report-container { padding: 0; }
      section { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="report-container">
    <div class="cover">
      <h1>${exp.name}</h1>
      <div class="meta">实验日期: ${exp.date}</div>
      <div class="meta">负责人: ${exp.leader}</div>
      <div class="meta" style="margin-top:20px;font-size:16px;color:#B0A8D8;">进度: ${progress}%</div>
    </div>

    <div class="toc">
      <h2 style="border-bottom:2px solid #FFB300;padding-bottom:8px;">目录</h2>
      <ol>${tocHtml}</ol>
      <ol style="margin-top:8px;">
        <li style="margin:8px 0;"><a href="#analysis" style="color:#E0E0E0;text-decoration:none;">数据分析小结</a></li>
        <li style="margin:8px 0;"><a href="#conclusion" style="color:#E0E0E0;text-decoration:none;">结论</a></li>
      </ol>
    </div>

    ${stepsHtml}
    ${summaryHtml}

    <section id="conclusion" class="conclusion-section">
      <h2 style="border-bottom:2px solid #FFB300;padding-bottom:8px;">结论</h2>
      <p style="color:#E0E0E0;white-space:pre-wrap;">${conclusion || '（请在此处填写实验结论...）'}</p>
    </section>
  </div>
</body>
</html>`;

  res.json({ html });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
