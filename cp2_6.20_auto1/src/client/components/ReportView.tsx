import React from 'react';
import { ParsedResume, MatchResult } from '../types';
import TimelineView from './TimelineView';
import SkillWordCloud from './SkillWordCloud';

interface ReportViewProps {
  resume: ParsedResume;
  matchResult: MatchResult;
  highlightedSkill?: string | null;
  onSkillHighlight?: (skill: string | null) => void;
}

const ReportView: React.FC<ReportViewProps> = ({
  resume,
  matchResult,
  highlightedSkill,
  onSkillHighlight
}) => {
  const getSkillColor = (score: number) => {
    if (score >= 80) return '#10B981';
    if (score >= 60) return '#3B82F6';
    if (score >= 40) return '#F59E0B';
    if (score >= 20) return '#F97316';
    return '#EF4444';
  };

  const getMatchLevel = (score: number) => {
    if (score >= 80) return { text: '优秀', color: '#10B981' };
    if (score >= 60) return { text: '良好', color: '#3B82F6' };
    if (score >= 40) return { text: '一般', color: '#F59E0B' };
    if (score >= 20) return { text: '较弱', color: '#F97316' };
    return { text: '缺失', color: '#EF4444' };
  };

  const matchedCount = matchResult.skills.filter(s => s.score > 0).length;
  const highMatchCount = matchResult.skills.filter(s => s.score >= 60).length;
  const missingSkills = matchResult.skills.filter(s => s.score === 0);

  const matchLevel = getMatchLevel(matchResult.overallScore);

  return (
    <div className="report-view">
      <div className="report-overview" style={{ animation: 'fadeIn 0.4s ease' }}>
        <h3 className="report-section-title">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18Z"
              stroke="#1E3A5F"
              strokeWidth="2"
            />
            <path
              d="M10 6V10L13 12"
              stroke="#FF6B35"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          匹配度概览 - {matchResult.job.name}
        </h3>

        <div className="overview-cards">
          <div className="overview-card score-card" style={{ animation: 'slideUp 0.5s ease 0.1s both' }}>
            <div className="card-label">综合匹配度</div>
            <div className="score-circle" style={{ background: `conic-gradient(${getSkillColor(matchResult.overallScore)} ${matchResult.overallScore * 3.6}deg, #E8F0FE 0deg)` }}>
              <div className="score-inner">
                <span className="score-number" style={{ color: getSkillColor(matchResult.overallScore) }}>
                  {matchResult.overallScore}
                </span>
                <span className="score-percent">%</span>
              </div>
            </div>
            <div className="match-level" style={{ color: matchLevel.color }}>
              {matchLevel.text}
            </div>
          </div>

          <div className="overview-card" style={{ animation: 'slideUp 0.5s ease 0.2s both' }}>
            <div className="card-icon matched">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="card-info">
              <div className="card-value">{matchedCount}/{matchResult.skills.length}</div>
              <div className="card-label">已匹配技能</div>
            </div>
          </div>

          <div className="overview-card" style={{ animation: 'slideUp 0.5s ease 0.3s both' }}>
            <div className="card-icon excellent">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="card-info">
              <div className="card-value">{highMatchCount}</div>
              <div className="card-label">高匹配技能(≥60%)</div>
            </div>
          </div>

          <div className="overview-card" style={{ animation: 'slideUp 0.5s ease 0.4s both' }}>
            <div className="card-icon missing">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="card-info">
              <div className="card-value">{missingSkills.length}</div>
              <div className="card-label">待补充技能</div>
            </div>
          </div>
        </div>
      </div>

      <div className="report-section" style={{ animation: 'fadeIn 0.4s ease 0.1s both' }}>
        <h3 className="report-section-title">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M16 4H4C3.44772 4 3 4.44772 3 5V15C3 15.5523 3.44772 16 4 16H16C16.5523 16 17 15.5523 17 15V5C17 4.44772 16.5523 4 16 4Z"
              stroke="#1E3A5F"
              strokeWidth="2"
            />
            <path
              d="M7 8H13M7 11H13M7 14H10"
              stroke="#1E3A5F"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          教育经历
          {resume.education.length > 0 && (
            <span className="section-count">{resume.education.length} 段</span>
          )}
        </h3>

        {resume.education.length > 0 ? (
          <div className="education-list">
            {resume.education.map((edu, index) => (
              <div
                key={edu.id}
                className="education-card"
                style={{ animation: `slideInLeft 0.5s ease ${index * 0.1}s both` }}
              >
                <div className="edu-header">
                  <h4 className="edu-school">{edu.school || '未识别学校'}</h4>
                  <span className="edu-date">
                    {edu.startDate || '?'} - {edu.endDate || '至今'}
                  </span>
                </div>
                <div className="edu-details">
                  {edu.degree && (
                    <span className="edu-tag degree">{edu.degree}</span>
                  )}
                  {edu.major && (
                    <span className="edu-tag major">{edu.major}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-tip">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <path
                d="M20 30L7 23L20 16L33 23L20 30Z"
                stroke="#CBD5E0"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M13 25V29"
                stroke="#CBD5E0"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M27 25.5V29.5"
                stroke="#CBD5E0"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            <span>暂未识别到教育经历</span>
          </div>
        )}
      </div>

      <div className="report-section" style={{ animation: 'fadeIn 0.4s ease 0.2s both' }}>
        <h3 className="report-section-title">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M4 4H9V9H4V4Z"
              stroke="#1E3A5F"
              strokeWidth="2"
            />
            <path
              d="M11 4H16V9H11V4Z"
              stroke="#FF6B35"
              strokeWidth="2"
            />
            <path
              d="M4 11H9V16H4V11Z"
              stroke="#FF6B35"
              strokeWidth="2"
            />
            <path
              d="M11 11H16V16H11V11Z"
              stroke="#1E3A5F"
              strokeWidth="2"
            />
          </svg>
          工作技能
          {resume.skills.length > 0 && (
            <span className="section-count">{resume.skills.length} 项</span>
          )}
        </h3>

        {resume.skills.length > 0 ? (
          <div className="skill-table-wrapper">
            <table className="skill-table">
              <thead>
                <tr>
                  <th>技能名称</th>
                  <th>出现次数</th>
                  <th>匹配分数</th>
                  <th>匹配等级</th>
                </tr>
              </thead>
              <tbody>
                {resume.skills.map((skill, index) => {
                  const match = matchResult.skills.find(s => s.skill === skill.name);
                  const score = match?.score ?? 0;
                  const level = getMatchLevel(score);
                  return (
                    <tr key={skill.name} style={{ animation: `fadeIn 0.3s ease ${index * 0.03}s both` }}>
                      <td className="skill-name-cell">
                        <span className="skill-dot" style={{ backgroundColor: getSkillColor(score) }} />
                        {skill.name}
                      </td>
                      <td className="skill-count-cell">
                        <span className="count-badge">{skill.count}</span>
                      </td>
                      <td className="skill-score-cell">
                        <div className="score-bar-wrapper">
                          <div
                            className="score-bar-fill"
                            style={{
                              width: `${score}%`,
                              backgroundColor: getSkillColor(score),
                            }}
                          />
                          <span className="score-bar-text">{score}%</span>
                        </div>
                      </td>
                      <td>
                        <span className="level-tag" style={{ backgroundColor: `${level.color}15`, color: level.color }}>
                          {level.text}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-tip">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <path
                d="M8 8H32V32H8V8Z"
                stroke="#CBD5E0"
                strokeWidth="2"
                strokeDasharray="3 3"
              />
              <path
                d="M14 14H26M14 20H26M14 26H20"
                stroke="#CBD5E0"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            <span>暂未识别到工作技能</span>
          </div>
        )}
      </div>

      <div className="report-section" style={{ animation: 'fadeIn 0.4s ease 0.3s both' }}>
        <h3 className="report-section-title">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M3 5C3 4.44772 3.44772 4 4 4H9L11 6H16C16.5523 6 17 6.44772 17 7V15C17 15.5523 16.5523 16 16 16H4C3.44772 16 3 15.5523 3 15V5Z"
              stroke="#1E3A5F"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <path
              d="M7 10H13"
              stroke="#FF6B35"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M7 13H11"
              stroke="#FF6B35"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          项目经验
          {resume.projects.length > 0 && (
            <span className="section-count">{resume.projects.length} 个</span>
          )}
        </h3>

        {resume.projects.length > 0 ? (
          <div className="project-list">
            {resume.projects.map((project, index) => (
              <div
                key={project.id}
                className="project-card"
                style={{ animation: `slideInLeft 0.5s ease ${index * 0.1}s both` }}
              >
                <div className="project-header">
                  <h4 className="project-name">{project.name || '未命名项目'}</h4>
                  {(project.startDate || project.endDate) && (
                    <span className="project-date">
                      {project.startDate || '?'} - {project.endDate || '至今'}
                    </span>
                  )}
                </div>
                {project.description && (
                  <p className="project-desc">{project.description}</p>
                )}
                {project.skills.length > 0 && (
                  <div className="project-skills">
                    {project.skills.map((sk, i) => (
                      <span key={i} className="project-skill-tag">{sk}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-tip">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <path
                d="M6 12C6 10.8954 6.89543 10 8 10H18L22 14H34C35.1046 14 36 14.8954 36 16V32C36 33.1046 35.1046 34 34 34H8C6.89543 34 6 33.1046 6 32V12Z"
                stroke="#CBD5E0"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <path
                d="M14 20H26"
                stroke="#CBD5E0"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            <span>暂未识别到项目经验</span>
          </div>
        )}
      </div>

      {(resume.education.some(e => e.startDate || e.endDate) || resume.projects.some(p => p.startDate || p.endDate)) && (
        <div className="report-section" style={{ animation: 'fadeIn 0.4s ease 0.35s both' }}>
          <TimelineView education={resume.education} projects={resume.projects} />
        </div>
      )}

      {resume.skills.length > 0 && (
        <div className="report-section" style={{ animation: 'fadeIn 0.4s ease 0.4s both' }}>
          <SkillWordCloud
            skills={resume.skills}
            skillMatches={matchResult.skills}
            highlightedSkill={highlightedSkill}
            onSkillClick={onSkillHighlight}
          />
        </div>
      )}

      <style>{`
        .report-view {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .report-overview {
          background: #fff;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
          transition: all 0.2s ease;
        }

        .report-overview:hover {
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
          transform: translateY(-2px);
        }

        .report-section {
          background: #fff;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
          transition: all 0.2s ease;
        }

        .report-section:hover {
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
          transform: translateY(-2px);
        }

        .report-section-title {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 16px;
          font-weight: 600;
          color: #1E3A5F;
          margin: 0 0 20px 0;
        }

        .section-count {
          margin-left: auto;
          font-size: 13px;
          font-weight: 500;
          color: #718096;
          background: #F1F5F9;
          padding: 4px 12px;
          border-radius: 12px;
        }

        .overview-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 16px;
        }

        .overview-card {
          background: linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%);
          border-radius: 12px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          transition: all 0.2s ease;
        }

        .overview-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
        }

        .score-card {
          background: linear-gradient(135deg, #FFFFFF 0%, #F0F7FF 100%);
        }

        .card-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .card-icon.matched {
          background: #D1FAE5;
          color: #10B981;
        }

        .card-icon.excellent {
          background: #FEF3C7;
          color: #F59E0B;
        }

        .card-icon.missing {
          background: #FEE2E2;
          color: #EF4444;
        }

        .card-info {
          text-align: center;
        }

        .card-value {
          font-size: 24px;
          font-weight: 700;
          color: #1E3A5F;
          line-height: 1.2;
        }

        .card-label {
          font-size: 12px;
          color: #718096;
          margin-top: 4px;
        }

        .score-circle {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }

        .score-inner {
          width: 80px;
          height: 80px;
          background: #fff;
          border-radius: 50%;
          display: flex;
          align-items: baseline;
          justify-content: center;
          gap: 2px;
        }

        .score-number {
          font-size: 32px;
          font-weight: 700;
        }

        .score-percent {
          font-size: 14px;
          color: #718096;
          font-weight: 500;
        }

        .match-level {
          font-size: 14px;
          font-weight: 600;
        }

        .education-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .education-card {
          background: linear-gradient(135deg, #F8FAFC 0%, #F0F7FF 100%);
          border-radius: 12px;
          padding: 16px 20px;
          border-left: 4px solid #1E3A5F;
          transition: all 0.2s ease;
        }

        .education-card:hover {
          transform: translateX(4px);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
        }

        .edu-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 8px;
        }

        .edu-school {
          font-size: 15px;
          font-weight: 600;
          color: #1E3A5F;
          margin: 0;
        }

        .edu-date {
          font-size: 12px;
          color: #FF6B35;
          font-weight: 500;
          white-space: nowrap;
          background: #FFF5F0;
          padding: 4px 10px;
          border-radius: 8px;
        }

        .edu-details {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .edu-tag {
          font-size: 12px;
          padding: 4px 12px;
          border-radius: 8px;
          font-weight: 500;
        }

        .edu-tag.degree {
          background: #E8F0FE;
          color: #1E3A5F;
        }

        .edu-tag.major {
          background: #F0FDF4;
          color: #10B981;
        }

        .skill-table-wrapper {
          overflow-x: auto;
          border-radius: 12px;
          border: 1px solid #E2E8F0;
        }

        .skill-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }

        .skill-table thead {
          background: linear-gradient(135deg, #F1F5F9 0%, #E8F0FE 100%);
        }

        .skill-table th {
          padding: 14px 16px;
          text-align: left;
          font-weight: 600;
          color: #1E3A5F;
          font-size: 13px;
          white-space: nowrap;
        }

        .skill-table td {
          padding: 12px 16px;
          border-top: 1px solid #F1F5F9;
          color: #4A5568;
        }

        .skill-table tbody tr {
          transition: all 0.2s ease;
        }

        .skill-table tbody tr:hover {
          background: #F8FAFC;
        }

        .skill-name-cell {
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 500;
          color: #1A1A2E;
        }

        .skill-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .skill-count-cell {
          width: 100px;
        }

        .count-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 28px;
          height: 24px;
          padding: 0 10px;
          background: #F1F5F9;
          color: #4A5568;
          border-radius: 12px;
          font-weight: 600;
          font-size: 12px;
        }

        .skill-score-cell {
          min-width: 160px;
        }

        .score-bar-wrapper {
          position: relative;
          height: 24px;
          background: #F1F5F9;
          border-radius: 12px;
          overflow: hidden;
        }

        .score-bar-fill {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          border-radius: 12px;
          transition: width 0.4s ease;
        }

        .score-bar-text {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          font-size: 12px;
          font-weight: 600;
          color: #1A1A2E;
        }

        .level-tag {
          display: inline-flex;
          align-items: center;
          padding: 4px 12px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
        }

        .empty-tip {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 40px 20px;
          color: #A0AEC0;
          font-size: 14px;
        }

        .project-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .project-card {
          background: linear-gradient(135deg, #F8FAFC 0%, #FFF9F5 100%);
          border-radius: 12px;
          padding: 18px 20px;
          border-top: 3px solid #FF6B35;
          transition: all 0.2s ease;
        }

        .project-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
        }

        .project-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 10px;
        }

        .project-name {
          font-size: 15px;
          font-weight: 600;
          color: #1E3A5F;
          margin: 0;
        }

        .project-date {
          font-size: 12px;
          color: #FF6B35;
          font-weight: 500;
          white-space: nowrap;
          background: #FFF5F0;
          padding: 4px 10px;
          border-radius: 8px;
        }

        .project-desc {
          font-size: 13px;
          color: #4A5568;
          line-height: 1.7;
          margin: 0 0 12px 0;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .project-skills {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .project-skill-tag {
          font-size: 11px;
          padding: 3px 10px;
          background: #E8F0FE;
          color: #1E3A5F;
          border-radius: 8px;
          font-weight: 500;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default ReportView;
