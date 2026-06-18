import { useState, useEffect } from 'react';
import { TopicApi, TopicListItem, CreateTopicData } from './TopicApi';

interface TopicBoardProps {
  nickname: string;
  onSelectTopic: (topicId: string) => void;
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 30) return `${days}天前`;
  return new Date(timestamp).toLocaleDateString('zh-CN');
}

function TopicCard({ topic, onClick }: { topic: TopicListItem; onClick: () => void }) {
  const maxVotes = 50;
  const progressPercent = Math.min((topic.totalVotes / maxVotes) * 100, 100);

  return (
    <div
      onClick={onClick}
      style={{
        width: 320,
        height: 180,
        borderRadius: 12,
        backgroundColor: '#ffffff',
        border: '1px solid #e5e7eb',
        padding: 16,
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'all 0.3s ease-out',
        animation: 'fadeIn 0.5s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div>
        <h3
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: '#1f2937',
            marginBottom: 8,
            lineHeight: 1.4,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {topic.title}
        </h3>
        <p
          style={{
            fontSize: 14,
            color: '#9ca3af',
            marginBottom: 12,
          }}
        >
          {topic.optionsCount}个选项 · {topic.totalVotes}票 · {topic.commentsCount}条评论
        </p>
      </div>
      <div>
        <div
          style={{
            width: '100%',
            height: 8,
            backgroundColor: '#f3f4f6',
            borderRadius: 4,
            overflow: 'hidden',
            marginBottom: 8,
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progressPercent}%`,
              background: 'linear-gradient(90deg, #10b981 0%, #6ee7b7 100%)',
              borderRadius: 4,
              transition: 'width 0.3s ease-out',
            }}
          />
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            fontSize: 12,
            color: '#9ca3af',
          }}
        >
          {formatRelativeTime(topic.createdAt)}
        </div>
      </div>
    </div>
  );
}

export default function TopicBoard({ nickname, onSelectTopic }: TopicBoardProps) {
  const [topics, setTopics] = useState<TopicListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTopic, setNewTopic] = useState<CreateTopicData>({
    title: '',
    description: '',
    options: ['', ''],
  });
  const [error, setError] = useState('');

  const fetchTopics = async () => {
    try {
      setLoading(true);
      const data = await TopicApi.getTopics();
      setTopics(data);
    } catch (err) {
      console.error('获取话题列表失败', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTopics();
  }, []);

  const handleCreateTopic = async () => {
    if (!newTopic.title.trim() || !newTopic.description.trim()) {
      setError('请填写标题和描述');
      return;
    }
    const validOptions = newTopic.options.filter((o) => o.trim());
    if (validOptions.length < 2) {
      setError('请至少填写2个选项');
      return;
    }
    try {
      await TopicApi.createTopic({
        title: newTopic.title.trim(),
        description: newTopic.description.trim(),
        options: validOptions,
      });
      setShowCreateModal(false);
      setNewTopic({ title: '', description: '', options: ['', ''] });
      setError('');
      fetchTopics();
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败');
    }
  };

  const addOption = () => {
    if (newTopic.options.length < 6) {
      setNewTopic({ ...newTopic, options: [...newTopic.options, ''] });
    }
  };

  const removeOption = (index: number) => {
    if (newTopic.options.length > 2) {
      const options = newTopic.options.filter((_, i) => i !== index);
      setNewTopic({ ...newTopic, options });
    }
  };

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: '#1f2937',
              marginBottom: 4,
            }}
          >
            话题看板
          </h1>
          <p style={{ fontSize: 14, color: '#6b7280' }}>
            浏览所有投票话题，点击卡片查看详情并参与投票
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            padding: '10px 20px',
            borderRadius: 8,
            backgroundColor: '#3b82f6',
            color: '#ffffff',
            border: 'none',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.3s ease-out',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#2563eb';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#3b82f6';
          }}
        >
          + 创建话题
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 80, color: '#6b7280' }}>
          加载中...
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, 320px)',
            gap: 20,
            justifyContent: 'center',
          }}
        >
          {topics.map((topic) => (
            <TopicCard
              key={topic.id}
              topic={topic}
              onClick={() => onSelectTopic(topic.id)}
            />
          ))}
        </div>
      )}

      {showCreateModal && (
        <div
          onClick={() => setShowCreateModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 200,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 16,
              padding: 24,
              width: 480,
              maxWidth: '90%',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1f2937', marginBottom: 20 }}>
              创建新话题
            </h2>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
                话题标题
              </label>
              <input
                type="text"
                value={newTopic.title}
                onChange={(e) => setNewTopic({ ...newTopic, title: e.target.value })}
                placeholder="请输入话题标题"
                style={{
                  width: '100%',
                  height: 40,
                  borderRadius: 8,
                  border: '1px solid #d1d5db',
                  padding: '0 12px',
                  fontSize: 14,
                  outline: 'none',
                  transition: 'border-color 0.2s ease',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#3b82f6';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#d1d5db';
                }}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
                话题描述
              </label>
              <textarea
                value={newTopic.description}
                onChange={(e) => setNewTopic({ ...newTopic, description: e.target.value })}
                placeholder="请输入话题描述"
                rows={3}
                style={{
                  width: '100%',
                  borderRadius: 8,
                  border: '1px solid #d1d5db',
                  padding: 10,
                  fontSize: 14,
                  outline: 'none',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  transition: 'border-color 0.2s ease',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#3b82f6';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#d1d5db';
                }}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
                投票选项
              </label>
              {newTopic.options.map((opt, index) => (
                <div key={index} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => {
                      const options = [...newTopic.options];
                      options[index] = e.target.value;
                      setNewTopic({ ...newTopic, options });
                    }}
                    placeholder={`选项 ${index + 1}`}
                    style={{
                      flex: 1,
                      height: 40,
                      borderRadius: 8,
                      border: '1px solid #d1d5db',
                      padding: '0 12px',
                      fontSize: 14,
                      outline: 'none',
                      transition: 'border-color 0.2s ease',
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#3b82f6';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#d1d5db';
                    }}
                  />
                  {newTopic.options.length > 2 && (
                    <button
                      onClick={() => removeOption(index)}
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 8,
                        border: '1px solid #e5e7eb',
                        backgroundColor: '#f9fafb',
                        cursor: 'pointer',
                        fontSize: 16,
                        color: '#ef4444',
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              {newTopic.options.length < 6 && (
                <button
                  onClick={addOption}
                  style={{
                    width: '100%',
                    height: 36,
                    borderRadius: 8,
                    border: '1px dashed #d1d5db',
                    backgroundColor: 'transparent',
                    cursor: 'pointer',
                    fontSize: 13,
                    color: '#6b7280',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#3b82f6';
                    e.currentTarget.style.color = '#3b82f6';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#d1d5db';
                    e.currentTarget.style.color = '#6b7280';
                  }}
                >
                  + 添加选项
                </button>
              )}
            </div>
            {error && (
              <div style={{ color: '#ef4444', fontSize: 13, marginBottom: 12 }}>{error}</div>
            )}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setError('');
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: '1px solid #e5e7eb',
                  backgroundColor: '#ffffff',
                  color: '#374151',
                  fontSize: 14,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                取消
              </button>
              <button
                onClick={handleCreateTopic}
                style={{
                  padding: '8px 20px',
                  borderRadius: 8,
                  border: 'none',
                  backgroundColor: '#3b82f6',
                  color: '#ffffff',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
