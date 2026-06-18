import express, { Request, Response } from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Annotation {
  id: string;
  imageId: string;
  x: number;
  y: number;
  number: number;
  author: string;
  comment: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number;
}

interface UploadedImage {
  id: string;
  filename: string;
  originalName: string;
  url: string;
  uploadedAt: number;
}

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use('/uploads', express.static(uploadsDir));

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${uuidv4()}${ext}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = /image\/(png|jpeg|jpg)/;
    if (allowedTypes.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('只允许上传 PNG 或 JPG 格式的图片'));
    }
  },
});

const images: UploadedImage[] = [];
const annotations: Annotation[] = [];

app.post('/api/upload', upload.single('image'), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: '未找到上传文件' });
      return;
    }
    const imageId = uuidv4();
    const uploadedImage: UploadedImage = {
      id: imageId,
      filename: req.file.filename,
      originalName: req.file.originalname,
      url: `/uploads/${req.file.filename}`,
      uploadedAt: Date.now(),
    };
    images.push(uploadedImage);
    res.json({ success: true, image: uploadedImage });
  } catch (err) {
    res.status(500).json({ error: '图片上传失败' });
  }
});

app.post('/api/annotation', (req: Request, res: Response) => {
  try {
    const { imageId, x, y, author, comment, status } = req.body;
    if (!imageId || x === undefined || y === undefined) {
      res.status(400).json({ error: '缺少必要参数' });
      return;
    }
    const imageAnnotations = annotations.filter((a) => a.imageId === imageId);
    const nextNumber = imageAnnotations.length + 1;
    const newAnnotation: Annotation = {
      id: uuidv4(),
      imageId,
      x: Number(x),
      y: Number(y),
      number: nextNumber,
      author: author || '',
      comment: comment || '',
      status: status || 'pending',
      createdAt: Date.now(),
    };
    annotations.push(newAnnotation);
    res.json({ success: true, annotation: newAnnotation });
  } catch (err) {
    res.status(500).json({ error: '添加标注失败' });
  }
});

app.put('/api/annotation/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { author, comment, status } = req.body;
    const index = annotations.findIndex((a) => a.id === id);
    if (index === -1) {
      res.status(404).json({ error: '标注不存在' });
      return;
    }
    if (author !== undefined) annotations[index].author = author;
    if (comment !== undefined) annotations[index].comment = comment;
    if (status !== undefined) annotations[index].status = status;
    res.json({ success: true, annotation: annotations[index] });
  } catch (err) {
    res.status(500).json({ error: '更新标注失败' });
  }
});

app.get('/api/annotations', (req: Request, res: Response) => {
  try {
    const { imageId, status } = req.query;
    let result = [...annotations];
    if (imageId) {
      result = result.filter((a) => a.imageId === imageId);
    }
    if (status && status !== 'all') {
      result = result.filter((a) => a.status === status);
    }
    result.sort((a, b) => a.number - b.number);
    res.json({ success: true, annotations: result });
  } catch (err) {
    res.status(500).json({ error: '获取标注列表失败' });
  }
});

app.get('/api/report', (req: Request, res: Response) => {
  try {
    const { imageId } = req.query;
    if (!imageId) {
      res.status(400).json({ error: '缺少 imageId 参数' });
      return;
    }
    const image = images.find((img) => img.id === imageId);
    if (!image) {
      res.status(404).json({ error: '图片不存在' });
      return;
    }
    const imageAnnotations = annotations
      .filter((a) => a.imageId === imageId)
      .sort((a, b) => a.number - b.number);

    const statusLabels: Record<string, string> = {
      pending: '待确认',
      approved: '已采纳',
      rejected: '已驳回',
    };

    const groups: Record<string, Annotation[]> = {
      pending: [],
      approved: [],
      rejected: [],
    };
    imageAnnotations.forEach((a) => {
      groups[a.status].push(a);
    });

    let report = `========================================\n`;
    report += `       设计稿标注汇总报告\n`;
    report += `========================================\n\n`;
    report += `图片名称：${image.originalName}\n`;
    report += `生成时间：${new Date().toLocaleString('zh-CN')}\n`;
    report += `标注总数：${imageAnnotations.length}\n\n`;
    report += `----------------------------------------\n\n`;

    (['pending', 'approved', 'rejected'] as const).forEach((status) => {
      const items = groups[status];
      report += `【${statusLabels[status]}】（${items.length} 条）\n\n`;
      if (items.length === 0) {
        report += `  （暂无记录）\n\n`;
      } else {
        items.forEach((item) => {
          report += `  ${item.number}. 反馈人：${item.author || '（未填写）'}\n`;
          report += `     评论：${item.comment || '（无内容）'}\n`;
          report += `     状态：${statusLabels[status]}\n\n`;
        });
      }
      report += `----------------------------------------\n\n`;
    });

    report += `              报告结束\n`;
    report += `========================================\n`;

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.json({ success: true, report });
  } catch (err) {
    res.status(500).json({ error: '生成报告失败' });
  }
});

app.listen(PORT, () => {
  console.log(`后端服务器运行在 http://localhost:${PORT}`);
});
