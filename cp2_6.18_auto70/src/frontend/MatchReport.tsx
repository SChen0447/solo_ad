import type { MatchReport as MatchReportType } from '../shared/types';

interface MatchReportProps {
  report: MatchReportType;
  isLoading: boolean;
}

export default function MatchReport({ report, isLoading }: MatchReportProps) {
  const percentage = report.matchPercentage;
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - percentage / 100);

  const getProgressColor = (pct: number) => {
    if (pct >= 70) return '#22c55e';
    if (pct >= 40) return '#f59e0b';
    return '#ef4444';
  };

  const progressColor = getProgressColor(percentage);

  const renderStars = (score: number) => {
    const starCount = 5;
    const filledStars = Math.round(score / 2);
    return Array.from({ length: starCount }).map((_, i) => (
      <span
        key={i}
        style={{
          fontSize: 24,
          color: i < filledStars ? '#f59e0b' : '#d1d5db',
          lineHeight: 1,
          margin: '0 2px'
        }}
      >
        ★
      </span>
    ));
  };

  return (
    <div style={{ ...styles.card, ...(isLoading ? styles.loading : {}) }}>
      <h3 style={styles.cardTitle}>📊 匹配评估报告</h3>

      <div style={styles.ringSection}>
        <svg width="120" height="120" viewBox="0 0 120 120" style={styles.ringSvg}>
          <defs>
            <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#22c55e" />
            </linearGradient>
          </defs>
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="10"
          />
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke={progressColor}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            transform="rotate(-90 60 60)"
            style={{ transition: 'stroke-dashoffset 0.6s ease, stroke 0.3s ease' }}
          />
          <text
            x="60"
            y="56"
            textAnchor="middle"
            fontSize="26"
            fontWeight="700"
            fill={progressColor}
          >
            {percentage}%
          </text>
          <text
            x="60"
            y="78"
            textAnchor="middle"
            fontSize="12"
            fill="#6b7280"
          >
            匹配度
          </text>
        </svg>
      </div>

      <div style={styles.scoreSection}>
        <div style={styles.starsRow}>
          {renderStars(report.overallScore)}
          <span style={styles.scoreText}>{report.overallScore}/10 分</span>
        </div>
        <p style={styles.summary}>{report.summary}</p>
      </div>

      <div style={styles.statsRow}>
        <div style={styles.statItem}>
          <div style={{ ...styles.statValue, color: '#22c55e' }}>{report.matchedSkills.length}</div>
          <div style={styles.statLabel}>匹配技能</div>
        </div>
        <div style={styles.statDivider} />
        <div style={styles.statItem}>
          <div style={{ ...styles.statValue, color: '#ef4444' }}>{report.missingSkills.length}</div>
          <div style={styles.statLabel}>缺失技能</div>
        </div>
        <div style={styles.statDivider} />
        <div style={styles.statItem}>
          <div style={{ ...styles.statValue, color: '#3b82f6' }}>{report.skillMatches.length}</div>
          <div style={styles.statLabel}>总技能数</div>
        </div>
      </div>

      <div style={styles.skillsSection}>
        <h4 style={styles.sectionSubtitle}>技能对比清单</h4>
        <div style={styles.skillListHeader}>
          <span style={styles.skillHeaderText}>技能名称</span>
          <span style={styles.skillHeaderStatus}>匹配状态</span>
        </div>
        <div style={styles.skillList}>
          {report.skillMatches.map((item, index) => (
            <div
              key={`${item.skill}-${index}`}
              style={{
                ...styles.skillRow,
                background: index % 2 === 0 ? '#ffffff' : '#f9fafb'
              }}
            >
              <div style={styles.skillNameWrap}>
                <span style={{
                  ...styles.reqBadge,
                  background: item.isRequired ? '#10b981' : '#6366f1'
                }}>
                  {item.isRequired ? '必备' : '加分'}
                </span>
                <span style={styles.skillName}>{item.skill}</span>
              </div>
              <div style={{
                ...styles.skillStatus,
                color: item.matched ? '#22c55e' : '#ef4444'
              }}>
                {item.matched ? '✓ 匹配' : '✗ 缺失'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    width: '100%',
    background: '#fff',
    borderRadius: 12,
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    border: '1px solid #e5e7eb',
    boxSizing: 'border-box'
  },
  loading: {
    opacity: 0.6,
    pointerEvents: 'none'
  },
  cardTitle: {
    margin: '0 0 20px 0',
    fontSize: 18,
    fontWeight: 700,
    color: '#1f2937'
  },
  ringSection: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: 20
  },
  ringSvg: {
    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.06))'
  },
  scoreSection: {
    textAlign: 'center',
    marginBottom: 20
  },
  starsRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12
  },
  scoreText: {
    fontSize: 16,
    fontWeight: 600,
    color: '#1f2937',
    marginLeft: 8
  },
  summary: {
    margin: 0,
    fontSize: 14,
    lineHeight: 1.7,
    color: '#4b5563',
    padding: '0 8px'
  },
  statsRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-around',
    background: '#f9fafb',
    borderRadius: 8,
    padding: '16px 8px',
    marginBottom: 20
  },
  statItem: {
    textAlign: 'center',
    flex: 1
  },
  statValue: {
    fontSize: 24,
    fontWeight: 700,
    marginBottom: 4
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280'
  },
  statDivider: {
    width: 1,
    height: 36,
    background: '#e5e7eb'
  },
  skillsSection: {
    marginTop: 8
  },
  sectionSubtitle: {
    margin: '0 0 12px 0',
    fontSize: 14,
    fontWeight: 600,
    color: '#374151'
  },
  skillListHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 12px',
    background: '#f3f4f6',
    borderRadius: '6px 6px 0 0',
    border: '1px solid #e5e7eb',
    borderBottom: 'none'
  },
  skillHeaderText: {
    fontSize: 12,
    fontWeight: 600,
    color: '#6b7280'
  },
  skillHeaderStatus: {
    fontSize: 12,
    fontWeight: 600,
    color: '#6b7280'
  },
  skillList: {
    border: '1px solid #e5e7eb',
    borderRadius: '0 0 6px 6px',
    overflow: 'hidden'
  },
  skillRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    height: 36,
    padding: '0 12px',
    boxSizing: 'border-box',
    transition: 'background 0.15s ease'
  },
  skillNameWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 8
  },
  reqBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: 4,
    color: '#fff',
    fontSize: 11,
    fontWeight: 500
  },
  skillName: {
    fontSize: 13,
    color: '#1f2937',
    fontWeight: 500
  },
  skillStatus: {
    fontSize: 13,
    fontWeight: 600
  }
};
