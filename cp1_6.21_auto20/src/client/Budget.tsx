import { useState, useEffect } from 'react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';
import { TravelPlan, BudgetStats } from './types';

const CATEGORY_COLORS: Record<string, string> = {
  '住宿': '#4DB6AC',
  '餐饮': '#FF7043',
  '交通': '#42A5F5',
  '门票': '#AB47BC',
  '其他': '#FFCA28',
};

interface BudgetProps {
  plan: TravelPlan;
}

export default function Budget({ plan }: BudgetProps) {
  const [stats, setStats] = useState<BudgetStats | null>(null);

  useEffect(() => {
    fetchStats();
  }, [plan.id, plan.activities.length, plan.activities.map(a => a.budget + a.payerId).join(',')]);

  const fetchStats = async () => {
    const res = await fetch(`/api/plans/${plan.id}/budget`);
    const data = await res.json();
    setStats(data);
  };

  if (!stats) return <div className="empty-state"><div className="empty-state-icon">💰</div><p>加载中...</p></div>;

  const pieData = Object.entries(stats.byCategory)
    .filter(([, value]) => value > 0)
    .map(([name, value]) => ({ name, value }));

  const barData = Object.entries(stats.byDay)
    .map(([day, value]) => ({ name: `第${parseInt(day) + 1}天`, 花费: value }))
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));

  const hasData = pieData.length > 0;

  return (
    <div className="budget-container">
      <div className="card budget-summary">
        <div className="budget-stat">
          <div className="budget-stat-value">¥{stats.totalBudget.toFixed(0)}</div>
          <div className="budget-stat-label">总预算</div>
        </div>
        <div className="budget-stat">
          <div className="budget-stat-value">¥{stats.perPerson.toFixed(0)}</div>
          <div className="budget-stat-label">人均分摊</div>
        </div>
        <div className="budget-stat">
          <div className="budget-stat-value">{plan.members.length}</div>
          <div className="budget-stat-label">同行成员</div>
        </div>
      </div>

      <div className="card">
        <h3>📊 预算类别分布</h3>
        {hasData ? (
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={90}
                  fill="#8884d8"
                  dataKey="value"
                  animationDuration={600}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={index} fill={CATEGORY_COLORS[entry.name] || '#ccc'} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `¥${value}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="empty-state"><div className="empty-state-icon">📊</div><p>暂无预算数据</p></div>
        )}
      </div>

      <div className="card">
        <h3>📈 每日花费趋势</h3>
        {barData.length > 0 ? (
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E0F2F1" />
                <XAxis dataKey="name" tick={{ fill: '#7F8C8D', fontSize: 12 }} />
                <YAxis tick={{ fill: '#7F8C8D', fontSize: 12 }} />
                <Tooltip formatter={(value: number) => `¥${value}`} />
                <Bar dataKey="花费" fill="#4DB6AC" radius={[6, 6, 0, 0]} animationDuration={600} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="empty-state"><div className="empty-state-icon">📈</div><p>暂无每日花费数据</p></div>
        )}
      </div>

      <div className="card">
        <h3>💳 付款统计</h3>
        {Object.keys(stats.byPayer).length > 0 ? (
          <div className="payers-list">
            {Object.values(stats.byPayer).map(payer => (
              <div key={payer.name} className="payer-item">
                <div className="payer-info">
                  <div className="avatar" style={{ background: payer.color, border: 'none', marginLeft: 0 }}>
                    {payer.name.charAt(0)}
                  </div>
                  <span style={{ fontWeight: 500 }}>{payer.name}</span>
                </div>
                <span className="payer-amount">¥{payer.total.toFixed(0)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state" style={{ padding: '30px' }}>
            <p style={{ fontSize: 13 }}>还没有成员认领付款</p>
          </div>
        )}
      </div>

      <div className="card">
        <h3>💵 结算建议</h3>
        <div className="settlements-list">
          {stats.settlements.map(s => (
            <div key={s.memberId} className="settlement-item">
              <div className="settlement-info">
                <div className="avatar" style={{ background: s.color, border: 'none', marginLeft: 0 }}>
                  {s.name.charAt(0)}
                </div>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>{s.name}</div>
                  <div style={{ fontSize: 11, color: '#999' }}>
                    已付 ¥{s.paid.toFixed(0)} · 应摊 ¥{s.shouldPay.toFixed(0)}
                  </div>
                </div>
              </div>
              <span className={`settlement-balance ${s.balance >= 0 ? 'positive' : 'negative'}`}>
                {s.balance >= 0 ? '应收' : '应付'} ¥{Math.abs(s.balance).toFixed(0)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
