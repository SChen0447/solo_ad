import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  Idea,
  Topic,
  Member,
  apiService,
} from '../services/apiService';
import { socketService, DecisionReport } from '../services/socketService';

const GRADIENT_COLORS = [
  'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
  'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
  'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)',
  'linear-gradient(135deg, #fce4ec 0%, #f8bbd0 100%)',
  'linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)',
  'linear-gradient(135deg, #e0f7fa 0%, #b2ebf2 100%)',
  'linear-gradient(135deg, #fff8e1 0%, #ffecb3 100%)',
  'linear-gradient(135deg, #e8eaf6 0%, #c5cae9 100%)',
  'linear-gradient(135deg, #e1f5fe 0%, #b3e5fc 100%)',
  'linear-gradient(135deg, #f1f8e9 0%, #dcedc8 100%)',
];

interface VotePageProps {
  ideas: Idea[];
  topics: Topic[];
  members: Member[];
  currentMember: Member;
  onUpdateIdea: (idea: Idea) => void;
  report: DecisionReport | null;
  showReport: boolean;
  setShowReport: (show: boolean) => void;
}

const DIMENSIONS = [
  { key: 'feasibility' as const, label: '可行性', icon: '✅' },
  { key: 'innovation' as const, label: '创新性', icon: '💡' },
  { key: 'cost' as const, label: '成本', icon: '💰' },
];

function AnimatedNumber({ value, duration = 300 }: { value: number; duration?: number }) {
  const [displayValue, setDisplayValue] = useState(value);
  const prevValue = useRef(value);
  const rafRef = useRef<number>();

  useEffect(() => {
    const start = prevValue.current;
    const end = value;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = start + (end - start) * easeOut;
      setDisplayValue(current);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        prevValue.current = value;
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration]);

  return <>{displayValue.toFixed(2)}</>;
}

function StarRating({
  rating,
  onRate,
  disabled,
}: {
  rating: number;
  onRate?: (r: number) => void;
  disabled?: boolean;
}) {
  const [hoverRating, setHoverRating] = useState(0);

  return (
    <div style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((star) => {
        const isActive = (hoverRating || rating) >= star;
        return (
          <button
            key={star}
            disabled={disabled}
            style={{
              ...styles.starBtn,
              cursor: disabled ? 'default' : 'pointer',
            }}
            onClick={() => !disabled && onRate?.(star)}
            onMouseEnter={() => !disabled && setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
          >
            <span
              style={{
                ...styles.star,
                color: isActive ? '#ffc107' : 'rgba(255,255,255,0.2)',
                transform: `scale(${isActive ? 1.15 : 1})`,
                transition: 'all 0.2s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
                display: 'inline-block',
              }}
            >
              ★
            </span>
          </button>
        );
      })}
    </div>
  );
}

const VotePage: React.FC<VotePageProps> = ({
  ideas,
  topics,
  members,
  currentMember,
  onUpdateIdea,
  report,
  showReport,
  setShowReport,
}) => {
  const [filterTopicId, setFilterTopicId] = useState<string | 'all'>('all');
  const [endingVote, setEndingVote] = useState(false);
  const [animatingLikes, setAnimatingLikes] = useState<Set<string>>(new Set());
  const ideaRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const sortedIdeas = useMemo(() => {
    const filtered = filterTopicId === 'all' ? ideas : ideas.filter((i) => i.topicId === filterTopicId);
    return [...filtered].sort((a, b) => b.avgScore - a.avgScore);
  }, [ideas, filterTopicId]);

  const chartData = useMemo(() => {
    return sortedIdeas.slice(0, 10).map((idea) => ({
      name: idea.content.length > 12 ? idea.content.slice(0, 12) + '...' : idea.content,
      fullName: idea.content,
      score: Number(idea.avgScore.toFixed(2)),
    }));
  }, [sortedIdeas]);

  const getMyVotes = (idea: Idea) => {
    return idea.votes[currentMember.id] || { feasibility: 0, innovation: 0, cost: 0 };
  };

  const handleVote = async (idea: Idea, dimension: 'feasibility' | 'innovation' | 'cost', rating: number) => {
    try {
      const existingVotes = getMyVotes(idea);
      const updatedIdea = await apiService.submitVote({
        ideaId: idea.id,
        memberId: currentMember.id,
        feasibility: dimension === 'feasibility' ? rating : existingVotes.feasibility,
        innovation: dimension === 'innovation' ? rating : existingVotes.innovation,
        cost: dimension === 'cost' ? rating : existingVotes.cost,
      });
      onUpdateIdea(updatedIdea);
    } catch (err) {
      console.error('投票失败:', err);
    }
  };

  const handleLike = async (idea: Idea) => {
    setAnimatingLikes((prev) => new Set(prev).add(idea.id));
    setTimeout(() => {
      setAnimatingLikes((prev) => {
        const next = new Set(prev);
        next.delete(idea.id);
        return next;
      });
    }, 200);

    try {
      const updatedIdea = await apiService.likeIdea({
        ideaId: idea.id,
        memberId: currentMember.id,
      });
      onUpdateIdea(updatedIdea);
    } catch (err) {
      console.error('点赞失败:', err);
    }
  };

  const handleEndVote = async () => {
    setEndingVote(true);
    socketService.endVote();
    setTimeout(() => setEndingVote(false), 2000);
  };

  const getTopicTitle = (topicId: string) => {
    return topics.find((t) => t.id === topicId)?.title || '未知议题';
  };

  const isLiked = (idea: Idea) => idea.likes.includes(currentMember.id);

  return (
    <div className="page-container-mobile" style={styles.pageContainer}>
      <div style={styles.headerRow}>
        <div>
          <h1 style={styles.pageTitle}>🗳️ 投票决策</h1>
          <p style={styles.pageSubtitle}>
            为创意评分，选出团队最优方案 · {sortedIdeas.length} 个创意待评
          </p>
        </div>
        <button
          className="btn-hover"
          style={{
            ...styles.endVoteBtn,
            ...(endingVote ? styles.btnDisabled : {}),
          }}
          onClick={handleEndVote}
          disabled={endingVote || sortedIdeas.length === 0}
        >
          {endingVote ? (
            <>
              <span style={styles.spinnerInline} />
              生成报告中...
            </>
          ) : (
            <>🏁 结束投票</>
          )}
        </button>
      </div>

      <div style={styles.filterBar}>
        <div style={styles.filterGroup}>
          <span style={styles.filterLabel}>筛选议题：</span>
          <div style={styles.filterChips}>
            <button
              style={{
                ...styles.filterChip,
                ...(filterTopicId === 'all' ? styles.filterChipActive : {}),
              }}
              onClick={() => setFilterTopicId('all')}
            >
              全部 ({ideas.length})
            </button>
            {topics.map((t) => (
              <button
                key={t.id}
                style={{
                  ...styles.filterChip,
                  ...(filterTopicId === t.id ? styles.filterChipActive : {}),
                }}
                onClick={() => setFilterTopicId(t.id)}
              >
                {t.title} ({ideas.filter((i) => i.topicId === t.id).length})
              </button>
            ))}
          </div>
        </div>
      </div>

      {sortedIdeas.length > 0 && (
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>📊 综合得分排行榜（Top 10）</h3>
          <div style={styles.chartContainer}>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} margin={{ top: 20, right: 20, bottom: 60, left: 10 }}>
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#888', fontSize: 11 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  tickLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  angle={-30}
                  textAnchor="end"
                  height={60}
                />
                <YAxis
                  domain={[0, 5]}
                  tick={{ fill: '#888', fontSize: 11 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  tickLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e1e1e',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8,
                    color: '#e0e0e0',
                    fontSize: 12,
                  }}
                  labelStyle={{ color: '#bb86fc', marginBottom: 4 }}
                  formatter={(value: number) => [`${value.toFixed(2)} 分`, '综合得分']}
                  labelFormatter={(label, payload) => {
                    if (payload?.[0]) return (payload[0].payload as any).fullName;
                    return label;
                  }}
                />
                <Bar
                  dataKey="score"
                  radius={[6, 6, 0, 0]}
                  animationDuration={500}
                  animationEasing="ease-out"
                >
                  {chartData.map((_, index) => (
                    <Cell key={index} fill={index < 3 ? (index === 0 ? '#ffd700' : index === 1 ? '#c0c0c0' : '#cd7f32') : '#6a5acd'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {sortedIdeas.length === 0 ? (
        <div style={styles.emptyState}>
          <span style={{ fontSize: 64 }}>🗳️</span>
          <h3 style={{ color: '#888', marginTop: 16 }}>暂无创意可投票</h3>
          <p style={{ color: '#555', marginTop: 8 }}>先去头脑风暴页面创建一些创意吧！</p>
        </div>
      ) : (
        <div className="vote-grid-mobile" style={styles.ideasGrid}>
          {sortedIdeas.map((idea, index) => {
            const myVotes = getMyVotes(idea);
            const isTop3 = index < 3;
            const liked = isLiked(idea);
            const likeAnimating = animatingLikes.has(idea.id);

            return (
              <div
                key={idea.id}
                ref={(el) => {
                  if (el) ideaRefs.current.set(idea.id, el);
                }}
                style={{
                  ...styles.ideaCard,
                  ...(isTop3 ? {
                    border: '2px solid #ffd700',
                    boxShadow: '0 0 20px rgba(255, 215, 0, 0.3)',
                    animation: 'goldPulse 2s ease-in-out infinite',
                  } : {}),
                  animationDelay: `${index * 0.05}s`,
                  zIndex: sortedIdeas.length - index,
                }}
              >
                {isTop3 && (
                  <div style={{
                    ...styles.rankBadge,
                    backgroundColor: index === 0 ? '#ffd700' : index === 1 ? '#c0c0c0' : '#cd7f32',
                    color: index === 0 ? '#121212' : 'white',
                  }}>
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'} Top {index + 1}
                  </div>
                )}

                <div style={styles.scoreHeader}>
                  <div style={styles.scoreLabel}>综合得分</div>
                  <div style={styles.scoreValue}>
                    <AnimatedNumber value={idea.avgScore} />
                  </div>
                </div>

                <div style={{
                  ...styles.contentSection,
                  background: idea.gradientColor || GRADIENT_COLORS[index % GRADIENT_COLORS.length],
                }}>
                  <div style={styles.contentText}>{idea.content}</div>
                </div>

                <div style={styles.metaRow}>
                  <div style={styles.topicTag}>
                    📌 {getTopicTitle(idea.topicId)}
                  </div>
                  <div style={styles.authorInfo}>
                    <div
                      style={{
                        ...styles.authorAvatar,
                        backgroundColor: idea.authorColor,
                      }}
                    />
                    <span>{idea.authorName}</span>
                  </div>
                </div>

                <div style={styles.voteSection}>
                  {DIMENSIONS.map((dim) => (
                    <div key={dim.key} style={styles.dimensionRow}>
                      <span style={styles.dimensionLabel}>
                        {dim.icon} {dim.label}
                      </span>
                      <StarRating
                        rating={myVotes[dim.key]}
                        onRate={(r) => handleVote(idea, dim.key, r)}
                      />
                    </div>
                  ))}
                </div>

                <div style={styles.actionRow}>
                  <button
                    style={{
                      ...styles.likeBtn,
                      color: liked ? '#ef5350' : '#888',
                      transform: likeAnimating ? 'scale(1.2)' : 'scale(1)',
                      transition: 'all 0.2s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
                    }}
                    onClick={() => handleLike(idea)}
                  >
                    <span>{liked ? '❤️' : '🤍'}</span>
                    <span style={styles.likeCount}>{idea.likes.length}</span>
                  </button>

                  <div style={styles.votedInfo}>
                    {Object.keys(idea.votes).length} 人已评
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showReport && report && (
        <>
          <div style={styles.modalOverlay} onClick={() => setShowReport(false)} />
          <div style={styles.reportModalWrapper}>
            <div style={styles.reportModal}>
              <div style={styles.reportHeader}>
                <h2 style={styles.reportTitle}>📋 决策报告</h2>
                <button
                  style={styles.closeBtn}
                  onClick={() => setShowReport(false)}
                >
                  ✕
                </button>
              </div>

              <div style={styles.reportSummary}>
                <div style={styles.summaryItem}>
                  <div style={styles.summaryValue}>{report.participantCount}</div>
                  <div style={styles.summaryLabel}>参与成员</div>
                </div>
                <div style={styles.summaryItem}>
                  <div style={styles.summaryValue}>{report.votedCount}</div>
                  <div style={styles.summaryLabel}>已投票</div>
                </div>
                <div style={styles.summaryItem}>
                  <div style={styles.summaryValue}>{report.totalIdeas}</div>
                  <div style={styles.summaryLabel}>创意总数</div>
                </div>
              </div>

              <div style={styles.reportRankSection}>
                <h3 style={styles.rankSectionTitle}>🏆 最终排名</h3>
                <div style={styles.rankList}>
                  {report.rankings.map((item) => (
                    <div
                      key={item.ideaId}
                      style={{
                        ...styles.rankItem,
                        ...(item.rank === 1 ? styles.rankItemGold : {}),
                      }}
                    >
                      <div style={styles.rankItemLeft}>
                        <div style={{
                          ...styles.rankNum,
                          backgroundColor: item.rank === 1 ? '#ffd700' : item.rank === 2 ? '#c0c0c0' : item.rank === 3 ? '#cd7f32' : 'rgba(255,255,255,0.1)',
                          color: item.rank <= 3 ? (item.rank === 1 ? '#121212' : 'white') : '#888',
                        }}>
                          {item.rank}
                        </div>
                        <div style={styles.rankContent}>
                          <div style={styles.rankText}>{item.content}</div>
                          {item.rank === 1 && (
                            <span style={styles.recommendTag}>✨ 推荐采纳</span>
                          )}
                        </div>
                      </div>
                      <div style={styles.rankItemRight}>
                        <div style={styles.rankScore}>
                          {item.avgScore.toFixed(2)}
                        </div>
                        <div style={styles.rankDims}>
                          <span>✅ {item.feasibilityAvg.toFixed(1)}</span>
                          <span>💡 {item.innovationAvg.toFixed(1)}</span>
                          <span>💰 {(6 - item.costAvg).toFixed(1)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={styles.reportFooter}>
                <button
                  style={{ ...styles.btn, ...styles.btnPrimary, flex: 1 }}
                  onClick={() => setShowReport(false)}
                >
                  确认
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes goldPulse {
          0%, 100% {
            box-shadow: 0 0 20px rgba(255, 215, 0, 0.3), 0 0 40px rgba(255, 215, 0, 0.1);
          }
          50% {
            box-shadow: 0 0 30px rgba(255, 215, 0, 0.6), 0 0 60px rgba(255, 215, 0, 0.3);
          }
        }
        @keyframes reportFlipIn {
          from {
            opacity: 0;
            transform: perspective(1000px) rotateY(-90deg);
          }
          to {
            opacity: 1;
            transform: perspective(1000px) rotateY(0);
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  pageContainer: {
    padding: '24px 32px 80px',
    maxWidth: 1400,
    margin: '0 auto',
  },
  headerRow: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 24,
    flexWrap: 'wrap',
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: 700,
    color: '#e0e0e0',
    marginBottom: 8,
  },
  pageSubtitle: {
    fontSize: 14,
    color: '#888',
  },
  endVoteBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 24px',
    backgroundColor: '#bb86fc',
    color: 'white',
    border: 'none',
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    outline: 'none',
  },
  btnDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  filterBar: {
    marginBottom: 24,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  filterGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  filterLabel: {
    fontSize: 13,
    color: '#888',
    fontWeight: 500,
  },
  filterChips: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
  },
  filterChip: {
    padding: '8px 16px',
    backgroundColor: '#1e1e1e',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 20,
    color: '#888',
    fontSize: 12,
    cursor: 'pointer',
    transition: 'all 0.2s',
    outline: 'none',
  },
  filterChipActive: {
    backgroundColor: 'rgba(187, 134, 252, 0.15)',
    borderColor: 'rgba(187, 134, 252, 0.4)',
    color: '#bb86fc',
    fontWeight: 500,
  },
  chartCard: {
    backgroundColor: '#1e1e1e',
    borderRadius: 16,
    padding: 24,
    border: '1px solid rgba(255,255,255,0.06)',
    marginBottom: 24,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: '#e0e0e0',
    marginBottom: 8,
  },
  chartContainer: {
    width: '100%',
  },
  emptyState: {
    textAlign: 'center',
    padding: '80px 24px',
    backgroundColor: '#1e1e1e',
    borderRadius: 16,
    border: '1px dashed rgba(255,255,255,0.1)',
  },
  ideasGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 20,
  },
  ideaCard: {
    backgroundColor: '#1e1e1e',
    borderRadius: 14,
    border: '1px solid rgba(255,255,255,0.06)',
    padding: 20,
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    position: 'relative',
    transition: 'all 0.3s ease',
    animation: 'fadeIn 0.5s ease both',
  },
  rankBadge: {
    position: 'absolute',
    top: -10,
    left: 16,
    padding: '4px 12px',
    borderRadius: 12,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.5,
  },
  scoreHeader: {
    textAlign: 'center',
    paddingBottom: 12,
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  scoreLabel: {
    fontSize: 11,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  scoreValue: {
    fontSize: 28,
    fontWeight: 700,
    color: '#bb86fc',
    fontFamily: 'monospace',
  },
  contentSection: {
    borderRadius: 10,
    padding: 14,
    color: '#333',
  },
  contentText: {
    fontSize: 14,
    lineHeight: 1.6,
    fontWeight: 500,
  },
  metaRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  topicTag: {
    fontSize: 11,
    color: '#666',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: '4px 10px',
    borderRadius: 6,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '60%',
  },
  authorInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 11,
    color: '#888',
  },
  authorAvatar: {
    width: 20,
    height: 20,
    borderRadius: '50%',
  },
  voteSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    padding: '12px 0',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  dimensionRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  dimensionLabel: {
    fontSize: 12,
    color: '#aaa',
  },
  starRow: {
    display: 'flex',
    gap: 2,
  },
  starBtn: {
    background: 'none',
    border: 'none',
    padding: '2px',
    outline: 'none',
  },
  star: {
    fontSize: 18,
    userSelect: 'none',
  },
  actionRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  likeBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'none',
    border: 'none',
    padding: '6px 10px',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 14,
    outline: 'none',
    transition: 'background-color 0.2s',
  },
  likeCount: {
    fontSize: 13,
    fontWeight: 600,
  },
  votedInfo: {
    fontSize: 11,
    color: '#666',
  },
  spinnerInline: {
    width: 16,
    height: 16,
    border: '2px solid transparent',
    borderTop: '2px solid white',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    zIndex: 1000,
    animation: 'fadeIn 0.2s ease',
  },
  reportModalWrapper: {
    position: 'fixed',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1001,
    pointerEvents: 'none',
    padding: 24,
  },
  reportModal: {
    backgroundColor: '#1e1e1e',
    borderRadius: 20,
    width: '100%',
    maxWidth: 640,
    maxHeight: '85vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    pointerEvents: 'auto',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    boxShadow: '0 32px 64px rgba(0, 0, 0, 0.5)',
    animation: 'reportFlipIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) both',
    transformOrigin: 'left center',
  },
  reportHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  reportTitle: {
    fontSize: 20,
    fontWeight: 600,
    color: '#e0e0e0',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#888',
    fontSize: 20,
    cursor: 'pointer',
    padding: 4,
  },
  reportSummary: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  summaryItem: {
    padding: 20,
    textAlign: 'center',
    backgroundColor: '#1e1e1e',
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: 700,
    color: '#bb86fc',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#888',
  },
  reportRankSection: {
    flex: 1,
    overflowY: 'auto',
    padding: 20,
  },
  rankSectionTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: '#e0e0e0',
    marginBottom: 16,
  },
  rankList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  rankItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.04)',
    gap: 12,
  },
  rankItemGold: {
    backgroundColor: 'rgba(255, 215, 0, 0.08)',
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  rankItemLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  rankNum: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 14,
    fontWeight: 700,
    flexShrink: 0,
  },
  rankContent: {
    minWidth: 0,
  },
  rankText: {
    fontSize: 13,
    color: '#ccc',
    lineHeight: 1.5,
    marginBottom: 4,
  },
  recommendTag: {
    display: 'inline-block',
    padding: '2px 8px',
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    color: '#ffd700',
    borderRadius: 4,
    fontSize: 10,
    fontWeight: 600,
  },
  rankItemRight: {
    textAlign: 'right',
    flexShrink: 0,
  },
  rankScore: {
    fontSize: 20,
    fontWeight: 700,
    color: '#bb86fc',
    marginBottom: 4,
  },
  rankDims: {
    display: 'flex',
    gap: 6,
    fontSize: 10,
    color: '#888',
  },
  reportFooter: {
    padding: 16,
    borderTop: '1px solid rgba(255,255,255,0.06)',
    display: 'flex',
    gap: 12,
  },
  btn: {
    padding: '12px 24px',
    borderRadius: 8,
    border: 'none',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    outline: 'none',
  },
  btnPrimary: {
    backgroundColor: '#bb86fc',
    color: 'white',
  },
};

export default VotePage;
