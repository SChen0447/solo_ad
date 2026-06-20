import React, { createContext, useContext, useReducer, ReactNode, useMemo } from 'react';

export const CATEGORY_COLORS = [
  '#2563EB',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
];

export interface User {
  id: string;
  name: string;
  avatar: string;
}

export interface Version {
  id: string;
  version: string;
  author: User;
  content: string;
  title: string;
  modifiedAt: string;
}

export interface Document {
  id: string;
  title: string;
  content: string;
  category: string;
  categoryColor: string;
  author: User;
  createdAt: string;
  updatedAt: string;
  versions: Version[];
}

export interface AppState {
  documents: Document[];
  currentUser: User;
  searchQuery: string;
  searchResults: Document[];
}

type Action =
  | { type: 'ADD_DOCUMENT'; payload: Document }
  | { type: 'UPDATE_DOCUMENT'; payload: Document }
  | { type: 'DELETE_DOCUMENT'; payload: string }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'SET_SEARCH_RESULTS'; payload: Document[] };

const defaultUser: User = {
  id: 'user-1',
  name: '张明',
  avatar: '👨‍💻',
};

const users: User[] = [
  defaultUser,
  { id: 'user-2', name: '李华', avatar: '👩‍💼' },
  { id: 'user-3', name: '王强', avatar: '👨‍🔬' },
  { id: 'user-4', name: '赵雪', avatar: '👩‍🚀' },
  { id: 'user-5', name: '陈伟', avatar: '👨‍🎨' },
];

const categories = [
  '前端开发',
  '后端开发',
  '数据库',
  'DevOps',
  '产品设计',
  '测试',
  '安全',
  '架构',
];

const sampleTitles = [
  'React Hooks 最佳实践指南',
  'TypeScript 高级类型详解',
  'Node.js 性能优化方案',
  'MySQL 索引优化笔记',
  'Docker 容器化部署手册',
  'RESTful API 设计规范',
  '前端工程化完整方案',
  '微服务架构设计模式',
  'Redis 缓存策略详解',
  'Git 工作流最佳实践',
  'CSS Grid 布局完全指南',
  'Kubernetes 入门到精通',
  'Webpack 5 配置优化',
  'Jest 单元测试实战',
  'Nginx 反向代理配置',
  'GraphQL 从入门到实践',
  'Vue3 Composition API',
  'PostgreSQL 高级特性',
  'CI/CD 流水线搭建指南',
  'WebSocket 实时通信实现',
];

function generateSampleContent(title: string): string {
  return `# ${title}

## 概述

本文档详细介绍了${title}相关的核心概念和实践方法。内容涵盖了从入门到进阶的完整知识体系。

## 核心概念

### 1. 基础概念

在开始深入学习之前，我们需要理解以下基础概念：

- **核心原理**: 理解底层机制是掌握技术的关键
- **应用场景**: 明确在什么情况下使用何种方案
- **最佳实践**: 学习业界公认的优秀做法

### 2. 代码示例

下面是一个简单的实现示例：

\`\`\`typescript
interface Config {
  name: string;
  version: string;
  options: {
    debug: boolean;
    timeout: number;
  };
}

function initialize(config: Config): void {
  console.log('Initializing:', config.name);
  if (config.options.debug) {
    console.log('Debug mode enabled');
  }
}

const appConfig: Config = {
  name: 'MyApp',
  version: '1.0.0',
  options: {
    debug: true,
    timeout: 5000
  }
};

initialize(appConfig);
\`\`\`

## 详细说明

### 配置选项

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| debug | boolean | false | 调试模式 |
| timeout | number | 3000 | 超时时间(ms) |
| retry | number | 3 | 重试次数 |

### 注意事项

1. 请确保在生产环境关闭 debug 模式
2. 合理设置 timeout 值避免请求堆积
3. 根据实际业务调整 retry 策略

## 总结

掌握${title}需要持续实践和总结。建议结合实际项目进行练习，在实践中加深理解。

> 💡 **小贴士**: 保持好奇心，多阅读源码，深入理解原理是提升技术水平的有效途径。
`;
}

function generateSampleDocuments(): Document[] {
  const docs: Document[] = [];
  const now = new Date();

  for (let i = 0; i < 50; i++) {
    const category = categories[i % categories.length];
    const title = sampleTitles[i % sampleTitles.length] + (i >= sampleTitles.length ? ` (${Math.floor(i / sampleTitles.length) + 1})` : '');
    const user = users[i % users.length];
    const createdAt = new Date(now.getTime() - Math.random() * 60 * 24 * 60 * 60 * 1000);
    const updatedAt = new Date(createdAt.getTime() + Math.random() * 10 * 24 * 60 * 60 * 1000);
    const versions: Version[] = [];
    const versionCount = Math.floor(Math.random() * 4) + 1;

    for (let v = 0; v < versionCount; v++) {
      const vUser = users[(i + v) % users.length];
      const vDate = new Date(createdAt.getTime() + v * 24 * 60 * 60 * 1000 * 2);
      versions.push({
        id: `v-${i}-${v}`,
        version: `v${v + 1}.0`,
        author: vUser,
        title: title + (v > 0 ? ` - 更新${v}` : ''),
        content: generateSampleContent(title) + (v > 0 ? `\n\n**版本更新内容**: 第${v}次更新优化了文档结构和代码示例。` : ''),
        modifiedAt: vDate.toISOString(),
      });
    }

    docs.push({
      id: `doc-${i}`,
      title,
      category,
      categoryColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
      author: user,
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString(),
      versions,
      content: versions[versions.length - 1].content,
    });
  }

  return docs.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

const initialState: AppState = {
  documents: generateSampleDocuments(),
  currentUser: defaultUser,
  searchQuery: '',
  searchResults: [],
};

function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'ADD_DOCUMENT':
      return {
        ...state,
        documents: [action.payload, ...state.documents],
      };
    case 'UPDATE_DOCUMENT':
      return {
        ...state,
        documents: state.documents.map((doc) =>
          doc.id === action.payload.id ? action.payload : doc
        ),
      };
    case 'DELETE_DOCUMENT':
      return {
        ...state,
        documents: state.documents.filter((doc) => doc.id !== action.payload),
      };
    case 'SET_SEARCH_QUERY':
      return {
        ...state,
        searchQuery: action.payload,
      };
    case 'SET_SEARCH_RESULTS':
      return {
        ...state,
        searchResults: action.payload,
      };
    default:
      return state;
  }
}

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  addDocument: (title: string, content: string, category: string) => void;
  updateDocument: (id: string, title: string, content: string) => void;
  deleteDocument: (id: string) => void;
  getDocument: (id: string) => Document | undefined;
  performSearch: (query: string) => Document[];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const addDocument = (title: string, content: string, category: string) => {
    const now = new Date().toISOString();
    const versionId = `v-new-${Date.now()}`;
    const newDoc: Document = {
      id: `doc-${Date.now()}`,
      title,
      content,
      category,
      categoryColor: CATEGORY_COLORS[Math.floor(Math.random() * CATEGORY_COLORS.length)],
      author: state.currentUser,
      createdAt: now,
      updatedAt: now,
      versions: [
        {
          id: versionId,
          version: 'v1.0',
          author: state.currentUser,
          title,
          content,
          modifiedAt: now,
        },
      ],
    };
    dispatch({ type: 'ADD_DOCUMENT', payload: newDoc });
  };

  const updateDocument = (id: string, title: string, content: string) => {
    const doc = state.documents.find((d) => d.id === id);
    if (!doc) return;

    const now = new Date().toISOString();
    const newVersionNum = `v${doc.versions.length + 1}.0`;
    const newVersion: Version = {
      id: `v-${id}-${Date.now()}`,
      version: newVersionNum,
      author: state.currentUser,
      title,
      content,
      modifiedAt: now,
    };

    dispatch({
      type: 'UPDATE_DOCUMENT',
      payload: {
        ...doc,
        title,
        content,
        updatedAt: now,
        versions: [...doc.versions, newVersion],
      },
    });
  };

  const deleteDocument = (id: string) => {
    dispatch({ type: 'DELETE_DOCUMENT', payload: id });
  };

  const getDocument = (id: string) => {
    return state.documents.find((d) => d.id === id);
  };

  const performSearch = (query: string): Document[] => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    const results = state.documents
      .filter(
        (doc) =>
          doc.title.toLowerCase().includes(q) ||
          doc.content.toLowerCase().includes(q) ||
          doc.category.toLowerCase().includes(q)
      )
      .slice(0, 15);
    dispatch({ type: 'SET_SEARCH_RESULTS', payload: results });
    return results;
  };

  const value = useMemo(
    () => ({
      state,
      dispatch,
      addDocument,
      updateDocument,
      deleteDocument,
      getDocument,
      performSearch,
    }),
    [state]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

export function formatDate(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours === 0) {
      const minutes = Math.floor(diff / (1000 * 60));
      return `${minutes}分钟前`;
    }
    return `${hours}小时前`;
  } else if (days === 1) {
    return '昨天';
  } else if (days < 7) {
    return `${days}天前`;
  } else {
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }
}
