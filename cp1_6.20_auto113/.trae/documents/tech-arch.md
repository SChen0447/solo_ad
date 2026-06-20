# 动态文字海报编辑器 技术架构文档

## 1. 技术选型

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 18.x | 前端框架，组件化开发 |
| TypeScript | 5.x | 类型安全，提升开发效率 |
| Vite | 5.x | 构建工具，快速开发体验 |
| framer-motion | 11.x | 动画库，实现拖拽、动画效果 |
| html-to-image | 1.x | DOM转图片，支持高清导出 |

---

## 2. 项目目录结构

```
auto113/
├── .trae/
│   └── documents/
│       ├── PRD.md
│       └── tech-arch.md
├── src/
│   ├── App.tsx              # 主组件，布局组合和状态管理
│   ├── Canvas.tsx           # 画布组件，渲染背景和文字元素
│   ├── TextElement.tsx      # 单个文字元素组件
│   ├── EditorPanel.tsx      # 属性编辑面板组件
│   └── ExportModal.tsx      # 导出确认对话框组件
├── index.html               # 入口HTML
├── package.json             # 依赖配置
├── vite.config.js           # Vite构建配置
└── tsconfig.json            # TypeScript配置
```

---

## 3. 数据模型设计

### 3.1 文字元素数据结构

```typescript
interface TextItem {
  id: string;              // 唯一标识
  char: string;            // 单个字符
  x: number;               // X坐标（相对于画布）
  y: number;               // Y坐标（相对于画布）
  fontSize: number;        // 字号 12-120
  rotation: number;        // 旋转角度 -180 到 180
  color: string;           // 字体颜色
  shadow: boolean;         // 是否开启阴影
}
```

### 3.2 画布背景配置

```typescript
interface GradientPreset {
  id: string;
  name: string;
  colors: [string, string];  // 渐变色起止
}

type GradientDirection = 'horizontal' | 'diagonal';

interface CanvasConfig {
  backgroundColor: string;          // 默认背景色
  gradientPresetId: string | null;  // 选中的渐变预设ID
  gradientDirection: GradientDirection;
}
```

### 3.3 动画配置

```typescript
type AnimationType = 'fadeIn' | 'slideFromTop' | 'slideFromLeft' | 'scaleIn' | 'rotateIn';

interface AnimationConfig {
  type: AnimationType | null;
  duration: number;      // 总持续时间 0.6s
  staggerDelay: number;  // 每个字延迟 0.1s
}
```

### 3.4 全局应用状态

```typescript
interface AppState {
  textItems: TextItem[];
  selectedId: string | null;
  canvasConfig: CanvasConfig;
  animation: AnimationConfig;
  isPlaying: boolean;
  showExportModal: boolean;
}
```

---

## 4. 组件架构

### 4.1 组件层级

```
App.tsx (根组件)
├── TopBar (顶栏)
│   ├── Logo
│   ├── TextInput (文字输入框)
│   └── AddButton (添加按钮)
├── MainContent (主体内容区，左右布局)
│   ├── CanvasContainer (左侧画布区域，70%)
│   │   ├── Canvas.tsx
│   │   │   ├── Background (背景层)
│   │   │   └── TextElement.tsx × N (文字元素列表)
│   │   └── AnimationController (播放控制条)
│   └── EditorPanel.tsx (右侧编辑面板，280px)
│       ├── Tabs (标签页: 文本/样式/动画/导出)
│       ├── TextStyleControls (字号、旋转、颜色、阴影)
│       ├── AnimationPresets (5种动画预设)
│       └── ExportButton
└── ExportModal.tsx (导出确认对话框)
```

### 4.2 核心组件职责

#### App.tsx - 主组件
- 管理全局状态（textItems, selectedId, canvasConfig, animation等）
- 实现状态更新回调函数
- 组合布局结构
- 处理文字添加逻辑

#### Canvas.tsx - 画布组件
- 渲染背景（纯色或渐变）
- 渲染所有TextElement
- 处理画布点击（取消选中）
- 管理画布引用供导出使用

#### TextElement.tsx - 单个文字元素
- 实现拖拽功能（framer-motion drag）
- 应用样式：字号、颜色、旋转、阴影
- 处理选中状态
- 入场动画效果

#### EditorPanel.tsx - 属性编辑面板
- 标签页切换
- 样式调节控件：字号滑块、旋转旋钮、颜色选择器、阴影开关
- 动画预设选择
- 渐变背景选择

#### ExportModal.tsx - 导出对话框
- 半透明遮罩
- 居中卡片
- 取消/导出按钮

---

## 5. 状态管理方案

使用 React 18 `useState` + `useReducer` 进行状态管理：
- 简单状态（如输入框值、面板展开）使用 `useState`
- 复杂的文字列表、选中状态使用 `useReducer` 集中管理

状态提升策略：
- 所有文字元素状态提升至 App.tsx
- 选中文字ID提升至 App.tsx
- 动画播放状态提升至 App.tsx
- 子组件通过 props + callbacks 与父组件通信

---

## 6. 动画实现方案

### 6.1 拖拽动画
使用 framer-motion 的 `drag` 属性：
```
drag={true}
dragMomentum={false}
transition={{ type: "spring", stiffness: 300, damping: 25 }}
```

### 6.2 入场动画
5种入场动画通过 framer-motion 的 `initial` 和 `animate` props 实现：
- **fadeIn**: opacity: 0 → 1
- **slideFromTop**: y: -50 → 0, opacity: 0 → 1
- **slideFromLeft**: x: -50 → 0, opacity: 0 → 1
- **scaleIn**: scale: 0 → 1, opacity: 0 → 1
- **rotateIn**: rotate: -180 → 0, scale: 0 → 1, opacity: 0 → 1

每个字延迟 `index * 0.1s`，总持续时间 `0.6s`。

### 6.3 播放控制
- `isPlaying` 状态控制动画是否触发
- `animationKey` 用于强制重新触发动画
- 进度条通过 `useAnimation` hook 监听动画进度

---

## 7. 导出实现方案

使用 `html-to-image` 库将 DOM 转换为图片：
1. 获取画布 DOM 元素引用（useRef）
2. 调用 `toPng` 方法，设置 `pixelRatio: 2` 实现2x分辨率
3. 设置 `backgroundColor: '#ffffff'` 确保白色背景
4. 创建下载链接，触发浏览器下载

---

## 8. 性能优化策略

### 8.1 拖拽性能
- framer-motion 使用 GPU 加速的 transform 属性
- 避免在拖拽时触发重排（只改变 transform，不改变 top/left）
- 使用 `will-change: transform` 提示浏览器优化

### 8.2 渲染优化
- 使用 React.memo 包装 TextElement，避免不必要的重渲染
- 使用 useCallback 包装回调函数，保证引用稳定
- 列表渲染使用稳定的 key（textItem.id）

### 8.3 动画性能
- 所有动画使用 transform 和 opacity（不触发重排重绘）
- 使用 `will-change` 提前告知浏览器
- 批量更新 state，减少 render 次数

---

## 9. 渐变色预设（10种）

| 编号 | 名称 | 色值 |
|------|------|------|
| 1 | 晨曦粉 | #ffecd2 → #fcb69f |
| 2 | 薄荷蓝 | #a1c4fd → #c2e9fb |
| 3 | 薰衣草 | #d4fc79 → #96e6a1 |
| 4 | 日落橙 | #ff9a9e → #fecfef |
| 5 | 深海蓝 | #667eea → #764ba2 |
| 6 | 柠檬黄 | #f6d365 → #fda085 |
| 7 | 森林绿 | #11998e → #38ef7d |
| 8 | 玫瑰粉 | #ee9ca7 → #ffdde1 |
| 9 | 星空紫 | #434343 → #000000 |
| 10 | 暖阳金 | #fceabb → #f8b500 |

---

## 10. 构建与部署

- 开发命令: `npm run dev` - 启动 Vite 开发服务器
- 构建命令: `npm run build` - 生产环境构建
- TypeScript 严格模式: `strict: true`
- 目标浏览器: ES2020，现代浏览器支持
