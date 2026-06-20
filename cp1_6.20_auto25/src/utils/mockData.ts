export type Priority = 'high' | 'medium' | 'low';
export type TaskStatus = 'todo' | 'inProgress' | 'done';

export interface Member {
  id: string;
  name: string;
  avatar: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  estimatedHours: number;
  priority: Priority;
  dueDate: string;
  assigneeId: string;
  status: TaskStatus;
}

const MEMBERS: Member[] = [
  { id: 'm1', name: '张伟', avatar: 'ZW' },
  { id: 'm2', name: '李娜', avatar: 'LN' },
  { id: 'm3', name: '王磊', avatar: 'WL' },
  { id: 'm4', name: '赵敏', avatar: 'ZM' },
  { id: 'm5', name: '陈晨', avatar: 'CC' },
];

function addDays(base: Date, days: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function generateTasks(): Task[] {
  const now = new Date();
  const tasks: Task[] = [];
  let idCounter = 1;

  const mkTask = (
    title: string,
    desc: string,
    hours: number,
    priority: Priority,
    dueOffset: number,
    assigneeId: string,
    status: TaskStatus = 'todo'
  ): Task => ({
    id: `t${idCounter++}`,
    title,
    description: desc,
    estimatedHours: hours,
    priority,
    dueDate: addDays(now, dueOffset),
    assigneeId,
    status,
  });

  tasks.push(mkTask('用户认证模块重构', '重构JWT认证流程，支持多端登录', 16, 'high', 5, 'm1'));
  tasks.push(mkTask('支付接口对接', '对接第三方支付网关，完成支付回调', 24, 'high', 5, 'm1'));
  tasks.push(mkTask('数据库索引优化', '分析慢查询，添加复合索引', 8, 'medium', 3, 'm1'));

  tasks.push(mkTask('首页UI改版', '重新设计首页布局和交互', 20, 'high', 6, 'm2'));
  tasks.push(mkTask('移动端适配', '响应式布局调整，兼容主流机型', 12, 'medium', 7, 'm2'));
  tasks.push(mkTask('设计系统文档', '整理组件库文档和使用规范', 6, 'low', 10, 'm2'));

  tasks.push(mkTask('消息推送服务', '实现WebSocket实时消息推送', 16, 'high', 4, 'm3'));
  tasks.push(mkTask('日志采集系统', '搭建ELK日志采集和分析管道', 20, 'high', 4, 'm3'));
  tasks.push(mkTask('监控告警配置', '配置Prometheus告警规则', 8, 'medium', 8, 'm3'));

  tasks.push(mkTask('单元测试补充', '核心模块测试覆盖率提升至80%', 12, 'medium', 9, 'm4'));
  tasks.push(mkTask('CI/CD流水线', '搭建自动化构建和部署流水线', 16, 'high', 6, 'm4'));
  tasks.push(mkTask('性能压测报告', '编写压力测试方案和执行报告', 8, 'low', 12, 'm4'));

  tasks.push(mkTask('客户需求分析', '整理Q3客户反馈，提炼需求优先级', 10, 'medium', 5, 'm5'));
  tasks.push(mkTask('竞品分析报告', '分析3个竞品的功能和商业模式', 6, 'low', 7, 'm5'));
  tasks.push(mkTask('产品路线图更新', '根据战略调整更新产品路线图', 4, 'medium', 6, 'm5'));

  tasks.push(mkTask('API网关搭建', '搭建Kong网关，配置限流和鉴权', 20, 'high', 8, 'm1'));
  tasks.push(mkTask('数据导出功能', '支持CSV和Excel格式的数据导出', 8, 'medium', 10, 'm2'));
  tasks.push(mkTask('权限管理重构', 'RBAC权限模型改造', 16, 'high', 7, 'm3'));
  tasks.push(mkTask('缓存策略优化', 'Redis缓存穿透和雪崩防护', 10, 'medium', 9, 'm3'));
  tasks.push(mkTask('前端性能优化', '首屏加载时间优化至2秒内', 14, 'high', 6, 'm2'));
  tasks.push(mkTask('容器化部署', 'Docker镜像构建和K8s编排', 18, 'high', 5, 'm4'));
  tasks.push(mkTask('国际化支持', 'i18n框架接入，支持中英日三语', 12, 'medium', 11, 'm5'));

  tasks[0].status = 'inProgress';
  tasks[3].status = 'inProgress';
  tasks[6].status = 'inProgress';
  tasks[9].status = 'inProgress';
  tasks[13].status = 'inProgress';

  return tasks;
}

export { MEMBERS, generateTasks };
