import React, { useState } from 'react';
import { Education, Project } from '../types';

interface TimelineItem {
  id: string;
  type: 'education' | 'project';
  title: string;
  subtitle?: string;
  startDate: string;
  endDate: string;
  description?: string;
  skills?: string[];
  startYear: number;
  endYear: number;
}

interface TimelineViewProps {
  education: Education[];
  projects: Project[];
}

function parseYear(dateStr: string): number {
  if (!dateStr) return new Date().getFullYear();
  const match = dateStr.match(/(\d{4})/);
  return match ? parseInt(match[1], 10) : new Date().getFullYear();
}

const TimelineView: React.FC<TimelineViewProps> = ({ education, projects }) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const timelineItems: TimelineItem[] = [
    ...education.map(edu => ({
      id: `edu-${edu.id}`,
      type: 'education' as const,
      title: edu.school || '未识别学校',
      subtitle: [edu.degree, edu.major].filter(Boolean).join(' · ') || undefined,
      startDate: edu.startDate || '?',
      endDate: edu.endDate || '至今',
      skills: [],
      startYear: parseYear(edu.startDate),
      endYear: parseYear(edu.endDate) || new Date().getFullYear(),
    })),
    ...projects.map(proj => ({
      id: `proj-${proj.id}`,
      type: 'project' as const,
      title: proj.name || '未命名项目',
      subtitle: proj.description?.slice(0, 50),
      startDate: proj.startDate || '?',
      endDate: proj.endDate || '至今',
      description: proj.description,
      skills: proj.skills,
      startYear: parseYear(proj.startDate),
      endYear: parseYear(proj.endDate) || new Date().getFullYear(),
    }))
  ].filter(item => item.startYear && item.endYear)
   .sort((a, b) => a.startYear - b.startYear);

  if (timelineItems.length === 0) return null;

  const minYear = Math.min(...timelineItems.map(i => i.startYear));
  const maxYear = Math.max(...timelineItems.map(i => i.endYear));
  const yearRange = Math.max(1, maxYear - minYear);

  const years: number[] = [];
  for (let y = minYear; y <= maxYear; y++) {
    years.push(y);
  }

  const getItemPosition = (item: TimelineItem) => {
    const left = ((item.startYear - minYear) / yearRange) * 100;
    const width = Math.max(5, ((item.endYear - item.startYear) / yearRange) * 100);
    return { left: `${left}%`, width: `${width}%` };
  };

  const typeColors: Record<string, { bg: string; border: string; text: string }> = {
    education: { bg: '#E8F0FE', border: '#1E3A5F', text: '#1E3A5F' },
    project: { bg: '#FFF5F0', border: '#FF6B35', text: '#FF6B35' },
  };

  return (
    <div className="timeline-view">
      <h4 className="timeline-title">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path
            d="M9 16C12.866 16 16 12.866 16 9C16 5.13401 12.866 2 9 2C5.13401 2 2 5.13401 2 9C2 12.866 5.13401 16 9 16Z"
            stroke="#1E3A5F"
            strokeWidth="1.8"
          />
          <path
            d="M9 5V9L12 11"
            stroke="#FF6B35"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        职业发展时间轴
      </h4>

      <div className="timeline-container">
        <div className="timeline-years">
          {years.map(year => (
            <div key={year} className="timeline-year-label">
              {year}
            </div>
          ))}
        </div>

        <div className="timeline-axis-wrapper">
          <div className="timeline-axis">
            <div className="timeline-axis-line" />
            {years.map((year, i) => (
              <div
                key={year}
                className="timeline-axis-tick"
                style={{ left: `${(i / (years.length - 1)) * 100}%` }}
              />
            ))}

            <svg
              className="timeline-arrow"
              viewBox="0 0 20 20"
              style={{ right: '-8px', top: '50%', transform: 'translateY(-50%)' }}
            >
              <path
                d="M5 15L15 10L5 5"
                stroke="#CBD5E0"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          </div>

          <div className="timeline-items">
            {timelineItems.map((item, index) => {
              const pos = getItemPosition(item);
              const colors = typeColors[item.type];
              const isHovered = hoveredId === item.id;
              const isAbove = index % 2 === 0;

              return (
                <div
                  key={item.id}
                  className={`timeline-item-wrapper ${isHovered ? 'hovered' : ''}`}
                  style={{
                    left: pos.left,
                    width: pos.width,
                  }}
                  onMouseEnter={() => setHoveredId(item.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  <div className={`timeline-item ${isAbove ? 'above' : 'below'}`}>
                    <div
                      className="timeline-node"
                      style={{
                        backgroundColor: colors.bg,
                        borderColor: colors.border,
                      }}
                    >
                      {item.type === 'education' ? (
                        <svg width="14" height="14" viewBox="0 0 14 14" fill={colors.text}>
                          <path d="M7 10.5L2.5 8L7 5.5L11.5 8L7 10.5Z" />
                          <path d="M4.5 9V11.5" stroke={colors.text} strokeWidth="1.5" />
                          <path d="M9.5 9.3V11.8" stroke={colors.text} strokeWidth="1.5" />
                        </svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path
                            d="M2 4C2 3.44772 2.44772 3 3 3H6L7 4H12C12.5523 4 13 4.44772 13 5V11C13 11.5523 12.5523 12 12 12H3C2.44772 12 2 11.5523 2 11V4Z"
                            fill={colors.bg}
                            stroke={colors.text}
                            strokeWidth="1.5"
                          />
                        </svg>
                      )}
                    </div>

                    <div
                      className={`timeline-node-line ${isAbove ? 'above' : 'below'}`}
                      style={{ backgroundColor: colors.border }}
                    />

                    <div
                      className={`timeline-card ${isAbove ? 'above' : 'below'}`}
                      style={{
                        borderColor: colors.border,
                        borderTop: `3px solid ${colors.border}`,
                        animation: `fadeIn 0.4s ease ${index * 0.08}s both`,
                      }}
                    >
                      <div className="timeline-card-header">
                        <span className="timeline-type-badge" style={{ backgroundColor: colors.bg, color: colors.text }}>
                          {item.type === 'education' ? '教育' : '项目'}
                        </span>
                        <span className="timeline-card-date">
                          {item.startDate} - {item.endDate}
                        </span>
                      </div>
                      <h5 className="timeline-card-title">{item.title}</h5>
                      {item.subtitle && (
                        <p className="timeline-card-subtitle">{item.subtitle}</p>
                      )}
                      {item.skills && item.skills.length > 0 && (
                        <div className="timeline-card-skills">
                          {item.skills.slice(0, 3).map((sk, i) => (
                            <span key={i} className="timeline-skill-tag">{sk}</span>
                          ))}
                          {item.skills.length > 3 && (
                            <span className="timeline-skill-more">+{item.skills.length - 3}</span>
                          )}
                        </div>
                      )}
                    </div>

                    {isHovered && item.description && (
                      <div className={`timeline-tooltip ${isAbove ? 'below' : 'above'}`}>
                        <div className="tooltip-arrow" />
                        <p className="tooltip-text">{item.description}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="timeline-legend">
          <div className="legend-item">
            <span className="legend-dot" style={{ backgroundColor: '#1E3A5F' }} />
            <span>教育经历</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot" style={{ backgroundColor: '#FF6B35' }} />
            <span>项目经验</span>
          </div>
        </div>
      </div>

      <style>{`
        .timeline-view {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .timeline-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 15px;
          font-weight: 600;
          color: #1E3A5F;
          margin: 0;
        }

        .timeline-container {
          background: linear-gradient(135deg, #F8FAFC 0%, #F0F5FF 100%);
          border-radius: 16px;
          padding: 24px 20px 20px;
          overflow-x: auto;
          min-height: 280px;
        }

        .timeline-years {
          display: flex;
          justify-content: space-between;
          padding: 0 8px 12px;
          margin-bottom: 8px;
        }

        .timeline-year-label {
          font-size: 12px;
          font-weight: 600;
          color: #718096;
          min-width: 40px;
          text-align: center;
        }

        .timeline-axis-wrapper {
          position: relative;
          padding: 80px 16px;
        }

        .timeline-axis {
          position: relative;
          height: 2px;
        }

        .timeline-axis-line {
          position: absolute;
          left: 0;
          right: 0;
          top: 50%;
          height: 2px;
          background: linear-gradient(90deg, #CBD5E0 0%, #1E3A5F 50%, #FF6B35 100%);
          transform: translateY(-50%);
          border-radius: 1px;
        }

        .timeline-axis-tick {
          position: absolute;
          top: 50%;
          width: 1px;
          height: 8px;
          background: #CBD5E0;
          transform: translate(-50%, -50%);
        }

        .timeline-arrow {
          position: absolute;
          width: 20px;
          height: 20px;
        }

        .timeline-items {
          position: absolute;
          top: 0;
          left: 16px;
          right: 16px;
          bottom: 0;
          pointer-events: none;
        }

        .timeline-item-wrapper {
          position: absolute;
          top: 0;
          height: 100%;
          min-width: 80px;
          pointer-events: auto;
        }

        .timeline-item {
          position: relative;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .timeline-node {
          position: absolute;
          top: 50%;
          left: 0;
          transform: translateY(-50%);
          width: 28px;
          height: 28px;
          border-radius: 50%;
          border: 2px solid;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2;
          transition: all 0.25s ease;
          cursor: pointer;
        }

        .timeline-item-wrapper.hovered .timeline-node {
          transform: translateY(-50%) scale(1.2);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
        }

        .timeline-node-line {
          position: absolute;
          left: 14px;
          width: 2px;
          z-index: 1;
        }

        .timeline-node-line.above {
          top: 0;
          bottom: 50%;
        }

        .timeline-node-line.below {
          top: 50%;
          bottom: 0;
        }

        .timeline-card {
          position: absolute;
          left: 0;
          right: -40px;
          background: #fff;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          padding: 12px 14px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
          transition: all 0.25s ease;
          z-index: 3;
        }

        .timeline-card.above {
          bottom: calc(50% + 20px);
        }

        .timeline-card.below {
          top: calc(50% + 20px);
        }

        .timeline-item-wrapper.hovered .timeline-card {
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
          transform: translateY(-2px);
        }

        .timeline-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 6px;
        }

        .timeline-type-badge {
          font-size: 10px;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 6px;
        }

        .timeline-card-date {
          font-size: 10px;
          color: #718096;
          font-weight: 500;
          white-space: nowrap;
        }

        .timeline-card-title {
          font-size: 13px;
          font-weight: 600;
          color: #1A1A2E;
          margin: 0 0 4px 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .timeline-card-subtitle {
          font-size: 11px;
          color: #718096;
          margin: 0 0 6px 0;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          line-height: 1.4;
        }

        .timeline-card-skills {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
        }

        .timeline-skill-tag {
          font-size: 10px;
          padding: 2px 6px;
          background: #E8F0FE;
          color: #1E3A5F;
          border-radius: 4px;
          font-weight: 500;
        }

        .timeline-skill-more {
          font-size: 10px;
          padding: 2px 6px;
          background: #F1F5F9;
          color: #718096;
          border-radius: 4px;
          font-weight: 500;
        }

        .timeline-tooltip {
          position: absolute;
          left: 0;
          right: -40px;
          background: #1E3A5F;
          color: #fff;
          border-radius: 8px;
          padding: 10px 12px;
          z-index: 10;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
          animation: fadeIn 0.2s ease;
        }

        .timeline-tooltip.above {
          bottom: calc(50% + 20px);
          transform: translateY(-8px);
        }

        .timeline-tooltip.below {
          top: calc(50% + 20px);
          transform: translateY(8px);
        }

        .tooltip-arrow {
          position: absolute;
          width: 8px;
          height: 8px;
          background: #1E3A5F;
          transform: rotate(45deg);
          left: 10px;
        }

        .timeline-tooltip.above .tooltip-arrow {
          bottom: -4px;
        }

        .timeline-tooltip.below .tooltip-arrow {
          top: -4px;
        }

        .tooltip-text {
          font-size: 12px;
          line-height: 1.5;
          margin: 0;
          display: -webkit-box;
          -webkit-line-clamp: 4;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .timeline-legend {
          display: flex;
          gap: 20px;
          margin-top: 16px;
          justify-content: center;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: #4A5568;
        }

        .legend-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 768px) {
          .timeline-container {
            min-width: 500px;
          }

          .timeline-card-title {
            font-size: 12px;
          }
        }
      `}</style>
    </div>
  );
};

export default TimelineView;
