import { v4 as uuidv4 } from 'uuid';
import type { Board, Task, Lane, User } from './types';

const boards = new Map<string, Board>();

const defaultLanes: Lane[] = [
  { id: 'lane-todo', name: '待办', color: '#f59e0b', order: 0 },
  { id: 'lane-progress', name: '进行中', color: '#3b82f6', order: 1 },
  { id: 'lane-done', name: '已完成', color: '#10b981', order: 2 },
];

export function createBoard(name: string, members: User[]): Board {
  const boardId = uuidv4();
  const now = new Date().toISOString();
  
  const board: Board = {
    id: boardId,
    name,
    members,
    lanes: defaultLanes.map(lane => ({ ...lane, id: `${boardId}-${lane.id}` })),
    tasks: [],
    createdAt: now,
    updatedAt: now,
  };
  
  boards.set(boardId, board);
  return board;
}

export function getBoard(boardId: string): Board | undefined {
  return boards.get(boardId);
}

export function getUserBoards(userId: string): Board[] {
  const userBoards: Board[] = [];
  boards.forEach(board => {
    if (board.members.some(m => m.id === userId)) {
      userBoards.push(board);
    }
  });
  return userBoards.sort((a, b) => 
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export function createTask(
  boardId: string,
  laneId: string,
  title: string,
  description: string,
  creator: User
): Task | null {
  const board = boards.get(boardId);
  if (!board) return null;
  
  const lane = board.lanes.find(l => l.id === laneId);
  if (!lane) return null;
  
  const now = new Date().toISOString();
  const task: Task = {
    id: uuidv4(),
    title,
    description,
    assignee: null,
    deadline: null,
    comments: [],
    laneId,
    order: board.tasks.filter(t => t.laneId === laneId).length,
    createdAt: now,
    updatedAt: now,
  };
  
  board.tasks.push(task);
  board.updatedAt = now;
  return task;
}

export function updateTask(boardId: string, taskId: string, updates: Partial<Task>): Task | null {
  const board = boards.get(boardId);
  if (!board) return null;
  
  const taskIndex = board.tasks.findIndex(t => t.id === taskId);
  if (taskIndex === -1) return null;
  
  board.tasks[taskIndex] = {
    ...board.tasks[taskIndex],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  
  board.updatedAt = new Date().toISOString();
  return board.tasks[taskIndex];
}

export function moveTask(
  boardId: string,
  taskId: string,
  newLaneId: string,
  newOrder: number
): Task | null {
  const board = boards.get(boardId);
  if (!board) return null;
  
  const task = board.tasks.find(t => t.id === taskId);
  if (!task) return null;
  
  const oldLaneId = task.laneId;
  
  const laneTasks = board.tasks.filter(t => t.laneId === newLaneId && t.id !== taskId);
  laneTasks.sort((a, b) => a.order - b.order);
  
  if (newLaneId !== oldLaneId) {
    const oldLaneTasks = board.tasks.filter(t => t.laneId === oldLaneId);
    oldLaneTasks.sort((a, b) => a.order - b.order);
    oldLaneTasks.forEach((t, index) => {
      const taskIdx = board.tasks.findIndex(bt => bt.id === t.id);
      if (taskIdx !== -1) {
        board.tasks[taskIdx].order = index;
      }
    });
  }
  
  const insertIndex = Math.min(Math.max(newOrder, 0), laneTasks.length);
  laneTasks.splice(insertIndex, 0, task);
  laneTasks.forEach((t, index) => {
    const taskIdx = board.tasks.findIndex(bt => bt.id === t.id);
    if (taskIdx !== -1) {
      board.tasks[taskIdx].order = index;
      board.tasks[taskIdx].laneId = newLaneId;
    }
  });
  
  task.laneId = newLaneId;
  task.order = insertIndex;
  task.updatedAt = new Date().toISOString();
  board.updatedAt = new Date().toISOString();
  
  return task;
}

export function addComment(
  boardId: string,
  taskId: string,
  content: string,
  author: User,
  mentions: string[] = []
): Task | null {
  const board = boards.get(boardId);
  if (!board) return null;
  
  const task = board.tasks.find(t => t.id === taskId);
  if (!task) return null;
  
  const comment = {
    id: uuidv4(),
    content,
    author,
    mentions,
    createdAt: new Date().toISOString(),
  };
  
  task.comments.push(comment);
  task.updatedAt = new Date().toISOString();
  board.updatedAt = new Date().toISOString();
  
  return task;
}

export function initializeDemoData(users: User[]): void {
  const demoBoard1 = createBoard('网站改版项目', users);
  const demoBoard2 = createBoard('移动端App开发', users.slice(0, 3));
  
  const now = Date.now();
  
  const board1Tasks = [
    { title: '首页设计稿评审', desc: '讨论首页新版设计方案，确定视觉方向', lane: 0, order: 0, assignee: users[0] },
    { title: '用户登录模块开发', desc: '实现用户登录、注册、密码找回功能', lane: 1, order: 0, assignee: users[1] },
    { title: '数据库表结构优化', desc: '优化用户表和订单表索引，提升查询性能', lane: 1, order: 1, assignee: users[2] },
    { title: 'API接口文档编写', desc: '编写完整的REST API接口文档', lane: 0, order: 1, assignee: users[3] },
    { title: '单元测试覆盖率提升', desc: '将核心模块测试覆盖率提升到80%以上', lane: 0, order: 2, assignee: null },
    { title: '产品需求文档整理', desc: '整理Q2产品需求并同步给团队', lane: 2, order: 0, assignee: users[0] },
    { title: '性能压测', desc: '对核心接口进行压力测试', lane: 2, order: 1, assignee: users[2] },
  ];
  
  board1Tasks.forEach(({ title, desc, lane, order, assignee }) => {
    const laneId = demoBoard1.lanes[lane].id;
    const task = createTask(demoBoard1.id, laneId, title, desc, users[0]);
    if (task && assignee) {
      updateTask(demoBoard1.id, task.id, { assignee });
    }
    if (task) {
      task.order = order;
      task.createdAt = new Date(now - (lane + 1) * 86400000 - order * 3600000).toISOString();
    }
  });
  
  const board2Tasks = [
    { title: '导航栏组件开发', desc: '实现底部Tab导航和顶部标题栏', lane: 0, order: 0, assignee: users[1] },
    { title: '列表页下拉刷新', desc: '实现列表页面的下拉刷新和上拉加载', lane: 1, order: 0, assignee: users[2] },
    { title: '用户反馈功能', desc: '开发用户反馈提交和历史查看功能', lane: 0, order: 1, assignee: null },
    { title: '消息推送集成', desc: '集成个推消息推送SDK', lane: 2, order: 0, assignee: users[1] },
    { title: '启动页优化', desc: '优化App启动速度，减少白屏时间', lane: 1, order: 1, assignee: users[0] },
    { title: '埋点数据上报', desc: '实现用户行为埋点和数据上报', lane: 0, order: 2, assignee: users[2] },
  ];
  
  board2Tasks.forEach(({ title, desc, lane, order, assignee }) => {
    const laneId = demoBoard2.lanes[lane].id;
    const task = createTask(demoBoard2.id, laneId, title, desc, users[0]);
    if (task && assignee) {
      updateTask(demoBoard2.id, task.id, { assignee });
    }
    if (task) {
      task.order = order;
      task.createdAt = new Date(now - (lane + 2) * 86400000 - order * 3600000).toISOString();
    }
  });
}
