import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Printer, ArrowLeft } from 'lucide-react';
import { useAppContext } from '../App';
import type { Question } from '../data/questionBank';

const optionLabels = ['A', 'B', 'C', 'D', 'E', 'F'];

const COLORS = {
  primary: '#1565C0',
  success: '#43A047',
  warning: '#FB8C00',
  danger: '#E53935',
  light: '#E3F2FD',
};

const typeLabel: Record<string, string> = {
  single: '单选题',
  multiple: '多选题',
  judge: '判断题',
};

function useAnimatedNumber(target: number, duration = 600): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setValue(target * easeOut);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [target, duration]);

  return value;
}

function AnimatedNumber({ value, decimals = 0, suffix = '' }: { value: number; decimals?: number; suffix?: string }) {
  const animated = useAnimatedNumber(value);
  return <span>{animated.toFixed(decimals)}{suffix}</span>;
}

function ProgressRing({ value, size = 120, strokeWidth = 10, color = COLORS.primary }: {
  value: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}) {
  const animatedValue = useAnimatedNumber(value, 600);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedValue / 100) * circumference;

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={COLORS.light}
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 600ms ease-out' }}
      />
      <text
        x={size / 2}
        y={size / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        style={{
          transform: 'rotate(90deg)',
          transformOrigin: `${size / 2}px ${size / 2}px`,
          fontSize: 24,
          fontWeight: 700,
          fill: color,
        }}
      >
        {animatedValue.toFixed(0)}%
      </text>
    </svg>
  );
}

export default function ReportPage() {
  const navigate = useNavigate();
  const { examResult, examQuestions } = useAppContext();

  const questions: Question[] = examQuestions;

  if (!examResult || questions.length === 0) {
    return (
      <div className="page-container">
        <h1 className="page-title">成绩报告</h1>
        <div className="card empty-state">
          <div className="empty-state-icon">📊</div>
          <div style={{ marginBottom: 16 }}>暂无考试数据，请先完成一场考试</div>
          <button className="btn-primary" onClick={() => navigate('/create-paper')}>
            开始组卷
          </button>
        </div>
      </div>
    );
  }

  const { typeStats, totalScore, maxScore, correctCount, totalCount, answers } = examResult;
  const overallAccuracy = totalCount > 0 ? (correctCount / totalCount) * 100 : 0;

  const chartData = useMemo(() => [
    { name: '正确', value: correctCount },
    { name: '错误', value: totalCount - correctCount },
  ], [correctCount, totalCount]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 className="page-title" style={{ margin: 0 }}>成绩报告</h1>
        <div className="report-actions" style={{ margin: 0 }}>
          <button className="btn-secondary" onClick={() => navigate('/exam')}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <ArrowLeft size={16} /> 返回考试
            </span>
          </button>
          <button className="btn-primary" onClick={handlePrint}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Printer size={16} /> 打印 / 导出PDF
            </span>
          </button>
        </div>
      </div>

      <div className="report-header">
        <div className="report-score-card">
          <div className="report-score-value">
            <AnimatedNumber value={totalScore} />
            <span style={{ fontSize: 20, opacity: 0.8 }}> / {maxScore}</span>
          </div>
          <div className="report-score-label">总分</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: 32 }}>
          <div style={{ fontSize: 48, fontWeight: 700, color: COLORS.primary, lineHeight: 1 }}>
            <AnimatedNumber value={correctCount} />
            <span style={{ fontSize: 20, color: 'var(--text-secondary)' }}> / {totalCount}</span>
          </div>
          <div style={{ marginTop: 8, fontSize: 14, color: 'var(--text-secondary)' }}>答对题数</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <ProgressRing
              value={overallAccuracy}
              size={110}
              color={overallAccuracy >= 60 ? COLORS.success : overallAccuracy >= 40 ? COLORS.warning : COLORS.danger}
            />
          </div>
          <div style={{ marginTop: 8, fontSize: 14, color: 'var(--text-secondary)' }}>总正确率</div>
        </div>
      </div>

      <div className="report-charts">
        <div className="report-chart-card">
          <div className="report-chart-title">单选题正确率</div>
          {typeStats.single.total > 0 ? (
            <>
              <ProgressRing
                value={typeStats.single.accuracy * 100}
                size={100}
                color