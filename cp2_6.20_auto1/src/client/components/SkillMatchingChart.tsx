import React, { useState, useEffect, useRef } from 'react';
import { SkillMatch } from '../types';

interface SkillMatchingChartProps {
  skills: SkillMatch[];
  jobName: string;
  overallScore: number;
}

const SkillMatchingChart: React.FC<SkillMatchingChartProps> = ({ skills, jobName, overallScore }) => {
  const [hoveredSkill, setHoveredSkill] = useState<string | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<SkillMatch | null>(null);
  const [rotation, setRotation] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setRotation(prev => prev + 360);
    const timer = setTimeout(() => {
      setSelectedSkill(null);
    }, 400);
    return () => clearTimeout(timer);
  }, [jobName]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const displaySkills = skills.slice(0, 10);
  const size = 360;
  const center = size / 2;
  const radius = size / 2 - 60;
  const levels = 5;

  const getSkillColor = (score: number) => {
    if (score >= 80) return '#10B981';
    if (score >= 60) return '#3B82F6';
    if (score >= 40) return '#F59E0B';
    if (score >= 20) return '#F97316';
    return '#EF4444';
  };

  const getPointPosition = (index: number, score: number) => {
    const angle = (index * 2 * Math.PI) / displaySkills.length - Math.PI / 2;
    const r = (score / 100) * radius;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  const getLabelPosition = (index: number) => {
    const angle = (index * 2 * Math.PI) / displaySkills.length - Math.PI / 2;
    const labelRadius = radius + 30;
    return {
      x: center + labelRadius * Math.cos(angle),
      y: center + labelRadius * Math.sin(angle),
    };
  };

  const handleCopyKeyword = async (keyword: string) => {
    try {
      await navigator.clipboard.writeText(keyword);
      setToast(`已复制: ${keyword}`);
    } catch {
      setToast('复制失败，请手动复制');
    }
  };

  const gridLines = [];
  for (let i = 1; i <= levels; i++) {
    const levelRadius = (i / levels) * radius;
    const points: string[] = [];
    for (let j = 0; j < displaySkills.length; j++) {
      const angle = (j * 2 * Math.PI) / displaySkills.length - Math.PI / 2;
      const x = center + levelRadius * Math.cos(angle);
      const y = center + levelRadius * Math.sin(angle);
      points.push(`${x},${y}`);
    }
    gridLines.push(
      <polygon
        key={`grid-${i}`}
        points={points.join(' ')}
        fill="none"
        stroke="#E2E8F0"
        strokeWidth="1"
      />
    );
  }

  const axisLines = displaySkills.map((_, index) => {
    const pos = getLabelPosition(index);
    return (
      <line
        key={`axis-${index}`}
        x1={center}
        y1={center}
        x2={pos.x}
        y2={pos.y}
        stroke="#E2E8F0"
        strokeWidth="1"
      />
    );
  });

  const areaPoints = displaySkills.map((skill, index) => {
    const pos = getPointPosition(index, skill.score);
    return `${pos.x},${pos.y}`;
  }).join(' ');

  const skillDots = displaySkills.map((skill, index) => {
    const pos = getPointPosition(index, skill.score);
    const isHovered = hoveredSkill === skill.skill;
    const isSelected = selectedSkill?.skill === skill.skill;
    const dotRadius = isHovered || isSelected ? 8 : 5;

    return (
      <g key={`dot-${skill.skill}`}>
        <circle
          cx={pos.x}
          cy={pos.y}
          r={dotRadius + 4}
          fill={getSkillColor(skill.score)}
          fillOpacity="0.3"
          style={{
            transition: 'all 0.2s ease',
          }}
        />
        <circle
          cx={pos.x}
          cy={pos.y}
          r={dotRadius}
          fill={getSkillColor(skill.score)}
          stroke="#fff"
          strokeWidth="2"
          style={{
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={() => setHoveredSkill(skill.skill)}
          onMouseLeave={() => setHoveredSkill(null)}
          onClick={() => setSelectedSkill(isSelected ? null : skill)}
        />
        {isHovered && (
          <g>
            <rect
              x={pos.x - 30}
              y={pos.y - 45}
              width="60"
              height="28"
              rx="6"
              fill="#1E3A5F"
            />
            <text
              x={pos.x}
              y={pos.y - 27}
              textAnchor="middle"
              fill="#fff"
              fontSize="14"
              fontWeight="600"
            >
              {skill.score}分
            </text>
          </g>
        )}
      </g>
    );
  });

  const skillLabels = displaySkills.map((skill, index) => {
    const pos = getLabelPosition(index);
    const isHovered = hoveredSkill === skill.skill;
    const isSelected = selectedSkill?.skill === skill.skill;

    let textAnchor = 'middle';
    if (pos.x < center - 20) textAnchor = 'end';
    if (pos.x > center + 20) textAnchor = 'start';

    return (
      <text
        key={`label-${skill.skill}`}
        x={pos.x}
        y={pos.y}
        textAnchor={textAnchor}
        dominantBaseline="middle"
        fill={isHovered || isSelected ? '#1E3A5F' : '#4A5568'}
        fontSize={isHovered || isSelected ? '14' : '12'}
        fontWeight={isHovered || isSelected ? '700' : '500'}
        style={{
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          transform: `scale(${isHovered || isSelected ? 1.1 : 1})`,
          transformOrigin: `${pos.x}px ${pos.y}px`,
        }}
        onMouseEnter={() => setHoveredSkill(skill.skill)}
        onMouseLeave={() => setHoveredSkill(null)}
        onClick={() => setSelectedSkill(isSelected ? null : skill)}
      >
        {skill.skill}
      </text>
    );
  });

  return (
    <div className="chart-container" ref={chartRef}>
      <div className="chart-header">
        <h3 className="chart-title">技能匹配雷达图</h3>
        <div className="overall-score">
          <span className="score-label">综合匹配度</span>
          <span className="score-value" style={{ color: getSkillColor(overallScore) }}>
            {overallScore}
          </span>
          <span className="score-unit">分</span>
        </div>
      </div>

      <div className="radar-chart-wrapper">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{
            transition: 'transform 0.4s ease',
            transform: `rotate(${rotation % 360}deg)`,
          }}
        >
          <defs>
            <radialGradient id="areaGradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#E8F0FE" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#60A5FA" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#1E3A5F" stopOpacity="0.3" />
            </radialGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {gridLines}
          {axisLines}

          <polygon
            points={areaPoints}
            fill="url(#areaGradient)"
            stroke="#1E3A5F"
            strokeWidth="2"
            filter="url(#glow)"
            style={{
              transition: 'all 0.4s ease',
            }}
          />

          {skillDots}
          {skillLabels}

          <circle
            cx={center}
            cy={center}
            r="4"
            fill="#1E3A5F"
          />
        </svg>
      </div>

      <div className="skill-list">
        <h4 className="list-title">技能匹配详情</h4>
        <div className="skill-tags">
          {skills.map((skill, index) => (
            <div
              key={skill.skill}
              className={`skill-tag ${selectedSkill?.skill === skill.skill ? 'selected' : ''}`}
              style={{
                animation: `slideInLeft 0.4s ease ${index * 0.05}s both`,
                backgroundColor: `${getSkillColor(skill.score)}15`,
                borderColor: `${getSkillColor(skill.score)}50`,
                color: getSkillColor(skill.score),
              }}
              onClick={() => setSelectedSkill(selectedSkill?.skill === skill.skill ? null : skill)}
            >
              <span className="skill-name">{skill.skill}</span>
              <span className="skill-score">{skill.score}%</span>
            </div>
          ))}
        </div>
      </div>

      <div className="skill-score-table-wrapper">
        <h4 className="list-title">技能分数明细</h4>
        <div className="score-table-container">
          <table className="score-table">
            <thead>
              <tr>
                <th style={{ width: '40%' }}>技能名称</th>
                <th style={{ width: '15%' }}>匹配度</th>
                <th style={{ width: '30%' }}>分数进度</th>
                <th style={{ width: '15%' }}>出现次数</th>
              </tr>
            </thead>
            <tbody>
              {[...skills].sort((a, b) => b.score - a.score).map((skill, index) => (
                <tr
                  key={skill.skill}
                  className={selectedSkill?.skill === skill.skill ? 'selected-row' : ''}
                  style={{ animation: `fadeIn 0.3s ease ${index * 0.02}s both` }}
                  onClick={() => setSelectedSkill(selectedSkill?.skill === skill.skill ? null : skill)}
                >
                  <td className="table-skill-name">
                    <span
                      className="skill-indicator"
                      style={{ backgroundColor: getSkillColor(skill.score) }}
                    />
                    {skill.skill}
                  </td>
                  <td className="table-score" style={{ color: getSkillColor(skill.score) }}>
                    <strong>{skill.score}</strong>
                    <span className="score-unit-sm">分</span>
                  </td>
                  <td>
                    <div className="table-progress-bar">
                      <div
                        className="table-progress-fill"
                        style={{
                          width: `${skill.score}%`,
                          background: `linear-gradient(90deg, ${getSkillColor(skill.score)}80, ${getSkillColor(skill.score)})`,
                        }}
                      />
                    </div>
                  </td>
                  <td className="table-count">
                    <span className="count-badge-sm">{skill.count}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedSkill && (
        <div className="skill-detail-panel" style={{ animation: 'expandHeight 0.3s ease forwards' }}>
          <div className="detail-header">
            <h4 style={{ color: getSkillColor(selectedSkill.score) }}>{selectedSkill.skill}</h4>
            <button className="close-btn" onClick={() => setSelectedSkill(null)}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M12 4L4 12M4 4L12 12"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>

          <div className="detail-content">
            <div className="detail-row">
              <span className="detail-label">出现次数</span>
              <span className="detail-value">{selectedSkill.count} 次</span>
            </div>

            {selectedSkill.contexts.length > 0 && (
              <div className="detail-row">
                <span className="detail-label">项目经验片段</span>
                <div className="context-list">
                  {selectedSkill.contexts.map((ctx, i) => (
                    <div key={i} className="context-item">
                      "...{ctx}..."
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedSkill.suggestions && selectedSkill.suggestions.length > 0 && (
              <div className="detail-row">
                <span className="detail-label">建议补充关键词</span>
                <div className="suggestion-list">
                  {selectedSkill.suggestions.map((sug, i) => (
                    <span
                      key={i}
                      className="suggestion-tag"
                      onClick={() => handleCopyKeyword(sug)}
                    >
                      {sug}
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path
                          d="M8 1H3C1.89543 1 1 1.89543 1 3V8H2V3C2 2.44772 2.44772 2 3 2H8V1ZM9 3H6C4.89543 3 4 3.89543 4 5V9C4 10.1046 4.89543 11 6 11H10C11.1046 11 12 10.1046 12 9V6C12 4.89543 11.1046 4 10 4H9V3ZM6 5H10C10.5523 5 11 5.44772 11 6V9C11 9.55228 10.5523 10 10 10H6C5.44772 10 5 9.55228 5 9V6C5 5.44772 5.44772 5 6 5Z"
                          fill="currentColor"
                        />
                      </svg>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {toast && (
        <div className="toast" style={{ animation: 'fadeInOut 2s ease forwards' }}>
          {toast}
        </div>
      )}

      <style>{`
        .chart-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .chart-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .chart-title {
          font-size: 18px;
          font-weight: 600;
          color: #1E3A5F;
          margin: 0;
        }

        .overall-score {
          display: flex;
          align-items: baseline;
          gap: 4px;
        }

        .score-label {
          font-size: 13px;
          color: #718096;
        }

        .score-value {
          font-size: 28px;
          font-weight: 700;
        }

        .score-unit {
          font-size: 14px;
          color: #718096;
        }

        .radar-chart-wrapper {
          display: flex;
          justify-content: center;
          padding: 16px;
          background: #fff;
          border-radius: 16px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
          transition: all 0.2s ease;
        }

        .radar-chart-wrapper:hover {
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
          transform: translateY(-2px);
        }

        .skill-list {
          background: #fff;
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
          transition: all 0.2s ease;
        }

        .skill-list:hover {
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
          transform: translateY(-2px);
        }

        .list-title {
          font-size: 16px;
          font-weight: 600;
          color: #1E3A5F;
          margin: 0 0 16px 0;
        }

        .skill-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .skill-tag {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px;
          border: 1px solid;
          border-radius: 20px;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 13px;
          font-weight: 500;
        }

        .skill-tag:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .skill-tag.selected {
          transform: scale(1.05);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
        }

        .skill-name {
          white-space: nowrap;
        }

        .skill-score {
          font-weight: 700;
        }

        .skill-detail-panel {
          background: #fff;
          border-radius: 16px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
          overflow: hidden;
          height: 0;
          opacity: 0;
        }

        .detail-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          background: linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%);
          border-bottom: 1px solid #E2E8F0;
        }

        .detail-header h4 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
        }

        .close-btn {
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
          color: #718096;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          transition: all 0.2s ease;
        }

        .close-btn:hover {
          background: #E2E8F0;
          color: #1E3A5F;
        }

        .detail-content {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .detail-row {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .detail-label {
          font-size: 13px;
          font-weight: 600;
          color: #4A5568;
        }

        .detail-value {
          font-size: 15px;
          color: #1A1A2E;
          font-weight: 500;
        }

        .context-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .context-item {
          padding: 10px 14px;
          background: #F8FAFC;
          border-radius: 8px;
          font-size: 13px;
          color: #4A5568;
          font-family: 'Courier New', monospace;
          border-left: 3px solid #60A5FA;
        }

        .suggestion-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .suggestion-tag {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: #E8F0FE;
          color: #1E3A5F;
          border-radius: 16px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .suggestion-tag:hover {
          background: #1E3A5F;
          color: #fff;
          transform: translateY(-2px);
        }

        .toast {
          position: fixed;
          bottom: 30px;
          left: 50%;
          transform: translateX(-50%);
          padding: 12px 24px;
          background: #1E3A5F;
          color: #fff;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
          z-index: 1000;
        }

        .skill-score-table-wrapper {
          background: #fff;
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
          transition: all 0.2s ease;
        }

        .skill-score-table-wrapper:hover {
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
          transform: translateY(-2px);
        }

        .score-table-container {
          overflow-x: auto;
          border-radius: 12px;
          border: 1px solid #E2E8F0;
        }

        .score-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }

        .score-table thead {
          background: linear-gradient(135deg, #F1F5F9 0%, #E8F0FE 100%);
        }

        .score-table th {
          padding: 12px 16px;
          text-align: left;
          font-weight: 600;
          color: #1E3A5F;
          font-size: 12px;
          white-space: nowrap;
        }

        .score-table td {
          padding: 10px 16px;
          border-top: 1px solid #F1F5F9;
          color: #4A5568;
          transition: background-color 0.2s ease;
        }

        .score-table tbody tr {
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .score-table tbody tr:hover {
          background: #F8FAFC;
        }

        .score-table tbody tr.selected-row {
          background: #E8F0FE;
        }

        .table-skill-name {
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 500;
          color: #1A1A2E;
        }

        .skill-indicator {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
          box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.5);
        }

        .table-score {
          font-size: 16px;
          display: flex;
          align-items: baseline;
          gap: 2px;
        }

        .table-score strong {
          font-weight: 700;
        }

        .score-unit-sm {
          font-size: 11px;
          font-weight: 500;
          opacity: 0.7;
        }

        .table-progress-bar {
          position: relative;
          height: 16px;
          background: #F1F5F9;
          border-radius: 8px;
          overflow: hidden;
        }

        .table-progress-fill {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          border-radius: 8px;
          transition: width 0.4s ease;
        }

        .table-count {
          text-align: center;
        }

        .count-badge-sm {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 24px;
          height: 22px;
          padding: 0 8px;
          background: #F1F5F9;
          color: #4A5568;
          border-radius: 11px;
          font-weight: 600;
          font-size: 11px;
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

        @keyframes expandHeight {
          from {
            height: 0;
            opacity: 0;
          }
          to {
            height: auto;
            opacity: 1;
          }
        }

        @keyframes fadeInOut {
          0% {
            opacity: 0;
            transform: translate(-50%, 20px);
          }
          10%, 90% {
            opacity: 1;
            transform: translate(-50%, 0);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -20px);
          }
        }
      `}</style>
    </div>
  );
};

export default SkillMatchingChart;
