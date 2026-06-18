import { v4 as uuidv4 } from 'uuid';
import type { Project, Task, TaskStatus, HealthMetrics, WorkloadItem } from './types';

export const projects: Project[] = [];

const sampleMembers = ['张小明', '李华', '王芳', '陈伟', '刘洋', '赵雪'];

function createSampleProject(name: string, members: string[]): Project {
  return {
    id: uuidv4(),
    name,
    members,
    createdAt: new Date().toISOString(),
    tasks: [],
  };
}

function createSampleTask(
  title: string,
  description: string,
  status: TaskStatus,
  assignee: string,
  dueDateOffsetDays: number,
  estimatedHours: number
): Task {
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + dueDateOffsetDays);
  const createdAt = new Date();
  createdAt.setDate(createdAt.getDate() - Math.floor(Math.random() * 5));
  return {
    id: uuidv4(),
    title,
    description,
    status,
    assignee,
    dueDate: dueDate.toISOString(),
    estimatedHours,
    createdAt: createdAt.toISOString(),
    history: [
      {
        status,
        timestamp: createdAt.toISOString(),
      },
    ],
  };
}

(function initSampleData() {
  const project1 = createSampleProject('官网重构', sampleMembers.slice(0, 4));
  project1.tasks = [
    createSampleTask('设计首页原型', '完成官网首页的UI设计稿', 'done', '张小明', -2, 8),
    createSampleTask('用户登录模块', '实现OAuth2.0登录认证', 'in-progress', '李华', 1, 12),
    createSampleTask('数据库表结构', '设计用户和订单表', 'todo', '王芳', 3, 6),
    createSampleTask('API文档整理', '整理后端API接口文档', 'review', '陈伟', 0, 4),
    createSampleTask('响应式适配', '移动端页面适配', 'todo', '张小明', 2, 10),
    createSampleTask('压力测试', '后端接口性能测试', 'in-progress', '李华', -1, 8),
  ];

  const project2 = createSampleProject('移动端APP开发', sampleMembers.slice(2, 6));
  project2.tasks = [
    createSampleTask('APP首页开发', '移动端首页UI和交互', 'in-progress', '王芳', 2, 16),
    createSampleTask('支付集成', '集成支付宝微信支付', 'todo', '陈伟', 5, 20),
    createSampleTask('推送通知', '实现APNs和FCM推送', 'review', '刘洋', 0, 6),
    createSampleTask('数据同步', '实现本地数据与云端同步', 'todo', '赵雪', 4, 12),
    createSampleTask('UI测试', '编写UI自动化测试', 'done', '王芳', -3, 5),
    createSampleTask('性能优化', '启动速度和内存优化', 'in-progress', '陈伟', 1, 8),
  ];

  const project3 = createSampleProject('数据可视化平台', sampleMembers.slice(0, 3).concat(sampleMembers[4]));
  project3.tasks = [
    createSampleTask('图表组件库', '封装ECharts组件', 'in-progress', '张小明', 1, 14),
    createSampleTask('数据接入层', '实现多数据源接入', 'todo', '李华', 6, 18),
    createSampleTask('权限管理', '用户角色和权限', 'review', '王芳', 0, 8),
    createSampleTask('大屏展示', '数据大屏布局设计', 'done', '刘洋', -5, 10),
    createSampleTask('报表导出', '支持PDF和Excel导出', 'todo', '张小明', 3, 6),
  ];

  const project4 = createSampleProject('CRM客户管理系统', sampleMembers.slice(1, 5));
  project4.tasks = [
    createSampleTask('客户列表', '客户信息CRUD', 'in-progress', '李华', 1, 10),
    createSampleTask('销售漏斗', '销售机会跟进', 'todo', '王芳', 4, 12),
    createSampleTask('合同管理', '合同上传和签署', 'done', '陈伟', -2, 6),
    createSampleTask('数据统计', '销售数据统计分析', 'in-progress', '刘洋', 0, 8),
    createSampleTask('邮件通知', '客户跟进邮件模板', 'todo', '李华', 5, 4),
  ];

  const project5 = createSampleProject('企业OA系统', [sampleMembers[0], sampleMembers[1], sampleMembers[3], sampleMembers[5]]);
  project5.tasks = [
    createSampleTask('考勤模块', '打卡和请假申请', 'in-progress', '张小明', 2, 12),
    createSampleTask('审批流程', '多级审批工作流', 'todo', '陈伟', 7, 20),
    createSampleTask('公告发布', '企业公告管理', 'done', '赵雪', -4, 5),
    createSampleTask('日程管理', '个人日程和会议', 'review', '张小明', -1, 6),
  ];

  const project6 = createSampleProject('智能客服机器人', sampleMembers.slice(2, 6));
  project6.tasks = [
    createSampleTask('NLP模型训练', '意图识别和槽位填充', 'in-progress', '王芳', 3, 24),
    createSampleTask('知识库', 'FAQ知识库构建', 'todo', '陈伟', 5, 10),
    createSampleTask('多轮对话', '上下文管理', 'todo', '刘洋', 2, 14),
    createSampleTask('语音接入', '电话和网页多渠道', 'review', '赵雪', 0, 8),
    createSampleTask('满意度调研', '对话结束满意度', 'done', '王芳', -3, 4),
  ];

  projects.push(project1, project2, project3, project4, project5, project6);
})();

export function findProjectById(id: string): Project | undefined {
  return projects.find(p => p.id === id);
}

export function calculateHealthMetrics(project: Project): HealthMetrics {
  const { tasks } = project;
  const now = new Date();
  const dailyLimit = 8;

  const completedTasks = tasks.filter(t => t.status === 'done');
  const onTimeCompleted = completedTasks.filter(t => {
    const doneEntry = [...t.history].reverse().find(h => h.status === 'done');
    if (!doneEntry) return false;
    return new Date(doneEntry.timestamp) <= new Date(t.dueDate);
  });
  const onTimeCompletionRate = completedTasks.length > 0
    ? Math.round((onTimeCompleted.length / completedTasks.length) * 100)
    : 100;

  const turnaroundTimes = completedTasks.map(t => {
    const doneEntry = [...t.history].reverse().find(h => h.status === 'done');
    if (!doneEntry) return 0;
    return (new Date(doneEntry.timestamp).getTime() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60);
  });
  const avgTurnaroundHours = turnaroundTimes.length > 0
    ? Math.round(turnaroundTimes.reduce((a, b) => a + b, 0) / turnaroundTimes.length)
    : 0;

  const blockedTasks = tasks.filter(t => {
    if (t.status === 'done' || t.status === 'review') return false;
    const due = new Date(t.dueDate);
    const hoursOverdue = (now.getTime() - due.getTime()) / (1000 * 60 * 60);
    return hoursOverdue >= 24;
  });
  const blockedTaskRate = tasks.length > 0
    ? Math.round((blockedTasks.length / tasks.length) * 100)
    : 0;

  const memberMap = new Map<string, { taskCount: number; remainingHours: number }>();
  project.members.forEach(m => memberMap.set(m, { taskCount: 0, remainingHours: 0 }));
  tasks.forEach(t => {
    if (t.status !== 'done') {
      const current = memberMap.get(t.assignee) || { taskCount: 0, remainingHours: 0 };
      current.taskCount += 1;
      current.remainingHours += t.estimatedHours;
      memberMap.set(t.assignee, current);
    }
  });

  const workloads: WorkloadItem[] = [];
  const overloadedMembers: string[] = [];
  memberMap.forEach((value, member) => {
    const isOverloaded = value.remainingHours > dailyLimit * 1.5;
    if (isOverloaded) overloadedMembers.push(member);
    workloads.push({
      member,
      taskCount: value.taskCount,
      remainingHours: value.remainingHours,
      dailyLimit,
      isOverloaded,
    });
  });

  return {
    onTimeCompletionRate,
    avgTurnaroundHours,
    blockedTaskRate,
    workloads,
    overloadedMembers,
  };
}
