## 1. 架构设计

```mermaid
flowchart TB
    subgraph "前端 (React + TypeScript + Vite)"
        "App.tsx<br/>全局状态管理" --> "MaterialPanel.tsx<br/>素材面板"
        "App.tsx" --> "JournalEditor.tsx<br/>手账编辑器"
        "App.tsx" --> "ThemeSelector.tsx<br/>主题选择"
        "types.ts<br/>类型定义"
    end
    subgraph "后端 (Python Flask)"
        "app.py" --> "/api/upload<br/>图片上传API"
    end
    "MaterialPanel.tsx" -->|"上传图片"| "/api/upload"
    "/api/upload" -->|"返回缩略图Base64"| "MaterialPanel.tsx"
    "App.tsx" -->|"localStorage"| "浏览器本地存储"
```

## 2. 技术说明
- 前端：React 18 + TypeScript + Vite
- 状态管理：Zustand
- 样式：Tailwind CSS
- 后端：Python Flask（提供图片上传和缩略图生成API）
- 数据存储：前端 localStorage
- 导出：html-to-image 库
- 拖拽：react-dropzone + 自定义拖拽逻辑
- HTTP客户端：axios

## 3. 路由定义
| 路由 | 用途 |
|------|------|
| / | 手账编辑主页面（单页应用） |

## 4. API定义

### 4.1 上传图片
- **接口**: POST /api/upload
- **请求**: multipart/form-data，字段 `files`，支持多文件上传
- **响应**: 
```typescript
interface UploadResponse {
  thumbnails: Array<{
    originalName: string;
    thumbnailBase64: string;
    width: number;
    height: number;
  }>;
}
```

## 5. 服务器架构图

```mermaid
flowchart LR
    "Flask路由<br/>/api/upload" --> "Pillow<br/>缩略图生成" --> "Base64编码<br/>返回前端"
```

## 6. 数据模型

### 6.1 数据模型定义

```mermaid
erDiagram
    "PhotoItem" {
        "string id" "唯一标识"
        "string thumbnailBase64" "缩略图Base64"
        "number x" "画布X坐标"
        "number y" "画布Y坐标"
        "number width" "宽度(80-300)"
        "number rotation" "旋转角度(0-360)"
        "string label" "文字标签(最大30字)"
    }
    "TextBlock" {
        "string id" "唯一标识"
        "string content" "文字内容(最大200字)"
        "number x" "画布X坐标"
        "number y" "画布Y坐标"
    }
    "JournalState" {
        "string title" "旅行标题(最大20字)"
        "string dateRange" "日期范围"
        "string theme" "当前主题"
        "PhotoItem[] photos" "照片列表"
        "TextBlock[] textBlocks" "文字段落列表"
    }
```

### 6.2 数据定义语言
- 使用 localStorage 键 `journal-state` 存储完整手账状态
- 数据格式为 JSON 序列化的 JournalState 对象
