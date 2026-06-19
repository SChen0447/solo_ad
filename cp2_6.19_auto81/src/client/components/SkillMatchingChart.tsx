import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  Radar, Target, TrendingUp, FileText, ClipboardCopy,
  Lightbulb, Search
} from 'lucide-react';
import type { MatchResult, ParsedResume, SkillMatch } from '../../types';

interface SkillMatchingChartProps {
  matchResult: MatchResult | null;
  parsedResume: ParsedResume | null;
  isLoading: boolean;
  isSwitching: boolean;
  onCopyKeyword: (keyword: string) => void;
}

const RADAR_SIZE = 380;
const CENTER = RADAR_SIZE / 2;
const MAX_RADIUS = 140;
const LEVELS = 5;

const getScoreColor = (score: number): string => {
  const clamped = Math.max(0, Math.min(100, score));
  const t = clamped / 100;
  const r = Math.round(239 * (1 - t) + 16 * t);
  const g = Math.round(68 * (1 - t) + 185 * t);
  const b = Math.round(68 * (1 - t) + 129 * t);
  return `rgb(${r}, ${g}, ${b})`;
};

const polarToCartesian = (cx: number, cy: number, radius: number, angleDeg: number) => {
  const angleRad = (angleDeg - 90) * Math.PI / 180;
  return {
    x: cx + radius * Math.cos(angleRad),
    y: cy + radius * Math.sin(angleRad),
  };
};

const SkillMatchingChart: React.FC<SkillMatchingChartProps> = ({
  matchResult, parsedResume, isLoading, isSwitching, onCopyKeyword
}) => {
  const [hoveredSkill, setHoveredSkill] = useState<string | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<SkillMatch | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const hasData = matchResult !== null;

  const skills = useMemo(() => {
    if (!matchResult) return [];
    return matchResult.skills;
  }, [matchResult]);

  const overallScore = matchResult?.overallScore ?? 0;

  const radarPoints = useMemo(() => {
    const result: {
      skill: SkillMatch;
      angle: number;
      outer: { x: number; y: number };
      point: { x: number; y: number };
    }[] = [];

    skills.forEach((skill, idx) => {
      const angle = (360 / Math.max(skills.length, 3)) * idx;
      const scoreRatio = skill.score / 100;
      const radius = MAX_RADIUS * scoreRatio;
      result.push({
        skill,
        angle,
        outer: polarToCartesian(CENTER, CENTER, MAX_RADIUS + 22, angle),
        point: polarToCartesian(CENTER, CENTER, radius, angle),
      });
    });

    return result;
  }, [skills]);

  const areaPath = useMemo(() => {
    if (radarPoints.length === 0) return '';
    const pts = radarPoints.map(p => `${p.point.x},${p.point.y}`);
    return `M${pts.join(' L')} Z`;
  }, [radarPoints]);

  const gridPolygons = useMemo(() => {
    const polys: { d: string; r: number }[] = [];
    const count = Math.max(skills.length, 3);
    for (let lv = LEVELS; lv >= 1; lv--) {
      const r = (MAX_RADIUS / LEVELS) * lv;
      const pts: string[] = [];
      for (let i = 0; i < count; i++) {
        const angle = (360 / count) * i;
        const { x, y } = polarToCartesian(CENTER, CENTER, r, angle);
        pts.push(`${x},${y}`);
      }
      polys.push({ d: `M${pts.join(' L')} Z`, r });
    }
    return polys;
  }, [skills.length]);

  const axisLines = useMemo(() => {
    const count = Math.max(skills.length, 3);
    return Array.from({ length: count }, (_, i) => {
      const angle = (360 / count) * i;
      const end = polarToCartesian(CENTER, CENTER, MAX_RADIUS, angle);
      return { x1: CENTER, y1: CENTER, x2: end.x, y2: end.y };
    });
  }, [skills.length]);

  const handlePointHover = useCallback((e: React.MouseEvent, skill: SkillMatch) => {
    setHoveredSkill(skill.skill);
    if (wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      setTooltip({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top - 45,
        text: `${skill.skill}: ${skill.score}分`,
      });
    }
  }, []);

  const handlePointLeave = useCallback(() => {
    setHoveredSkill(null);
    setTooltip(null);
  }, []);

  const handlePointClick = useCallback((skill: SkillMatch) => {
    setSelectedSkill(prev => prev?.skill === skill.skill ? null : skill);
  }, []);

  const scoreColor = getScoreColor(overallScore);
  const ringCircumference = 2 * Math.PI * 44;
  const ringOffset = ringCircumference * (1 - overallScore / 100);

  const scoreBreakdown = useMemo(() => {
    if (!matchResult) return { good: 0, mid: 0, low: 0 };
    let good = 0, mid = 0, low = 0;
    matchResult.skills.forEach(s => {
      if (s.score >= 70) good++;
      else if (s.score >= 40) mid++;
      else low++;
    });
    return { good, mid, low };
  }, [matchResult]);

  return (
    <>
      <div className="card animate-fadeIn">
        <h2 className="card-title">
          <Target className="card-title-icon" size={18} />
          技能匹配分析
        </h2>

        {!hasData ? (
          <div className="empty-state">
            <Radar className="empty-state-icon" strokeWidth={1.2} />
            <div className="empty-state-title">暂无匹配数据</div>
            <div className="empty-state-text">请先上传简历，系统将自动分析技能匹配度</div>
          </div>
        ) : (
          <>
            <div className="score-overview">
              <div className="overall-score-wrap">
                <div className="overall-score-ring">
                  <svg viewBox="0 0 100 100">
                    <circle className="ring-bg" cx="50" cy="50" r="44" />
                    <circle
                      className="ring-fill"
                      cx="50" cy="50" r="44"
                      stroke={scoreColor}
                      strokeDasharray={ringCircumference}
                      strokeDashoffset={ringOffset}
                      style={{ filter: `drop-shadow(0 0 6px ${scoreColor}55)` }}
                    />
                  </svg>
                  <div className="overall-score-value" style={{ color: scoreColor }}>
                    {overallScore}
                  </div>
                </div>
              </div>
              <div className="score-stats">
                <div className="score-stat-item">
                  <span className="stat-dot" style={{ background: 'var(--color-success)' }} />
                  <span>优秀 (≥70): {scoreBreakdown.good} 项</span>
                </div>
                <div className="score-stat-item">
                  <span className="stat-dot" style={{ background: 'var(--color-warning)' }} />
                  <span>一般 (40-69): {scoreBreakdown.mid} 项</span>
                </div>
                <div className="score-stat-item">
                  <span className="stat-dot" style={{ background: 'var(--color-danger)' }} />
                  <span>待提升 ({'<'}=40): {scoreBreakdown.low} 项</span>
                </div>
                <div style={{
                  marginTop: 4,
                  fontSize: 12,
                  color: 'var(--color-text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}>
                  <TrendingUp size={13} />
                  <span>
                    综合匹配度:
                    <strong style={{ color: scoreColor, marginLeft: 4 }}>
                      {overallScore >= 80 ? '非常匹配' :
                        overallScore >= 60 ? '较为匹配' :
                          overallScore >= 40 ? '部分匹配' : '匹配度较低'}
                    </strong>
                  </span>
                </div>
              </div>
            </div>

            <div
              className="radar-chart-wrapper"
              ref={wrapperRef}
              style={{ position: 'relative' }}
            >
              <svg
                className={`radar-svg ${isSwitching || isLoading ? 'switching' : ''}`}
                width={RADAR_SIZE}
                height={RADAR_SIZE}
                viewBox={`0 0 ${RADAR_SIZE} ${RADAR_SIZE}`}
              >
                <defs>
                  <radialGradient id="radarFill" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#1E3A5F" stopOpacity="0.08" />
                    <stop offset="40%" stopColor="#3A6FB5" stopOpacity="0.25" />
                    <stop offset="75%" stopColor="#5A9BE0" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="#7FB8F4" stopOpacity="0.6" />
                  </radialGradient>
                  <filter id="pointGlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {gridPolygons.map((poly, idx) => (
                  <polygon
                    key={`grid-${idx}`}
                    d={poly.d}
                    fill="none"
                    stroke="#D4DFF0"
                    strokeWidth={idx === LEVELS - 1 ? 1.2 : 0.8}
                    strokeOpacity={0.7}
                  />
                ))}

                {axisLines.map((ln, idx) => (
                  <line
                    key={`axis-${idx}`}
                    x1={ln.x1} y1={ln.y1}
                    x2={ln.x2} y2={ln.y2}
                    stroke="#D4DFF0"
                    strokeWidth={0.8}
                    strokeOpacity={0.6}
                  />
                ))}

                {radarPoints.length > 2 && (
                  <>
                    <path
                      d={areaPath}
                      fill="url(#radarFill)"
                      stroke="#1E3A5F"
                      strokeWidth={2}
                      strokeLinejoin="round"
                      style={{
                        transition: 'd 0.4s ease-out, fill-opacity 0.4s ease-out',
                        fillOpacity: isSwitching ? 0.3 : 1,
                      }}
                    />
                  </>
                )}

                {radarPoints.map(({ skill, outer, point, angle }) => {
                  const isHovered = hoveredSkill === skill.skill;
                  const isSelected = selectedSkill?.skill === skill.skill;
                  const color = getScoreColor(skill.score);
                  const scale = isHovered ? 1.1 : 1;
                  const labelScale = isHovered ? 1.1 : 1;

                  return (
                    <g key={skill.skill}>
                      <g
                        transform={`translate(${outer.x}, ${outer.y}) scale(${labelScale})`}
                        style={{
                          transformOrigin: `${outer.x}px ${outer.y}px`,
                          transition: 'transform 0.2s ease-out',
                          cursor: 'pointer',
                        }}
                        onMouseEnter={() => handlePointHover({
                          clientX: point.x, clientY: point.y
                        } as React.MouseEvent, skill)}
                        onMouseMove={(e) => handlePointHover(e, skill)}
                        onMouseLeave={handlePointLeave}
                        onClick={() => handlePointClick(skill)}
                      >
                        <text
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fontSize={12}
                          fontWeight={isHovered || isSelected ? 700 : 500}
                          fill={isHovered || isSelected ? 'var(--color-primary)' : 'var(--color-text-secondary)'}
                          style={{
                            transition: 'all 0.2s ease-out',
                            paintOrder: 'stroke',
                            stroke: isHovered ? 'white' : 'none',
                            strokeWidth: isHovered ? 3 : 0,
                          }}
                        >
                          {skill.skill}
                        </text>
                      </g>

                      <g
                        transform={`translate(${point.x}, ${point.y}) scale(${scale})`}
                        style={{
                          transformOrigin: `${point.x}px ${point.y}px`,
                          transition: 'transform 0.2s ease-out',
                          cursor: 'pointer',
                        }}
                        onMouseEnter={(e) => handlePointHover(e, skill)}
                        onMouseMove={(e) => handlePointHover(e, skill)}
                        onMouseLeave={handlePointLeave}
                        onClick={() => handlePointClick(skill)}
                        filter={isHovered ? 'url(#pointGlow)' : undefined}
                      >
                        <circle
                          r={isSelected ? 9 : 7}
                          fill={color}
                          stroke="white"
                          strokeWidth={isSelected ? 3 : 2.5}
                          style={{ transition: 'all 0.2s ease-out' }}
                        />
                        {isSelected && (
                          <circle
                            r={14}
                            fill="none"
                            stroke={color}
                            strokeWidth={1.5}
                            strokeDasharray="3 3"
                            style={{
                              animation: 'spin 8s linear infinite',
                              transformOrigin: 'center',
                            }}
                          />
                        )}
                      </g>
                    </g>
                  );
                })}

                <circle
                  cx={CENTER}
                  cy={CENTER}
                  r={5}
                  fill="var(--color-primary)"
                  stroke="white"
                  strokeWidth={2}
                />
              </svg>

              {tooltip && (
                <div
                  className="radar-tooltip"
                  style={{ left: tooltip.x, top: tooltip.y }}
                >
                  {tooltip.text}
                </div>
              )}
            </div>

            <div
              className={`detail-panel ${selectedSkill ? 'open' : ''}`}
              style={{
                overflow: selectedSkill ? 'visible' : 'hidden',
              }}
            >
              {selectedSkill && (
                <div key={selectedSkill.skill} className="animate-fadeIn">
                  <div className="detail-header">
                    <div className="detail-skill-name">
                      <Search size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: -2 }} />
                      {selectedSkill.skill}
                      <span
                        style={{
                          marginLeft: 10,
                          fontSize: 13,
                          fontWeight: 600,
                          color: getScoreColor(selectedSkill.score),
                          background: `${getScoreColor(selectedSkill.score)}18`,
                          padding: '2px 10px',
                          borderRadius: 10,
                        }}
                      >
                        {selectedSkill.score} / 100
                      </span>
                    </div>
                    <div className="detail-occurrences">
                      出现 {selectedSkill.occurrences || 0} 次
                    </div>
                  </div>

                  <div>
                    <div className="detail-section-title">
                      <FileText size={11} style={{ display: 'inline', marginRight: 4, verticalAlign: -1 }} />
                      项目经验片段
                    </div>
                    {selectedSkill.contexts && selectedSkill.contexts.length > 0 ? (
                      selectedSkill.contexts.slice(0, 2).map((ctx, i) => (
                        <div key={i} className="detail-context">
                          {ctx}
                        </div>
                      ))
                    ) : (
                      <div style={{
                        fontSize: 12,
                        color: 'var(--color-text-muted)',
                        fontStyle: 'italic',
                      }}>
                        未提取到明确的上下文片段
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="detail-section-title">
                      <Lightbulb size={11} style={{ display: 'inline', marginRight: 4, verticalAlign: -1, color: 'var(--color-accent)' }} />
                      建议补充关键词
                      <span style={{
                        marginLeft: 6,
                        textTransform: 'none',
                        fontWeight: 400,
                        color: 'var(--color-text-muted)',
                        fontSize: 10,
                      }}>
                        (点击复制)
                      </span>
                    </div>
                    {selectedSkill.suggestedKeywords && selectedSkill.suggestedKeywords.length > 0 ? (
                      <div className="suggested-tags">
                        {selectedSkill.suggestedKeywords.map(kw => (
                          <button
                            key={kw}
                            className="suggested-tag"
                            onClick={() => onCopyKeyword(kw)}
                            title={`点击复制: ${kw}`}
                          >
                            <ClipboardCopy size={10} style={{ display: 'inline', marginRight: 4, verticalAlign: -1 }} />
                            {kw}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div style={{
                        fontSize: 12,
                        color: 'var(--color-text-muted)',
                        fontStyle: 'italic',
                      }}>
                        该技能相关关键词已覆盖较全面
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {hasData && parsedResume && parsedResume.projects.length > 0 && (
        <div className="card animate-slideInUp" style={{ animationDelay: '100ms' }}>
          <h2 className="card-title">
            <FileText className="card-title-icon" size={18} />
            项目经验
            <span
              style={{
                marginLeft: 'auto',
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--color-accent)',
              }}
            >
              共 {parsedResume.projects.length} 个
            </span>
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {parsedResume.projects.slice(0, 5).map((proj, idx) => (
              <div
                key={idx}
                className="animate-slideInLeft"
                style={{
                  padding: '14px 16px',
                  background: 'var(--color-bg-alt)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  animationDelay: `${idx * 80 + 100}ms`,
                  transition: 'all var(--transition-fast)',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateX(4px)';
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-primary-light)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = '';
                  (e.currentTarget as HTMLElement).style.borderColor = '';
                }}
              >
                <div style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: 'var(--color-primary)',
                  marginBottom: 6,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}>
                  <span style={{
                    width: 6, height: 6, borderRadius: 3,
                    background: `hsl(${idx * 60}, 70%, 55%)`,
                  }} />
                  {proj.name}
                </div>
                <div style={{
                  fontSize: 12,
                  color: 'var(--color-text-secondary)',
                  lineHeight: 1.6,
                }}>
                  {proj.description || proj.context || '暂无详细描述'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default React.memo(SkillMatchingChart);
