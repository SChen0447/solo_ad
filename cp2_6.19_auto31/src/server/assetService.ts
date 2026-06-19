import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

export interface Asset {
  id: string;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  category: string;
  tags: string[];
  description: string;
  downloadCount: number;
  uploadedAt: string;
  url: string;
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;
    cb(null, uniqueName);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.png', '.jpg', '.jpeg', '.svg'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('仅支持 PNG、JPG、SVG 格式文件'));
    }
  },
});

let assets: Asset[] = [
  {
    id: '1',
    filename: 'brand-logo.png',
    originalName: 'brand-logo.png',
    mimetype: 'image/png',
    size: 245000,
    category: '图标',
    tags: ['品牌色'],
    description: '品牌主标识Logo',
    downloadCount: 12,
    uploadedAt: '2025-01-15T08:00:00Z',
    url: '/uploads/brand-logo.png',
  },
  {
    id: '2',
    filename: 'icon-home.svg',
    originalName: 'icon-home.svg',
    mimetype: 'image/svg+xml',
    size: 3200,
    category: '图标',
    tags: ['界面元素'],
    description: '首页导航图标',
    downloadCount: 45,
    uploadedAt: '2025-02-10T10:30:00Z',
    url: '/uploads/icon-home.svg',
  },
  {
    id: '3',
    filename: 'hero-illustration.jpg',
    originalName: 'hero-illustration.jpg',
    mimetype: 'image/jpeg',
    size: 1520000,
    category: '插画',
    tags: ['装饰图形'],
    description: '首页Hero区域装饰插画',
    downloadCount: 23,
    uploadedAt: '2025-03-05T14:20:00Z',
    url: '/uploads/hero-illustration.jpg',
  },
  {
    id: '4',
    filename: 'button-primary.svg',
    originalName: 'button-primary.svg',
    mimetype: 'image/svg+xml',
    size: 1800,
    category: 'UI组件',
    tags: ['品牌色', '界面元素'],
    description: '主要操作按钮组件',
    downloadCount: 67,
    uploadedAt: '2025-03-20T09:15:00Z',
    url: '/uploads/button-primary.svg',
  },
  {
    id: '5',
    filename: 'card-bg-pattern.png',
    originalName: 'card-bg-pattern.png',
    mimetype: 'image/png',
    size: 890000,
    category: '插画',
    tags: ['装饰图形'],
    description: '卡片背景装饰纹理',
    downloadCount: 8,
    uploadedAt: '2025-04-01T11:45:00Z',
    url: '/uploads/card-bg-pattern.png',
  },
  {
    id: '6',
    filename: 'icon-search.svg',
    originalName: 'icon-search.svg',
    mimetype: 'image/svg+xml',
    size: 2100,
    category: '图标',
    tags: ['界面元素'],
    description: '搜索功能图标',
    downloadCount: 34,
    uploadedAt: '2025-04-10T16:00:00Z',
    url: '/uploads/icon-search.svg',
  },
  {
    id: '7',
    filename: 'modal-component.svg',
    originalName: 'modal-component.svg',
    mimetype: 'image/svg+xml',
    size: 4500,
    category: 'UI组件',
    tags: ['界面元素'],
    description: '弹窗对话框组件',
    downloadCount: 19,
    uploadedAt: '2025-04-15T13:30:00Z',
    url: '/uploads/modal-component.svg',
  },
  {
    id: '8',
    filename: 'onboarding-illustration.png',
    originalName: 'onboarding-illustration.png',
    mimetype: 'image/png',
    size: 2100000,
    category: '插画',
    tags: ['品牌色', '装饰图形'],
    description: '引导页装饰插画',
    downloadCount: 15,
    uploadedAt: '2025-05-01T07:00:00Z',
    url: '/uploads/onboarding-illustration.png',
  },
  {
    id: '9',
    filename: 'icon-settings.svg',
    originalName: 'icon-settings.svg',
    mimetype: 'image/svg+xml',
    size: 2800,
    category: '图标',
    tags: ['界面元素'],
    description: '设置齿轮图标',
    downloadCount: 28,
    uploadedAt: '2025-05-10T15:20:00Z',
    url: '/uploads/icon-settings.svg',
  },
  {
    id: '10',
    filename: 'input-component.svg',
    originalName: 'input-component.svg',
    mimetype: 'image/svg+xml',
    size: 3200,
    category: 'UI组件',
    tags: ['品牌色', '界面元素'],
    description: '输入框组件设计稿',
    downloadCount: 41,
    uploadedAt: '2025-05-20T10:00:00Z',
    url: '/uploads/input-component.svg',
  },
  {
    id: '11',
    filename: 'icon-notification.svg',
    originalName: 'icon-notification.svg',
    mimetype: 'image/svg+xml',
    size: 1900,
    category: '图标',
    tags: ['界面元素'],
    description: '通知铃铛图标',
    downloadCount: 22,
    uploadedAt: '2025-06-01T08:30:00Z',
    url: '/uploads/icon-notification.svg',
  },
  {
    id: '12',
    filename: 'empty-state-illustration.png',
    originalName: 'empty-state-illustration.png',
    mimetype: 'image/png',
    size: 680000,
    category: '插画',
    tags: ['装饰图形'],
    description: '空状态页面装饰插画',
    downloadCount: 9,
    uploadedAt: '2025-06-10T12:00:00Z',
    url: '/uploads/empty-state-illustration.png',
  },
];

let nextId = 13;

export function getAllAssets(): Asset[] {
  return [...assets];
}

export function getAssetById(id: string): Asset | undefined {
  return assets.find((a) => a.id === id);
}

export function filterAssets(category?: string, tag?: string): Asset[] {
  let result = [...assets];
  if (category) {
    result = result.filter((a) => a.category === category);
  }
  if (tag) {
    result = result.filter((a) => a.tags.includes(tag));
  }
  return result;
}

export function searchAssets(keyword: string): Asset[] {
  const lower = keyword.toLowerCase();
  return assets.filter(
    (a) =>
      a.originalName.toLowerCase().includes(lower) ||
      a.description.toLowerCase().includes(lower)
  );
}

export function addAsset(
  file: Express.Multer.File,
  category: string,
  tags: string[],
  description: string
): Asset {
  const asset: Asset = {
    id: String(nextId++),
    filename: file.filename,
    originalName: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
    category,
    tags,
    description,
    downloadCount: 0,
    uploadedAt: new Date().toISOString(),
    url: `/uploads/${file.filename}`,
  };
  assets = [asset, ...assets];
  return asset;
}

export function incrementDownloadCount(id: string): Asset | null {
  const asset = assets.find((a) => a.id === id);
  if (!asset) return null;
  asset.downloadCount += 1;
  return asset;
}

export function getCategories(): { name: string; tags: string[] }[] {
  const categoryMap = new Map<string, Set<string>>();
  for (const asset of assets) {
    if (!categoryMap.has(asset.category)) {
      categoryMap.set(asset.category, new Set());
    }
    const tagSet = categoryMap.get(asset.category)!;
    for (const tag of asset.tags) {
      tagSet.add(tag);
    }
  }
  const result: { name: string; tags: string[] }[] = [];
  for (const [name, tagSet] of categoryMap) {
    result.push({ name, tags: Array.from(tagSet) });
  }
  return result;
}
