## 1. 架构设计

```mermaid
flowchart TB
    subgraph "前端层 (React + TypeScript + Vite)"
        "App.tsx" --> "SideBySideView.tsx"
        "App.tsx --> diffEngine.ts"
        "App.tsx --> highlighter.ts"
    end
    subgraph "工具层"
        "diffEngine.ts" --> "diff库"
        "highlighter.ts" --> "正则匹配"
    end
```

纯前端架构，无后端依赖。所有代码数据和对比结果在内存中管理。

## 2. 技术说明

- 前端：React 18 + TypeScript + Vite
- 初始化工具：vite-init（react-ts模板）
- 样式：CSS Modules + CSS变量（深色主题）
- 差异计算：diff库（npm包`diff`）
- 状态管理：React useState/useCallback（无需全局状态库，状态仅在App组件内管理）
- 后端：无
- 数据库：无

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 单页应用，包含所有功能模块 |

## 4. 数据流向

```
用户输入 → App.tsx(state: leftCode, rightCode)
         → 防抖300ms → diffEngine.compare(leftCode, rightCode)
         → DiffLine[] → App.tsx(state: diffData)
         → SideBySideView(diffData) → 渲染高亮视图

语言选择 → App.tsx(state: language)
        → highlighter.highlight(code, language)
        → 高亮后的HTML → SideBySideView渲染

复制操作 → App.tsx → navigator.clipboard.writeText()
        → 显示提示条
```

## 5. 类型定义

```typescript
type DiffLineStatus = 'added' | 'removed' | 'changed' | 'unchanged';

interface DiffLine {
  lineNumber: number;
  status: DiffLineStatus;
  text: string;
  leftText?: string;
  rightText?: string;
}

type SupportedLanguage = 'javascript' | 'typescript' | 'html' | 'css';
```

## 6. 文件结构与调用关系

```
project/
├── index.html              # 入口HTML
├── package.json            # 依赖配置
├── vite.config.ts          # Vite配置（端口3000）
├── tsconfig.json           # TypeScript配置
├── src/
│   ├── main.tsx            # React入口 → 渲染App
│   ├── App.tsx             # 主组件（全局状态管理、工具栏、布局）
│   │                       # 调用：diffEngine.compare, highlighter.highlight
│   │                       # 传递：diffData → SideBySideView
│   ├── components/
│   │   └── SideBySideView.tsx  # 并排对比视图
│   │                           # 接收：diffData, language
│   │                           # 调用：highlighter.highlight
│   ├── utils/
│   │   ├── diffEngine.ts   # 差异计算：compare(textA, textB) → DiffLine[]
│   │   └── highlighter.ts  # 语法高亮：highlight(code, language) → HTML字符串
│   └── styles/
│       └── global.css      # 全局样式、CSS变量、自定义滚动条
```
