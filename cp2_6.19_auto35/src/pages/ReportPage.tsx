import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Printer, ArrowLeft, Home, FileText, Edit3, CheckCircle, Clock } from 'lucide-react';
import { useAppContext } from '../App';
import type { Question } from '../data/questionBank';

const optionLabels = ['A', 'B', 'C', 'D', 'E', 'F'];

const COLORS = {
  primary: '#1565C0',
  multiple: '#00C853',
  judge: '#FF6D00',
  success: '#43A047',
  warning: '#FB8C00',
  danger: '#E53935',
  light: '#E3F2FD',
  borderCorrect: '#66BB6A',
  borderWrong: '#EF5350',
  borderUnanswered: '#B0BEC5',
  bgSingle: '#E3F2FD',
  bgMultiple: '#C8E6C9',
  bgJudge: '#FFE0B2',
};

const TYPE_COLOR_MAP: Record<string, string> = {
  single: COLORS.primary,
  multiple: COLORS.multiple,
  judge: COLORS.judge,
};

const GRADIENT_MAP: Record<string, { start: string; end: string }> = {
  [COLORS.primary]: { start: '#90CAF9', end: '#1565C0' },
  [COLORS.multiple]: { start: '#69F0AE', end: '#00A84A' },
  [COLORS.judge]: { start: '#FFAB40', end: '#E65100' },
  [COLORS.success]: { start: '#A5D6A7', end: '#2E7D32' },
  [COLORS.warning]: { start: '#FFE082', end: '#F57C00' },
  [COLORS.danger]: { start: '#EF9A9A', end: '#C62828' },
};

const typeLabel: Record<string, string> = {
  single: '单选题',
  multiple: '多选题',
  judge: '判断题',
};

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}分${s.toString().padStart(2, '0')}秒`;
}

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

interface OverviewCardProps {
  icon: React.ElementType;
  label: string;
  value: number;
  suffix?: string;
  color: string;
  bgColor: string;
}

function OverviewCard({ icon: Icon, label, value, suffix = '', color, bgColor }: OverviewCardProps) {
  return (
    <div
      className="card"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: 20,
        animation: 'fadeIn 400ms ease-out both',
      }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: 12,
          background: bgColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon size={24} style={{ color }} />
      </div>
      <div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 26, fontWeight: 700, color, lineHeight: 1.2 }}>
          <AnimatedNumber value={value} />
          {suffix && <span style={{ fontSize: 14, fontWeight: 500 }}>{suffix}</span>}
        </div>
      </div>
    </div>
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

  const { typeStats, totalScore, maxScore, correctCount, totalCount, answeredCount, timeUsed, answers } = examResult;
  const overallAccuracy = totalCount > 0 ? (correctCount / totalCount) * 100 : 0;

  const chartData = useMemo(() => [
    { name: '正确', value: correctCount },
    { name: '错误', value: totalCount - correctCount },
  ], [correctCount, totalCount]);

  const handlePrint = () => {
    window.print();
  };

  const formatAnswer = (ans: string | string[] | undefined): string => {
    if (!ans) return '';
    return Array.isArray(ans) ? ans.join(', ') : ans;
  };

  return (
    <div className="page-container" style={{ position: 'relative', paddingBottom: 80 }}>
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

      <div className="section-title">考试概览</div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 16,
          marginBottom: 28,
        }}
      >
        <OverviewCard
          icon={FileText}
          label="总题数"
          value={totalCount}
          suffix=" 道"
          color={COLORS.primary}
          bgColor={COLORS.bgSingle}
        />
        <OverviewCard
          icon={Edit3}
          label="已作答"
          value={answeredCount}
          suffix=" 道"
          color={COLORS.multiple}
          bgColor={COLORS.bgMultiple}
        />
        <OverviewCard
          icon={CheckCircle}
          label="正确数"
          value={correctCount}
          suffix=" 道"
          color={COLORS.judge}
          bgColor={COLORS.bgJudge}
        />
        <OverviewCard
          icon={Clock}
          label="用时"
          value={0}
          color={COLORS.primary}
          bgColor={'#E8EAF6'}
        />
        <div style={{ display: 'none' }}>{/* placeholder */}</div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 16,
          marginTop: -28,
          marginBottom: 28,
          pointerEvents: 'none',
        }}
      >
        <div />
        <div />
        <div />
        <div
          className="card"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            padding: 20,
            pointerEvents: 'auto',
            animation: 'fadeIn 400ms ease-out 300ms both',
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 12,
              background: '#E8EAF6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Clock size={24} style={{ color: COLORS.primary }} />
          </div>
          <div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 2 }}>用时</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: COLORS.primary, lineHeight: 1.2 }}>
              {formatDuration(timeUsed)}
            </div>
          </div>
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
                color={COLORS.multiple}
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
                color={COLORS.judge}
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
        const isUnanswered = !userAns || (Array.isArray(userAns) && userAns.length === 0);

        let borderColor: string;
        let statusText: string;
        let statusBg: string;
        let statusColor: string;

        if (isUnanswered) {
          borderColor = COLORS.borderUnanswered;
          statusText = '未作答';
          statusBg = '#ECEFF1';
          statusColor = '#546E7A';
        } else if (isCorrect) {
          borderColor = COLORS.borderCorrect;
          statusText = '正确';
          statusBg = '#E8F5E9';
          statusColor = COLORS.success;
        } else {
          borderColor = COLORS.borderWrong;
          statusText = '错误';
          statusBg = '#FFEBEE';
          statusColor = COLORS.danger;
        }

        const typeColor = TYPE_COLOR_MAP[q.type] || COLORS.primary;
        const typeBg =
          q.type === 'single' ? COLORS.bgSingle :
          q.type === 'multiple' ? COLORS.bgMultiple : COLORS.bgJudge;

        return (
          <div
            key={q.id}
            style={{
              background: 'white',
              borderRadius: 8,
              padding: 20,
              marginBottom: 14,
              boxShadow: 'var(--shadow-sm)',
              borderLeft: `4px solid ${borderColor}`,
              display: 'flex',
              gap: 16,
              animation: `fadeIn 400ms ease-out ${Math.min(idx * 30, 300)}ms both`,
              transition: 'box-shadow 200ms ease-out',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-md)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-sm)';
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: isUnanswered ? '#CFD8DC' : borderColor,
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {idx + 1}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                <span
                  className="tag"
                  style={{
                    background: typeBg,
                    color: typeColor,
                    padding: '2px 10px',
                    borderRadius: 12,
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {typeLabel[q.type]}
                </span>
                <span className={`tag tag-${q.difficulty}`} style={{ fontSize: 12 }}>
                  {q.difficulty === 'easy' ? '简单' : q.difficulty === 'medium' ? '中等' : '困难'}
                </span>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{q.score}分</span>
                <span
                  style={{
                    marginLeft: 'auto',
                    padding: '3px 12px',
                    borderRadius: 12,
                    fontSize: 12,
                    fontWeight: 600,
                    background: statusBg,
                    color: statusColor,
                  }}
                >
                  {statusText}
                </span>
              </div>

              <div style={{ fontSize: 15, color: 'var(--text-primary)', lineHeight: 1.7, marginBottom: 12 }}>
                {q.content}
              </div>

              {q.options && (
                <div style={{ marginBottom: 12 }}>
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
                          padding: '6px 10px',
                          borderRadius: 6,
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
                          marginBottom: 2,
                        }}
                      >
                        {label}. {opt}
                        {isCorrectOpt && <span style={{ marginLeft: 6 }}>✓</span>}
                        {isUserOpt && !isCorrectOpt && <span style={{ marginLeft: 6 }}>✗</span>}
                      </div>
                    );
                  })}
                </div>
              )}

              {q.type === 'judge' && (
                <div style={{ marginBottom: 12 }}>
                  <div
                    style={{
                      padding: '6px 10px',
                      borderRadius: 6,
                      fontSize: 14,
                      background: q.answer === '正确' ? '#E8F5E9' : 'transparent',
                      color: q.answer === '正确' ? '#2E7D32' : 'var(--text-secondary)',
                    }}
                  >
                    正确 {q.answer === '正确' && '✓'}
                  </div>
                  <div
                    style={{
                      padding: '6px 10px',
                      borderRadius: 6,
                      fontSize: 14,
                      background: q.answer === '错误' ? '#E8F5E9' : 'transparent',
                      color: q.answer === '错误' ? '#2E7D32' : 'var(--text-secondary)',
                    }}
                  >
                    错误 {q.answer === '错误' && '✓'}
                  </div>
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  gap: 16,
                  paddingTop: 12,
                  borderTop: '1px dashed var(--border-color)',
                  fontSize: 14,
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <span style={{ color: 'var(--text-secondary)', marginRight: 4 }}>你的答案：</span>
                  <span style={{ color: statusColor, fontWeight: 600 }}>
                    {formatAnswer(userAns) || '未作答'}
                  </span>
                </div>
                {!isCorrect && (
                  <div>
                    <span style={{ color: 'var(--text-secondary)', marginRight: 4 }}>正确答案：</span>
                    <span style={{ color: COLORS.success, fontWeight: 600 }}>
                      {formatAnswer(q.answer)}
                    </span>
                  </div>
                )}
              </div>

              {q.analysis && (
                <div
                  style={{
                    marginTop: 12,
                    padding: 12,
                    background: 'var(--bg-color)',
                    borderRadius: 6,
                    fontSize: 13,
                    color: 'var(--text-secondary)',
                    lineHeight: 1.7,
                  }}
                >
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>📝 解析：</span>
                  {q.analysis}
                </div>
              )}
            </div>
          </div>
        );
      })}

      <button
        onClick={() => navigate('/question-bank')}
        style={{
          position: 'fixed',
          right: 32,
          bottom: 40,
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'var(--primary-color)',
          color: 'white',
          boxShadow: '0 8px 24px rgba(21, 101, 192, 0.35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 80,
          border: 'none',
          transition: 'all 250ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          padding: 0,
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-6px) scale(1.06)';
          (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 14px 32px rgba(21, 101, 192, 0.45)';
          (e.currentTarget as HTMLButtonElement).style.background = 'var(--primary-hover)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0) scale(1)';
          (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 24px rgba(21, 101, 192, 0.35)';
          (e.currentTarget as HTMLButtonElement).style.background = 'var(--primary-color)';
        }}
        title="返回首页"
        className="floating-home-btn"
      >
        <Home size={24} />
      </button>
    </div>
  );
}
