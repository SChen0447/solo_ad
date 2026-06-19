import { useState, useEffect, useMemo, useRef } from 'react';
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

const GRADIENT_MAP: Record<string, { start: string; end: string }> = {
  [COLORS.primary]: { start: '#90CAF9', end: '#1565C0' },
  [COLORS.success]: { start: '#A5D6A7', end: '#2E7D32' },
  [COLORS.warning]: { start: '#FFE082', end: '#F57C00' },
  [COLORS.danger]: { start: '#EF9A9A', end: '#C62828' },
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

let gradientIdCounter = 0;

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

  const gradientIdRef = useRef(`progressGradient-${gradientIdCounter++}`);
  const gradientId = gradientIdRef.current;

  const gradient = GRADIENT_MAP[color] || GRADIENT_MAP[COLORS.primary];

  const progress = Math.min(animatedValue / Math.max(value, 1), 1);
  const scaleValue = 0.6 + 0.4 * progress;

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={gradient.start} />
          <stop offset="100%" stopColor={gradient.end} />
        </linearGradient>
        <filter id={`${gradientId}-glow`}>
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
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
        stroke={`url(#${gradientId})`}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        filter={`url(#${gradientId}-glow)`}
        style={{ transition: 'stroke-dashoffset 600ms ease-out' }}
      />
      <text
        x={size / 2}
        y={size / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        style={{
          transform: `rotate(90deg) scale(${scaleValue})`,
          transformOrigin: `${size / 2}px ${size / 2}px`,
          fontSize: size >= 110 ? 24 : 20,
          fontWeight: 700,
          fill: `url(#${gradientId})`,
          transition: 'transform 600ms cubic-bezier(0.34, 1.56, 0.64, 1)',
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
                color={COLORS.primary}
              />
              <div style={{ marginTop: 12, fontSize: 14, color: 'var(--text-secondary)' }}>
                {typeStats.single.correct} / {typeStats.single.total} 题
              </div>
            </>
          ) : (
            <div style={{ color: 'var(--text-light)', padding: 20 }}>无此题型</div>
          )}
        </div>
        <div className="report-chart-card">
          <div className="report-chart-title">多选题正确率</div>
          {typeStats.multiple.total > 0 ? (
            <>
              <ProgressRing
                value={typeStats.multiple.accuracy * 100}
                size={100}
                color={COLORS.warning}
              />
              <div style={{ marginTop: 12, fontSize: 14, color: 'var(--text-secondary)' }}>
                {typeStats.multiple.correct} / {typeStats.multiple.total} 题
              </div>
            </>
          ) : (
            <div style={{ color: 'var(--text-light)', padding: 20 }}>无此题型</div>
          )}
        </div>
        <div className="report-chart-card">
          <div className="report-chart-title">判断题正确率</div>
          {typeStats.judge.total > 0 ? (
            <>
              <ProgressRing
                value={typeStats.judge.accuracy * 100}
                size={100}
                color={COLORS.success}
              />
              <div style={{ marginTop: 12, fontSize: 14, color: 'var(--text-secondary)' }}>
                {typeStats.judge.correct} / {typeStats.judge.total} 题
              </div>
            </>
          ) : (
            <div style={{ color: 'var(--text-light)', padding: 20 }}>无此题型</div>
          )}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="section-title">成绩分布</div>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={4}
              dataKey="value"
              animationBegin={0}
              animationDuration={600}
              animationEasing="ease-out"
            >
              <Cell fill={COLORS.success} />
              <Cell fill={COLORS.danger} />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 24, fontSize: 14 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 3, background: COLORS.success }} />
            正确 {correctCount} 题
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 3, background: COLORS.danger }} />
            错误 {totalCount - correctCount} 题
          </span>
        </div>
      </div>

      <div className="section-title">答题详情</div>
      {questions.map((q, idx) => {
        const answer = answers[idx];
        const userAns = answer?.answer;
        const isCorrect = answer?.isCorrect;

        return (
          <div
            key={q.id}
            className={`answer-detail-item ${isCorrect ? '' : 'wrong'}`}
          >
            <div className="answer-detail-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className={`tag tag-${q.type}`}>{typeLabel[q.type]}</span>
                <span className={`tag tag-${q.difficulty}`}>
                  {q.difficulty === 'easy' ? '简单' : q.difficulty === 'medium' ? '中等' : '困难'}
                </span>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>第 {idx + 1} 题 ({q.score}分)</span>
              </div>
              <span className={`answer-status ${isCorrect ? 'correct' : 'wrong'}`}>
                {isCorrect ? '正确' : '错误'}
              </span>
            </div>

            <div className="question-content">{q.content}</div>

            {q.options && (
              <div className="question-options" style={{ marginTop: 8 }}>
                {q.options.map((opt, i) => {
                  const label = optionLabels[i];
                  const isCorrectOpt = Array.isArray(q.answer)
                    ? q.answer.includes(label)
                    : q.answer === label;
                  const isUserOpt = Array.isArray(userAns)
                    ? userAns.includes(label)
                    : userAns === label;

                  return (
                    <div
                      key={i}
                      style={{
                        padding: '6px 8px',
                        borderRadius: 4,
                        fontSize: 14,
                        background: isCorrectOpt
                          ? '#E8F5E9'
                          : isUserOpt && !isCorrectOpt
                          ? '#FFEBEE'
                          : 'transparent',
                        color: isCorrectOpt
                          ? '#2E7D32'
                          : isUserOpt && !isCorrectOpt
                          ? '#C62828'
                          : 'var(--text-secondary)',
                      }}
                    >
                      {label}. {opt}
                      {isCorrectOpt && ' ✓'}
                      {isUserOpt && !isCorrectOpt && ' ✗'}
                    </div>
                  );
                })}
              </div>
            )}

            {q.type === 'judge' && (
              <div style={{ marginTop: 8, fontSize: 14 }}>
                <span style={{ color: q.answer === '正确' ? '#2E7D32' : 'var(--text-secondary)', marginRight: 16 }}>
                  正确 {q.answer === '正确' && '✓'}
                </span>
                <span style={{ color: q.answer === '错误' ? '#2E7D32' : 'var(--text-secondary)' }}>
                  错误 {q.answer === '错误' && '✓'}
                </span>
              </div>
            )}

            <div className="answer-detail-section">
              <strong>你的答案：</strong>
              <span style={{ color: isCorrect ? 'var(--success-color)' : 'var(--danger-color)' }}>
                {Array.isArray(userAns) ? userAns.join(', ') : (userAns || '未作答')}
              </span>
              {!isCorrect && (
                <>
                  <span style={{ margin: '0 8px', color: 'var(--text-light)' }}>|</span>
                  <strong>正确答案：</strong>
                  <span style={{ color: 'var(--success-color)' }}>
                    {Array.isArray(q.answer) ? q.answer.join(', ') : q.answer}
                  </span>
                </>
              )}
            </div>

            {q.analysis && (
              <div className="answer-detail-section">
                <strong>解析：</strong>
                <div className="analysis-text">{q.analysis}</div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
