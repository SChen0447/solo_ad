import React from 'react';
import type { MatchReport as MatchReportType, JobRequirement } from '../types';

interface MatchReportProps {
  report: MatchReportType;
  job: JobRequirement;
}

const MatchReport: React.FC<MatchReportProps> = ({ report, job }) => {
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (report.matchPercentage / 100) * circumference;

  const getColor = (percent: number) => {
    if (percent >= 70) return '#22c55e';
    if (percent >= 40) return '#f59e0b';
    return '#ef4444';
  };

  const color = getColor(report.matchPercentage);

  return (
    <div style={{
      background: '#ffffff',
      borderRadius: 12,
      padding: 24,
      border: '1px solid #e5e7eb',
      boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
    }} className="fade-in">
      <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20, color: '#111827' }}>
        匹配报告 - {job.title}
      </h3>

      <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 24 }}>
        <div style={{ position: 'relative', width: 120, height: 120, flexShrink: 0 }}>
          <svg width="120" height="120" viewBox="0 0 120 120">
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
              stroke={color}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              transform="rotate(-90 60 60)"
              style={{ transition: 'stroke-dashoffset 0.6s ease' }}
            />
          </svg>
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <span style={{ fontSize: 26, fontWeight: 700, color }}>
              {report.matchPercentage}%
            </span>
            <span style={{ fontSize: 11, color: '#6b7280' }}>匹配度</span>
          </div>
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} filled={i < report.starRating} size={24} />
            ))}
          </div>
          <div style={{ fontSize: 14, color: '#4b5563', lineHeight: 1.6 }}>
            {report.summary}
          </div>
        </div>
      </div>

      <div style={{
        display: 'flex',
        gap: 12,
        marginBottom: 20,
        padding: 12,
        background: '#f9fafb',
        borderRadius: 8,
      }}>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>经验匹配</div>
          <div style={{
            fontSize: 14,
            fontWeight: 600,
            color: report.experienceMatch ? '#22c55e' : '#ef4444',
          }}>
            {report.experienceMatch ? '✓ 符合' : '✗ 不足'}
          </div>
        </div>
        <div style={{ width: 1, background: '#e5e7eb' }} />
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>学历匹配</div>
          <div style={{
            fontSize: 14,
            fontWeight: 600,
            color: report.educationMatch ? '#22c55e' : '#ef4444',
          }}>
            {report.educationMatch ? '✓ 符合' : '✗ 不足'}
          </div>
        </div>
        <div style={{ width: 1, background: '#e5e7eb' }} />
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>综合评分</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>
            {report.overallScore.toFixed(1)} / 10
          </div>
        </div>
      </div>

      <div>
        <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#111827' }}>
          技能对比
        </h4>
        <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid #e5e7eb' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 40px',
            padding: '10px 14px',
            background: '#f3f4f6',
            fontSize: 12,
            fontWeight: 600,
            color: '#6b7280',
          }}>
            <span>简历技能</span>
            <span>职位要求</span>
            <span style={{ textAlign: 'center' }}>状态</span>
          </div>
          {report.skillMatches.map((item, index) => (
            <div
              key={index}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 40px',
                padding: '0 14px',
                height: 36,
                alignItems: 'center',
                background: index % 2 === 0 ? '#ffffff' : '#f9fafb',
                borderTop: index === 0 ? 'none' : '1px solid #e5e7eb',
                fontSize: 13,
              }}
            >
              <span style={{ color: item.matched ? '#16a34a' : '#9ca3af' }}>
                {item.matched ? item.skill : '—'}
              </span>
              <span style={{ color: '#374151' }}>
                {item.skill}
                {item.type === 'preferred' && (
                  <span style={{
                    fontSize: 11,
                    color: '#6b7280',
                    marginLeft: 6,
                    padding: '1px 6px',
                    background: '#f3f4f6',
                    borderRadius: 4,
                  }}>优先</span>
                )}
              </span>
              <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 16 }}>
                {item.matched ? (
                  <span style={{ color: '#22c55e' }}>✓</span>
                ) : (
                  <span style={{ color: '#ef4444' }}>✗</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const Star: React.FC<{ filled: boolean; size?: number }> = ({ filled, size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={filled ? '#f59e0b' : 'none'}
    stroke={filled ? '#f59e0b' : '#d1d5db'}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

export default MatchReport;
