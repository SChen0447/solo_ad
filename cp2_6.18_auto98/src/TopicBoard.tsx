import { useState, useEffect, useCallback } from 'react';
import { TopicApi, Topic } from './TopicApi';

interface TopicBoardProps {
  onTopicClick: (topicId: string) => void;
}

const formatRelativeTime = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  return `${days}天前`;
};

const getTotalVotes = (topic: Topic): number => {
  return topic.options.reduce((sum, opt) => sum + opt.votes, 0);
};

function TopicBoard({ onTopicClick }: TopicBoardProps) {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newOptions, setNewOptions] = useState(['', '']);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchTopics = useCallback(async () => {
    try {
      const data = await TopicApi.getTopics();
      setTopics(data);
    } catch (error) {
      console.error('Failed to fetch topics:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTopics();
  }, [fetchTopics]);

  const handleCreateTopic = async () => {
    if (!newTitle.trim() || !newDescription.trim()) return;
    const validOptions = newOptions.filter(opt => opt.trim());
    if (validOptions.length < 2) return;

    setIsSubmitting(true);
    try {
      await TopicApi.createTopic({
        title: newTitle.trim(),
        description: newDescription.trim(),
        options: validOptions,
      });
      setShowCreateModal(false);
      setNewTitle('');
      setNewDescription('');
      setNewOptions(['', '']);
      fetchTopics();
    } catch (error) {
      console.error('Failed to create topic:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddOption = () => {
    if (newOptions.length < 6) {
      setNewOptions([...newOptions, '']);
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const updated = [...newOptions];
    updated[index] = value;
    setNewOptions(updated);
  };

  const handleRemoveOption = (index: number) => {
    if (newOptions.length > 2) {
      const updated = newOptions.filter((_, i) => i !== index);
      setNewOptions(updated);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>
        加载中...
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>
          投票话题看板
        </h1>
        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            padding: '10px 20px',
            backgroundColor: '#3b82f6',
            color: '#ffffff',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
            transition: 'background-color 0.3s ease-out',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#2563eb';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#3b82f6';
          }}
        >
          + 创建新话题
        </button>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, 320px)',
        gap: '20px',
        justifyContent: 'center',
      }}>
        {topics.map((topic) => {
          const totalVotes = getTotalVotes(topic);
          const maxVotes = Math.max(...topic.options.map(o => o.votes), 1);
          const participationRate = totalVotes > 0 ? (totalVotes / (totalVotes + 10)) * 100 : 0;
          
          return (
            <div
              key={topic.id}
              className="fade-in"
              onClick={() => onTopicClick(topic.id)}
              style={{
                width: '320px',
                height: '180px',
                borderRadius: '12px',
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                cursor: 'pointer',
                transition: 'transform 0.3s ease-out, box-shadow 0.3s ease-out',
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
                <h3 style={{
                  fontSize: '16px',
                  fontWeight: 'bold',
                  color: '#1f2937',
                  marginBottom: '8px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  lineHeight: '1.4',
                  minHeight: '45px',
                }}>
                  {topic.title}
                </h3>
                <div style={{
                  fontSize: '14px',
                  color: '#9ca3af',
                  display: 'flex',
                  gap: '16px',
                }}>
                  <span>{topic.options.length}个选项</span>
                  <span>{totalVotes}票</span>
                </div>
              </div>
              
              <div>
                <div style={{
                  width: '100%',
                  height: '8px',
                  borderRadius: '4px',
                  backgroundColor: '#f3f4f6',
                  overflow: 'hidden',
                  marginBottom: '8px',
                }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(participationRate, 100)}%`,
                    background: 'linear-gradient(90deg, #10b981, #6ee7b7)',
                    transition: 'width 0.3s ease-out',
                  }} />
                </div>
                <div style={{
                  fontSize: '12px',
                  color: '#9ca3af',
                  textAlign: 'right',
                }}>
                  {formatRelativeTime(topic.createdAt)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showCreateModal && (
        <div style={{
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
        }} onClick={() => setShowCreateModal(false)}>
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '24px',
              width: '90%',
              maxWidth: '500px',
              maxHeight: '80vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1f2937', marginBottom: '20px' }}>
              创建新话题
            </h2>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', color: '#374151', marginBottom: '6px' }}>
                话题标题
              </label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="请输入话题标题"
                style={{
                  width: '100%',
                  height: '40px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  padding: '0 12px',
                  fontSize: '14px',
                  transition: 'border-color 0.2s ease',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#3b82f6';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#d1d5db';
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', color: '#374151', marginBottom: '6px' }}>
                话题描述
              </label>
              <textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="请输入话题描述"
                rows={3}
                style={{
                  width: '100%',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  padding: '10px 12px',
                  fontSize: '14px',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  transition: 'border-color 0.2s ease',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#3b82f6';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#d1d5db';
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', color: '#374151', marginBottom: '6px' }}>
                投票选项（至少2个）
              </label>
              {newOptions.map((option, index) => (
                <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    placeholder={`选项 ${index + 1}`}
                    style={{
                      flex: 1,
                      height: '40px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      padding: '0 12px',
                      fontSize: '14px',
                      transition: 'border-color 0.2s ease',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#3b82f6';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#d1d5db';
                    }}
                  />
                  {newOptions.length > 2 && (
                    <button
                      onClick={() => handleRemoveOption(index)}
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '8px',
                        backgroundColor: '#fee2e2',
                        color: '#ef4444',
                        fontSize: '18px',
                        transition: 'background-color 0.2s ease',
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              {newOptions.length < 6 && (
                <button
                  onClick={handleAddOption}
                  style={{
                    width: '100%',
                    height: '36px',
                    borderRadius: '8px',
                    backgroundColor: '#f3f4f6',
                    color: '#6b7280',
                    fontSize: '14px',
                    transition: 'background-color 0.2s ease',
                  }}
                >
                  + 添加选项
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  backgroundColor: '#f3f4f6',
                  color: '#4b5563',
                  fontSize: '14px',
                  transition: 'background-color 0.2s ease',
                }}
              >
                取消
              </button>
              <button
                onClick={handleCreateTopic}
                disabled={isSubmitting || !newTitle.trim() || !newDescription.trim() || newOptions.filter(o => o.trim()).length < 2}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  backgroundColor: '#3b82f6',
                  color: '#ffffff',
                  fontSize: '14px',
                  transition: 'background-color 0.2s ease',
                  opacity: (isSubmitting || !newTitle.trim() || !newDescription.trim() || newOptions.filter(o => o.trim()).length < 2) ? 0.5 : 1,
                }}
              >
                {isSubmitting ? '创建中...' : '创建话题'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TopicBoard;
