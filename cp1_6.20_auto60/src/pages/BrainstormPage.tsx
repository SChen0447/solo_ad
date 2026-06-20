import React, { useState, useMemo } from 'react';
import { Topic, Idea, Member, apiService } from '../services/apiService';

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

interface BrainstormPageProps {
  topics: Topic[];
  ideas: Idea[];
  members: Member[];
  selectedTopicId: string | null;
  setSelectedTopicId: (id: string) => void;
  currentMember: Member;
  onCreateTopic: (topic: Topic) => void;
  onCreateIdea: (idea: Idea) => void;
}

const BrainstormPage: React.FC<BrainstormPageProps> = ({
  topics,
  ideas,
  members,
  selectedTopicId,
  setSelectedTopicId,
  currentMember,
  onCreateTopic,
  onCreateIdea,
}) => {
  const [showTopicModal, setShowTopicModal] = useState(false);
  const [showIdeaModal, setShowIdeaModal] = useState(false);
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [newTopicDesc, setNewTopicDesc] = useState('');
  const [newIdeaContent, setNewIdeaContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [expandedTopicId, setExpandedTopicId] = useState<string | null>(null);
  const [ripple, setRipple] = useState<{ id: string; x: number; y: number } | null>(null);

  const selectedTopicIdeas = useMemo(() => {
    return ideas.filter((i) => i.topicId === selectedTopicId);
  }, [ideas, selectedTopicId]);

  const getRandomGradient = () => {
    return GRADIENT_COLORS[Math.floor(Math.random() * GRADIENT_COLORS.length)];
  };

  const handleCreateTopic = async () => {
    if (!newTopicTitle.trim()) return;
    setSubmitting(true);
    try {
      const topic = await apiService.createTopic({
        title: newTopicTitle.trim(),
        description: newTopicDesc.trim(),
      });
      onCreateTopic(topic);
      setShowTopicModal(false);
      setNewTopicTitle('');
      setNewTopicDesc('');
    } catch (err) {
      console.error('创建议题失败:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateIdea = async () => {
    if (!newIdeaContent.trim() || !selectedTopicId) return;
    setSubmitting(true);
    try {
      const idea = await apiService.createIdea({
        topicId: selectedTopicId,
        content: newIdeaContent.trim(),
        authorId: currentMember.id,
        authorName: currentMember.name,
        authorColor: currentMember.color,
      });
      onCreateIdea({ ...idea, gradientColor: getRandomGradient() });
      setShowIdeaModal(false);
      setNewIdeaContent('');
    } catch (err) {
      console.error('提交创意失败:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleButtonClick = (e: React.MouseEvent<HTMLButtonElement>, action: () => void) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now().toString();
    setRipple({ id, x, y });
    setTimeout(() => setRipple(null), 400);
    setTimeout(action, 50);
  };

  const toggleTopicExpand = (topicId: string) => {
    setExpandedTopicId(expandedTopicId === topicId ? null : topicId);
    setSelectedTopicId(topicId);
  };

  return (
    <div className="page-container-mobile" style={styles.pageContainer}>
      <div style={styles.header}>
        <h1 style={styles.pageTitle}>🧠 头脑风暴</h1>
        <p style={styles.pageSubtitle}>创建议题，分享创意，激发团队灵感</p>
      </div>

      <div className="brainstorm-layout-mobile" style={styles.contentLayout}>
        <div style={styles.topicsPanel}>
          <div style={styles.panelHeader}>
            <h2 style={styles.panelTitle}>议题列表</h2>
            <span style={styles.topicCount}>{topics.length} 个议题</span>
          </div>

          <div style={styles.topicsList}>
            {topics.map((topic, topicIndex) => {
              const topicIdeas = ideas.filter((i) => i.topicId === topic.id);
              const isExpanded = expandedTopicId === topic.id;
              const isSelected = selectedTopicId === topic.id;

              return (
                <div key={topic.id} style={{ animation: `fadeInUp 0.3s ease-out ${topicIndex * 0.05}s both` }}>
                  <div
                    style={{
                      ...styles.topicCard,
                      ...(isSelected ? styles.topicCardSelected : {}),
                    }}
                    onClick={() => toggleTopicExpand(topic.id)}
                  >
                    <div style={styles.topicHeader}>
                      <div style={styles.topicTitleRow}>
                        <span style={styles.topicIcon}>📌</span>
                        <h3 style={styles.topicTitle}>{topic.title}</h3>
                      </div>
                      <span style={styles.expandIcon}>{isExpanded ? '▲' : '▼'}</span>
                    </div>
                    {topic.description && (
                      <p style={styles.topicDesc}>{topic.description}</p>
                    )}
                    <div style={styles.topicMeta}>
                      <span style={styles.topicMetaItem}>
                        💡 {topicIdeas.length} 个创意
                      </span>
                    </div>
                  </div>

                  {isExpanded && (
                    <div style={styles.ideasContainer}>
                      {topicIdeas.length === 0 ? (
                        <div style={styles.emptyIdeas}>
                          <span style={{ fontSize: 32 }}>✨</span>
                          <p>还没有创意，快来提交第一个吧！</p>
                        </div>
                      ) : (
                        topicIdeas.map((idea, ideaIndex) => (
                          <div
                            key={idea.id}
                            style={{
                              ...styles.ideaCard,
                              background: idea.gradientColor || getRandomGradient(),
                              animation: `ideaFlyIn 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55) ${ideaIndex * 0.1}s both`,
                            }}
                          >
                            <div style={styles.ideaContent}>
                              {idea.content}
                            </div>
                            <div style={styles.ideaFooter}>
                              <div style={styles.ideaAuthor}>
                                <div
                                  style={{
                                    ...styles.authorAvatar,
                                    backgroundColor: idea.authorColor,
                                  }}
                                >
                                  {idea.authorName.charAt(idea.authorName.length - 1)}
                                </div>
                                <span style={styles.authorName}>{idea.authorName}</span>
                              </div>
                              <div style={styles.ideaLikes}>
                                ❤️ {idea.likes.length}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {topics.length === 0 && (
              <div style={styles.emptyTopics}>
                <span style={{ fontSize: 48 }}>📝</span>
                <p>还没有议题，点击右上角按钮创建第一个吧！</p>
              </div>
            )}
          </div>
        </div>

        <div className="members-panel-mobile" style={styles.membersPanel}>
          <div style={styles.panelHeader}>
            <h2 style={styles.panelTitle}>在线成员</h2>
            <div style={styles.onlineIndicator}>
              <span style={styles.onlineDot} />
              {members.length}
            </div>
          </div>

          <div style={styles.membersGrid}>
            {members.map((member, index) => (
              <div
                key={member.id}
                style={styles.memberCard}
              >
                <div
                  style={{
                    ...styles.memberBigAvatar,
                    backgroundColor: member.color,
                    animation: `memberFadeIn 0.3s ease-out ${index * 0.05}s both`,
                  }}
                >
                  {member.name.charAt(member.name.length - 1)}
                </div>
                <div style={styles.memberDisplayName}>{member.name}</div>
                {member.id === currentMember.id && (
                  <span style={styles.youTag}>我</span>
                )}
              </div>
            ))}
          </div>

          {selectedTopicId && (
            <div style={styles.selectedTopicCard}>
              <div style={styles.selectedTopicLabel}>当前议题</div>
              <div style={styles.selectedTopicTitle}>
                {topics.find((t) => t.id === selectedTopicId)?.title}
              </div>
              <div style={styles.selectedTopicStats}>
                <div>
                  <strong>{selectedTopicIdeas.length}</strong>
                  <span>个创意</span>
                </div>
                <div>
                  <strong>{new Set(selectedTopicIdeas.flatMap((i) => i.likes)).size}</strong>
                  <span>次点赞</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="floating-buttons-mobile" style={styles.floatingButtons}>
        <button
          className="fab-hover"
          style={styles.fabButton}
          onClick={(e) => handleButtonClick(e, () => setShowTopicModal(true))}
        >
          <span style={styles.fabIcon}>📌</span>
          <span style={styles.fabText}>新建议题</span>
        </button>
        <button
          className="fab-hover"
          style={{
            ...styles.fabButton,
            ...(styles.fabButton as any).secondary,
            opacity: selectedTopicId ? 1 : 0.5,
            pointerEvents: selectedTopicId ? 'auto' : 'none',
          }}
          onClick={(e) => handleButtonClick(e, () => setShowIdeaModal(true))}
          disabled={!selectedTopicId}
        >
          <span style={styles.fabIcon}>💡</span>
          <span style={styles.fabText}>提交创意</span>
        </button>
      </div>

      {showTopicModal && (
        <>
          <div style={styles.modalOverlay} onClick={() => setShowTopicModal(false)} />
          <div style={styles.modalWrapper}>
            <div style={styles.modal}>
              <h2 style={styles.modalTitle}>📌 创建新议题</h2>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>议题标题 *</label>
                <input
                  type="text"
                  style={styles.formInput}
                  value={newTopicTitle}
                  onChange={(e) => setNewTopicTitle(e.target.value)}
                  placeholder="例如：下季度产品方向讨论"
                  maxLength={50}
                />
                <div style={styles.charCount}>{newTopicTitle.length}/50</div>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>议题描述</label>
                <textarea
                  style={{ ...styles.formInput, height: 100, resize: 'none' }}
                  value={newTopicDesc}
                  onChange={(e) => setNewTopicDesc(e.target.value)}
                  placeholder="详细描述一下这个议题的背景和目标..."
                  maxLength={200}
                />
                <div style={styles.charCount}>{newTopicDesc.length}/200</div>
              </div>
              <div style={styles.modalActions}>
                <button
                  className="btn-hover"
                  style={{ ...styles.btn, ...styles.btnSecondary }}
                  onClick={() => setShowTopicModal(false)}
                  disabled={submitting}
                >
                  取消
                </button>
                <button
                  className="btn-hover"
                  style={{ ...styles.btn, ...styles.btnPrimary }}
                  onClick={handleCreateTopic}
                  disabled={submitting || !newTopicTitle.trim()}
                >
                  {submitting ? (
                    <span style={styles.spinnerInline} />
                  ) : (
                    '创建议题'
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {showIdeaModal && (
        <>
          <div style={styles.modalOverlay} onClick={() => setShowIdeaModal(false)} />
          <div style={styles.modalWrapper}>
            <div style={styles.modal}>
              <h2 style={styles.modalTitle}>💡 提交创意</h2>
              <div style={styles.currentTopicHint}>
                议题：<strong>{topics.find((t) => t.id === selectedTopicId)?.title}</strong>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>创意内容 *</label>
                <textarea
                  style={{ ...styles.formInput, height: 120, resize: 'none' }}
                  value={newIdeaContent}
                  onChange={(e) => setNewIdeaContent(e.target.value)}
                  placeholder="分享你的想法，越具体越好..."
                  maxLength={100}
                />
                <div style={{
                  ...styles.charCount,
                  color: newIdeaContent.length >= 100 ? '#ef5350' : undefined,
                }}>
                  {newIdeaContent.length}/100
                </div>
              </div>
              <div style={styles.modalActions}>
                <button
                  className="btn-hover"
                  style={{ ...styles.btn, ...styles.btnSecondary }}
                  onClick={() => setShowIdeaModal(false)}
                  disabled={submitting}
                >
                  取消
                </button>
                <button
                  className="btn-hover"
                  style={{ ...styles.btn, ...styles.btnPrimary }}
                  onClick={handleCreateIdea}
                  disabled={submitting || !newIdeaContent.trim()}
                >
                  {submitting ? (
                    <span style={styles.spinnerInline} />
                  ) : (
                    '提交创意'
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {ripple && (
        <div
          style={{
            position: 'fixed',
            left: ripple.x - 10,
            top: ripple.y - 10,
            width: 20,
            height: 20,
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 255, 255, 0.4)',
            pointerEvents: 'none',
            animation: 'ripple 0.4s ease-out forwards',
            zIndex: 9999,
          }}
        />
      )}

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes ideaFlyIn {
          from { opacity: 0; transform: translateX(-60px) scale(0.8); }
          to { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes memberFadeIn {
          from { opacity: 0; transform: translateX(30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes modalRise {
          from { opacity: 0; transform: translateY(60px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes ripple {
          0% { transform: scale(1); opacity: 0.5; }
          100% { transform: scale(30); opacity: 0; }
        }
        @keyframes navFill {
          from { transform: scaleY(0); }
          to { transform: scaleY(1); }
        }
      `}</style>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties & { secondary?: React.CSSProperties } } = {
  pageContainer: {
    padding: '24px 32px 120px',
    maxWidth: 1400,
    margin: '0 auto',
  },
  header: {
    marginBottom: 32,
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
  contentLayout: {
    display: 'grid',
    gridTemplateColumns: '1fr 320px',
    gap: 24,
  },
  topicsPanel: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  panelHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  panelTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: '#e0e0e0',
  },
  topicCount: {
    fontSize: 12,
    color: '#888',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: '4px 10px',
    borderRadius: 12,
  },
  topicsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  topicCard: {
    backgroundColor: '#1e1e1e',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    padding: 16,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  topicCardSelected: {
    borderColor: 'rgba(187, 134, 252, 0.4)',
    boxShadow: '0 0 20px rgba(187, 134, 252, 0.1)',
  },
  topicHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  topicTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  topicIcon: {
    fontSize: 18,
  },
  topicTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: '#e0e0e0',
  },
  expandIcon: {
    fontSize: 10,
    color: '#888',
    padding: '4px 8px',
  },
  topicDesc: {
    fontSize: 13,
    color: '#888',
    lineHeight: 1.6,
    marginBottom: 12,
  },
  topicMeta: {
    display: 'flex',
    gap: 16,
    fontSize: 12,
  },
  topicMetaItem: {
    color: '#666',
  },
  ideasContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: 12,
    marginTop: 12,
    padding: '16px',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 12,
  },
  ideaCard: {
    borderRadius: 8,
    padding: 16,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
    color: '#333',
    display: 'flex',
    flexDirection: 'column',
    minHeight: 140,
  },
  ideaContent: {
    flex: 1,
    fontSize: 14,
    lineHeight: 1.6,
    marginBottom: 12,
    fontWeight: 500,
  },
  ideaFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: 11,
    paddingTop: 8,
    borderTop: '1px solid rgba(0, 0, 0, 0.08)',
  },
  ideaAuthor: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  authorAvatar: {
    width: 22,
    height: 22,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontSize: 10,
    fontWeight: 600,
  },
  authorName: {
    color: '#555',
    fontWeight: 500,
  },
  ideaLikes: {
    color: '#e91e63',
    fontWeight: 600,
  },
  emptyIdeas: {
    gridColumn: '1 / -1',
    textAlign: 'center',
    padding: 32,
    color: '#666',
  },
  emptyTopics: {
    textAlign: 'center',
    padding: '60px 24px',
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    border: '1px dashed rgba(255, 255, 255, 0.1)',
    color: '#666',
  },
  membersPanel: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    position: 'sticky',
    top: 80,
    alignSelf: 'flex-start',
  },
  onlineIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 14,
    color: '#66bb6a',
    fontWeight: 600,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    backgroundColor: '#66bb6a',
    animation: 'pulse 2s infinite',
  },
  membersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 12,
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 16,
    border: '1px solid rgba(255, 255, 255, 0.06)',
  },
  memberCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    position: 'relative',
  },
  memberBigAvatar: {
    width: 48,
    height: 48,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontSize: 18,
    fontWeight: 600,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
  },
  memberDisplayName: {
    fontSize: 10,
    color: '#888',
    textAlign: 'center',
    maxWidth: 80,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  youTag: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#bb86fc',
    color: 'white',
    fontSize: 9,
    padding: '1px 6px',
    borderRadius: 8,
    fontWeight: 600,
  },
  selectedTopicCard: {
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 16,
    border: '1px solid rgba(187, 134, 252, 0.2)',
  },
  selectedTopicLabel: {
    fontSize: 11,
    color: '#bb86fc',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  selectedTopicTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: '#e0e0e0',
    marginBottom: 16,
  },
  selectedTopicStats: {
    display: 'flex',
    justifyContent: 'space-around',
    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
    paddingTop: 12,
  },
  floatingButtons: {
    position: 'fixed',
    right: 32,
    bottom: 32,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    zIndex: 90,
  },
  fabButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '14px 20px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    color: '#e0e0e0',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    outline: 'none',
    overflow: 'hidden',
    position: 'relative',
  },
  fabIcon: {
    fontSize: 18,
  },
  fabText: {},
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    zIndex: 1000,
    animation: 'fadeIn 0.2s ease',
  },
  modalWrapper: {
    position: 'fixed',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1001,
    pointerEvents: 'none',
    padding: 24,
  },
  modal: {
    backgroundColor: '#1e1e1e',
    borderRadius: 16,
    padding: 28,
    width: '100%',
    maxWidth: 480,
    border: '1px solid rgba(255, 255, 255, 0.08)',
    boxShadow: '0 24px 48px rgba(0, 0, 0, 0.4)',
    pointerEvents: 'auto',
    animation: 'modalRise 0.3s cubic-bezier(0.16, 1, 0.3, 1) both',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 600,
    color: '#e0e0e0',
    marginBottom: 20,
  },
  currentTopicHint: {
    fontSize: 13,
    color: '#888',
    marginBottom: 16,
    padding: 12,
    backgroundColor: 'rgba(187, 134, 252, 0.08)',
    borderRadius: 8,
  },
  formGroup: {
    marginBottom: 18,
    position: 'relative',
  },
  formLabel: {
    display: 'block',
    fontSize: 13,
    color: '#aaa',
    marginBottom: 8,
    fontWeight: 500,
  },
  formInput: {
    width: '100%',
    padding: '12px 14px',
    backgroundColor: '#121212',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    color: '#e0e0e0',
    fontSize: 14,
    outline: 'none',
    transition: 'border-color 0.2s',
    fontFamily: 'inherit',
    boxSizing: 'border-box' as const,
  },
  charCount: {
    position: 'absolute',
    right: 0,
    bottom: -18,
    fontSize: 11,
    color: '#666',
  },
  modalActions: {
    display: 'flex',
    gap: 12,
    marginTop: 32,
    justifyContent: 'flex-end',
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
    gap: 8,
    outline: 'none',
  },
  btnPrimary: {
    backgroundColor: '#bb86fc',
    color: 'white',
  },
  btnSecondary: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    color: '#ccc',
  },
  spinnerInline: {
    width: 16,
    height: 16,
    border: '2px solid transparent',
    borderTop: '2px solid white',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
};

export default BrainstormPage;
