import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const shareStore = new Map();

function generateShortCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

app.post('/api/share', (req, res) => {
  try {
    const { data } = req.body;
    if (!data) {
      return res.status(400).json({ error: '缺少分享数据' });
    }
    const id = generateShortCode();
    const expiry = Date.now() + 24 * 60 * 60 * 1000;
    shareStore.set(id, { data, expiry, createdAt: Date.now() });
    res.json({ id, expiry });
  } catch (err) {
    res.status(500).json({ error: '服务器错误' });
  }
});

app.get('/api/share/:id', (req, res) => {
  try {
    const { id } = req.params;
    const stored = shareStore.get(id);
    if (!stored) {
      return res.status(404).json({ error: '分享链接不存在或已过期' });
    }
    if (Date.now() > stored.expiry) {
      shareStore.delete(id);
      return res.status(410).json({ error: '分享链接已过期' });
    }
    res.json({ data: stored.data, expiry: stored.expiry });
  } catch (err) {
    res.status(500).json({ error: '服务器错误' });
  }
});

setInterval(() => {
  const now = Date.now();
  for (const [id, stored] of shareStore.entries()) {
    if (now > stored.expiry) {
      shareStore.delete(id);
    }
  }
}, 60 * 60 * 1000);

app.listen(PORT, () => {
  console.log(`[server] 分享服务运行在 http://localhost:${PORT}`);
});
