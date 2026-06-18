## 1. 架构设计

```mermaid
flowchart TB
    "前端层" --> "App.tsx"
    "App.tsx" --> "EditorPanel.tsx"
    "App.tsx" --> "PreviewPanel.tsx"
    "EditorPanel.tsx" --> "store.ts"
    "PreviewPanel.tsx" --> "store.ts"
    "store.ts" --> "zustand全局状态"
```

数据流向：
- 用户操作 → EditorPanel 更新局部状态 → 调用 zustand store 的更新方法 → store 全局状态变化 → PreviewPanel 订阅 store 并重新渲染
- 预设方案点击 → store 批量更新所有排版参数 → PreviewPanel 重新渲染
- CSS导出 → 读取 store 当前状态 → 生成 CSS 代码片段

## 2. 技术说明

- 前端框架：React 18 + TypeScript（严格模式）
- 构建工具：Vite + @vitejs/plugin-react
- 状态管理：zustand
- 文件下载：file-saver
- 初始化工具：vite-init（react-ts模板）
- 后端：无
- 数据库：无

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 主页面，包含编辑面板和预览画布 |

## 4. 文件结构与调用关系

```
项目根目录/
├── package.json          # 依赖与脚本配置
├── vite.config.ts        # Vite构建配置
├── tsconfig.json         # TypeScript严格模式配置
├── index.html            # 入口HTML页面
└── src/
    ├── main.tsx          # React应用挂载点 → 渲染App组件
    ├── App.tsx           # 主容器组件 → 引入EditorPanel + PreviewPanel
    ├── store.ts          # zustand全局状态管理 → 管理排版参数和预设方案
    ├── EditorPanel.tsx   # 侧面板编辑区 → 调用store更新方法
    └── PreviewPanel.tsx  # 画布预览区 → 订阅store渲染文本
```

### 文件间调用关系

- `main.tsx` → 导入并渲染 `App.tsx`
- `App.tsx` → 导入 `EditorPanel.tsx` 和 `PreviewPanel.tsx`，管理左右布局
- `EditorPanel.tsx` → 导入 `store.ts`，用户操作时调用 store 的 `updateTypography` 方法
- `PreviewPanel.tsx` → 导入 `store.ts`，订阅 store 中的排版参数进行渲染
- `App.tsx` → 导入 `store.ts`，用于CSS导出功能（读取当前状态生成CSS）

### 数据流向

```
用户操作（字体/字号/字间距/行高/对齐）
    ↓
EditorPanel（局部交互状态）
    ↓
zustand store.updateTypography()（全局状态更新）
    ↓
PreviewPanel（订阅store，重新计算CSS样式并渲染）

预设方案点击
    ↓
zustand store.applyPreset()（批量更新所有排版参数）
    ↓
PreviewPanel（重新渲染）

CSS导出
    ↓
读取zustand store当前状态
    ↓
生成CSS代码片段 → 复制到剪贴板 / 下载为.css文件
```

## 5. 状态模型

### zustand store 数据结构

```typescript
interface TypographyState {
  fontFamily: string;
  fontSize: number;
  letterSpacing: number;
  lineHeight: number;
  textAlign: 'left' | 'center' | 'right' | 'justify';
}

interface Preset {
  name: string;
  config: TypographyState;
}

interface StoreState extends TypographyState {
  presets: Preset[];
  updateTypography: (partial: Partial<TypographyState>) => void;
  applyPreset: (presetName: string) => void;
}
```

### 预设方案数据

| 预设名称 | fontFamily | fontSize | letterSpacing | lineHeight | textAlign |
|----------|-----------|----------|---------------|-----------|-----------|
| 新闻正文 | Georgia | 16 | 0.5 | 1.8 | justify |
| 博客标题 | Playfair Display | 36 | 1 | 1.3 | left |
| 展览说明 | Inter | 14 | 2 | 2.0 | left |
| 诗歌排版 | Courier New | 18 | 0 | 2.5 | center |
