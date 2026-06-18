## 1. 架构设计

```mermaid
flowchart TB
    subgraph "前端"
        A["App.tsx 状态管理"] --> B["PuzzleCanvas.tsx 画布"]
        A --> C["Toolbar.tsx 工具栏"]
        A --> D["ShareSection 分享区"]
        B --> E["imageHelper.ts 图片处理"]
        D --> F["shareHelper.ts 分享工具"]
    end
    subgraph "浏览器API"
        G["File API 上传"]
        H["Canvas API 缩略图"]
        I["Clipboard API 复制"]
        J["html-to-image 截图"]
    end
    E --> G
    E --> H
    F --> I
    F --> J
```

## 2. 技术说明

- 前端：React 18 + TypeScript + Vite
- 样式：Tailwind CSS 3
- 状态管理：Zustand
- 初始化工具：vite-init（react-ts模板）
- 后端：无
- 数据库：无

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 拼图编辑主页 |

## 4. API定义

无后端API，所有功能在前端完成。

## 5. 服务器架构图

不适用

## 6. 数据模型

### 6.1 数据模型定义

```mermaid
erDiagram
    PuzzleImage {
        string id PK
        string thumbnail
        string original
        number order
    }
    PuzzleConfig {
        string backgroundColor
        string borderStyle
        string layoutMode
    }
```

### 6.2 核心类型定义

```typescript
interface PuzzleImage {
  id: string;
  thumbnail: string;
  original: string;
  order: number;
}

type BorderStyle = 'none' | 'white-rounded' | 'gray-dashed';
type LayoutMode = 'compact' | 'loose';

interface PuzzleConfig {
  backgroundColor: string;
  borderStyle: BorderStyle;
  layoutMode: LayoutMode;
}
```
