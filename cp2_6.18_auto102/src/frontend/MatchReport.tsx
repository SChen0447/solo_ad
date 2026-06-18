import React, { useMemo } from 'react';
import type { MatchReport as MatchReportType, JobRequirement } from '../shared/types';

interface MatchReportProps {
  report: MatchReportType;
  job: JobRequirement;
  resumeSkills: string[];
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => Math.round(Math.max(0, Math.min(255, x))).toString(16).padStart(2, '0')).join('');
}

function interpolateColorTriple(percentage: number): string {
  const p = Math.max(0, Math.min(100, percentage));
  const pureRed: [number, number, number] = [239, 68, 68];
  const pureYellow: [number, number, number] = [255, 255, 0];
  const pureGreen: [number, number, number] = [34, 197, 94];

  let r: number, g: number, b: number;

  if (p <= 50) {
    const t = p / 50;
    r = lerp(pureRed[0], pureYellow[0], t);
    g = lerp(pureRed[1], pureYellow[1], t);
    b = lerp(pureRed[2], pureYellow[2], t);
  } else {
    const t = (p - 50) / 50;
    r = lerp(pureYellow[0], pureGreen[0], t);
    g = lerp(pureYellow[1], pureGreen[1], t);
    b = lerp(pureYellow[2], pureGreen[2], t);
  }

  return rgbToHex(r, g, b);
}

const RingProgress: React.FC<{ percentage: number; diameter?: number }> = ({
  percentage,
  diameter = 120,
}) => {
  const strokeWidth = 10;
  const radius = (diameter - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const safePercentage = Math.max(0, Math.min(100, percentage));
  const strokeDasharray = `${circumference} ${circumference}`;
  const strokeDashoffset = circumference - (safePercentage / 100) * circumference;
  const color = interpolateColorTriple(percentage);

  return (
    <svg width={diameter} height={diameter} viewBox={`0 0 ${diameter} ${diameter}`}>
      <g style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}>
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
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          style={{
            transition: 'stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.6s ease',
          }}
        />
      </g>
      <text
        x={diameter / 2}
        y={diameter / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        style={{
          fontSize: 24,
          fontWeight: 700,
          fill: color,
          transition: 'fill 0.6s ease',
        }}
      >
        {percentage}%
      </text>
    </svg>
  );
};

const StarRating: React.FC<{ rating: number }> = ({ rating }) => {
  const fullStars = Math.floor(rating);
  const remainder = rating - fullStars;
  const hasHalf = remainder >= 0.25 && remainder < 0.75;
  const displayFullStars = remainder >= 0.75 ? fullStars + 1 : fullStars;

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
          <svg key={i} width={24} height={24} viewBox="0 0 24 24" fill={fillColor} style={{ transition: 'fill 0.3s ease' }}>
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

  const findMatchingResumeSkill = (jobSkill: string): string | null => {
    const exact = resumeSkills.find(s =>
      s.toLowerCase().replace(/[\s.\-]/g, '') ===
      jobSkill.toLowerCase().replace(/[\s.\-]/g, '')
    );
    if (exact) return exact;

    const fuzzy = resumeSkills.find(s => {
      const normA = s.toLowerCase().replace(/[\s.\-]/g, '');
      const normB = jobSkill.toLowerCase().replace(/[\s.\-]/g, '');
      return normA.includes(normB) || normB.includes(normA);
    });
    return fuzzy || null;
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.jobInfo}>
          <h3 style={styles.jobTitle}>{job.title}</h3>
          <p style={styles.jobDesc}>{job.description}</p>
          <div style={styles.jobMeta}>
            <span style={styles.metaTag}>经验: {job.experience}</span>
            <span style={styles.metaTag}>学历: {job.education}</span>
          </div>
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
            <span style={{ ...styles.headerCell, textAlign: 'right' }}>职位要求</span>
          </div>
          {sortedMatchedSkills.map((item, index) => {
            const matchingSkill = findMatchingResumeSkill(item.skill);
            return (
              <div
                key={`${item.skill}-${item.isPreferred}`}
                style={{
                  ...styles.skillRow,
                  backgroundColor: index % 2 === 0 ? '#ffffff' : '#f9fafb',
                }}
              >
                <div style={styles.skillCell}>
                  {matchingSkill ? (
                    <span style={styles.resumeSkillTag}>{matchingSkill}</span>
                  ) : (
                    <span style={styles.emptyCell}>—</span>
                  )}
                </div>
                <div style={styles.skillCellRight}>
                  {item.matched ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 10 }}>
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 10 }}>
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  )}
                  <span style={{
                    ...styles.jobSkillTag,
                    ...(item.isPreferred ? styles.preferredTag : {}),
                  }}>
                    {item.skill}
                    {item.isPreferred && ' (优先)'}
                  </span>
                </div>
              </div>
            );
          })}
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
    marginBottom: 10,
  },
  jobMeta: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
  },
  metaTag: {
    display: 'inline-block',
    padding: '3px 10px',
    backgroundColor: '#f3f4f6',
    color: '#4b5563',
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 500,
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
    minHeight: 36,
    padding: '6px 24px',
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
    justifyContent: 'flex-end',
  },
  resumeSkillTag: {
    display: 'inline-block',
    padding: '3px 10px',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 500,
    transition: 'transform 0.15s ease',
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
  emptyCell: {
    color: '#d1d5db',
    fontSize: 14,
  },
};

export default MatchReport;
