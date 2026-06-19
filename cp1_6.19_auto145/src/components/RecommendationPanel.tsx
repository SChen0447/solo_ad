import React, { useState, useEffect, useCallback } from 'react';
import {
  Recommendation,
  TeamMember,
  getScoreColor,
  getScoreLabel
} from '../utils/skillData';

interface RecommendationPanelProps {
  recommendations: Recommendation[];
  selectedMember: TeamMember | null;
  loading: boolean;
}

const RecommendationPanel: React.FC<RecommendationPanelProps> = ({
  recommendations,
  selectedMember,
  loading
}) => {
  const [visibleCards, setVisibleCards] = useState<Set<string>>(new Set());

  useEffect(() => {
    setVisibleCards(new Set());
    if (recommendations.length > 0) {
      recommendations.forEach((rec, index) => {
        setTimeout(() => {
          setVisibleCards(prev => new Set([...prev, rec.id]));
        }, index * 250 + 100);
      });
    }
  }, [recommendations]);

  const avatarGradient = useCallback((index: number): string => {
    const colors = [
      'linear-gradient(135deg, #667eea, #764ba2)',
      'linear-gradient(135deg, #f093fb, #f5576c)',
      'linear-gradient(135deg, #4facfe, #00f2fe)',
      'linear-gradient(135deg, #43e97b, #38f9d7)',
      'linear-gradient(135deg, #fa709a, #fee140)',
      'linear-gradient(135deg, #30cfd0, #330867)'
    ];
    return colors[index % colors.length];
  }, []);

  const getMatchColor = (score: number): string => {
    if (score >= 85) return '#43e97b';
    if (score >= 70) return '#4facfe';
    if (score >= 55) return '#fa709a';
    return '#f5576c';
  };

  return (
    <div style={{
      position: 'relative',
      padding: '24px',
      borderRadius: '20px',
      background: 'rgba(255, 255, 255, 0.05)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      height: '100%'
    }}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{
          fontSize: '22px',
          fontWeight: 600,
          background: 'linear-gradient(135deg, #fa709a 0%, #f093fb 50%, #fee140 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '4px'
        }}>智能推荐</h2>
        <p style={{
          fontSize: '13px',
          color: 'rgba(255,255,255,0.5)'
        }}>
          {selectedMember
            ? `为 ${selectedMember.name} 推荐结对编程伙伴`
            : '选择团队成员查看推荐'}
        </p>
      </div>

      {loading ? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px 0'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid rgba(102, 126, 234, 0.2)',
            borderTopColor: '#667eea',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite'
          }} />
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      ) : recommendations.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          color: 'rgba(255,255,255,0.4)'
        }}>
          <div style={{
            fontSize: '48px',
            marginBottom: '16px',
            opacity: 0.5
          }}>✨</div>
          <div style={{ fontSize: '14px' }}>
            {selectedMember
              ? '暂无推荐数据'
              : '点击左侧成员头像或表格行开始分析'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {recommendations.map((rec, index) => {
            const isVisible = visibleCards.has(rec.id);
            const matchColor = getMatchColor(rec.matchScore);
            return (
              <div
                key={rec.id}
                style={{
                  position: 'relative',
                  padding: '18px',
                  borderRadius: '16px',
                  background: 'linear-gradient(145deg, rgba(40, 50, 85, 0.6), rgba(25, 35, 65, 0.6))',
                  border: `1px solid ${matchColor}30`,
                  opacity: isVisible ? 1 : 0,
                  transform: isVisible ? 'translateX(0)' : 'translateX(40px)',
                  transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px) scale(1.01)';
                  e.currentTarget.style.boxShadow = `0 12px 30px ${matchColor}30, 0 0 20px ${matchColor}15`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateX(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div
                  aria-hidden
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '1px',
                    background: `linear-gradient(90deg, transparent, ${matchColor}, transparent)`,
                    opacity: isVisible ? 0.8 : 0,
                    animation: isVisible ? 'pulse-glow 2s ease-in-out infinite' : 'none'
                  }}
                />

                <div style={{ marginBottom: '14px' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '6px'
                  }}>
                    <div style={{
                      padding: '4px 10px',
                      borderRadius: '8px',
                      background: `${matchColor}20`,
                      fontSize: '11px',
                      fontWeight: 600,
                      color: matchColor
                    }}>
                      推荐 {index + 1}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: 'rgba(255,255,255,0.5)'
                    }}>
                      薄弱技能提升
                    </div>
                  </div>
                  <div style={{
                    fontSize: '18px',
                    fontWeight: 600,
                    color: '#fff',
                    marginBottom: '4px'
                  }}>
                    {rec.skill.name}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: 'rgba(255,255,255,0.55)',
                    lineHeight: 1.5
                  }}>
                    {rec.skill.description}
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '14px',
                  padding: '12px',
                  borderRadius: '12px',
                  background: 'rgba(255,255,255,0.03)'
                }}>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <div style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #2b5876, #4a6fa5)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '13px',
                      fontWeight: 700,
                      color: '#fff',
                      opacity: 0.9
                    }}>
                      {selectedMember?.avatar}
                    </div>
                    <div style={{
                      padding: '2px 8px',
                      borderRadius: '6px',
                      background: `${getScoreColor(rec.currentScore)}30`,
                      fontSize: '10px',
                      fontWeight: 600,
                      color: getScoreColor(rec.currentScore)
                    }}>
                      {getScoreLabel(rec.currentScore)} {rec.currentScore}
                    </div>
                  </div>

                  <div style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    padding: '0 8px'
                  }}>
                    {[1, 2, 3].map(i => (
                      <div
                        key={i}
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: matchColor,
                          opacity: 0.3 + i * 0.25
                        }}
                      />
                    ))}
                    <span style={{
                      margin: '0 6px',
                      fontSize: '16px',
                      color: matchColor,
                      fontWeight: 700
                    }}>→</span>
                    {[1, 2, 3].map(i => (
                      <div
                        key={i}
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: matchColor,
                          opacity: 1 - i * 0.2
                        }}
                      />
                    ))}
                  </div>

                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <div style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      background: avatarGradient(index + 2),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '13px',
                      fontWeight: 700,
                      color: '#fff',
                      boxShadow: `0 4px 10px ${matchColor}40`
                    }}>
                      {rec.partner.avatar}
                    </div>
                    <div style={{
                      padding: '2px 8px',
                      borderRadius: '6px',
                      background: `${getScoreColor(rec.partnerScore)}30`,
                      fontSize: '10px',
                      fontWeight: 600,
                      color: getScoreColor(rec.partnerScore)
                    }}>
                      {getScoreLabel(rec.partnerScore)} {rec.partnerScore}
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '8px'
                  }}>
                    <div>
                      <span style={{
                        fontSize: '14px',
                        fontWeight: 600,
                        color: '#fff'
                      }}>
                        {rec.partner.name}
                      </span>
                      <span style={{
                        fontSize: '12px',
                        color: 'rgba(255,255,255,0.45)',
                        marginLeft: '8px'
                      }}>
                        结对编程伙伴
                      </span>
                    </div>
                    <div style={{
                      fontSize: '18px',
                      fontWeight: 700,
                      color: matchColor
                    }}>
                      {rec.matchScore}%
                    </div>
                  </div>

                  <div style={{
                    height: '8px',
                    borderRadius: '4px',
                    background: 'rgba(255,255,255,0.06)',
                    overflow: 'hidden',
                    position: 'relative'
                  }}>
                    <div
                      style={{
                        height: '100%',
                        width: isVisible ? `${rec.matchScore}%` : '0%',
                        background: `linear-gradient(90deg, ${matchColor}80, ${matchColor})`,
                        borderRadius: '4px',
                        transition: 'width 1s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s',
                        position: 'relative'
                      }}
                    >
                      <div style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                        animation: isVisible ? 'shimmer 2s ease-in-out infinite' : 'none'
                      }} />
                    </div>
                    <style>{`
                      @keyframes shimmer {
                        0% { transform: translateX(-100%); }
                        100% { transform: translateX(100%); }
                      }
                    `}</style>
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  gap: '8px'
                }}>
                  <a
                    href={`mailto:${rec.partner.email}`}
                    onClick={(e) => e.preventDefault()}
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      borderRadius: '10px',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      textDecoration: 'none',
                      color: 'rgba(255,255,255,0.85)',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = `${matchColor}20`;
                      e.currentTarget.style.borderColor = `${matchColor}40`;
                      e.currentTarget.style.color = matchColor;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                      e.currentTarget.style.color = 'rgba(255,255,255,0.85)';
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                    发邮件
                  </a>
                  <button
                    onClick={() => alert(`正在联系 ${rec.partner.name}: ${rec.partner.phone}`)}
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      borderRadius: '10px',
                      background: `linear-gradient(135deg, ${matchColor}80, ${matchColor})`,
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      color: '#fff',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: `0 4px 12px ${matchColor}40`
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.02)';
                      e.currentTarget.style.boxShadow = `0 6px 18px ${matchColor}50`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.boxShadow = `0 4px 12px ${matchColor}40`;
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                    联系
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && recommendations.length > 0 && (
        <div style={{
          marginTop: '20px',
          padding: '14px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1))',
          border: '1px solid rgba(102, 126, 234, 0.2)'
        }}>
          <div style={{
            fontSize: '12px',
            fontWeight: 600,
            color: '#667eea',
            marginBottom: '4px'
          }}>
            💡 智能提示
          </div>
          <div style={{
            fontSize: '12px',
            color: 'rgba(255,255,255,0.65)',
            lineHeight: 1.6
          }}>
            建议与推荐同事安排每周2-3次结对编程，
            重点提升薄弱技能。预计4-6周可见显著进步。
          </div>
        </div>
      )}
    </div>
  );
};

export default RecommendationPanel;
