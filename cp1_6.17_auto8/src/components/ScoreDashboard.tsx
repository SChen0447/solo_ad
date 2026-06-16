import { Scale, FileCheck, PenTool, Award, TrendingUp } from 'lucide-react';
import type { ComplianceScore } from '../types';

interface ScoreDashboardProps {
  score: ComplianceScore;
}

export default function ScoreDashboard({ score }: ScoreDashboardProps) {
  const getScoreColor = (value: number) => {
    if (value >= 80) return '#00B42A';
    if (value >= 60) return '#FF7D00';
    return '#F53F3F';
  };

  const getScoreLabel = (value: number) => {
    if (value >= 90) return '优秀';
    if (value >= 80) return '良好';
    if (value >= 70) return '中等';
    if (value >= 60) return '及格';
    return '较差';
  };

  const CircularProgress = ({
    value,
    label,
    icon: Icon,
    description
  }: {
    value: number;
    label: string;
    icon: React.ElementType;
    description: string;
  }) => {
    const radius = 60;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (value / 100) * circumference;
    const color = getScoreColor(value);

    return (
      <div className="circular-progress-item fade-in">
        <div className="circular-progress-wrapper">
          <svg width="160" height="160" viewBox="0 0 160 160">
            <defs>
              <linearGradient id={`gradient-${label}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={color} stopOpacity="1" />
                <stop offset="100%" stopColor={color} stopOpacity="0.6" />
              </linearGradient>
            </defs>
            <circle
              cx="80"
              cy="80"
              r={radius}
              fill="none"
              stroke="var(--border)"
              strokeWidth="8"
            />
            <circle
              cx="80"
              cy="80"
              r={radius}
              fill="none"
              stroke={`url(#gradient-${label})`}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              transform="rotate(-90 80 80)"
              style={{
                transition: 'stroke-dashoffset 1s ease-out',
                animation: 'progressFill 1.2s ease-out'
              }}
            />
          </svg>
          <div className="circular-progress-content">
            <div className="progress-icon">
              <Icon size={20} style={{ color }} />
            </div>
            <div className="progress-value" style={{ color }}>
              {value}
            </div>
            <div className="progress-label">{label}</div>
          </div>
        </div>
        <p className="progress-description">{description}</p>
      </div>
    );
  };

  const dimensions = [
    {
      key: 'legalBasis',
      label: '法律依据',
      value: score.legalBasis,
      icon: Scale,
      description: score.details.legalBasis
    },
    {
      key: 'fairness',
      label: '条款公平性',
      value: score.fairness,
      icon: FileCheck,
      description: score.details.fairness
    },
    {
      key: 'precision',
      label: '用词精准度',
      value: score.precision,
      icon: PenTool,
      description: score.details.precision
    }
  ];

  const totalColor = getScoreColor(score.total);
  const totalLabel = getScoreLabel(score.total);

  return (
    <div className="score-dashboard">
      <div className="score-total-card fade-in">
        <div className="score-total-header">
          <Award size={28} style={{ color: totalColor }} />
          <h3>综合合规评分</h3>
        </div>
        <div className="score-total-content">
          <div className="score-total-value" style={{ color: totalColor }}>
            {score.total}
            <span className="score-total-max">/100</span>
          </div>
          <div className="score-total-label" style={{ color: totalColor }}>
            {totalLabel}
          </div>
          <div className="score-total-bar">
            <div
              className="score-total-bar-fill"
              style={{
                width: `${score.total}%`,
                background: `linear-gradient(90deg, ${totalColor} 0%, ${totalColor}aa 100%)`
              }}
            />
          </div>
        </div>

        <div className="score-summary">
          <div className="summary-item">
            <TrendingUp size={16} className="summary-icon" />
            <span className="summary-label">风险等级</span>
            <span className={`summary-value ${score.total < 60 ? 'danger' : score.total < 80 ? 'warning' : 'success'}`}>
              {score.total < 60 ? '高风险' : score.total < 80 ? '中风险' : '低风险'}
            </span>
          </div>
        </div>
      </div>

      <div className="score-dimensions">
        {dimensions.map((dim) => (
          <CircularProgress
            key={dim.key}
            value={dim.value}
            label={dim.label}
            icon={dim.icon}
            description={dim.description}
          />
        ))}
      </div>

      <div className="score-suggestions fade-in">
        <h4>优化建议</h4>
        <ul>
          {score.legalBasis < 80 && (
            <li>建议补充相关法律依据的明确引用，增强条款合法性。</li>
          )}
          {score.fairness < 80 && (
            <li>条款存在不公平表述，建议调整双方权利义务的对等性。</li>
          )}
          {score.precision < 80 && (
            <li>部分条款表述模糊，建议使用更明确、具体的措辞。</li>
          )}
          {score.total >= 80 && (
            <li>合同整体合规性良好，建议定期审查更新。</li>
          )}
        </ul>
      </div>

      <style>{`
        .score-dashboard {
          display: flex;
          flex-direction: column;
          gap: 20px;
          padding: 20px 24px;
          height: 100%;
          overflow-y: auto;
        }

        .score-total-card {
          background: linear-gradient(135deg, rgba(22, 93, 255, 0.08) 0%, rgba(22, 93, 255, 0.02) 100%);
          border: 1px solid rgba(22, 93, 255, 0.15);
          border-radius: 12px;
          padding: 20px;
        }

        .score-total-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 16px;
        }

        .score-total-header h3 {
          font-size: 16px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .score-total-content {
          text-align: center;
          margin-bottom: 16px;
        }

        .score-total-value {
          font-size: 48px;
          font-weight: 700;
          line-height: 1.2;
          font-family: 'Noto Sans SC', sans-serif;
        }

        .score-total-max {
          font-size: 20px;
          color: var(--text-tertiary);
          font-weight: 500;
        }

        .score-total-label {
          font-size: 14px;
          font-weight: 600;
          margin-top: 4px;
        }

        .score-total-bar {
          height: 8px;
          background: var(--bg-secondary);
          border-radius: 4px;
          overflow: hidden;
          margin-top: 16px;
        }

        .score-total-bar-fill {
          height: 100%;
          border-radius: 4px;
          transition: width 1s ease-out;
        }

        .score-summary {
          display: flex;
          justify-content: center;
          padding-top: 16px;
          border-top: 1px solid rgba(22, 93, 255, 0.1);
        }

        .summary-item {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .summary-icon {
          color: var(--text-secondary);
        }

        .summary-label {
          font-size: 13px;
          color: var(--text-secondary);
        }

        .summary-value {
          font-size: 13px;
          font-weight: 600;
        }

        .summary-value.danger {
          color: var(--danger);
        }

        .summary-value.warning {
          color: var(--warning);
        }

        .summary-value.success {
          color: var(--success);
        }

        .score-dimensions {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .circular-progress-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          padding: 16px;
          background: var(--bg-primary);
          border-radius: 12px;
          box-shadow: var(--shadow-sm);
        }

        .circular-progress-wrapper {
          position: relative;
          width: 160px;
          height: 160px;
        }

        .circular-progress-content {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
        }

        .progress-icon {
          opacity: 0.8;
        }

        .progress-value {
          font-size: 32px;
          font-weight: 700;
          line-height: 1.2;
        }

        .progress-label {
          font-size: 12px;
          color: var(--text-secondary);
          font-weight: 500;
        }

        .progress-description {
          font-size: 12px;
          color: var(--text-tertiary);
          text-align: center;
          line-height: 1.6;
          padding: 0 8px;
        }

        .score-suggestions {
          background: var(--bg-primary);
          border-radius: 12px;
          padding: 16px 20px;
          box-shadow: var(--shadow-sm);
        }

        .score-suggestions h4 {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .score-suggestions h4::before {
          content: '';
          width: 4px;
          height: 16px;
          background: var(--primary);
          border-radius: 2px;
        }

        .score-suggestions ul {
          list-style: none;
          padding: 0;
        }

        .score-suggestions li {
          position: relative;
          padding-left: 20px;
          font-size: 12px;
          color: var(--text-secondary);
          line-height: 1.7;
          margin-bottom: 8px;
        }

        .score-suggestions li::before {
          content: '•';
          position: absolute;
          left: 8px;
          color: var(--primary);
          font-weight: 600;
        }

        .score-suggestions li:last-child {
          margin-bottom: 0;
        }
      `}</style>
    </div>
  );
}
