import React, { useState } from 'react';
import { Skill, SkillMatch } from '../types';

interface SkillWordCloudProps {
  skills: Skill[];
  skillMatches: SkillMatch[];
  onSkillClick?: (skillName: string) => void;
  highlightedSkill?: string | null;
}

const SkillWordCloud: React.FC<SkillWordCloudProps> = ({
  skills,
  skillMatches,
  onSkillClick,
  highlightedSkill
}) => {
  const [hoveredSkill, setHoveredSkill] = useState<string | null>(null);

  if (skills.length === 0) return null;

  const getSkillColor = (score: number) => {
    if (score >= 80) return '#10B981';
    if (score >= 60) return '#1E3A5F';
    if (score >= 40) return '#3B82F6';
    if (score >= 20) return '#F59E0B';
    return '#94A3B8';
  };

  const getFontSize = (score: number, count: number) => {
    const baseSize = 12;
    const scoreWeight = (score / 100) * 10;
    const countWeight = Math.min(count * 1.5, 6);
    return `${baseSize + scoreWeight + countWeight}px`;
  };

  const getSkillMatch = (skillName: string): SkillMatch | undefined => {
    return skillMatches.find(s => s.skill.toLowerCase() === skillName.toLowerCase());
  };

  const maxCount = Math.max(...skills.map(s => s.count), 1);
  const maxScore = Math.max(...skillMatches.map(s => s.score), 1);

  return (
    <div className="skill-word-cloud">
      <h4 className="word-cloud-title">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path
            d="M9 16C12.866 16 16 12.866 16 9C16 5.13401 12.866 2 9 2C5.13401 2 2 5.13401 2 9C2 12.866 5.13401 16 9 16Z"
            stroke="#1E3A5F"
            strokeWidth="1.8"
          />
          <path
            d="M5 9H13"
            stroke="#FF6B35"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M9 5V13"
            stroke="#FF6B35"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
        技能关键词云
        <span className="word-cloud-tip">点击技能可在雷达图中高亮</span>
      </h4>

      <div className="word-cloud-container">
        <div className="word-cloud-inner">
          {[...skills].sort((a, b) => {
            const matchA = getSkillMatch(a.name);
            const matchB = getSkillMatch(b.name);
            return (matchB?.score || 0) - (matchA?.score || 0);
          }).map((skill, index) => {
            const match = getSkillMatch(skill.name);
            const score = match?.score || 0;
            const color = getSkillColor(score);
            const fontSize = getFontSize(score, skill.count);
            const isHovered = hoveredSkill === skill.name;
            const isHighlighted = highlightedSkill === skill.name;

            return (
              <span
                key={skill.name}
                className={`word-cloud-item ${isHighlighted ? 'highlighted' : ''}`}
                style={{
                  fontSize,
                  color,
                  fontWeight: score >= 60 ? 700 : score >= 40 ? 600 : 500,
                  opacity: isHighlighted ? 1 : (hoveredSkill && !isHovered ? 0.4 : 1),
                  animation: `fadeInScale 0.4s ease ${index * 0.02}s both`,
                  animationDelay: `${index * 0.02}s`,
                }}
                onMouseEnter={() => setHoveredSkill(skill.name)}
                onMouseLeave={() => setHoveredSkill(null)}
                onClick={() => onSkillClick?.(skill.name)}
                title={`${skill.name} - 匹配度: ${score}%, 出现: ${skill.count}次`}
              >
                {skill.name}
                {(isHovered || isHighlighted) && (
                  <span className="word-tooltip">
                    <span className="word-tooltip-score" style={{ color }}>{score}分</span>
                    <span className="word-tooltip-count">{skill.count}次</span>
                  </span>
                )}
              </span>
            );
          })}
        </div>

        <div className="word-cloud-legend">
          <div className="legend-title">匹配度图例:</div>
          <div className="legend-scale">
            <span className="legend-label">低</span>
            <div className="legend-bar">
              <div
                className="legend-bar-fill"
                style={{
                  background: `linear-gradient(90deg, ${getSkillColor(0)}, ${getSkillColor(40)}, ${getSkillColor(60)}, ${getSkillColor(80)})`
                }}
              />
            </div>
            <span className="legend-label">高</span>
          </div>
        </div>
      </div>

      <style>{`
        .skill-word-cloud {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .word-cloud-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 15px;
          font-weight: 600;
          color: #1E3A5F;
          margin: 0;
          flex-wrap: wrap;
        }

        .word-cloud-tip {
          font-size: 11px;
          font-weight: 400;
          color: #718096;
          background: #F1F5F9;
          padding: 3px 10px;
          border-radius: 8px;
          margin-left: auto;
        }

        .word-cloud-container {
          background: linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%);
          border-radius: 16px;
          padding: 28px 24px;
          border: 1px solid #E2E8F0;
          transition: all 0.25s ease;
        }

        .word-cloud-container:hover {
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
          transform: translateY(-2px);
        }

        .word-cloud-inner {
          display: flex;
          flex-wrap: wrap;
          gap: 12px 16px;
          justify-content: center;
          align-items: center;
          min-height: 140px;
          padding: 8px 0;
        }

        .word-cloud-item {
          position: relative;
          cursor: pointer;
          transition: all 0.25s ease;
          padding: 4px 8px;
          border-radius: 8px;
          user-select: none;
          transform-origin: center;
        }

        .word-cloud-item:hover {
          transform: scale(1.1);
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          z-index: 2;
        }

        .word-cloud-item.highlighted {
          background: #E8F0FE;
          transform: scale(1.15);
          box-shadow: 0 4px 16px rgba(30, 58, 95, 0.2);
          z-index: 3;
        }

        .word-tooltip {
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%) translateY(-6px);
          background: #1E3A5F;
          padding: 6px 10px;
          border-radius: 8px;
          display: flex;
          gap: 8px;
          white-space: nowrap;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
          animation: fadeIn 0.15s ease;
          z-index: 10;
        }

        .word-tooltip::after {
          content: '';
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          border: 5px solid transparent;
          border-top-color: #1E3A5F;
        }

        .word-tooltip-score {
          font-size: 12px;
          font-weight: 700;
          color: #fff !important;
        }

        .word-tooltip-count {
          font-size: 11px;
          color: #CBD5E0;
        }

        .word-cloud-legend {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          margin-top: 20px;
          padding-top: 16px;
          border-top: 1px dashed #E2E8F0;
        }

        .legend-title {
          font-size: 12px;
          font-weight: 500;
          color: #718096;
        }

        .legend-scale {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .legend-label {
          font-size: 11px;
          color: #94A3B8;
          font-weight: 500;
        }

        .legend-bar {
          width: 160px;
          height: 8px;
          background: #F1F5F9;
          border-radius: 4px;
          overflow: hidden;
        }

        .legend-bar-fill {
          width: 100%;
          height: 100%;
          border-radius: 4px;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-2px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(-6px);
          }
        }

        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: scale(0.6);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @media (max-width: 768px) {
          .word-cloud-tip {
            margin-left: 0;
            margin-top: 4px;
            width: 100%;
            text-align: center;
          }

          .word-cloud-inner {
            gap: 8px 12px;
          }
        }
      `}</style>
    </div>
  );
};

export default SkillWordCloud;
