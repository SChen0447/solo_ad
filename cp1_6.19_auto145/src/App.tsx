import React, { useState, useEffect, useCallback, useMemo } from 'react';
import SkillMatrix from './components/SkillMatrix';
import RadarChart from './components/RadarChart';
import RecommendationPanel from './components/RecommendationPanel';
import {
  Skill,
  TeamMember,
  SkillScoresMap,
  Recommendation,
  SkillScore,
  fetchAllData,
  updateScore as apiUpdateScore,
  fetchRecommendations as apiFetchRecommendations,
  generateMockRecommendations
} from './utils/skillData';

const App: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [skillScores, setSkillScores] = useState<SkillScoresMap>({});
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [recLoading, setRecLoading] = useState(false);
  const [radarAnimationKey, setRadarAnimationKey] = useState(0);

  useEffect(() => {
    const initData = async () => {
      try {
        setLoading(true);
        const data = await fetchAllData();
        setSkills(data.skills);
        setMembers(data.members);
        setSkillScores(data.skillScores);
        if (data.members.length > 0) {
          setSelectedMemberId(data.members[0].id);
        }
      } catch (error) {
        console.error('Failed to initialize data:', error);
      } finally {
        setTimeout(() => setLoading(false), 300);
      }
    };
    initData();
  }, []);

  useEffect(() => {
    if (!selectedMemberId || members.length === 0) return;

    const loadRecommendations = async () => {
      setRecLoading(true);
      try {
        const result = await apiFetchRecommendations(selectedMemberId);
        if (result && result.length > 0) {
          setRecommendations(result);
        } else {
          const selectedMember = members.find(m => m.id === selectedMemberId);
          if (selectedMember) {
            setRecommendations(
              generateMockRecommendations(selectedMemberId, members, skills, skillScores)
            );
          }
        }
      } catch (error) {
        console.error('Failed to fetch recommendations:', error);
        setRecommendations(
          generateMockRecommendations(selectedMemberId, members, skills, skillScores)
        );
      } finally {
        setTimeout(() => setRecLoading(false), 200);
      }
    };

    loadRecommendations();
  }, [selectedMemberId, members, skills, skillScores]);

  const handleSelectMember = useCallback((memberId: string) => {
    setSelectedMemberId(memberId);
    setRadarAnimationKey(prev => prev + 1);
  }, []);

  const handleUpdateScore = useCallback(async (
    memberId: string,
    skillId: string,
    score: number,
    note: string
  ) => {
    const prevScores = { ...skillScores };
    const prevMemberScores = { ...(skillScores[memberId] || {}) };
    const prevScoreData = prevMemberScores[skillId];

    const optimisticUpdate: SkillScore = {
      score,
      note,
      updatedAt: new Date().toISOString()
    };

    setSkillScores(prev => ({
      ...prev,
      [memberId]: {
        ...(prev[memberId] || {}),
        [skillId]: optimisticUpdate
      }
    }));

    const result = await apiUpdateScore(memberId, skillId, score, note);
    if (!result) {
      setSkillScores(prevScores);
      if (prevScoreData) {
        setSkillScores(prev => ({
          ...prev,
          [memberId]: {
            ...(prev[memberId] || {}),
            [skillId]: prevScoreData
          }
        }));
      }
    }
  }, [skillScores]);

  const selectedMember = useMemo(() => {
    if (!selectedMemberId) return null;
    return members.find(m => m.id === selectedMemberId) || null;
  }, [selectedMemberId, members]);

  const teamStats = useMemo(() => {
    if (members.length === 0 || skills.length === 0) return null;
    let totalScore = 0;
    let totalCount = 0;
    Object.values(skillScores).forEach(memberScores => {
      Object.values(memberScores).forEach(data => {
        totalScore += data.score;
        totalCount++;
      });
    });
    return {
      avgScore: totalCount > 0 ? (totalScore / totalCount).toFixed(1) : '0',
      memberCount: members.length,
      skillCount: skills.length
    };
  }, [members, skills, skillScores]);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '60px',
            height: '60px',
            margin: '0 auto 20px',
            border: '4px solid rgba(102, 126, 234, 0.15)',
            borderTopColor: '#667eea',
            borderRightColor: '#f093fb',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <div style={{
            fontSize: '18px',
            fontWeight: 600,
            color: '#fff',
            marginBottom: '8px'
          }}>正在加载团队数据...</div>
          <div style={{
            fontSize: '13px',
            color: 'rgba(255,255,255,0.5)'
          }}>技能热力图系统启动中</div>
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      padding: '32px',
      maxWidth: '1600px',
      margin: '0 auto'
    }}>
      <header style={{
        marginBottom: '32px',
        animation: 'fadeInUp 0.6s ease'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '20px'
        }}>
          <div>
            <h1 style={{
              fontSize: '36px',
              fontWeight: 700,
              marginBottom: '8px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 30%, #f093fb 60%, #fee140 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.5px'
            }}>
              🎯 团队技能热力图
            </h1>
            <p style={{
              fontSize: '15px',
              color: 'rgba(255,255,255,0.6)',
              maxWidth: '600px',
              lineHeight: 1.6
            }}>
              可视化团队技能分布，智能推荐结对编程与培训方案，助力团队能力提升
            </p>
          </div>

          {teamStats && (
            <div style={{
              display: 'flex',
              gap: '16px'
            }}>
              {[
                { label: '团队成员', value: teamStats.memberCount, suffix: '人', gradient: 'linear-gradient(135deg, #667eea, #764ba2)' },
                { label: '技能维度', value: teamStats.skillCount, suffix: '项', gradient: 'linear-gradient(135deg, #4facfe, #43e97b)' },
                { label: '平均水平', value: teamStats.avgScore, suffix: '分', gradient: 'linear-gradient(135deg, #fa709a, #f093fb)' }
              ].map((stat, i) => (
                <div
                  key={stat.label}
                  style={{
                    padding: '14px 20px',
                    borderRadius: '14px',
                    background: 'rgba(255,255,255,0.04)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    minWidth: '110px',
                    animation: `fadeInUp 0.6s ${i * 0.1}s both`
                  }}
                >
                  <div style={{
                    fontSize: '11px',
                    color: 'rgba(255,255,255,0.5)',
                    marginBottom: '4px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    {stat.label}
                  </div>
                  <div style={{
                    fontSize: '24px',
                    fontWeight: 700,
                    background: stat.gradient,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  }}>
                    {stat.value}<span style={{ fontSize: '14px', marginLeft: '2px' }}>{stat.suffix}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </header>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 360px',
        gap: '24px',
        marginBottom: '24px',
        animation: 'fadeInUp 0.6s 0.2s both'
      }}>
        <div>
          <SkillMatrix
            skills={skills}
            members={members}
            skillScores={skillScores}
            selectedMemberId={selectedMemberId}
            onSelectMember={handleSelectMember}
            onUpdateScore={handleUpdateScore}
          />
        </div>

        <div>
          <RecommendationPanel
            recommendations={recommendations}
            selectedMember={selectedMember}
            loading={recLoading}
          />
        </div>
      </div>

      <div style={{
        animation: 'fadeInUp 0.6s 0.3s both'
      }}>
        <RadarChart
          skills={skills}
          members={members}
          skillScores={skillScores}
          selectedMemberId={selectedMemberId}
          onSelectMember={handleSelectMember}
          animationKey={radarAnimationKey}
        />
      </div>

      <footer style={{
        marginTop: '32px',
        padding: '20px 0',
        textAlign: 'center',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        animation: 'fadeInUp 0.6s 0.4s both'
      }}>
        <p style={{
          fontSize: '12px',
          color: 'rgba(255,255,255,0.35)',
          lineHeight: 1.8
        }}>
          💡 提示：点击热力图单元格可编辑评分，点击成员行或头像可切换雷达图与推荐方案
          <br />
          Team Skill Heatmap System · 让团队能力一目了然
        </p>
      </footer>
    </div>
  );
};

export default App;
