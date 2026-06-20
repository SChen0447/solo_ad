import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import type { TooltipItem } from 'chart.js';
import type { FinanceParams } from '../../types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface FinanceChartsProps {
  params: FinanceParams;
}

interface MonthData {
  month: number;
  revenue: number;
  cost: number;
  grossProfit: number;
  cumulativeProfit: number;
}

function computeProjections(params: FinanceParams): MonthData[] {
  const { initialInvestment, monthlyFixedCost, monthlyGrowthRate } = params;
  const results: MonthData[] = [];
  let cumulativeProfit = -initialInvestment;

  for (let m = 1; m <= 12; m++) {
    const revenue = monthlyFixedCost * 1.5 * Math.pow(1 + monthlyGrowthRate / 100, m - 1);
    const cost = monthlyFixedCost * (1 + 0.02 * (m - 1));
    const grossProfit = revenue - cost;
    cumulativeProfit += grossProfit;
    results.push({
      month: m,
      revenue: Math.round(revenue),
      cost: Math.round(cost),
      grossProfit: Math.round(grossProfit),
      cumulativeProfit: Math.round(cumulativeProfit),
    });
  }
  return results;
}

const FinanceCharts: React.FC<FinanceChartsProps> = ({ params }) => {
  const projections = useMemo(() => computeProjections(params), [params]);

  const months = projections.map(p => `第${p.month}月`);
  const revenues = projections.map(p => p.revenue);
  const grossProfits = projections.map(p => p.grossProfit);

  const paybackMonth = projections.find(p => p.cumulativeProfit >= 0);

  const lineData = {
    labels: months,
    datasets: [
      {
        label: '月收入预测',
        data: revenues,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59,130,246,0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: '#3b82f6',
      },
    ],
  };

  const lineOptions = {
    responsive: true,
    animation: { duration: 500 } as const,
    plugins: {
      tooltip: {
        callbacks: {
          label: (ctx: TooltipItem<'line'>) => `收入：¥${(ctx.parsed.y ?? 0).toLocaleString()}`,
        },
      },
      legend: { display: false },
    },
    scales: {
      x: { title: { display: true, text: '月份' } },
      y: { title: { display: true, text: '金额（元）' }, beginAtZero: true },
    },
  };

  const barData = {
    labels: months,
    datasets: [
      {
        label: '月毛利',
        data: grossProfits,
        backgroundColor: grossProfits.map(v => (v >= 0 ? '#22c55e' : '#ef4444')),
        borderRadius: 4,
      },
    ],
  };

  const barOptions = {
    responsive: true,
    animation: { duration: 500 } as const,
    plugins: {
      tooltip: {
        callbacks: {
          label: (ctx: TooltipItem<'bar'>) => `毛利：¥${(ctx.parsed.y ?? 0).toLocaleString()}`,
        },
      },
      legend: { display: false },
    },
    scales: {
      x: { title: { display: true, text: '月份' } },
      y: { title: { display: true, text: '金额（元）' } },
    },
  };

  return (
    <div style={styles.container}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        style={styles.chartWrapper}
      >
        <h4 style={styles.chartTitle}>📈 未来12月收入预测曲线</h4>
        <Line data={lineData} options={lineOptions} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        style={styles.chartWrapper}
      >
        <h4 style={styles.chartTitle}>📊 月毛利趋势</h4>
        <Bar data={barData} options={barOptions} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        style={styles.paybackCard}
      >
        <h4 style={styles.chartTitle}>💰 投资回收期</h4>
        {paybackMonth ? (
          <p style={styles.paybackText}>
            预计在第 <strong style={{ color: '#22c55e' }}>{paybackMonth.month}</strong> 个月实现累计盈利回正
          </p>
        ) : (
          <p style={{ ...styles.paybackText, color: '#ef4444' }}>
            当前参数下12个月内无法回本，请调整参数
          </p>
        )}
      </motion.div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 24,
  },
  chartWrapper: {
    background: '#f9fafb',
    borderRadius: 12,
    padding: 20,
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: '#1e3a5f',
    marginBottom: 12,
  },
  paybackCard: {
    background: '#f9fafb',
    borderRadius: 12,
    padding: 20,
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  },
  paybackText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 1.6,
  },
};

export default FinanceCharts;
