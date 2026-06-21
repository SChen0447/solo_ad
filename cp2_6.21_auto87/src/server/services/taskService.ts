import { v4 as uuidv4 } from 'uuid';
import type { Task, TaskType, TaskUrgency } from '../../types';
import { addPoints, incrementTasksCompleted, getMemberById } from './memberService';

const tasks: Task[] = [];

function initTasks() {
  if (tasks.length > 0) return;
  const samples: Array<{ title: string; type: TaskType; urgency: TaskUrgency; offsetDays: number; status: '待认领' | '进行中' | '已完成' }> = [
    { title: '给番茄大棚浇水', type: '浇水', urgency: '非常紧急', offsetDays: 0, status: '待认领' },
    { title: '东区菜地施肥', type: '施肥', urgency: '紧急', offsetDays: 1, status: '待认领' },
    { title: '清除菜畦杂草', type: '除草', urgency: '普通', offsetDays: 2, status: '待认领' },
    { title: '采摘成熟草莓', type: '采摘', urgency: '紧急', offsetDays: 0, status: '待认领' },
    { title: '北侧豆角浇水', type: '浇水', urgency: '普通', offsetDays: 3, status: '待认领' },
    { title: '给果树追施有机肥', type: '施肥', urgency: '普通', offsetDays: 4, status: '待认领' },
    { title: '温室除草', type: '除草', urgency: '紧急', offsetDays: 1, status: '待认领' },
    { title: '采摘黄瓜', type: '采摘', urgency: '普通', offsetDays: 2, status: '待认领' },
    { title: '灌溉香草区', type: '浇水', urgency: '非常紧急', offsetDays: 0, status: '进行中' },
    { title: '整理工具棚', type: '除草', urgency: '普通', offsetDays: 5, status: '已完成' },
  ];
  const now = Date.now();
  samples.forEach((s) => {
    const t: Task = {
      id: uuidv4(),
      title: s.title,
      type: s.type,
      urgency: s.urgency,
      deadline: new Date(now + s.offsetDays * 24 * 3600 * 1000).toISOString().slice(0, 10),
      status: s.status,
      createdAt: new Date(now - Math.floor(Math.random() * 3) * 24 * 3600 * 1000).toISOString(),
    };
    if (s.status === '进行中') {
      t.assigneeId = 'mock-assignee';
      t.assigneeName = '李娜';
    }
    if (s.status === '已完成') {
      t.assigneeId = 'mock-completer';
      t.assigneeName = '张伟';
      t.completedAt = new Date(now - 86400000).toISOString();
    }
    tasks.push(t);
  });
}

initTasks();

export function getTasks(): Task[] {
  return [...tasks];
}

export function createTask(data: Omit<Task, 'id' | 'createdAt' | 'status'>): Task {
  const task: Task = {
    ...data,
    id: uuidv4(),
    status: '待认领',
    createdAt: new Date().toISOString(),
  };
  tasks.push(task);
  return task;
}

export function claimTask(taskId: string, memberId: string): Task | null {
  const task = tasks.find((t) => t.id === taskId);
  if (!task || task.status !== '待认领') return null;
  const member = getMemberById(memberId);
  task.status = '进行中';
  task.assigneeId = memberId;
  task.assigneeName = member?.name ?? '匿名';
  return task;
}

export function completeTask(taskId: string): Task | null {
  const task = tasks.find((t) => t.id === taskId);
  if (!task || task.status !== '进行中' || !task.assigneeId) return null;
  task.status = '已完成';
  task.completedAt = new Date().toISOString();
  addPoints(task.assigneeId, 10);
  incrementTasksCompleted(task.assigneeId);
  return task;
}
