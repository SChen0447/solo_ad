import React, { useState, useMemo, useCallback } from 'react';
import {
  Radar,
  RadarChart as RechartsRadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip
} from 'recharts';
import {
  Skill,
  TeamMember,
  SkillScoresMap,
  generateRadarGradient,
  getScoreLabel
} from '../utils/skillData';

interface RadarChartProps {
  skills: Skill[];
  members: TeamMember[];
  skillScores: SkillScoresMap;
  selectedMemberId: string | null;
  onSelectMember: (memberId: string) => void;
  animationKey: number;
}

const RadarChart: React.FC<RadarChartProps> = ({
  skills,
  members,
  skillScores,
  selectedMemberId,
  onSelectMember,
  animationKey
}) => {
  const [hoveredSkill, setHoveredSkill] = useState<string | null>(null);
  const gradientColors = useMemo(() => generateRadarGradient(), []);

  const selectedMember = useMemo(() => {
    if (!selectedMemberId) return members[0];
    return members.find(m => m.id === selectedMemberId) || members[0];
  }, [selectedMemberId, members]);

  const radarData = useMemo(() => {
    if (!selectedMember) return [];
    const memberScores = skillScores[selectedMember.id] || {};
    return skills.map((skill, index) => ({
      skill: skill.name,
      skillId: skill.id,
      fullMark: 5,
      value: memberScores[skill.id]?.score ?? 1,
      color: gradientColors[index % gradientColors.length]
    }));
  }, [selectedMember, skills, skillScores, gradientColors]);

  const CustomTooltip = useCallback(({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const skillInfo = skills.find(s => s.id === data.skillId);
      return (
        <div style={{
          background: 'rgba(15, 20, 40, 0.98)',
          backdropFilter: 'blur(10px)',
          padding: '14px 18px',
          borderRadius: '12px',
          border: `1px solid ${data.color}50`,
          boxShadow: `0 10px 30px rgba(0,0,0,0.5), 0 0 20px ${data.color}20`
        }}>
          <div style={{
            fontSize: '14px',
            fontWeight: 600,
            color: data.color,
            marginBottom: '6px'
          }}>
            {data.skill}
          </div>
          <div style={{
            fontSize: '13px',
            color: '#fff',
            marginBottom: '8px'
          }}>
            熟练度: <strong>{getScoreLabel(data.value)}</strong> ({data.value}/5)
          </div>
          {skillInfo && (
            <div style={{
              fontSize: '12px',
              color: 'rgba(255,255,255,0.7)',
              borderTop: '1px solid rgba(255,255,255,0.1)',
              paddingTop: '8px',
              maxWidth: '240px'
            }}>
              {skillInfo.description}
            </div>
          )}
        </div>
      );
    }
    return null;
  }, [skills]);

  const avatarGradient = useMemo(() => {
    const colors = [
      'linear-gradient(135deg, #667eea, #764ba2)',
      'linear-gradient(135deg, #f093fb, #f5576c)',
      'linear-gradient(135deg, #4facfe, #00f2fe)',
      'linear-gradient(135deg, #43e97b, #38f9d7)',
      'linear-gradient(135deg, #fa709a, #fee140)',
      'linear-gradient(135deg, #30cfd0, #330867)'
    ];
    const index = members.findIndex(m => m.id === selectedMember?.id);
    return colors[index >= 0 ? index : 0];
  }, [members, selectedMember]);

  const avgScore = useMemo(() => {
    if (radarData.length === 0) return 0;
    return (radarData.reduce((acc, d) => acc + d.value, 0) / radarData.length).toFixed(1);
  }, [radarData]);

  return (
    <div style={{
      position: 'relative',
      padding: '24px',
      borderRadius: '20px',
      background: 'rgba(255, 255, 255, 0.05)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.1)'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <h2 style={{
            fontSize: '22px',
            fontWeight: 600,
            background: 'linear-gradient(135deg, #4facfe 0%, #43e97b 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '4px'
          }}>技能雷达图</h2>
          <p style={{
            fontSize: '13px',
            color: 'rgba(255,255,255,0.5)'
          }}>
            选中成员: <span style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>
              {selectedMember?.name || '未选择'}
            </span>
            {radarData.length > 0 && (
              <span style={{ marginLeft: '12px' }}>
                平均: <span style={{
                  color: '#43e97b',
                  fontWeight: 600,
                  fontSize: '15px'
                }}>{avgScore}</span>
              </span>
            )}
          </p>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          flexWrap: 'wrap'
        }}>
          {members.map(member => {
            const isSelected = member.id === selectedMember?.id;
            const memberIndex = members.findIndex(m => m.id === member.id);
            const gradColors = [
              'linear-gradient(135deg, #667eea, #764ba2)',
              'linear-gradient(135deg, #f093fb, #f5576c)',
              'linear-gradient(135deg, #4facfe, #00f2fe)',
              'linear-gradient(135deg, #43e97b, #38f9d7)',
              'linear-gradient(135deg, #fa709a, #fee140)',
              'linear-gradient(135deg, #30cfd0, #330867)'
            ];
            return (
              <button
                key={member.id}
                onClick={() => onSelectMember(member.id)}
                title={member.name}
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: gradColors[memberIndex % gradColors.length],
                  border: isSelected
                    ? '3px solid rgba(255,255,255,0.9)'
                    : '2px solid rgba(255,255,255,0.1)',
                  color: '#fff',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                  transform: isSelected ? 'scale(1.15)' : 'scale(1)',
                  boxShadow: isSelected
                    ? `0 4px 15px rgba(0,0,0,0.4), 0 0 15px ${gradColors[memberIndex % gradColors.length].split(',')[0].replace('linear-gradient(135deg, ', '')}60`
                    : '0 2px 8px rgba(0,0,0,0.2)'
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.transform = 'scale(1.1)';
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                {member.avatar}
              </button>
            );
          })}
        </div>
      </div>

      {selectedMember && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          marginBottom: '16px',
          padding: '12px 16px',
          borderRadius: '14px',
          background: 'rgba(102, 126, 234, 0.1)',
          border: '1px solid rgba(102, 126, 234, 0.2)'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: avatarGradient,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            fontWeight: 700,
            color: '#fff',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
          }}>
            {selectedMember.avatar}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: '16px',
              fontWeight: 600,
              color: '#fff'
            }}>{selectedMember.name}</div>
            <div style={{
              fontSize: '12px',
              color: 'rgba(255,255,255,0.5)'
            }}>
              {selectedMember.email} · {selectedMember.phone}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{
              fontSize: '11px',
              color: 'rgba(255,255,255,0.5)',
              marginBottom: '2px'
            }}>技能覆盖</div>
            <div style={{
              fontSize: '20px',
              fontWeight: 700,
              background: 'linear-gradient(135deg, #4facfe, #43e97b)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              {Math.round((parseFloat(avgScore) / 5) * 100)}%
            </div>
          </div>
        </div>
      )}

      <div
        key={`radar-${animationKey}-${selectedMember?.id}`}
        style={{
          width: '100%',
          height: '380px',
          position: 'relative',
          animation: 'fadeInUp 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)'
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <RechartsRadarChart
            cx="50%"
            cy="50%"
            outerRadius="78%"
            data={radarData}
          >
            <defs>
              <linearGradient id="radarFillGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#667eea" stopOpacity={0.5} />
                <stop offset="50%" stopColor="#764ba2" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#f093fb" stopOpacity={0.3} />
              </linearGradient>
              {radarData.map((d, i) => (
                <radialGradient key={i} id={`pointGrad-${i}`}>
                  <stop offset="0%" stopColor={d.color} stopOpacity={1} />
                  <stop offset="100%" stopColor={d.color} stopOpacity={0.7} />
                </radialGradient>
              ))}
            </defs>
            <PolarGrid
              stroke="rgba(102, 126, 234, 0.2)"
              strokeDasharray="4 4"
              fill="url(#polarGridGradient)"
            />
            <PolarAngleAxis
              dataKey="skill"
              tick={{
                fill: (data: any) => {
                  const idx = radarData.findIndex(d => d.skill === data.value);
                  return idx >= 0 ? radarData[idx].color : 'rgba(255,255,255,0.8)';
                },
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer'
              }}
              tickLine={false}
              onMouseEnter={(data) => setHoveredSkill(data?.payload?.skillId || null)}
              onMouseLeave={() => setHoveredSkill(null)}
            />
            <PolarRadiusAxis
              angle={30}
              domain={[0, 5]}
              tick={{
                fill: 'rgba(255,255,255,0.4)',
                fontSize: 10
              }}
              axisLine={false}
              tickCount={6}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(102, 126, 234, 0.3)' }} />
            <Radar
              name="技能熟练度"
              dataKey="value"
              stroke="#667eea"
              strokeWidth={2.5}
              fill="url(#radarFillGradient)"
              fillOpacity={1}
              animationDuration={800}
              animationEasing="ease-out"
              isAnimationActive={true}
              dot={(props: any) => {
                const { cx, cy, index } = props;
                if (index === undefined) return null;
                const data = radarData[index];
                const isHovered = hoveredSkill === data?.skillId;
                return (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isHovered ? 8 : 6}
                    fill={data?.color || '#667eea'}
                    stroke="#fff"
                    strokeWidth={2}
                    style={{
                      filter: `drop-shadow(0 0 ${isHovered ? 12 : 6}px ${data?.color || '#667eea'}80)`,
                      transition: 'all 0.2s ease',
                      cursor: 'pointer'
                    }}
                  />
                );
              }}
            />
          </RechartsRadarChart>
        </ResponsiveContainer>
      </div>

      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px 16px',
        marginTop: '8px',
        paddingTop: '16px',
        borderTop: '1px solid rgba(255,255,255,0.06)'
      }}>
        {radarData.map((d, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '8px',
              background: hoveredSkill === d.skillId
                ? `${d.color}20`
                : 'rgba(255,255,255,0.03)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              border: hoveredSkill === d.skillId
                ? `1px solid ${d.color}40`
                : '1px solid transparent'
            }}
            onMouseEnter={() => setHoveredSkill(d.skillId)}
            onMouseLeave={() => setHoveredSkill(null)}
          >
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: d.color,
              boxShadow: `0 0 6px ${d.color}80`
            }} />
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.75)' }}>
              {d.skill}
            </span>
            <span style={{
              fontSize: '12px',
              fontWeight: 600,
              color: d.color
            }}>
              {d.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RadarChart;
