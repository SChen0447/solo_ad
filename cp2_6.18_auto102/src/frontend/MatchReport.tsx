import React, { useMemo } from 'react';
import type { MatchReport as MatchReportType, JobRequirement } from '../shared/types';

interface MatchReportProps {
  report: MatchReportType;
  job: JobRequirement;
  resumeSkills: string[];
}

function getProgressColor(percentage: number): string {
  if (percentage >= 80) return '#22c55e';
  if (percentage >= 60) return '#eab308';
  if (percentage >= 40) return '#f97316';
  return '#ef4444';
}

function interpolateColor(percentage: number): string {
  const r1 = 239, g1 = 68, b1 = 68;
  const r2 = 34, g2 = 197, b2 = 94;
  const t = percentage / 100;
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

const RingProgress: React.FC<{ percentage: number; diameter?: number }> = ({
  percentage,
  diameter = 120,
}) => {
  const strokeWidth = 10;
  const radius = (diameter - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  const color = interpolateColor(percentage);

  return (
    <svg width={diameter} height={diameter} style={{ transform: 'rotate(-90deg)' }}>
      <circle
        cx={diameter / 2}
        cy={diameter / 2}
        r={radius}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={diameter / 2}
        cy={diameter / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.5s ease, stroke 0.5s ease' }}
      />
      <text
        x={diameter / 2}
        y={diameter / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        style={{
          transform: `rotate(90deg)`,
          transformOrigin: `${diameter / 2}px ${diameter / 2}px`,
          fontSize: 24,
          fontWeight: 700,
          fill: color,
        }}
      >
        {percentage}%
      </text>
    </svg>
  );
};

const StarRating: React.FC<{ rating: number }> = ({ rating }) => {
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.25 && rating - fullStars < 0.75;
  const displayFullStars = rating - fullStars >= 0.75 ? fullStars + 1 : fullStars;

  return (
    <div style={styles.starsContainer}>
      {[1, 2, 3, 4, 5].map(i => {
        let fillColor = '#d1d5db';
        if (i <= displayFullStars) {
          fillColor = '#f59e0b';
        } else if (i === fullStars + 1 && hasHalf) {
          fillColor = '#f59e0b';
        }
        return (
          <svg key={i} width={24} height={24} viewBox="0 0 24 24" fill={fillColor}>
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        );
      })}
      <span style={styles.ratingText}>{rating.toFixed(1)} / 5</span>
    </div>
  );
};

const MatchReport: React.FC<MatchReportProps> = ({ report, job, resumeSkills }) => {
  const sortedMatchedSkills = useMemo(() => {
    return [...report.matchedSkills].sort((a, b) => {
      if (a.matched !== b.matched) return a.matched ? -1 : 1;
      if (a.isPreferred !== b.isPreferred) return a.isPreferred ? 1 : -1;
      return 0;
    });
  }, [report.matchedSkills]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.jobInfo}>
          <h3 style={styles.jobTitle}>{job.title}</h3>
          <p style={styles.jobDesc}>{job.description}</p>
        </div>
        <RingProgress percentage={report.matchPercentage} />
      </div>

      <div style={styles.scoreSection}>
        <div style={styles.scoreRow}>
          <span style={styles.scoreLabel}>整体评分</span>
          <StarRating rating={report.starRating} />
        </div>
        <p style={styles.summary}>{report.summary}</p>
      </div>

      <div style={styles.skillsSection}>
        <h4 style={styles.sectionTitle}>技能对比</h4>
        <div style={styles.skillsTable}>
          <div style={styles.skillsHeader}>
            <span style={styles.headerCell}>简历技能</span>
            <span style={styles.headerCell}>职位要求</span>
          </div>
          {sortedMatchedSkills.map((item, index) => (
            <div
              key={item.skill}
              style={{
                ...styles.skillRow,
                backgroundColor: index % 2 === 0 ? '#ffffff' : '#f9fafb',
              }}
            >
              <div style={styles.skillCell}>
                {resumeSkills.some(s =>
                  s.toLowerCase().replace(/[\s.\-]/g, '') ===
                  item.skill.toLowerCase().replace(/[\s.\-]/g, '')
                ) && (
                  <span style={styles.resumeSkillTag}>{item.skill}</span>
                )}
                {!resumeSkills.some(s =>
                  s.toLowerCase().replace(/[\s.\-]/g, '') ===
                  item.skill.toLowerCase().replace(/[\s.\-]/g, '')
                ) && resumeSkills.some(s => {
                  const normA = s.toLowerCase().replace(/[\s.\-]/g, '');
                  const normB = item.skill.toLowerCase().replace(/[\s.\-]/g, '');
                  return normA.includes(normB) || normB.includes(normA);
                }) && (
                  <span style={styles.resumeSkillTag}>
                    {resumeSkills.find(s => {
                      const normA = s.toLowerCase().replace(/[\s.\-]/g, '');
                      const normB = item.skill.toLowerCase().replace(/[\s.\-]/g, '');
                      return normA.includes(normB) || normB.includes(normA);
                    })}
                  </span>
                )}
              </div>
              <div style={styles.skillCellRight}>
                <span style={{
                  ...styles.jobSkillTag,
                  ...(item.isPreferred ? styles.preferredTag : {}),
                }}>
                  {item.skill}
                  {item.isPreferred && ' (优先)'}
                </span>
                {item.matched ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    border: '1px solid #e5e7eb',
    marginBottom: 16,
  },
  jobInfo: {
    flex: 1,
    marginRight: 16,
  },
  jobTitle: {
    fontSize: 20,
    fontWeight: 700,
    color: '#111827',
    marginBottom: 8,
  },
  jobDesc: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 1.6,
  },
  scoreSection: {
    padding: '20px 24px',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    border: '1px solid #e5e7eb',
    marginBottom: 16,
  },
  scoreRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  scoreLabel: {
    fontSize: 14,
    fontWeight: 600,
    color: '#374151',
  },
  starsContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    marginLeft: 10,
    fontSize: 14,
    fontWeight: 600,
    color: '#f59e0b',
  },
  summary: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 1.7,
    padding: '12px 16px',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  skillsSection: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    border: '1px solid #e5e7eb',
    overflow: 'hidden',
  },
  sectionTitle: {
    padding: '16px 24px',
    fontSize: 15,
    fontWeight: 700,
    color: '#111827',
    borderBottom: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb',
  },
  skillsTable: {
    width: '100%',
  },
  skillsHeader: {
    display: 'flex',
    padding: '10px 24px',
    backgroundColor: '#f3f4f6',
    borderBottom: '1px solid #e5e7eb',
  },
  headerCell: {
    flex: 1,
    fontSize: 12,
    fontWeight: 600,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  skillRow: {
    display: 'flex',
    alignItems: 'center',
    height: 36,
    padding: '0 24px',
    borderBottom: '1px solid #f3f4f6',
    transition: 'background-color 0.15s ease',
  },
  skillCell: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
  },
  skillCellRight: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  resumeSkillTag: {
    display: 'inline-block',
    padding: '3px 10px',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 500,
  },
  jobSkillTag: {
    fontSize: 13,
    color: '#374151',
    fontWeight: 500,
  },
  preferredTag: {
    color: '#6b7280',
    fontStyle: 'italic',
  },
};

export default MatchReport;
