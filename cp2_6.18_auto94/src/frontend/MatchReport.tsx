import React, { useMemo } from 'react';
import type { MatchReport as MatchReportType, SkillMatch } from '../backend/types';

interface MatchReportProps {
  report: MatchReportType | null;
}

const MatchReport: React.FC<MatchReportProps> = ({ report }) => {
  const ringData = useMemo(() => {
    if (!report) return null;
    const size = 120;
    const strokeWidth = 10;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (report.matchPercentage / 100) * circumference;

    let color: string;
    if (report.matchPercentage >= 70) {
      color = '#22c55e';
    } else if (report.matchPercentage >= 40) {
      color = '#f59e0b';
    } else {
      color = '#ef4444';
    }

    return { size, strokeWidth, radius, circumference, offset, color };
  }, [report]);

  if (!report) {
    return (
      <div className="card">
        <div className="card-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#3b82f6' }}>
            <path d="M9 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-4"></path>
            <polyline points="9 11 12 14 15 11"></polyline>
            <line x1="12" y1="14" x2="12" y2="3"></line>
          </svg>
          匹配报告
        </div>
        <div className="empty-state">
          <div className="empty-state-icon">📊</div>
          请先上传简历并选择职位模板以查看匹配报告
        </div>
      </div>
    );
  }

  const requiredMatches = report.skillMatches.filter(s => !s.isPreferred);
  const preferredMatches = report.skillMatches.filter(s => s.isPreferred);

  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span key={i} className={`star ${i <= report.starRating ? 'star-filled' : 'star-empty'}`}>
          ★
        </span>
      );
    }
    return stars;
  };

  const renderSkillRow = (item: SkillMatch, index: number) => (
    <div className="skill-row" key={`${item.skill}-${index}`}>
      <div className="skill-col">
        <span className={`match-icon ${item.matched ? 'success' : 'error'}`}>
          {item.matched ? '✓' : '✗'}
        </span>
        {item.skill}
        {item.isPreferred && <span className="preferred-badge">加分</span>}
      </div>
      <div className="skill-col">
        <span className={`match-icon ${item.matched ? 'success' : 'error'}`}>
          {item.matched ? '✓' : '✗'}
        </span>
        {item.matched ? '已掌握' : '未掌握'}
      </div>
    </div>
  );

  return (
    <div className="card">
      <div className="card-title">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#3b82f6' }}>
          <path d="M9 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-4"></path>
          <polyline points="9 11 12 14 15 11"></polyline>
          <line x1="12" y1="14" x2="12" y2="3"></line>
        </svg>
        匹配报告
      </div>

      {ringData && (
        <div className="chart-container">
          <svg width={ringData.size} height={ringData.size} className="progress-ring">
            <circle
              cx={ringData.size / 2}
              cy={ringData.size / 2}
              r={ringData.radius}
              fill="none"
              stroke="#f4f4f5"
              strokeWidth={ringData.strokeWidth}
            />
            <circle
              className="progress-ring-circle"
              cx={ringData.size / 2}
              cy={ringData.size / 2}
              r={ringData.radius}
              fill="none"
              stroke={ringData.color}
              strokeWidth={ringData.strokeWidth}
              strokeLinecap="round"
              strokeDasharray={ringData.circumference}
              strokeDashoffset={ringData.offset}
            />
            <text
              x={ringData.size / 2}
              y={ringData.size / 2 - 4}
              textAnchor="middle"
              className="chart-center-text"
            >
              {report.matchPercentage}%
            </text>
            <text
              x={ringData.size / 2}
              y={ringData.size / 2 + 16}
              textAnchor="middle"
              className="chart-center-label"
            >
              匹配度
            </text>
          </svg>
        </div>
      )}

      <div style={{ textAlign: 'center', marginBottom: '16px' }}>
        <div style={{ fontSize: '13px', color: '#71717a', marginBottom: '4px' }}>
          综合评分 ({report.overallScore}/10)
        </div>
        <div className="stars-container" style={{ justifyContent: 'center' }}>
          {renderStars()}
        </div>
      </div>

      <div className="score-summary">{report.summary}</div>

      <div className="section-divider"></div>

      <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#18181b' }}>
        技能对比
      </div>

      {requiredMatches.length > 0 && (
        <>
          <div style={{ fontSize: '12px', color: '#71717a', margin: '12px 0 4px', fontWeight: '500' }}>
            必备技能 ({requiredMatches.filter(s => s.matched).length}/{requiredMatches.length})
          </div>
          <div className="skill-table-header">
            <div className="skill-col">技能名称</div>
            <div className="skill-col">匹配状态</div>
          </div>
          <div style={{ borderRadius: '0 0 8px 8px', overflow: 'hidden' }}>
            {requiredMatches.map((item, i) => renderSkillRow(item, i))}
          </div>
        </>
      )}

      {preferredMatches.length > 0 && (
        <>
          <div style={{ fontSize: '12px', color: '#71717a', margin: '16px 0 4px', fontWeight: '500' }}>
            加分技能 ({preferredMatches.filter(s => s.matched).length}/{preferredMatches.length})
          </div>
          <div className="skill-table-header">
            <div className="skill-col">技能名称</div>
            <div className="skill-col">匹配状态</div>
          </div>
          <div style={{ borderRadius: '0 0 8px 8px', overflow: 'hidden' }}>
            {preferredMatches.map((item, i) => renderSkillRow(item, i))}
          </div>
        </>
      )}

      <div className="section-divider"></div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
          <span style={{ color: '#71717a' }}>工作经验要求</span>
          <span style={{ color: report.experienceMatch ? '#22c55e' : '#ef4444', fontWeight: '500' }}>
            {report.experienceMatch ? '✓ 符合' : '✗ 不足'}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
          <span style={{ color: '#71717a' }}>学历要求</span>
          <span style={{ color: report.educationMatch ? '#22c55e' : '#ef4444', fontWeight: '500' }}>
            {report.educationMatch ? '✓ 符合' : '✗ 不足'}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
          <span style={{ color: '#71717a' }}>语义相似度</span>
          <span style={{ color: '#52525b', fontWeight: '500' }}>
            {(report.semanticSimilarity * 100).toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
};

export default MatchReport;
