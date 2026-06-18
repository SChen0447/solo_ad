import React, { useState, useEffect, useCallback } from 'react';
import { fetchTopics, createTopic, type Topic } from './TopicApi';

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}秒前`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  return `${days}天前`;
}

interface Props {
  onSelectTopic: (id: string) => void;
}

export default function TopicBoard({ onSelectTopic }: Props) {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newOptions, setNewOptions] = useState(['', '', '']);
  const [fadeInIds, setFadeInIds] = useState<Set<string>>(new Set());

  const loadTopics = useCallback(async () => {
    try {
      const data = await fetchTopics();
      const existingIds = new Set(topics.map((t) => t.id));
      const newIds = new Set<string>();
      data.forEach((t) => {
        if (!existingIds.has(t.id)) newIds.add(t.id);
      });
      if (newIds.size > 0) {
        setFadeInIds(newIds);
        setTimeout(() => setFadeInIds(new Set()), 600);
      }
      setTopics(data);
    } catch (err) {
      console.error('Failed to load topics:', err);
    } finally {
      setLoading(false);
    }
  }, [topics]);

  useEffect(() => {
    loadTopics();
  }, []);

  const handleCreate = async () => {
    const filtered = newOptions.filter((o) => o.trim() !== '');
    if (!newTitle.trim() || filtered.length < 2) return;
    try {
      await createTopic({ title: newTitle, description: newDesc, options: filtered });
      setNewTitle('');
      setNewDesc('');
      setNewOptions(['', '', '']);
      setShowCreate(false);
      await loadTopics();
    } catch (err) {
      console.error('Failed to create topic:', err);
    }
  };

  const addOptionField = () => {
    if (newOptions.length < 6) {
      setNewOptions([...newOptions, '']);
    }
  };

  const removeOptionField = (index: number) => {
    if (newOptions.length > 2) {
      setNewOptions(newOptions.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index: number, value: string) => {
    const updated = [...newOptions];
    updated[index] = value;
    setNewOptions(updated);
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80, color: '#9ca3af' }}>
        加载中...
      </div>
    );
  }

  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
      }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: '#1f2937', margin: 0 }}>
          话题看板
        </h2>
        <button
          onClick={() => setShowCreate(!showCreate)}
          style={{
            background: '#3b82f6',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '8px 20px',
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'background 0.3s ease-out',
          }}
        >
          + 创建话题
        </button>
      </div>

      {showCreate && (
        <div style={{
          background: '#fff',
          borderRadius: 12,
          border: '1px solid #e5e7eb',
          padding: 24,
          marginBottom: 24,
          animation: 'fadeSlideIn 0.3s ease-out',
        }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1f2937', margin: '0 0 16px' }}>
            创建新话题
          </h3>
          <input
            type="text"
            placeholder="话题标题"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            style={{
              width: '100%',
              height: 40,
              borderRadius: 8,
              border: '1px solid #d1d5db',
              padding: '0 12px',
              fontSize: 14,
              marginBottom: 12,
              boxSizing: 'border-box',
              outline: 'none',
            }}
            onFocus={(e) => (e.target.style.borderColor = '#3b82f6')}
            onBlur={(e) => (e.target.style.borderColor = '#d1d5db')}
          />
          <textarea
            placeholder="话题描述（可选）"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            style={{
              width: '100%',
              height: 60,
              borderRadius: 8,
              border: '1px solid #d1d5db',
              padding: '8px 12px',
              fontSize: 14,
              marginBottom: 12,
              boxSizing: 'border-box',
              resize: 'vertical',
              outline: 'none',
              fontFamily: 'inherit',
            }}
            onFocus={(e) => (e.target.style.borderColor = '#3b82f6')}
            onBlur={(e) => (e.target.style.borderColor = '#d1d5db')}
          />
          {newOptions.map((opt, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input
                type="text"
                placeholder={`选项 ${i + 1}`}
                value={opt}
                onChange={(e) => updateOption(i, e.target.value)}
                style={{
                  flex: 1,
                  height: 36,
                  borderRadius: 8,
                  border: '1px solid #d1d5db',
                  padding: '0 12px',
                  fontSize: 14,
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#3b82f6')}
                onBlur={(e) => (e.target.style.borderColor = '#d1d5db')}
              />
              {newOptions.length > 2 && (
                <button
                  onClick={() => removeOptionField(i)}
                  style={{
                    background: '#fee2e2',
                    color: '#ef4444',
                    border: 'none',
                    borderRadius: 8,
                    width: 36,
                    cursor: 'pointer',
                    fontSize: 16,
                  }}
                >
                  ×
                </button>
              )}
            </div>
          ))}
          {newOptions.length < 6 && (
            <button
              onClick={addOptionField}
              style={{
                background: 'none',
                border: '1px dashed #d1d5db',
                borderRadius: 8,
                width: '100%',
                height: 36,
                color: '#9ca3af',
                cursor: 'pointer',
                marginBottom: 16,
                fontSize: 14,
              }}
            >
              + 添加选项
            </button>
          )}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              onClick={() => setShowCreate(false)}
              style={{
                background: '#f3f4f6',
                border: 'none',
                borderRadius: 8,
                padding: '8px 20px',
                fontSize: 14,
                cursor: 'pointer',
                color: '#6b7280',
              }}
            >
              取消
            </button>
            <button
              onClick={handleCreate}
              style={{
                background: '#3b82f6',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '8px 20px',
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              创建
            </button>
          </div>
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: 20,
      }}>
        {topics.map((topic) => {
          const totalVotes = topic.options.reduce((sum, o) => sum + o.votes, 0);
          const maxVotes = Math.max(...topic.options.map((o) => o.votes), 1);
          const progressPercent = Math.min((totalVotes / (maxVotes * topic.options.length)) * 100, 100);
          const isFading = fadeInIds.has(topic.id);

          return (
            <div
              key={topic.id}
              onClick={() => onSelectTopic(topic.id)}
              style={{
                width: '100%',
                minHeight: 180,
                background: '#fff',
                borderRadius: 12,
                border: '1px solid #e5e7eb',
                padding: 20,
                cursor: 'pointer',
                transition: 'transform 0.3s ease-out, box-shadow 0.3s ease-out',
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                opacity: isFading ? 0 : 1,
                animation: isFading ? 'fadeIn 0.5s ease forwards' : 'none',
                position: 'relative',
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
                <div style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: '#1f2937',
                  marginBottom: 8,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {topic.title}
                </div>
                <div style={{ fontSize: 14, color: '#9ca3af', marginBottom: 4 }}>
                  {topic.options.length}个选项 · {totalVotes}票
                </div>
                <div style={{ fontSize: 14, color: '#9ca3af' }}>
                  {topic.comments.length}条评论
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <div style={{
                  width: '100%',
                  height: 6,
                  background: '#e5e7eb',
                  borderRadius: 3,
                  overflow: 'hidden',
                }}>
                  <div style={{
                    width: `${progressPercent}%`,
                    height: '100%',
                    background: 'linear-gradient(to right, #22c55e, #86efac)',
                    borderRadius: 3,
                    transition: 'width 0.3s ease-out',
                  }} />
                </div>
                <div style={{
                  fontSize: 12,
                  color: '#9ca3af',
                  textAlign: 'right',
                  marginTop: 8,
                }}>
                  {formatRelativeTime(topic.createdAt)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {topics.length === 0 && !loading && (
        <div style={{ textAlign: 'center', padding: 80, color: '#9ca3af' }}>
          暂无话题，点击上方按钮创建第一个话题
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 767px) {
          .topic-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
