## 1. 架构设计

```mermaid
graph TD
    A["App.tsx (全局状态管理)
    B["ImageUploader.tsx" -->|"上传图片数据| A
    C["WatermarkPanel.tsx" -->|"水印参数变更| A
    A -->|"图片数据 + 参数| D["PreviewArea.tsx"
    A -->|"图片数据 + 参数| E["watermark.ts"
    E -->|"渲染结果| D
    E -->|"Blob 数据| F["zipUtils.ts"
    F -->|"ZIP 文件| G["用户下载"
```

## 2. 技术描述

- 前端框架：React 18 + TypeScript
- 构建工具：Vite
- 核心依赖：
  - react / react-dom：UI 框架
  - uuid：生成唯一图片 ID
  - jszip：ZIP 打包压缩
  - file-saver：文件下载
  - lucide-react：图标库
- 样式方案：原生 CSS + CSS Modules（无需 Tailwind）

## 3. 文件结构

```
/
├── package.json
├── vite.config.js
├── tsconfig.json
├── index.html
├── src/
│   ├── App.tsx              # 主应用组件，全局状态与布局
│   ├── components/
│   │   ├── ImageUploader.tsx   # 上传区 + 缩略图网格
│   │   ├── WatermarkPanel.tsx  # 水印参数控制面板
│   │   └── PreviewArea.tsx     # 实时预览区
│   └── utils/
│       ├── watermark.ts      # 水印 Canvas 渲染工具
│       └── zipUtils.ts        # ZIP 打包下载工具
```

## 4. 数据模型

### 4.1 类型定义

```typescript
interface ImageItem {
  id: string;
  file: File;
  url: string;
  name: string;
  width: number;
  height: number;
  processedBlob?: Blob;
}

interface WatermarkConfig {
  text: string;
  fontFamily: string;
  fontSize: number;
  color: string;
  opacity: number;
  position: WatermarkPosition;
  rotation: number;
}

type WatermarkPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'center-left'
  | 'center'
  | 'center-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';
```

### 4.2 预置字体

```
- 'Noto Sans SC' (思源黑体 - 中文)
- 'Noto Serif SC' (思源宋体 - 中文)
- 'Arial'
- 'Georgia'
```

## 5. 工具函数 API

### watermark.ts

```typescript
// 将水印绘制到图片上，返回 Blob
export async function renderWatermark(
  imageUrl: string,
  config: WatermarkConfig
): Promise<Blob>;

// 将水印绘制到指定 Canvas（用于实时预览）
export function drawWatermarkOnCanvas(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  config: WatermarkConfig
): void;
```

### zipUtils.ts

```typescript
// 将多张已处理的图片打包为 ZIP 并下载
export async function downloadAllAsZip(
  images: ImageItem[],
  outputFilename?: string
): Promise<void>;

// 下载单张处理后的图片
export function downloadSingleImage(
  blob: Blob,
  filename: string
): void;
```
