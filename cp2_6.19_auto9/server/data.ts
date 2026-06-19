export interface Post {
  id: string;
  title: string;
  content: string;
  tag: string;
  author: string;
  authorAvatar: string;
  createdAt: number;
  isTop: boolean;
  isFeatured: boolean;
}

export interface Comment {
  id: string;
  postId: string;
  author: string;
  content: string;
  createdAt: number;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface UserStats {
  name: string;
  avatar: string;
  posts: number;
  comments: number;
  total: number;
}

export interface Stats {
  hotTags: { tag: Tag; count: number }[];
  activeUsers: UserStats[];
}

const TAGS: Tag[] = [
  { id: 'frontend', name: '前端技术', color: '#3b82f6' },
  { id: 'backend', name: '后端架构', color: '#10b981' },
  { id: 'product', name: '产品设计', color: '#f59e0b' },
  { id: 'team', name: '团队建设', color: '#8b5cf6' },
  { id: 'chat', name: '闲聊', color: '#ec4899' }
];

let posts: Post[] = [];
let comments: Comment[] = [];

const generateId = (): string => Math.random().toString(36).substring(2, 11);

const AUTHORS = ['张明', '李华', '王芳', '赵强', '陈静', '刘洋', '周磊', '吴敏'];

const getAvatar = (name: string): string => {
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316'];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
};

const initMockData = (): void => {
  const now = Date.now();
  const samplePosts: Post[] = [
    {
      id: generateId(),
      title: 'React 18 新特性详解：并发渲染与自动批处理',
      content: 'React 18 带来了许多令人兴奋的新特性，其中最重要的就是并发渲染（Concurrent Rendering）。\n\n## 并发渲染\n\n并发渲染允许 React 同时准备多个版本的 UI。这意味着 React 可以在后台准备新的 UI，而不会阻塞主线程。\n\n## 自动批处理\n\n在 React 18 中，所有的状态更新都会自动批处理，无论它们发生在什么上下文中。\n\n## Suspense 改进\n\nSuspense 现在可以在服务端使用，支持流式 SSR。',
      tag: 'frontend',
      author: '张明',
      authorAvatar: getAvatar('张明'),
      createdAt: now - 3600000,
      isTop: true,
      isFeatured: true
    },
    {
      id: generateId(),
      title: '微服务架构设计最佳实践',
      content: '微服务架构已经成为现代应用开发的主流选择。本文分享一些设计最佳实践。\n\n## 服务拆分原则\n\n- 单一职责：每个服务只负责一个业务领域\n- 独立部署：每个服务可以独立部署和扩展\n- 故障隔离：一个服务的故障不应该影响其他服务\n\n## API 设计\n\n使用 RESTful API 或 gRPC 进行服务间通信。',
      tag: 'backend',
      author: '李华',
      authorAvatar: getAvatar('李华'),
      createdAt: now - 7200000,
      isTop: false,
      isFeatured: true
    },
    {
      id: generateId(),
      title: '产品设计中的用户体验思考',
      content: '好的产品设计不仅仅是美观，更重要的是用户体验。\n\n## 用户中心设计\n\n始终以用户需求为出发点，而不是以技术为出发点。\n\n## 简洁至上\n\n减少用户的认知负担，让操作变得直观简单。',
      tag: 'product',
      author: '王芳',
      authorAvatar: getAvatar('王芳'),
      createdAt: now - 10800000,
      isTop: false,
      isFeatured: false
    },
    {
      id: generateId(),
      title: '如何打造高效的远程团队',
      content: '远程办公已经成为常态，如何打造高效的远程团队是每个管理者都需要思考的问题。\n\n## 清晰的沟通渠道\n\n建立明确的沟通规范，选择合适的工具。\n\n## 目标管理\n\n使用 OKR 或其他目标管理方法，确保每个人都知道自己的方向。',
      tag: 'team',
      author: '赵强',
      authorAvatar: getAvatar('赵强'),
      createdAt: now - 14400000,
      isTop: false,
      isFeatured: false
    },
    {
      id: generateId(),
      title: '周末有什么好玩的户外活动推荐？',
      content: '最近天气不错，想出去走走，大家有什么推荐吗？\n\n最好是离市区不太远的地方，适合一日游的那种。',
      tag: 'chat',
      author: '陈静',
      authorAvatar: getAvatar('陈静'),
      createdAt: now - 18000000,
      isTop: false,
      isFeatured: false
    },
    {
      id: generateId(),
      title: 'TypeScript 高级类型技巧总结',
      content: 'TypeScript 的类型系统非常强大，掌握高级类型可以大大提升代码质量。\n\n## 条件类型\n\n条件类型允许我们根据条件选择不同的类型。\n\n## 映射类型\n\n映射类型可以基于已有类型创建新类型。',
      tag: 'frontend',
      author: '刘洋',
      authorAvatar: getAvatar('刘洋'),
      createdAt: now - 21600000,
      isTop: false,
      isFeatured: true
    },
    {
      id: generateId(),
      title: '数据库索引优化实战',
      content: '数据库性能优化是后端开发的重要课题，索引优化是其中最常见的手段。\n\n## 索引类型\n\n- 主键索引\n- 唯一索引\n- 普通索引\n- 复合索引\n\n## 优化原则\n\n最左前缀匹配原则是复合索引使用的关键。',
      tag: 'backend',
      author: '周磊',
      authorAvatar: getAvatar('周磊'),
      createdAt: now - 25200000,
      isTop: false,
      isFeatured: false
    },
    {
      id: generateId(),
      title: '新入职的小伙伴看过来！团队介绍',
      content: '欢迎新同学加入我们团队！\n\n## 团队成员\n\n- 张明：前端技术负责人\n- 李华：后端技术负责人\n- 王芳：产品经理\n- 赵强：项目经理\n\n期待与大家一起成长！',
      tag: 'team',
      author: '吴敏',
      authorAvatar: getAvatar('吴敏'),
      createdAt: now - 28800000,
      isTop: true,
      isFeatured: false
    },
    {
      id: generateId(),
      title: '分享一个超好用的 VS Code 插件',
      content: '最近发现了一个超级好用的 VS Code 插件，叫 GitLens，强烈推荐给大家！\n\n## 主要功能\n\n- 查看每一行代码的提交历史\n-  blame 信息显示\n- 分支管理\n- 代码评审\n\n真的大大提升了开发效率！',
      tag: 'chat',
      author: '张明',
      authorAvatar: getAvatar('张明'),
      createdAt: now - 32400000,
      isTop: false,
      isFeatured: false
    },
    {
      id: generateId(),
      title: '设计系统搭建指南',
      content: '搭建一套完整的设计系统可以大大提升团队的设计和开发效率。\n\n## 设计系统包含什么\n\n- 设计原则\n- 组件库\n- 设计令牌（颜色、字体、间距）\n- 使用规范',
      tag: 'product',
      author: '王芳',
      authorAvatar: getAvatar('王芳'),
      createdAt: now - 36000000,
      isTop: false,
      isFeatured: false
    },
    {
      id: generateId(),
      title: 'Node.js 性能调优：从入门到精通',
      content: 'Node.js 性能调优是后端开发的重要技能。\n\n## 常见性能瓶颈\n\n- 阻塞事件循环\n- 内存泄漏\n- 不合理的异步操作\n\n## 调优工具\n\n- clinic.js\n- 0x\n- Node.js 内置 --prof',
      tag: 'backend',
      author: '李华',
      authorAvatar: getAvatar('李华'),
      createdAt: now - 39600000,
      isTop: false,
      isFeatured: false
    },
    {
      id: generateId(),
      title: 'CSS Grid 布局完全指南',
      content: 'CSS Grid 是现代 CSS 布局的强大工具。\n\n## 基本概念\n\n- Grid Container\n- Grid Item\n- Grid Line\n- Grid Track\n- Grid Cell\n- Grid Area\n\n## 常用属性\n\n- grid-template-columns/rows\n- gap\n- grid-column/row',
      tag: 'frontend',
      author: '刘洋',
      authorAvatar: getAvatar('刘洋'),
      createdAt: now - 43200000,
      isTop: false,
      isFeatured: false
    }
  ];

  posts = samplePosts;

  const sampleComments: Comment[] = [
    { id: generateId(), postId: posts[0].id, author: '李华', content: '写得太好了！并发渲染确实是 React 18 最激动人心的特性。', createdAt: now - 3000000 },
    { id: generateId(), postId: posts[0].id, author: '王芳', content: 'Suspense 在服务端的支持对 SSR 提升很大。', createdAt: now - 2400000 },
    { id: generateId(), postId: posts[0].id, author: '赵强', content: '自动批处理这个功能等了好久了！', createdAt: now - 1800000 },
    { id: generateId(), postId: posts[1].id, author: '周磊', content: '微服务拆分确实是门艺术，拆不好反而更麻烦。', createdAt: now - 6000000 },
    { id: generateId(), postId: posts[1].id, author: '张明', content: '同意，服务粒度的把握很关键。', createdAt: now - 5400000 },
    { id: generateId(), postId: posts[4].id, author: '刘洋', content: '推荐去西山森林公园，离市区近，风景也不错！', createdAt: now - 17000000 },
    { id: generateId(), postId: posts[4].id, author: '周磊', content: '我上周刚去过，确实值得一去。', createdAt: now - 16000000 },
    { id: generateId(), postId: posts[5].id, author: '陈静', content: '收藏了，高级类型确实需要多练习。', createdAt: now - 20000000 },
    { id: generateId(), postId: posts[7].id, author: '陈静', content: '欢迎欢迎！期待一起工作～', createdAt: now - 27000000 },
    { id: generateId(), postId: posts[7].id, author: '刘洋', content: '新人有什么问题随时问我哈！', createdAt: now - 26500000 }
  ];

  comments = sampleComments;
};

initMockData();

export const getTags = (): Tag[] => TAGS;

export const getPosts = (tag?: string): Post[] => {
  let result = tag ? posts.filter(p => p.tag === tag) : [...posts];
  result.sort((a, b) => {
    if (a.isTop !== b.isTop) return b.isTop ? 1 : -1;
    return b.createdAt - a.createdAt;
  });
  return result;
};

export const getPost = (id: string): Post | undefined => {
  return posts.find(p => p.id === id);
};

export const addPost = (title: string, content: string, tag: string, author: string): Post => {
  const newPost: Post = {
    id: generateId(),
    title,
    content,
    tag,
    author,
    authorAvatar: getAvatar(author),
    createdAt: Date.now(),
    isTop: false,
    isFeatured: false
  };
  posts.unshift(newPost);
  return newPost;
};

export const getComments = (postId: string): Comment[] => {
  return comments
    .filter(c => c.postId === postId)
    .sort((a, b) => a.createdAt - b.createdAt);
};

export const addComment = (postId: string, author: string, content: string): Comment | null => {
  const post = posts.find(p => p.id === postId);
  if (!post) return null;
  
  const newComment: Comment = {
    id: generateId(),
    postId,
    author,
    content,
    createdAt: Date.now()
  };
  comments.push(newComment);
  return newComment;
};

export const toggleTop = (id: string): Post | undefined => {
  const post = posts.find(p => p.id === id);
  if (post) {
    post.isTop = !post.isTop;
  }
  return post;
};

export const toggleFeatured = (id: string): Post | undefined => {
  const post = posts.find(p => p.id === id);
  if (post) {
    post.isFeatured = !post.isFeatured;
  }
  return post;
};

export const getStats = (): Stats => {
  const tagCounts: Record<string, number> = {};
  posts.forEach(p => {
    tagCounts[p.tag] = (tagCounts[p.tag] || 0) + 1;
  });

  const hotTags = TAGS.map(tag => ({
    tag,
    count: tagCounts[tag.id] || 0
  })).sort((a, b) => b.count - a.count);

  const userActivity: Record<string, { posts: number; comments: number }> = {};
  posts.forEach(p => {
    if (!userActivity[p.author]) {
      userActivity[p.author] = { posts: 0, comments: 0 };
    }
    userActivity[p.author].posts++;
  });
  comments.forEach(c => {
    if (!userActivity[c.author]) {
      userActivity[c.author] = { posts: 0, comments: 0 };
    }
    userActivity[c.author].comments++;
  });

  const activeUsers = Object.entries(userActivity)
    .map(([name, stats]) => ({
      name,
      avatar: getAvatar(name),
      posts: stats.posts,
      comments: stats.comments,
      total: stats.posts + stats.comments
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  return { hotTags, activeUsers };
};

export const generateMorePosts = (count: number): void => {
  const tagIds = TAGS.map(t => t.id);
  const titles = [
    '关于技术选型的一些思考',
    '分享一个有趣的编程技巧',
    '这周的技术分享会大家来吗？',
    '新项目启动，需要大家的建议',
    '代码审查中的常见问题',
    '如何写出更优雅的代码',
    '测试驱动开发实践心得',
    '敏捷开发中的团队协作',
    '聊聊最近的技术趋势',
    '推荐几本技术好书'
  ];

  for (let i = 0; i < count; i++) {
    const titleIndex = i % titles.length;
    const tagIndex = i % tagIds.length;
    const authorIndex = i % AUTHORS.length;
    const author = AUTHORS[authorIndex];
    
    addPost(
      `${titles[titleIndex]}（${i + 1}）`,
      `这是第 ${i + 1} 篇测试帖子的内容。\n\n包含一些详细的描述信息，用于测试列表的滚动和虚拟滚动功能。\n\n## 小标题\n\n这里是一些正文内容，用来填充帖子的详细信息。希望大家喜欢这篇分享！`,
      tagIds[tagIndex],
      author
    );
  }
};
