## 1. 架构设计

```mermaid
flowchart TB
    subgraph "前端层"
        "CommentInput" --> "analysisEngine"
        "CommentInput" --> "App状态管理"
        "App状态管理" --> "WordCloud"
        "App状态管理" --> "TrendChart"
    end
    subgraph "数据层"
        "types.ts" --> "CommentInput"
        "types.ts" --> "WordCloud"
        "types.ts" --> "TrendChart"
        "types.ts" --> "analysisEngine"
    end
```

纯前端应用，无后端依赖。状态通过 React useState/useCallback 在 App 组件内管理，通过 props 传递给子组件。

## 2. 技术说明

- 前端：React 18 + TypeScript + Vite
- 可视化：D3.js（词云布局 + 折线图）
- 状态管理：React 内置 useState（无需 zustand，状态简单）
- 初始化工具：vite-init（react-ts 模板）
- 后端：无
- 数据库：无（纯前端内存数据）

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 单页面应用，包含所有功能模块 |

## 4. 文件结构

```
├── package.json
├── vite.config.js
├── tsconfig.json
├── index.html
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── App.css
│   ├── modules/
│   │   ├── commentInput/
│   │   │   ├── CommentInput.tsx
│   │   │   └── analysisEngine.ts
│   │   ├── wordCloud/
│   │   │   └── WordCloud.tsx
│   │   └── trendChart/
│   │       └── TrendChart.tsx
│   └── shared/
│       └── types.ts
```

## 5. 核心数据类型

```typescript
interface Comment {
  id: string;
  content: string;
  rating: number;       // 1-5
  date: string;         // YYYY-MM-DD
}

type KeywordCategory = 'positive' | 'negative' | 'neutral';

interface KeywordResult {
  word: string;
  frequency: number;
  category: KeywordCategory;
  weeklyData: { week: string; count: number }[];
}

interface AnalysisResult {
  keywords: KeywordResult[];
}
```

## 6. 关键词分析引擎设计

### 6.1 规则引擎（非AI）

1. **分词**：中文按标点和停用词拆分，英文按空格拆分
2. **停用词过滤**：移除常见无意义词（的、了、是、和、等）
3. **同义词合并**：预定义同义词表（如"好"="优秀"="棒"、"差"="不好"="糟糕"），合并到主词
4. **情感分类**：
   - 预定义优点词库（质量好、速度快、好用、满意、推荐等）→ positive
   - 预定义缺点词库（质量差、慢、难用、失望、退货等）→ negative
   - 其余 → neutral
5. **频率统计**：统计每个关键词在所有评论中出现的次数
6. **周聚合**：按评论日期将关键词出现次数按周聚合

### 6.2 性能保证

- 50条评论分析 ≤ 2秒：纯内存操作，O(n*m) 复杂度（n=评论数，m=每条评论词数）
