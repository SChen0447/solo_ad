import { useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import { useFinance } from '../../App';

function getMonthRange(offset: number) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + offset;
  const d = new Date(year, month, 1);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const firstDay = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  const lastDay = `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`;
  return { firstDay, lastDay, year: d.getFullYear(), month: d.getMonth() };
}

function getHealthLevel(score: number) {
  if (score >= 80) return { text: '优秀', cls: 'good' };
  if (score >= 60) return { text: '良好', cls: 'good' };
  if (score >= 40) return { text: '一般', cls: 'warning' };
  return { text: '需改善', cls: 'danger' };
}

function getScoreColor(score: number) {
  if (score >= 80) return '#10b981';
  if (score >= 60) return '#3b82f6';
  if (score >= 40) return '#f59e0b';
  return '#ef4444';
}

function renderRing(score: number, size = 200) {
  const radius = 88;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = getScoreColor(score);

  return (
    <svg width={size} height={size} viewBox="0 0 200 200">
      <circle
        cx="100"
        cy="100"
        r={radius}
        fill="none"
        stroke="#e2e8f0"
        strokeWidth="14"
      />
      <circle
        cx="100"
        cy="100"
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="14"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform="rotate(-90 100 100)"
        style={{ transition: 'stroke-dashoffset 0.8s ease' }}
      />
    </svg>
  );
}

function FinancialHealthBoard() {
  const { transactions, budgets, categories } = useFinance();

  const analysis = useMemo(() => {
    const currentMonth = getMonthRange(0);
    const prevMonth1 = getMonthRange(-1);
    const prevMonth2 = getMonthRange(-2);

    const sumForRange = (firstDay: string, lastDay: string) => {
      let inc = 0;
      let exp = 0;
      const byDateInc: Record<string, number> = {};
      const byDateExp: Record<string, number> = {};
      for (const t of transactions) {
        if (t.date >= firstDay && t.date <= lastDay) {
          if (t.type === 'income') {
            inc += t.amount;
            byDateInc[t.date] = (byDateInc[t.date] || 0) + t.amount;
          } else {
            exp += t.amount;
            byDateExp[t.date] = (byDateExp[t.date] || 0) + t.amount;
          }
        }
      }
      return { income: inc, expense: exp, byDateInc, byDateExp };
    };

    const cur = sumForRange(currentMonth.firstDay, currentMonth.lastDay);
    const p1 = sumForRange(prevMonth1.firstDay, prevMonth1.lastDay);
    const p2 = sumForRange(prevMonth2.firstDay, prevMonth2.lastDay);

    const totalIncome3m = cur.income + p1.income + p2.income;
    const totalExpense3m = cur.expense + p1.expense + p2.expense;

    const incomeExpenseRatio = totalIncome3m > 0 ? Math.min(totalIncome3m / Math.max(totalExpense3m, 1), 2) : 0;
    const ratioScore = Math.min(incomeExpenseRatio / 1.5, 1) * 100;

    const currentMonthKey = `${currentMonth.year}-${String(currentMonth.month + 1).padStart(2, '0')}`;
    const monthBudgets = budgets.filter((b) => b.month === currentMonthKey);

    let budgetComplianceScore = 100;
    const budgetExec: Record<string, number> = {};
    if (monthBudgets.length > 0) {
      let totalWeight = 0;
      let weightedScore = 0;
      for (const b of monthBudgets) {
        const spent = (() => {
          let s = 0;
          for (const t of transactions) {
            if (
              t.type === 'expense' &&
              t.category === b.category &&
              t.date >= currentMonth.firstDay &&
              t.date <= currentMonth.lastDay
            ) {
              s += t.amount;
            }
          }
          return s;
        })();
        const execRatio = b.limit > 0 ? spent / b.limit : 0;
        budgetExec[b.category] = Math.min(execRatio * 100, 200);

        const weight = b.limit;
        totalWeight += weight;
        let catScore = 100;
        if (execRatio > 1) {
          catScore = Math.max(0, 100 - (execRatio - 1) * 100);
        } else if (execRatio > 0.8) {
          catScore = 100 - (execRatio - 0.8) * 50;
        }
        weightedScore += catScore * weight;
      }
      budgetComplianceScore = totalWeight > 0 ? weightedScore / totalWeight : 100;
    }

    const savingsRate = totalIncome3m > 0 ? (totalIncome3m - totalExpense3m) / totalIncome3m : 0;
    const savingsScore = Math.max(0, Math.min(savingsRate / 0.3, 1)) * 100;

    const healthScore = Math.round(ratioScore * 0.35 + budgetComplianceScore * 0.35 + savingsScore * 0.3);

    const trendData: Array<{ date: string; 收入: number; 支出: number }> = [];
    const startDate = new Date(prevMonth2.firstDay);
    const endDate = new Date(currentMonth.lastDay);
    const allByDateInc = { ...p2.byDateInc, ...p1.byDateInc, ...cur.byDateInc };
    const allByDateExp = { ...p2.byDateExp, ...p1.byDateExp, ...cur.byDateExp };

    const d = new Date(startDate);
    while (d <= endDate) {
      const dateStr = d.toISOString().split('T')[0];
      trendData.push({
        date: dateStr.slice(5),
        收入: allByDateInc[dateStr] || 0,
        支出: allByDateExp[dateStr] || 0,
      });
      d.setDate(d.getDate() + 1);
    }

    const radarData = categories.expense.map((c) => ({
      category: c.key,
      执行率: budgetExec[c.key] || 0,
      预算线: 100,
    }));

    return {
      healthScore,
      ratioScore,
      budgetComplianceScore,
      savingsScore,
      savingsRate,
      incomeExpenseRatio,
      trendData,
      radarData,
      currentMonthIncome: cur.income,
      currentMonthExpense: cur.expense,
    };
  }, [transactions, budgets, categories]);

  const level = getHealthLevel(analysis.healthScore);

  return (
    <div>
      <div className="card">
        <h2 className="card-title">💡 财务健康度分析</h2>

        <div className="health-score-section">
          <div className="health-score-ring">
            {renderRing(analysis.healthScore)}
            <div className="health-score-value">
              <span className="health-score-number" style={{ color: getScoreColor(analysis.healthScore) }}>
                {analysis.healthScore}
              </span>
              <span className="health-score-label">{level.text}</span>
            </div>
          </div>

          <div className="health-score-dimensions">
            <div className="dimension-card">
              <div className="dimension-icon">📊</div>
              <div className="dimension-name">收支比</div>
              <div className={`dimension-value ${analysis.ratioScore >= 60 ? 'good' : analysis.ratioScore >= 40 ? 'warning' : 'danger'}`}>
                {analysis.incomeExpenseRatio.toFixed(2)}
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                {Math.round(analysis.ratioScore)}分
              </div>
            </div>
            <div className="dimension-card">
              <div className="dimension-icon">🎯</div>
              <div className="dimension-name">预算遵从度</div>
              <div className={`dimension-value ${analysis.budgetComplianceScore >= 60 ? 'good' : analysis.budgetComplianceScore >= 40 ? 'warning' : 'danger'}`}>
                {Math.round(analysis.budgetComplianceScore)}%
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                {Math.round(analysis.budgetComplianceScore)}分
              </div>
            </div>
            <div className="dimension-card">
              <div className="dimension-icon">💰</div>
              <div className="dimension-name">储蓄率</div>
              <div className={`dimension-value ${analysis.savingsScore >= 60 ? 'good' : analysis.savingsScore >= 40 ? 'warning' : 'danger'}`}>
                {(analysis.savingsRate * 100).toFixed(1)}%
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                {Math.round(analysis.savingsScore)}分
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="chart-grid">
        <div className="chart-card">
          <div className="chart-card-title">📈 近3个月每日收支趋势</div>
          <div style={{ width: '100%', height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analysis.trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="date"
                  stroke="#94a3b8"
                  tick={{ fontSize: 11 }}
                  interval="preserveStartEnd"
                />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="收入"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorIncome)"
                />
                <Area
                  type="monotone"
                  dataKey="支出"
                  stroke="#ef4444"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorExpense)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-card-title">🎯 各品类预算执行率</div>
          <div style={{ width: '100%', height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={analysis.radarData} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis
                  dataKey="category"
                  tick={{ fontSize: 12, fill: '#475569' }}
                />
                <PolarRadiusAxis
                  angle={30}
                  domain={[0, 150]}
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                />
                <Radar
                  name="执行率(%)"
                  dataKey="执行率"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.4}
                  strokeWidth={2}
                />
                <Radar
                  name="预算线(100%)"
                  dataKey="预算线"
                  stroke="#f59e0b"
                  fill="#f59e0b"
                  fillOpacity={0}
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                />
                <Legend />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FinancialHealthBoard;
