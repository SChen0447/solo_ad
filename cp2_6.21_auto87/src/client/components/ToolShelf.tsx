import { useState, useEffect, useCallback } from 'react';
import { api } from '@/client/services/api';
import type { Tool, TimePeriod, CurrentUser } from '@/types';

interface Props {
  currentUser: CurrentUser;
}

const PERIODS: TimePeriod[] = ['上午', '下午', '全天'];

function getNextDays(n: number): string[] {
  const days: string[] = [];
  const now = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

function formatDate(s: string): string {
  const d = new Date(s);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function ToolShelf({ currentUser }: Props) {
  const [tools, setTools] = useState<Tool[]>([]);
  const [selected, setSelected] = useState<Record<string, { date: string; period: TimePeriod }>>({});
  const [reserving, setReserving] = useState<string | null>(null);

  const loadTools = useCallback(async () => {
    try {
      const data = await api.getTools();
      setTools(data);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    loadTools();
  }, [loadTools]);

  const days = getNextDays(3);

  const isPeriodReserved = (tool: Tool, date: string, period: TimePeriod): boolean => {
    return tool.reservations.some((r) => {
      if (r.date !== date) return false;
      if (r.period === '全天' || period === '全天') return true;
      return r.period === period;
    });
  };

  const getReservedBy = (tool: Tool, date: string, period: TimePeriod): string | null => {
    const r = tool.reservations.find((x) => {
      if (x.date !== date) return false;
      if (x.period === '全天' || period === '全天') return true;
      return x.period === period;
    });
    return r ? r.memberName : null;
  };

  const handleSelect = (toolId: string, date: string, period: TimePeriod) => {
    const tool = tools.find((t) => t.id === toolId);
    if (!tool) return;
    if (isPeriodReserved(tool, date, period)) return;
    setSelected({ ...selected, [toolId]: { date, period } });
  };

  const handleReserve = async (toolId: string) => {
    const pick = selected[toolId];
    if (!pick) return;
    setReserving(toolId);
    try {
      await api.reserveTool({
        toolId,
        date: pick.date,
        period: pick.period,
        memberId: currentUser.id,
        memberName: currentUser.name,
      });
      setSelected({ ...selected, [toolId]: undefined as any });
      await loadTools();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setReserving(null);
    }
  };

  return (
    <section className="panel">
      <div className="panel-title">
        <span>🛠 工具架</span>
      </div>
      <div className="panel-content">
        {tools.length === 0 && <div className="empty-state">加载中...</div>}
        {tools.map((tool) => {
          const sel = selected[tool.id];
          return (
            <div key={tool.id} className="card tool-card">
              <div className="tool-header">
                <div className="tool-info">
                  <span className="tool-icon">{tool.icon}</span>
                  <div>
                    <div className="tool-name">{tool.name}</div>
                    <div className="tool-stock">库存 {tool.available}/{tool.total}</div>
                  </div>
                </div>
              </div>
              {tool.currentBorrower && (
                <div className="tool-borrower">
                  借用人：{tool.currentBorrower}
                  {tool.returnTime && ` · 预计归还 ${new Date(tool.returnTime).toLocaleString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`}
                </div>
              )}
              <div className="reservation-section">
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>选择预约日期和时段（未来3天）：</div>
                {days.map((date) => (
                  <div key={date} style={{ marginBottom: 6 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 4 }}>{formatDate(date)}</div>
                    <div className="reservation-slots">
                      {PERIODS.map((period) => {
                        const reserved = isPeriodReserved(tool, date, period);
                        const reservedBy = reserved ? getReservedBy(tool, date, period) : null;
                        const isSel = sel?.date === date && sel?.period === period;
                        return (
                          <div
                            key={period}
                            title={reserved && reservedBy ? `已被${reservedBy}预约` : ''}
                            className={`slot ${reserved ? 'slot-locked' : ''} ${isSel ? 'selected' : ''}`}
                            onClick={() => !reserved && handleSelect(tool.id, date, period)}
                          >
                            {period}
                            {reserved && (
                              <div className="slot-overlay">
                                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM12 17c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zM15.1 8H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                                </svg>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
                <button
                  className="btn btn-primary btn-sm btn-block"
                  style={{ marginTop: 8 }}
                  disabled={!sel || reserving === tool.id}
                  onClick={() => handleReserve(tool.id)}
                >
                  {reserving === tool.id ? '预约中...' : sel ? `确认预约 ${formatDate(sel.date)} ${sel.period}` : '请选择时段'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
