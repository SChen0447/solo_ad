import { Request, Response } from 'express';
import path from 'path';
import {
  upload,
  getAllAssets,
  filterAssets,
  searchAssets,
  addAsset,
  incrementDownloadCount,
  getCategories,
} from './assetService.js';

export function handleUpload(req: Request, res: Response): void {
  upload.single('file')(req, res, (err: any) => {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: '请选择要上传的文件' });
      return;
    }
    const category = req.body.category || '图标';
    const tags = req.body.tags ? JSON.parse(req.body.tags) : [];
    const description = req.body.description || '';
    const asset = addAsset(req.file, category, tags, description);
    res.status(201).json(asset);
  });
}

export function handleGetAssets(req: Request, res: Response): void {
  const { category, tag } = req.query;
  if (category || tag) {
    const result = filterAssets(
      category as string | undefined,
      tag as string | undefined
    );
    res.json(result);
    return;
  }
  res.json(getAllAssets());
}

export function handleSearch(req: Request, res: Response): void {
  const { q } = req.query;
  if (!q || typeof q !== 'string') {
    res.status(400).json({ error: '请提供搜索关键词' });
    return;
  }
  const result = searchAssets(q);
  res.json(result);
}

export function handleDownload(req: Request, res: Response): void {
  const { id } = req.params;
  const updated = incrementDownloadCount(id);
  if (!updated) {
    res.status(404).json({ error: '素材未找到' });
    return;
  }
  const filePath = path.resolve(
    process.cwd(),
    'uploads',
    updated.filename
  );
  res.download(filePath, updated.originalName);
}

export function handleGetCategories(_req: Request, res: Response): void {
  const categories = getCategories();
  res.json(categories);
}
