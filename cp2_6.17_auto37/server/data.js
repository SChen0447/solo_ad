import { v4 as uuidv4 } from 'uuid';

let tasks = [
  {
    id: uuidv4(),
    title: '完成项目需求文档',
    description: '整理并编写项目的详细需求文档，包括功能需求和非功能需求',
    priority: 'high',
    dueDate: '2025-06-20',
    assignee: '张三',
    status: 'todo',
    order: 0
  },
  {
    id: uuidv4(),
    title: '设计数据库架构',
    description: '根据需求文档设计数据库表结构和关系',
    priority: 'high',
    dueDate: '2025-06-22',
    assignee: '李四',
    status: 'todo',
    order: 1
  },
  {
    id: uuidv4(),
    title: '前端页面原型设计',
    description: '使用Figma完成主要页面的原型设计',
    priority: 'medium',
    dueDate: '2025-06-25',
    assignee: '王五',
    status: 'in-progress',
    order: 0
  },
  {
    id: uuidv4(),
    title: '搭建开发环境',
    description: '完成前后端开发环境的搭建和配置',
    priority: 'low',
    dueDate: '2025-06-15',
    assignee: '赵六',
    status: 'done',
    order: 0
  }
];

export function getAllTasks() {
  return tasks;
}

export function getTasksByStatus(status) {
  return tasks
    .filter(t => t.status === status)
    .sort((a, b) => a.order - b.order);
}

export function getTaskById(id) {
  return tasks.find(t => t.id === id);
}

export function createTask(taskData) {
  const statusTasks = getTasksByStatus(taskData.status || 'todo');
  const newTask = {
    id: uuidv4(),
    ...taskData,
    status: taskData.status || 'todo',
    order: statusTasks.length
  };
  tasks.push(newTask);
  return newTask;
}

export function updateTask(id, updates) {
  const index = tasks.findIndex(t => t.id === id);
  if (index === -1) return null;
  tasks[index] = { ...tasks[index], ...updates };
  return tasks[index];
}

export function updateTaskStatus(id, newStatus) {
  const task = getTaskById(id);
  if (!task) return null;
  if (task.status === newStatus) return task;
  
  const oldStatusTasks = getTasksByStatus(task.status);
  oldStatusTasks
    .filter(t => t.order > task.order)
    .forEach(t => {
      const idx = tasks.findIndex(x => x.id === t.id);
      tasks[idx].order = t.order - 1;
    });
  
  const newStatusTasks = getTasksByStatus(newStatus);
  task.status = newStatus;
  task.order = newStatusTasks.length;
  const idx = tasks.findIndex(x => x.id === id);
  tasks[idx] = task;
  
  return task;
}

export function updateTaskOrder(id, newOrder) {
  const task = getTaskById(id);
  if (!task) return null;
  
  const statusTasks = getTasksByStatus(task.status);
  const oldOrder = task.order;
  
  if (oldOrder === newOrder) return task;
  
  if (newOrder < oldOrder) {
    statusTasks
      .filter(t => t.order >= newOrder && t.order < oldOrder)
      .forEach(t => {
        const idx = tasks.findIndex(x => x.id === t.id);
        tasks[idx].order = t.order + 1;
      });
  } else {
    statusTasks
      .filter(t => t.order > oldOrder && t.order <= newOrder)
      .forEach(t => {
        const idx = tasks.findIndex(x => x.id === t.id);
        tasks[idx].order = t.order - 1;
      });
  }
  
  const idx = tasks.findIndex(x => x.id === id);
  tasks[idx].order = newOrder;
  
  return getTaskById(id);
}

export function deleteTask(id) {
  const index = tasks.findIndex(t => t.id === id);
  if (index === -1) return false;
  tasks.splice(index, 1);
  return true;
}
