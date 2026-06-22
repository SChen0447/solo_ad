## 1. 架构设计

```mermaid
graph TB
    subgraph "前端层"
        App["App.tsx 主组件<br/>(状态管理、数据流"]
        subgraph "组件层"
            DiaryInput["DiaryInput.tsx<br/>日记输入组件"]
            Timeline["Timeline.tsx<br/>时间线组件"]
            MoodBar["心情色块条组件"]
            Calendar["日历组件"]
            KeywordCloud["关键词云组件"]
        end
        subgraph "工具层"
            moodAnalyzer["moodAnalyzer.ts<br/>心情分析工具"]
            calendarHelper["calendarHelper.ts<br/>日历辅助工具"]
        end
    end
    subgraph "数据层"
        LocalStorage["LocalStorage<br/>(本地存储)
    end
```

## 2. 技术描述

- **前端框架**：React@18.2.0 + TypeScript@5.3.3
- **构建工具**：Vite@5.0.8 + @vitejs/plugin-react@4.2.0
- **样式方案**：CSS Modules / 纯CSS（按用户指定的CSS变量
- **状态管理**：React useState/useReducer（轻量级，无需额外状态库）
- **数据存储**：LocalStorage（本地持久化）
- **动画实现**：CSS Transition + CSS Animation
- **图标方案**：纯CSS实现，无第三方图标库

## 3. 文件结构

```
src/
├── App.tsx                 # 主组件，状态管理
├── components/
│   ├── DiaryInput.tsx      # 日记输入组件
│   ├── Timeline.tsx        # 时间线组件
│   ├── MoodBar.tsx         # 心情色块条组件
│   ├── Calendar.tsx        # 日历组件
│   └── DiaryCard.tsx      # 日记卡片组件
├── utils/
│   ├── moodAnalyzer.ts     # 心情分析工具
│   └── calendarHelper.ts   # 日历辅助工具
├── types/
│   └── index.ts            # 类型定义
└── styles/
    └── globals.css          # 全局样式
```

## 4. 数据模型

### 4.1 日记条目类型
```typescript
interface DiaryEntry {
  id: string;
  date: string;        // YYYY-MM-DD
  content: string;
  moodColor: string;
  keywords: string[];
  moodLevel: number;     // 0-100 心情指数
}
```

### 4.2 心情分析结果类型
```typescript
interface MoodAnalysisResult {
  color: string;
  keywords: string[];
  moodLevel: number;
}
```

## 5. 核心算法

### 5.1 心情分析算法
- 基于关键词情感词典的简单情感分析
- 正面词汇增加心情指数，负面词汇降低
- 根据最终心情指数映射到颜色渐变（红→黄→绿→蓝→紫
- 关键词提取：分词 + 词频统计 + 情感词权重

### 5.2 关键词云渲染
- 根据词频决定字号（14-28px范围）
- 心情色系决定颜色
- 透明度随机变化增加层次感

### 5.3 周视图曲线
- 使用SVG贝塞尔曲线连接
- 相邻颜色渐变过渡
- stroke-dasharray 实现绘制动画

## 6. 性能优化
- 关键词提取控制在100ms内完成
- CSS动画使用transform和opacity属性，保证60fps
- 列表渲染使用key优化
- 避免不必要的重渲染（React.memo优化
