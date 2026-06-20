## 1. 架构设计

```mermaid
graph TB
    subgraph "前端层"
        "index.html" --> "main.ts"
        "main.ts" --> "waterfall.ts"
        "main.ts" --> "poemData.ts"
        "main.ts" --> "background.ts"
        "waterfall.ts" --> "card.ts"
        "waterfall.ts" --> "filter.ts"
        "card.ts" --> "modal.ts"
        "modal.ts" --> "tts.ts"
    end
    subgraph "数据层"
        "poemData.ts" --> "内置诗词数据集"
    end
    subgraph "浏览器API"
        "tts.ts" --> "SpeechSynthesis API"
        "background.ts" --> "Canvas API"
    end
```

## 2. 技术说明

- **前端**：TypeScript + Vite + 原生DOM（无框架）
- **构建工具**：Vite（支持TypeScript编译、HMR）
- **样式**：CSS自定义属性 + 原生CSS动画
- **数据**：内置静态诗词数据集（唐宋名篇约50首）
- **依赖**：canvas-confetti（粒子特效）、typescript
- **无后端**：纯前端应用，数据内嵌

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 首页，包含每日一诗、筛选栏、瀑布流 |

（单页应用，无客户端路由）

## 4. 模块职责

| 文件 | 职责 |
|------|------|
| src/main.ts | 应用入口，初始化各模块，协调模块间通信 |
| src/core/waterfall.ts | 瀑布流布局引擎，管理卡片位置、筛选动画、骨架屏 |
| src/core/poemData.ts | 诗词数据加载、每日推荐算法（基于日期哈希）、数据查询 |
| src/ui/card.ts | 卡片DOM创建、翻转动画CSS、点击事件委托 |
| src/ui/modal.ts | 详情弹窗创建、淡入缩放动画、TTS调用 |
| src/ui/background.ts | Canvas渐变背景渲染、根据诗词意境切换色彩方案 |
| src/utils/tts.ts | 封装SpeechSynthesis API，提供朗读/停止接口 |
| src/utils/filter.ts | 关键词匹配、作者过滤、朝代过滤逻辑 |

## 5. 数据模型

### 5.1 诗词数据结构

```typescript
interface Poem {
  id: number;
  title: string;
  author: string;
  dynasty: string;
  lines: string[];
  excerpt: string;
  annotations: string[];
  mood: '雄浑' | '婉约' | '田园' | '边塞' | '思乡' | '离别' | '咏物' | '怀古';
}
```

### 5.2 意境-色彩映射

| 意境 | 渐变色方案 |
|------|-----------|
| 雄浑 | 深墨→暗金 |
| 婉约 | 淡粉→浅紫 |
| 田园 | 浅绿→米黄 |
| 边塞 | 暗红→深褐 |
| 思乡 | 月白→淡蓝 |
| 离别 | 灰→暗紫 |
| 咏物 | 各异 |
| 怀古 | 古铜→深墨 |

## 6. 性能策略

- 瀑布流使用CSS Grid + 绝对定位实现，避免重排
- 卡片使用DocumentFragment批量插入DOM
- 筛选动画使用CSS transform + opacity（GPU加速）
- 骨架屏使用CSS animation脉动效果，无JS开销
- Canvas背景使用requestAnimationFrame，仅每日一诗区域渲染
- TTS使用浏览器原生API，零额外依赖
