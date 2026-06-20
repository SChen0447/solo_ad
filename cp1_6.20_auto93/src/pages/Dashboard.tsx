import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '@/context/AppContext';
import IdeaCard from '@/components/IdeaCard';
import VotingPanel from '@/components/VotingPanel';

const Dashboard: React.FC = () => {
  const { topicId } = useParams<{ topicId: string }>();
  const navigate = useNavigate();
  const {
    currentTopic,
    ideas,
    userVotes,
    loading,
    userId,
    selectTopic,
    createIdea,
    setDeadline,
    endVoting,
  } = useApp();

  const [showAddIdea, setShowAddIdea] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [ideaTitle, setIdeaTitle] = useState('');
  const [ideaDesc, setIdeaDesc] = useState('');
  const [deadlineInput, setDeadlineInput] = useState('');
  const [showMobilePanel, setShowMobilePanel] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showEndedBanner, setShowEndedBanner] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (topicId) selectTopic(topicId);
  }, [topicId, selectTopic]);

  useEffect(() => {
    if (currentTopic?.is_voting_ended) setShowEndedBanner(true);
  }, [currentTopic?.is_voting_ended]);

  const sortedIdeas = useMemo(() => {
    return [...ideas].sort(
      (a, b) => b.votes - a.votes || new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    );
  }, [ideas]);

  const handleAddIdea = async () => {
    if (!topicId || !ideaTitle.trim()) return;
    const result = await createIdea(topicId, ideaTitle.trim(), ideaDesc.trim());
    if (result) {
      setShowAddIdea(false);
      setIdeaTitle('');
      setIdeaDesc('');
    }
  };

  const handleSetDeadline = async () => {
    if (!topicId) return;
    try {
      await setDeadline(topicId, deadlineInput || null);
      setShowSettings(false);
    } catch (e) {
      alert('只有主题创建者可以设置截止时间');
    }
  };

  const handleEndVoting = async () => {
    if (!topicId) return;
    if (!confirm('确定要立即结束投票吗？此操作不可撤销。')) return;
    try {
      await endVoting(topicId);
      setShowSettings(false);
    } catch (e) {
      alert('只有主题创建者可以结束投票');
    }
  };

  if (loading && !currentTopic) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#1a1a2e',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
        }}
      >
        加载中...
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#1a1a2e', position: 'relative' }}>
      <AnimatePresence>
        {showEndedBanner && (
          <motion.div
            initial={{ y: -80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -80, opacity: 0 }}
            transition={{ type: 'spring', damping: 20 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              zIndex: 90,
              background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
              color: '#fff',
              padding: '14px 24px',
              textAlign: 'center',
              fontWeight: 600,
              fontSize: 15,
              boxShadow: '0 4px 20px rgba(239,68,68,0.4)',
            }}
          >
            🎉 投票已结束！感谢大家的参与，查看最终排名结果 →
          </motion.div>
        )}
      </AnimatePresence>

      <header
        style={{
          padding: showEndedBanner ? '76px 24px 20px' : '24px',
          background: 'rgba(255,255,255,0.03)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div
          style={{
            maxWidth: 1400,
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <motion.button
            whileTap={{ scale: 0.95 }}
            transition={{ duration: 0.15 }}
            onClick={() => navigate('/')}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              background: 'rgba(255,255,255,0.08)',
              color: '#fff',
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            ← 返回
          </motion.button>

          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <h1
                style={{
                  color: '#fff',
                  fontSize: 22,
                  fontWeight: 700,
                  letterSpacing: '-0.3px',
                }}
              >
                {currentTopic?.title || '加载中...'}
              </h1>
              <span
                style={{
                  padding: '3px 10px',
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 600,
                  background: currentTopic?.is_voting_ended
                    ? 'rgba(239,68,68,0.2)'
                    : 'rgba(34,197,94,0.2)',
                  color: currentTopic?.is_voting_ended ? '#fca5a5' : '#86efac',
                }}
              >
                {currentTopic?.is_voting_ended ? '投票已结束' : '投票进行中'}
              </span>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, lineHeight: 1.5 }}>
              {currentTopic?.description || '暂无描述'}
            </p>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 16px',
              borderRadius: 10,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>剩余票数</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {Array.from({ length: userVotes.max_votes }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    background:
                      i < userVotes.max_votes - userVotes.remaining_votes
                        ? '#f59e0b'
                        : 'rgba(255,255,255,0.15)',
                    transition: 'all 0.3s',
                  }}
                />
              ))}
            </div>
            <span style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>
              {userVotes.remaining_votes}/{userVotes.max_votes}
            </span>
          </div>

          {currentTopic?.creator_id === userId && !currentTopic?.is_voting_ended && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.15 }}
              onClick={() => {
                if (currentTopic.deadline) {
                  const d = new Date(currentTopic.deadline);
                  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
                    .toISOString()
                    .slice(0, 16);
                  setDeadlineInput(local);
                }
                setShowSettings(true);
              }}
              style={{
                padding: '10px 16px',
                borderRadius: 10,
                background: 'rgba(255,255,255,0.08)',
                color: '#fff',
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              ⚙️ 管理
            </motion.button>
          )}

          {!currentTopic?.is_voting_ended && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.15 }}
              onClick={() => setShowAddIdea(true)}
              style={{
                padding: '10px 22px',
                borderRadius: 10,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: '#fff',
                fontSize: 14,
                fontWeight: 600,
                boxShadow: '0 4px 14px rgba(102,126,234,0.4)',
              }}
            >
              + 添加创意
            </motion.button>
          )}

          {isMobile && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.15 }}
              onClick={() => setShowMobilePanel(true)}
              style={{
                padding: '10px 14px',
                borderRadius: 10,
                background: '#2c3e50',
                color: '#fff',
                fontSize: 13,
              }}
            >
              🏆 排行榜
            </motion.button>
          )}
        </div>

        {currentTopic?.deadline && (
          <div
            style={{
              maxWidth: 1400,
              margin: '12px auto 0',
              color: 'rgba(255,255,255,0.6)',
              fontSize: 12,
            }}
          >
            ⏰ 投票截止：{new Date(currentTopic.deadline).toLocaleString('zh-CN')}
          </div>
        )}
      </header>

      <div
        style={{
          maxWidth: 1400,
          margin: '0 auto',
          padding: '28px 24px 60px',
          display: 'flex',
          gap: 28,
          alignItems: 'flex-start',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              background: '#f0f2f5',
              borderRadius: 16,
              padding: 24,
              minHeight: 400,
            }}
          >
            {ideas.length === 0 ? (
              <div
                style={{
                  padding: '80px 20px',
                  textAlign: 'center',
                  color: '#94a3b8',
                  fontSize: 14,
                }}
              >
                还没有创意卡片{!currentTopic?.is_voting_ended && '，点击右上角"添加创意"开始吧 ✨'}
              </div>
            ) : (
              <div
                style={{
                  columns: isMobile ? '1' : 'auto',
                  columnCount: isMobile ? 1 : window.innerWidth < 1100 ? 2 : 3,
                  columnGap: 20,
                }}
              >
                <AnimatePresence>
                  {ideas.map((idea) => (
                    <div key={idea.id} style={{ breakInside: 'avoid', marginBottom: 20 }}>
                      <IdeaCard idea={idea} />
                    </div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {!isMobile && (
          <div style={{ width: 280, flexShrink: 0 }}>
            <VotingPanel ideas={sortedIdeas} isEnded={!!currentTopic?.is_voting_ended} />
          </div>
        )}
      </div>

      {isMobile && (
        <AnimatePresence>
          {showMobilePanel && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowMobilePanel(false)}
                style={{
                  position: 'fixed',
                  inset: 0,
                  background: 'rgba(0,0,0,0.5)',
                  zIndex: 95,
                }}
              />
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 30 }}
                style={{
                  position: 'fixed',
                  left: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: 96,
                  maxHeight: '80vh',
                  overflow: 'hidden',
                  borderTopLeftRadius: 20,
                  borderTopRightRadius: 20,
                }}
              >
                <VotingPanel
                  ideas={sortedIdeas}
                  isEnded={!!currentTopic?.is_voting_ended}
                  onClose={() => setShowMobilePanel(false)}
                />
              </motion.div>
            </>
          )}
        </AnimatePresence>
      )}

      <AnimatePresence>
        {showAddIdea && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowAddIdea(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(4px)',
              zIndex: 100,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20,
            }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: 520,
                background: '#fff',
                borderRadius: 18,
                padding: 28,
                color: '#1a1a2e',
              }}
            >
              <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 20 }}>✨ 添加新创意</h2>
              <div style={{ marginBottom: 16 }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: 13,
                    fontWeight: 600,
                    marginBottom: 6,
                    color: '#475569',
                  }}
                >
                  创意标题
                </label>
                <input
                  value={ideaTitle}
                  onChange={(e) => setIdeaTitle(e.target.value)}
                  maxLength={50}
                  placeholder="用一句话描述你的创意"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: 10,
                    border: '1.5px solid #e2e8f0',
                    fontSize: 14,
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = '#667eea')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = '#e2e8f0')}
                />
                <div
                  style={{
                    fontSize: 11,
                    color: '#94a3b8',
                    marginTop: 4,
                    textAlign: 'right',
                  }}
                >
                  {ideaTitle.length}/50
                </div>
              </div>
              <div style={{ marginBottom: 24 }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: 13,
                    fontWeight: 600,
                    marginBottom: 6,
                    color: '#475569',
                  }}
                >
                  详细描述
                </label>
                <textarea
                  value={ideaDesc}
                  onChange={(e) => setIdeaDesc(e.target.value)}
                  maxLength={300}
                  rows={5}
                  placeholder="展开说说你的创意，可以包括背景、方案、预期效果等"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: 10,
                    border: '1.5px solid #e2e8f0',
                    fontSize: 14,
                    resize: 'none',
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = '#667eea')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = '#e2e8f0')}
                />
                <div
                  style={{
                    fontSize: 11,
                    color: '#94a3b8',
                    marginTop: 4,
                    textAlign: 'right',
                  }}
                >
                  {ideaDesc.length}/300
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  onClick={() => setShowAddIdea(false)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: 10,
                    fontSize: 14,
                    color: '#64748b',
                    fontWeight: 500,
                    background: '#f1f5f9',
                  }}
                >
                  取消
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  onClick={handleAddIdea}
                  disabled={!ideaTitle.trim()}
                  style={{
                    padding: '10px 24px',
                    borderRadius: 10,
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#fff',
                    background: ideaTitle.trim()
                      ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                      : '#cbd5e1',
                    cursor: ideaTitle.trim() ? 'pointer' : 'not-allowed',
                  }}
                >
                  发布创意
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowSettings(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(4px)',
              zIndex: 100,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20,
            }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: 440,
                background: '#fff',
                borderRadius: 18,
                padding: 28,
                color: '#1a1a2e',
              }}
            >
              <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 20 }}>⚙️ 主题管理</h2>
              <div style={{ marginBottom: 20 }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: 13,
                    fontWeight: 600,
                    marginBottom: 6,
                    color: '#475569',
                  }}
                >
                  投票截止时间
                </label>
                <input
                  type="datetime-local"
                  value={deadlineInput}
                  onChange={(e) => setDeadlineInput(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: 10,
                    border: '1.5px solid #e2e8f0',
                    fontSize: 14,
                  }}
                />
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                  留空表示不设截止时间
                </div>
              </div>
              <div
                style={{
                  padding: 16,
                  borderRadius: 12,
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  marginBottom: 24,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: '#dc2626', marginBottom: 6 }}>
                  ⚠️ 危险操作
                </div>
                <div style={{ fontSize: 12, color: '#991b1b', marginBottom: 10, lineHeight: 1.6 }}>
                  立即结束投票将禁用所有投票按钮并公布最终结果，此操作不可撤销。
                </div>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  onClick={handleEndVoting}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    background: '#ef4444',
                    color: '#fff',
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  立即结束投票
                </motion.button>
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  onClick={() => setShowSettings(false)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: 10,
                    fontSize: 14,
                    color: '#64748b',
                    fontWeight: 500,
                    background: '#f1f5f9',
                  }}
                >
                  取消
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  onClick={handleSetDeadline}
                  style={{
                    padding: '10px 24px',
                    borderRadius: 10,
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#fff',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  }}
                >
                  保存设置
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;
