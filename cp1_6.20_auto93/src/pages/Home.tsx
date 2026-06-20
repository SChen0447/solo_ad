import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '@/context/AppContext';
import { Topic } from '@/types';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { topics, fetchTopics, createTopic, userName, setUserName, loading } = useApp();
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [nameInput, setNameInput] = useState(userName);

  useEffect(() => {
    fetchTopics();
  }, [fetchTopics]);

  const handleCreate = async () => {
    if (!title.trim()) return;
    const topic = await createTopic(title.trim(), description.trim());
    if (topic) {
      setShowCreate(false);
      setTitle('');
      setDescription('');
      navigate(`/topic/${topic.id}`);
    }
  };

  const handleNameSave = () => {
    if (nameInput.trim()) setUserName(nameInput.trim());
  };

  return (
    <div style={{ minHeight: '100vh', background: '#1a1a2e', padding: '40px 24px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ marginBottom: 36 }}
        >
          <h1
            style={{
              color: '#ffffff',
              fontSize: 36,
              fontWeight: 700,
              marginBottom: 8,
              letterSpacing: '-0.5px',
            }}
          >
            🎨 团队灵感画布
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 16 }}>
            共创、投票、决策 — 让团队灵感高效落地
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12,
            padding: 20,
            marginBottom: 32,
            display: 'flex',
            gap: 12,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <span style={{ color: 'rgba(255,255,255,0.7)' }}>你的昵称：</span>
          <input
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onBlur={handleNameSave}
            onKeyDown={(e) => e.key === 'Enter' && handleNameSave()}
            style={{
              flex: 1,
              minWidth: 160,
              maxWidth: 280,
              padding: '8px 14px',
              borderRadius: 8,
              background: 'rgba(255,255,255,0.08)',
              color: '#fff',
              fontSize: 14,
              border: '1px solid rgba(255,255,255,0.15)',
            }}
            placeholder="输入你的昵称"
          />
          <motion.button
            whileTap={{ scale: 0.95 }}
            transition={{ duration: 0.15 }}
            onClick={() => setShowCreate(true)}
            style={{
              padding: '10px 24px',
              borderRadius: 10,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              boxShadow: '0 4px 14px rgba(102,126,234,0.4)',
            }}
          >
            + 创建灵感主题
          </motion.button>
        </motion.div>

        <div style={{ marginBottom: 16 }}>
          <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 600 }}>
            已有主题 ({topics.length})
          </h2>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 20,
          }}
        >
          <AnimatePresence>
            {topics.map((topic: Topic, idx) => (
              <motion.div
                key={topic.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.35, delay: idx * 0.05 }}
                whileHover={{ y: -4, boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}
                onClick={() => navigate(`/topic/${topic.id}`)}
                style={{
                  cursor: 'pointer',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 14,
                  padding: 22,
                  color: '#fff',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10, gap: 10 }}>
                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      background: topic.is_voting_ended
                        ? 'rgba(239,68,68,0.15)'
                        : 'rgba(34,197,94,0.15)',
                      color: topic.is_voting_ended ? '#fca5a5' : '#86efac',
                    }}
                  >
                    {topic.is_voting_ended ? '已结束' : '进行中'}
                  </span>
                  {topic.creator_id === 'admin' && topic.title === 'Q4产品创新方向' && (
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>示例</span>
                  )}
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, lineHeight: 1.4 }}>
                  {topic.title}
                </h3>
                <p
                  style={{
                    color: 'rgba(255,255,255,0.6)',
                    fontSize: 13,
                    lineHeight: 1.6,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {topic.description || '暂无描述'}
                </p>
                {topic.deadline && (
                  <div
                    style={{
                      marginTop: 12,
                      paddingTop: 12,
                      borderTop: '1px solid rgba(255,255,255,0.08)',
                      fontSize: 12,
                      color: 'rgba(255,255,255,0.5)',
                    }}
                  >
                    ⏰ 截止：{new Date(topic.deadline).toLocaleString('zh-CN')}
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {!loading && topics.length === 0 && (
            <div
              style={{
                gridColumn: '1 / -1',
                textAlign: 'center',
                padding: '60px 20px',
                color: 'rgba(255,255,255,0.4)',
                fontSize: 14,
              }}
            >
              还没有主题，点击上方按钮创建第一个吧 ✨
            </div>
          )}
        </div>

        <AnimatePresence>
          {showCreate && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreate(false)}
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
                  maxWidth: 480,
                  background: '#fff',
                  borderRadius: 18,
                  padding: 28,
                  color: '#1a1a2e',
                }}
              >
                <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 20 }}>
                  创建新灵感主题
                </h2>
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
                    主题标题
                  </label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={50}
                    placeholder="例如：Q4产品创新方向"
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: 10,
                      border: '1.5px solid #e2e8f0',
                      fontSize: 14,
                      transition: 'border-color 0.2s',
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
                    {title.length}/50
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
                    主题描述
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={300}
                    rows={4}
                    placeholder="描述一下这个主题的背景和目标..."
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: 10,
                      border: '1.5px solid #e2e8f0',
                      fontSize: 14,
                      resize: 'none',
                      transition: 'border-color 0.2s',
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
                    {description.length}/300
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowCreate(false)}
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
                    onClick={handleCreate}
                    disabled={!title.trim()}
                    style={{
                      padding: '10px 24px',
                      borderRadius: 10,
                      fontSize: 14,
                      fontWeight: 600,
                      color: '#fff',
                      background: title.trim()
                        ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                        : '#cbd5e1',
                      cursor: title.trim() ? 'pointer' : 'not-allowed',
                    }}
                  >
                    创建并进入
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Home;
