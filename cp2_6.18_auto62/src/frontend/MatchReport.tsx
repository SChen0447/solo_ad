import type { MatchReport as MatchReportType, JobRequirement } from './types';

interface MatchReportProps {
  report: MatchReportType | null;
  isLoading: boolean;
  job: JobRequirement | undefined;
}

export default function MatchReport({ report, isLoading, job }: MatchReportProps) {
  
  const getColorByPercentage = (percent: number): string => {
    if (percent >= 80) return '#22c55e';
    if (percent >= 60) return '#eab308';
    if (percent >= 40) return '#f97316';
    return '#ef4444';
  };

  const renderCircularProgress = (percentage: number) => {
    const size = 120;
    const strokeWidth = 10;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (percentage / 100) * circumference;
    const color = getColorByPercentage(percentage);

    return (
      <svg width={size} height={size} className="circular-progress">
        <defs>
          <linearGradient id={`gradient-${percentage}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="50%" stopColor="#eab308" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
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
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 0.8s ease, stroke 0.5s ease' }}
        />
        <text
          x={size / 2}
          y={size / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="24"
          fontWeight="700"
          fill="#111827"
        >
          {percentage}%
        </text>
      </svg>
    );
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <svg key={`full-${i}`} width="24" height="24" viewBox="0 0 24 24" fill="#f59e0b">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      );
    }

    if (hasHalfStar) {
      stars.push(
        <svg key="half" width="24" height="24" viewBox="0 0 24 24">
          <defs>
            <linearGradient id="half-gradient">
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="50%" stopColor="#d1d5db" />
            </linearGradient>
          </defs>
          <polygon 
            points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" 
            fill="url(#half-gradient)" 
          />
        </svg>
      );
    }

    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <svg key={`empty-${i}`} width="24" height="24" viewBox="0 0 24 24" fill="#d1d5db">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      );
    }

    return <div className="star-rating">{stars}</div>;
  };

  if (!job) {
    return <div className="report-empty">请选择职位模板</div>;
  }

  if (isLoading) {
    return (
      <div className="report-container">
        <div className="report-loading">
          <div className="spinner"></div>
          <p>正在计算匹配度...</p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="report-container">
        <div className="report-empty">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          <p>上传简历后即可查看匹配报告</p>
        </div>
      </div>
    );
  }

  return (
    <div className="report-container">
      <h3 className="section-title">📊 匹配报告</h3>

      <div className="report-score-section">
        {renderCircularProgress(report.matchPercentage)}
        <div className="score-info">
          <div className="score-label">综合匹配度</div>
          <div className="score-value">{report.overallScore} / 10 分</div>
          {renderStars(report.starRating)}
        </div>
      </div>

      <div className="report-description">
        {report.description}
      </div>

      <div className="skills-comparison">
        <h4 className="sub-title">技能对比</h4>
        
        <div className="skill-list-header">
          <span>简历技能</span>
          <span>职位要求</span>
        </div>
        
        {report.skillsMatch.map((item, index) => (
          <div 
            key={index} 
            className={`skill-row ${index % 2 === 0 ? 'even' : 'odd'}`}
          >
            <div className="skill-col">
              {item.matched ? (
                <>
                  <span className="check-icon">✓</span>
                  <span className="skill-name matched">{item.skill}</span>
                </>
              ) : (
                <span className="skill-name faded">—</span>
              )}
            </div>
            <div className="skill-col right">
              {item.matched ? (
                <>
                  <span className="skill-name matched">{item.skill}</span>
                  <span className="check-icon">✓</span>
                </>
              ) : (
                <>
                  <span className="skill-name missing">{item.skill}</span>
                  <span className="cross-icon">✗</span>
                </>
              )}
              {item.type === 'preferred' && (
                <span className="skill-badge preferred">加分</span>
              )}
              {item.type === 'required' && (
                <span className="skill-badge required">必备</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="match-details">
        <div className="detail-item">
          <span className="detail-label">匹配技能</span>
          <span className="detail-value success">{report.matchedSkills.length} 项</span>
        </div>
        <div className="detail-item">
          <span className="detail-label">缺失技能</span>
          <span className="detail-value danger">{report.missingSkills.length} 项</span>
        </div>
      </div>
    </div>
  );
}
