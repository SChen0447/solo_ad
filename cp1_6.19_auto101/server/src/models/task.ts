import type { Task, Column, Comment } from '../../../shared/types';

const generateId = (): string => Math.random().toString(36).substring(2, 11);

const now = (): string => new Date().toISOString();

let columns: Column[] = [
  { id: 'todo', title: '待办', order: 0 },
  { id: 'in-progress', title: '进行中', order: 1 },
  { id: 'done', title: '已完成', order: 2 },
];

let tasks: Task[] = [
  {
    id: generateId(),
    title: '设计用户界面原型',
    description: '完成首页和详情页的UI设计，确保符合设计规范',
    assignee: '张三',
    dueDate: '2026-06-25',
    columnId: 'todo',
    comments: [
      { id: generateId(), taskId: '', content: '请参考最新的设计指南', author: '李四', createdAt: now() },
    ],
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: generateId(),
    title: '开发登录模块',
    description: '实现用户登录、注册和密码找回功能',
    assignee: '王五',
    dueDate: '2026-06-28',
    columnId: 'in-progress',
    comments: [
      { id: generateId(), taskId: '', content: '需要添加验证码功能', author: '赵六', createdAt: now() },
      { id: generateId(), taskId: '', content: '好的，我会加上', author: '王五', createdAt: now() },
    ],
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: generateId(),
    title: '编写API文档',
    description: '完成所有后端接口的文档编写',
    assignee: '李四',
    dueDate: '2026-06-20',
    columnId: 'done',
    comments: [],
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: generateId(),
    title: '数据库优化',
    description: '对慢查询进行优化，添加必要的索引',
    assignee: '赵六',
    dueDate: '2026-06-30',
    columnId: 'todo',
    comments: [],
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: generateId(),
    title: '性能测试',
    description: '对系统进行压力测试，确保1000并发下稳定运行',
    assignee: '张三',
    dueDate: '2026-07-05',
    columnId: 'in-progress',
    comments: [],
    createdAt: now(),
    updatedAt: now(),
  },
];

tasks.forEach(task => {
  task.comments.forEach(comment => {
    comment.taskId = task.id;
  });
});

export const getColumns = (): Column[] => {
  return [...columns].sort((a, b) => a.order - b.order);
};

export const addColumn = (title: string): Column => {
  const newColumn: Column = {
    id: generateId(),
    title,
    order: columns.length,
  };
  columns.push(newColumn);
  return newColumn;
};

export const getTasks = (): Task[] => {
  return [...tasks];
};

export const getTaskById = (id: string): Task | undefined => {
  return tasks.find(t => t.id === id);
};

export const addTask = (taskData: Omit<Task, 'id' | 'comments' | 'createdAt' | 'updatedAt'>): Task => {
  const newTask: Task = {
    ...taskData,
    id: generateId(),
    comments: [],
    createdAt: now(),
    updatedAt: now(),
  };
  tasks.push(newTask);
  return newTask;
};

export const updateTask = (id: string, updates: Partial<Task>): Task | undefined => {
  const index = tasks.findIndex(t => t.id === id);
  if (index === -1) return undefined;
  
  tasks[index] = {
    ...tasks[index],
    ...updates,
    updatedAt: now(),
  };
  return tasks[index];
};

export const deleteTask = (id: string): boolean => {
  const index = tasks.findIndex(t => t.id === id);
  if (index === -1) return false;
  tasks.splice(index, 1);
  return true;
};

export const addComment = (taskId: string, content: string, author: string): Comment | undefined => {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return undefined;
  
  const newComment: Comment = {
    id: generateId(),
    taskId,
    content,
    author,
    createdAt: now(),
  };
  task.comments.unshift(newComment);
  task.updatedAt = now();
  return newComment;
};
