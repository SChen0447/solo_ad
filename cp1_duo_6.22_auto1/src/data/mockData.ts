import type { Task, TeamMember, TaskStatus, TaskPriority } from './taskStore'

const members: TeamMember[] = [
  { id: 'm1', name: '张明', avatar: 'ZM' },
  { id: 'm2', name: '李雪', avatar: 'LX' },
  { id: 'm3', name: '王磊', avatar: 'WL' },
  { id: 'm4', name: '赵芳', avatar: 'ZF' },
  { id: 'm5', name: '陈涛', avatar: 'CT' },
]

const titles = [
  '用户登录模块优化', '首页响应式适配', 'API 接口文档编写', '订单列表性能调优',
  '支付流程单元测试', '数据看板图表修复', '消息推送服务对接', '搜索功能重构',
  '权限管理模块开发', '国际化翻译整理', '代码评审记录整理', 'CI 流水线配置',
  '数据库索引优化', '前端异常监控接入', '移动端手势适配', '表单验证规则统一',
  '用户权限审计日志', '商品详情页改版', '后台管理系统导航', '批量导入导出功能',
  '缓存策略设计', '错误提示文案优化', '文件上传组件封装', '富文本编辑器集成',
  'WebSocket 长连接管理', '图片懒加载实现', '主题切换功能', '用户引导新手教程',
  '数据脱敏处理', '日志分级规范',
]

const descriptions = [
  '提升模块稳定性，降低响应时间 30%',
  '适配主流分辨率设备',
  '补充缺失的接口说明与示例',
  '解决大数据量下卡顿问题',
  '覆盖核心分支与边界条件',
  '修复数据统计异常问题',
  '接入第三方推送 SDK',
  '迁移至新搜索引擎架构',
  '支持角色与资源细粒度控制',
  '整理中英文文案包',
  '汇总本月评审意见并跟踪',
  '自动执行构建、测试与部署',
  '优化慢查询，提升写入性能',
  '接入 Sentry 并配置告警规则',
  '支持常见滑动与缩放手势',
  '抽离公共校验规则库',
  '记录关键操作的完整链路',
  '提升转化率，优化视觉层次',
  '支持多级菜单与面包屑导航',
  '支持 Excel 模板导入与数据导出',
  '设计 Redis + 本地多级缓存',
  '统一错误码与用户友好提示',
  '支持拖拽上传与进度展示',
  '接入 Markdown 编辑器',
  '处理断线重连与心跳机制',
  '基于 IntersectionObserver 实现',
  '深色/浅色模式无缝切换',
  '分步引导与帮助气泡',
  '用户手机号、身份证号脱敏',
  '明确 error/warn/info 分级策略',
]

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function generateMockTasks(): Task[] {
  const tasks: Task[] = []
  const today = new Date()
  const statuses: TaskStatus[] = ['todo', 'in_progress', 'done']
  const priorities: TaskPriority[] = ['low', 'medium', 'high']

  for (let i = 0; i < 100; i++) {
    const daysAgo = Math.floor(Math.random() * 7)
    const created = new Date(today)
    created.setDate(created.getDate() - daysAgo)
    created.setHours(Math.floor(Math.random() * 10) + 8, Math.floor(Math.random() * 60), 0, 0)

    const status = randomFrom(statuses)
    const priority = randomFrom(priorities)
    const estimated = Math.floor(Math.random() * 12) + 1
    const actual = status === 'done' ? Math.round((estimated * (0.6 + Math.random() * 0.9)) * 10) / 10 : Math.floor(Math.random() * estimated)

    let startedAt: Date | undefined
    let completedAt: Date | undefined
    if (status === 'in_progress' || status === 'done') {
      startedAt = new Date(created)
      startedAt.setHours(startedAt.getHours() + Math.floor(Math.random() * 4) + 1)
    }
    if (status === 'done') {
      completedAt = new Date(startedAt!)
      completedAt.setHours(completedAt.getHours() + actual + Math.floor(Math.random() * 3))
    }

    tasks.push({
      id: `t${i + 1}`,
      title: titles[i % titles.length],
      description: descriptions[i % descriptions.length],
      status,
      priority,
      estimatedHours: estimated,
      actualHours: actual,
      assigneeId: members[i % members.length].id,
      createdAt: created,
      startedAt,
      completedAt,
      switchCount: status === 'in_progress' ? Math.floor(Math.random() * 4) : Math.floor(Math.random() * 2),
    })
  }
  return tasks
}

export function getTeamMembers(): TeamMember[] {
  return members
}

export function getDateRange(days: number): string[] {
  const dates: string[] = []
  const today = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    dates.push(formatDate(d))
  }
  return dates
}
