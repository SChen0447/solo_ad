import React, { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { ActionItem } from '../api';

interface ChartPanelProps {
  allActions: ActionItem[];
  members: string[];
}

const COLORS = {
  completed: '#22c55e',
  pending: '#fb923c',
  overdue: '#ef4444'
};

const classifyAction = (action: ActionItem): 'completed' | 'pending' | 'overdue' => {
  if (action.completed) return 'completed';
  if (!action.dueDate) return 'pending';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(action.dueDate);
  due.setHours(0, 0, 0, 0);
  if (due.getTime() < today.getTime()) return 'overdue';
  return 'pending';
};

const ChartPanel: React.FC<ChartPanelProps> = ({ allActions, members }) => {
  const [filterAssignee, setFilterAssignee] = useState<string>('all');

  const chartData = useMemo(() => {
    const filtered = filterAssignee === 'all'
      ? allActions
      : allActions.filter((a) => a.assignee === filterAssignee);

    const counts = { completed: 0, pending: 0, overdue: 0 };
    filtered.forEach((a) => {
      counts[classifyAction(a)]++;
    });

    const total = filtered.length || 1;

    return [
      {
        name: '已完成',
        key: 'completed',
        value: counts.completed,
        percent: Math.round((counts.completed / total) * 100)
      },
      {
        name: '未完成',
        key: 'pending',
        value: counts.pending,
        percent: Math.round((counts.pending / total) * 100)
      },
      {
        name: '逾期',
        key: 'overdue',
        value: counts.overdue,
        percent: Math.round((counts.overdue / total) * 100)
      }
    ];
  }, [allActions, filterAssignee]);

  const completionRate = useMemo(() => {
    const filtered = filterAssignee === 'all'
      ? allActions
      : allActions.filter((a) => a.assignee === filterAssignee);
    if (filtered.length === 0) return 0;
    const done = filtered.filter((a) => a.completed).length;
    return Math.round((done / filtered.length) * 100);
  }, [allActions, filterAssignee]);

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: { name: string; value: number; percent: number } }> }) => {
    if (active && payload && payload.length > 0) {
      const data = payload[0].payload;
      return (
        <div
          style={{
            background: 'rgba(22, 33, 62, 0.95)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '10px',
            padding: '12px 16px',
            backdropFilter: 'blur(10px)',
            color: '#e8e8f0'
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: '6px' }}>{data.name}</div>
          <div style={{ fontSize: '13px', color: '#9ca3af' }}>
            数量：<span style={{ color: '#fff', fontWeight: 600 }}>{data.value}</span>
          </div>
          <div style={{ fontSize: '13px', color: '#9ca3af' }}>
            占比：<span style={{ color: '#fff', fontWeight: 600 }}>{data.percent}%</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const hasAssignees = allActions.some((a) => a.assignee);
  const uniqueAssignees = Array.from(new Set(allActions.map((a) => a.assignee).filter(Boolean)));

  return (
    <div className="chart-panel">
      <div className="chart-panel-header">
        <div>
          <div className="chart-panel-title">📊 团队行动项完成率分析</div>
          <div style={{ fontSize: '13px', color: '#9ca3af', marginTop: '4px' }}>
            总完成率：
            <span style={{ color: COLORS.completed, fontWeight: 700, fontSize: '15px' }}>
              {completionRate}%
            </span>
            {' '}· 共 {filterAssignee === 'all' ? allActions.length : allActions.filter((a) => a.assignee === filterAssignee).length} 条行动项
          </div>
        </div>
        {hasAssignees && (
          <select
            className="filter-select"
            value={filterAssignee}
            onChange={(e) => setFilterAssignee(e.target.value)}
          >
            <option value="all">全部成员</option>
            {uniqueAssignees.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
            {members
              .filter((m) => !uniqueAssignees.includes(m))
              .map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
          </select>
        )}
      </div>
      <div className="chart-container">
        {allActions.length === 0 ? (
          <div
            style={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#9ca3af',
              fontSize: '14px'
            }}
          >
            暂无行动项数据
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 40, left: 10, bottom: 10 }}
            >
              <defs>
                <linearGradient id="gradCompleted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS.completed} stopOpacity={0.9} />
                  <stop offset="100%" stopColor={COLORS.completed} stopOpacity={0.3} />
                </linearGradient>
                <linearGradient id="gradPending" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS.pending} stopOpacity={0.9} />
                  <stop offset="100%" stopColor={COLORS.pending} stopOpacity={0.3} />
                </linearGradient>
                <linearGradient id="gradOverdue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS.overdue} stopOpacity={0.9} />
                  <stop offset="100%" stopColor={COLORS.overdue} stopOpacity={0.3} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis
                dataKey="name"
                tick={{ fill: '#9ca3af', fontSize: 13 }}
                axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: '#9ca3af', fontSize: 12 }}
                axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
              <Bar
                dataKey="value"
                radius={[10, 10, 0, 0]}
                maxBarSize={100}
                label={{
                  position: 'top',
                  fill: '#e8e8f0',
                  fontSize: 13,
                  fontWeight: 600
                }}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      entry.key === 'completed'
                        ? 'url(#gradCompleted)'
                        : entry.key === 'pending'
                        ? 'url(#gradPending)'
                        : 'url(#gradOverdue)'
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
      <div className="legend-row">
        <div className="legend-item">
          <span className="legend-color" style={{ background: COLORS.completed }}></span>
          已完成
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ background: COLORS.pending }}></span>
          未完成
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ background: COLORS.overdue }}></span>
          逾期
        </div>
      </div>
    </div>
  );
};

export default ChartPanel;
