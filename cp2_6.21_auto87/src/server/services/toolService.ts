import { v4 as uuidv4 } from 'uuid';
import type { Tool, TimePeriod, ToolReservation } from '../../types';

const tools: Tool[] = [];

function initTools() {
  if (tools.length > 0) return;
  const samples: Array<{ name: string; icon: string; total: number; available: number; borrower?: string; returnHoursLater?: number }> = [
    { name: '大号水桶', icon: '🪣', total: 5, available: 3, borrower: '张伟', returnHoursLater: 2 },
    { name: '园艺铲', icon: '🪏', total: 6, available: 5 },
    { name: '修枝剪', icon: '✂️', total: 4, available: 2, borrower: '王芳', returnHoursLater: 5 },
    { name: '浇水壶', icon: '🚿', total: 8, available: 6 },
    { name: '耙子', icon: '🧹', total: 3, available: 3 },
    { name: '手套（副）', icon: '🧤', total: 10, available: 7, borrower: '李娜', returnHoursLater: 1 },
    { name: '锄头', icon: '⛏️', total: 4, available: 4 },
    { name: '手推车', icon: '🛒', total: 2, available: 1, borrower: '刘洋', returnHoursLater: 4 },
  ];
  const now = Date.now();
  samples.forEach((s) => {
    const tool: Tool = {
      id: uuidv4(),
      name: s.name,
      icon: s.icon,
      total: s.total,
      available: s.available,
      reservations: [],
    };
    if (s.borrower && s.returnHoursLater !== undefined) {
      tool.currentBorrower = s.borrower;
      tool.returnTime = new Date(now + s.returnHoursLater * 3600 * 1000).toISOString();
    }
    tools.push(tool);
  });
}

initTools();

export function getTools(): Tool[] {
  return tools.map((t) => ({ ...t, reservations: [...t.reservations] }));
}

export function getToolById(id: string): Tool | undefined {
  return tools.find((t) => t.id === id);
}

function periodsConflict(a: TimePeriod, b: TimePeriod): boolean {
  if (a === '全天' || b === '全天') return true;
  return a === b;
}

export function reserveTool(
  toolId: string,
  date: string,
  period: TimePeriod,
  memberId: string,
  memberName: string,
): { ok: boolean; message: string; reservation?: ToolReservation } {
  const tool = tools.find((t) => t.id === toolId);
  if (!tool) return { ok: false, message: '工具不存在' };
  if (tool.available <= 0) return { ok: false, message: '该工具暂无库存' };
  const existing = tool.reservations.filter((r) => r.date === date);
  if (existing.some((r) => periodsConflict(r.period, period))) {
    return { ok: false, message: '该时段已被预约' };
  }
  const reservation: ToolReservation = {
    id: uuidv4(),
    date,
    period,
    memberId,
    memberName,
  };
  tool.reservations.push(reservation);
  return { ok: true, message: '预约成功', reservation };
}
