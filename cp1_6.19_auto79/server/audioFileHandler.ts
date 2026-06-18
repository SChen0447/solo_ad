import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request, Response } from 'express';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export function createAudioUploadMiddleware(uploadsDir: string) {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, uploadsDir);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      const baseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');
      const uniqueName = `${baseName}_${Date.now()}${ext}`;
      cb(null, uniqueName);
    },
  });

  return multer({
    storage,
    limits: {
      fileSize: MAX_FILE_SIZE,
    },
    fileFilter: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      if (ext === '.wav' || ext === '.mp3') {
        cb(null, true);
      } else {
        cb(new Error('Only WAV and MP3 files are allowed'));
      }
    },
  });
}

export function handleAudioUpload(req: Request, res: Response): void {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }

  const file = req.file;
  const projectId = req.params.projectId;

  const metadata = {
    id: `clip_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    projectId,
    originalName: file.originalname,
    fileName: file.filename,
    filePath: `/uploads/${file.filename}`,
    size: file.size,
    mimeType: file.mimetype,
    uploadedAt: Date.now(),
  };

  res.json({
    success: true,
    clip: metadata,
  });
}
