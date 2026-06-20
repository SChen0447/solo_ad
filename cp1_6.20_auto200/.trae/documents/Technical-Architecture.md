## 1. 架构设计

```mermaid
flowchart LR
    A["App.tsx<br/>(状态管理 & 标签切换)"] --> B["CardEditor.tsx<br/>(卡牌编辑器)]
    A --> C["BattleSimulator.tsx<br/>(战斗模拟器)]
    A --> D["CardDeck.tsx<br/>(牌库管理)]
    B --> E["Canvas<br/>(渐变背景渲染)]
    C --> F["framer-motion<br/>(攻击动画)]
    D --> G["localStorage<br/>(本地存储)]
    A --> H["shared types<br/>(共享类型定义)]
```

## 2. 技术描述

- **前端框架**：React 18 + TypeScript
- **构建工具**：Vite
- **动画库**：framer-motion
- **图形渲染**：HTML5 Canvas
- **数据存储**：localStorage
- **状态管理**：React useState/useReducer (轻量状态，无需额外状态管理库)

## 3. 类型定义

```typescript
// 卡牌稀有度
type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

// 卡牌接口
interface Card {
  id: string;
  name: string;
  hp: number;
  attack: number;
  skill: string;
  rarity: Rarity;
  currentHp?: number;
  position?: { row: number; col: number };
  side?: 'player' | 'enemy';
}

// 稀有度配置
interface RarityConfig {
  color: string;
  gradient: { start: string; end: string };
  label: string;
}

// 战场格子
interface BattleCell {
  row: number;
  col: number;
  card: Card | null;
}

// 标签页类型
type TabType = 'editor' | 'battle' | 'deck';

// 攻击动画状态
interface AttackState {
  active: boolean;
  from: { x: number; y: number } | null;
  to: { x: number; y: number } | null;
}
```

## 4. 文件结构

```
e:\solo\SoloAutoDemo\tasks\auto200
├── package.json
├── index.html
├── tsconfig.json
├── vite.config.js
└── src/
    ├── App.tsx              # 主应用组件
    ├── CardEditor.tsx        # 卡牌编辑器
    ├── BattleSimulator.tsx  # 战斗模拟器
    ├── CardDeck.tsx         # 牌库管理
    └── main.tsx           # 入口文件
```

## 5. 组件职责

### 5.1 App.tsx
- 管理全局状态：当前激活标签页
- 管理卡牌数据：已保存的卡牌列表
- 管理对战状态：战场卡牌位置、攻击状态
- 子组件事件回调处理
- 标签页切换动画

### 5.2 CardEditor.tsx
- 字段模板展示与交互
- 稀有度下拉选择
- Canvas渐变背景渲染
- 实时卡牌预览（300x420px）
- 生成按钮与保存逻辑
- 字段拖拽功能

### 5.3 BattleSimulator.tsx
- 3x3战场网格渲染（每格80x80px）
- 卡牌放置与移除
- 攻击交互逻辑
- 攻击路径动画（framer-motion）
- 血量更新动画
- 胜负判断

### 5.4 CardDeck.tsx
- 牌库侧边栏（250px）
- 缩略图渲染（80x112px）
- 详情弹窗
- 长按删除交互
- 滑出删除动画
- localStorage 读写

## 6. 关键技术实现

### 6.1 Canvas 渐变渲染
- 使用 Canvas 2D Context 创建线性渐变
- 根据稀有度动态生成渐变起始和结束颜色
- 圆角裁剪实现圆角卡片效果

### 6.2 framer-motion 动画优化
- 使用 `motion` 组件实现标签切换淡入效果
- 使用 `AnimatePresence` 处理弹窗和删除动画
- 使用 `animate` 属性实现攻击闪光路径

### 6.3 性能优化
- 所有动画使用 transform 和 opacity，避免重排重绘
- Canvas 渲染使用 requestAnimationFrame
- 列表渲染使用唯一 key
- 长按交互使用 setTimeout 实现，避免阻塞主线程

### 6.4 本地存储
- 使用 localStorage 存储卡牌数据
- 数据序列化/反序列化
- 初始化时从 localStorage 加载

## 7. 颜色常量定义

```typescript
// 稀有度配置
const RARITY_CONFIG: Record<Rarity, RarityConfig> = {
  common: {
    color: '#B0B0B0',
    gradient: { start: '#E0E0E0', end: '#808080' },
    label: '普通'
  },
  rare: {
    color: '#4A90D9',
    gradient: { start: '#6BB3FF', end: '#2D5AA8' },
    label: '稀有'
  },
  epic: {
    color: '#9B59B6',
    gradient: { start: '#C39BD3', end: '#6C3483' },
    label: '史诗'
  },
  legendary: {
    color: '#F39C12',
    gradient: { start: '#FFD700', end: '#D35400' },
    label: '传说'
  }
};

// 主题颜色
const THEME = {
  background: '#1A1A2E',
  text: '#EAEAEA',
  accent: '#E94560',
  gridLine: '#E0E0E0',
  deckBackground: '#2C3E50',
  modalOverlay: '#00000080'
};
```

## 8. 动画配置

```typescript
// 动画时长配置
const ANIMATION_CONFIG = {
  tabSwitch: { duration: 0.2 },
  attack: { duration: 0.2 },
  hpUpdate: { duration: 0.15 },
  cardDelete: { duration: 0.3 },
  modal: { duration: 0.2 }
};

// 尺寸配置
const SIZES = {
  cardWidth: 300,
  cardHeight: 420,
  cardRadius: 8,
  cellSize: 80,
  sidebarWidth: 250,
  menuWidth: 280,
  thumbnailWidth: 80,
  thumbnailHeight: 112,
  thumbnailRadius: 4
};
```
