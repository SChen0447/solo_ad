import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import AdmZip from 'adm-zip';
import { renderComponentSnapshots } from './sandbox.js';
import { computeDiff } from './differ.js';

const app = express();
const PORT = 3001;

app.use(express.json({ limit: '50mb' }));

const uploadDir = path.resolve('uploads');
const extractDir = path.resolve('extracted');

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
if (!fs.existsSync(extractDir)) fs.mkdirSync(extractDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});
const upload = multer({ storage });

interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  size?: number;
  lastModified?: string;
  description?: string;
  children?: TreeNode[];
}

function findReadme(dir: string): string {
  const candidates = ['README.md', 'README.txt', 'README', 'readme.md', 'readme.txt'];
  for (const name of candidates) {
    const p = path.join(dir, name);
    if (fs.existsSync(p)) {
      try {
        const content = fs.readFileSync(p, 'utf-8').trim();
        return content.slice(0, 500);
      } catch {}
    }
  }
  return '';
}

function buildFileTree(dir: string, basePath: string): TreeNode[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries
    .filter((e) => !e.name.startsWith('.') && e.name !== 'node_modules')
    .map((entry) => {
      const fullPath = path.join(dir, entry.name);
      const relPath = path.relative(basePath, fullPath).replace(/\\/g, '/');
      if (entry.isDirectory()) {
        return {
          name: entry.name,
          path: relPath,
          type: 'folder' as const,
          children: buildFileTree(fullPath, basePath),
        };
      }
      const stat = fs.statSync(fullPath);
      const ext = path.extname(entry.name).toLowerCase();
      if (!['.tsx', '.jsx', '.ts', '.js'].includes(ext)) return null;
      const readmeContent = findReadme(path.dirname(fullPath));
      return {
        name: entry.name,
        path: relPath,
        type: 'file' as const,
        size: stat.size,
        lastModified: stat.mtime.toISOString(),
        description: readmeContent,
      };
    })
    .filter(Boolean) as TreeNode[];
}

function extractPropsAndDeps(filePath: string): { props: string[]; dependencies: string[]; description: string } {
  const props: string[] = [];
  const dependencies: string[] = [];
  const description = findReadme(path.dirname(filePath));
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const propsMatch = content.match(/interface\s+\w*Props\s*\{([^}]*)\}/);
    if (propsMatch) {
      const lines = propsMatch[1].split('\n');
      lines.forEach((line) => {
        const m = line.trim().match(/^(\w+)/);
        if (m) props.push(m[1]);
      });
    }
    const importRegex = /import\s+.*?from\s+['"]([^'"]+)['"]/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      dependencies.push(match[1]);
    }
  } catch {}
  return { props, dependencies, description };
}

app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }
    const zip = new AdmZip(req.file.path);
    const targetDir = path.join(extractDir, path.basename(req.file.filename, '.zip'));
    if (fs.existsSync(targetDir)) fs.rmSync(targetDir, { recursive: true });
    zip.extractAllTo(targetDir, true);
    res.json({ success: true, path: targetDir });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/list', (req, res) => {
  try {
    const queryPath = req.query.path as string | undefined;
    let baseDir = extractDir;
    const dirs = fs.readdirSync(extractDir);
    if (dirs.length > 0) {
      baseDir = path.join(extractDir, dirs[dirs.length - 1]);
    }
    if (queryPath) {
      const filePath = path.join(extractDir, queryPath);
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const { props, dependencies, description } = extractPropsAndDeps(filePath);
        res.json({ props, dependencies, description });
        return;
      }
    }
    const tree = buildFileTree(baseDir, extractDir);
    res.json({ tree });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/test', async (req, res) => {
  try {
    const { componentPath, states } = req.body as { componentPath: string; states: string[] };
    if (!componentPath || !states || !Array.isArray(states)) {
      res.status(400).json({ error: 'componentPath and states are required' });
      return;
    }
    const fullPath = path.join(extractDir, componentPath);
    const results = await renderComponentSnapshots(fullPath, states);
    res.json({ results });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/diff', async (req, res) => {
  try {
    const { imageA, imageB, threshold } = req.body as { imageA: string; imageB: string; threshold: number };
    if (!imageA || !imageB) {
      res.status(400).json({ error: 'Two images are required' });
      return;
    }
    const result = await computeDiff(imageA, imageB, threshold || 0.1);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/report', (req, res) => {
  try {
    const { results, diff } = req.body as { results: any[]; diff: any };
    const html = `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="UTF-8"><title>组件体检报告</title>
<style>
body{background:#1e1e2e;color:#cdd6f4;font-family:system-ui,sans-serif;padding:40px;max-width:1200px;margin:0 auto}
h1{font-size:24px;margin-bottom:24px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px}
.card{background:#2d2d44;border-radius:8px;overflow:hidden}
.card img{width:200px;height:150px;object-fit:cover}
.card-info{padding:8px 12px;display:flex;justify-content:space-between;font-size:13px}
.diff-section{margin-top:32px}
.diff-section img{max-width:100%;border-radius:8px}
</style></head><body>
<h1>组件体检报告</h1>
<div class="grid">${(results || []).map((r: any) => `<div class="card"><img src="${r.thumbnail}" alt="${r.state}"/><div class="card-info"><span>${r.state}</span><span>${r.renderTime}ms</span></div></div>`).join('')}</div>
${diff ? `<div class="diff-section"><h2>差异分析</h2><p>差异面积: ${diff.diffPercent?.toFixed(1)}%</p><img src="${diff.heatmapImage}" alt="heatmap"/></div>` : ''}
</body></html>`;
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', 'attachment; filename=component-test-report.html');
    res.send(html);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
