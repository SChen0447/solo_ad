import { useState, useEffect, useCallback } from 'react';
import TopicBoard from './TopicBoard';
import TopicDetail from './TopicDetail';

type Page = 'board' | 'detail';

const ADJECTIVES = [
  '勇敢的', '智慧的', '敏捷的', '沉稳的', '快乐的',
  '好奇的', '友善的', '热情的', '勤奋的', '乐观的',
  '冷静的', '开朗的', '专注的', '诚实的', '幽默的'
];

const ANIMALS = [
  '熊猫', '狐狸', '猎豹', '大象', '海豚',
  '松鼠', '老虎', '兔子', '猫头鹰', '鲸鱼',
  '马', '鹿', '蝴蝶', '企鹅', '树袋熊'
];

function generateAnonymousName(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  return `${adj}${animal}`;
}

function generateUserId(): string {
  let id = localStorage.getItem('voting_user_id');
  if (!id) {
    id = 'user_' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('voting_user_id', id);
  }
  return id;
}

export default function App() {
  const [page, setPage] = useState<Page>('board');
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [userId] = useState<string>(() => generateUserId());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newOptions, setNewOptions] = useState<string[]>(['', '']);

  const refreshUserName = useCallback(() => {
    setIsRefreshing(true);
    setTimeout(() => {
      setUserName(generateAnonymousName());
      setIsRefreshing(false);
    }, 500);
  }, []);

  useEffect(() => {
    setUserName(generateAnonymousName());
  }, []);

  const handleTopicClick = (topicId: string) => {
    setSelectedTopicId(topicId);
    setPage('detail');
    window.scrollTo(0, 0);
  };

  const handleBackToBoard = () => {
    setPage('board');
    setSelectedTopicId(null);
  };

  const handleAddOption = () => {
    if (newOptions.length < 6) {
      setNewOptions([...newOptions, '']);
    }
  };

  const handleRemoveOption = (index: number) => {
    if (newOptions.length > 2) {
      setNewOptions(newOptions.filter((_, i) => i !== index));
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const updated = [...newOptions];
    updated[index] = value;
    setNewOptions(updated);
  };

  const handleCreateTopic = async () => {
    if (!newTitle.trim() || newOptions.filter(o => o.trim()).length < 2) {
      alert('请填写话题标题和至少2个选项');
      return;
    }
    try {
      const res = await fetch('/api/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDescription.trim(),
          options: newOptions.filter(o => o.trim())
        })
      });
      const data = await res.json();
      if (data.id) {
        setShowCreateModal(false);
        setNewTitle('');
        setNewDescription('');
        setNewOptions(['', '']);
        setPage('board');
        setTimeout(() => {
          handleTopicClick(data.id);
        }, 100);
      }
    } catch (e) {
      alert('创建话题失败，请重试');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f9fafb',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      color: '#1f2937'
    }}>
      <nav style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        height: '56px',
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        alignItems: 'center'
      }}>
        <div style={{
          maxWidth: '1200px',
          width: '100%',
          margin: '0 auto',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <h1
              onClick={handleBackToBoard}
              style={{
                fontSize: '18px',
                fontWeight: 700,
                color: '#3b82f6',
                cursor: page === 'detail' ? 'pointer' : 'default',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span style={{ fontSize: '22px' }}>📊</span>
              匿名投票看板
            </h1>
            {page === 'board' && (
              <button
                onClick={() => setShowCreateModal(true)}
                style={{
                  height: '36px',
                  padding: '0 16px',
                  borderRadius: '8px',
                  backgroundColor: '#3b82f6',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'background-color 0.3s ease-out',
                  fontSize: '14px'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2563eb')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#3b82f6')}
              >
                + 发起话题
              </button>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={refreshUserName}
              title="刷新匿名称号"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                border: '1px solid #e5e7eb',
                backgroundColor: '#ffffff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                transition: 'transform 0.5s ease-in-out',
                transform: isRefreshing ? 'rotate(360deg)' : 'rotate(0deg)'
              }}
            >
              🔄
            </button>
            <div style={{
              backgroundColor: '#f3f4f6',
              borderRadius: '16px',
              padding: '4px 12px',
              fontSize: '14px',
              color: '#4b5563',
              fontWeight: 500
            }}>
              {userName}
            </div>
          </div>
        </div>
      </nav>

      <main style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '32px 24px'
      }}>
        {page === 'board' && (
          <TopicBoard onTopicClick={handleTopicClick} />
        )}
        {page === 'detail' && selectedTopicId && (
          <TopicDetail
            topicId={selectedTopicId}
            onBack={handleBackToBoard}
            userId={userId}
            userName={userName}
          />
        )}
      </main>

      {showCreateModal && (
        <div
          onClick={() => setShowCreateModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            animation: 'fadeIn 0.3s ease-out'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '520px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '28px',
              border: '1px solid #e5e7eb'
            }}
          >
            <h2 style={{ margin: 0, marginBottom: '20px', fontSize: '20px', fontWeight: 700, color: '#1f2937' }}>
              发起新话题
            </h2>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500, color: '#374151' }}>
                话题标题
              </label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="如：团建活动方案选择"
                style={{
                  width: '100%',
                  height: '40px',
                  padding: '0 12px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  outline: 'none',
                  transition: 'border-color 0.3s ease-out'
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#3b82f6')}
                onBlur={(e) => (e.currentTarget.style.borderColor = '#d1d5db')}
              />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500, color: '#374151' }}>
                话题描述（可选）
              </label>
              <textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="简单描述一下这个话题..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  outline: 'none',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  transition: 'border-color 0.3s ease-out'
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#3b82f6')}
                onBlur={(e) => (e.currentTarget.style.borderColor = '#d1d5db')}
              />
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500, color: '#374151' }}>
                投票选项（至少2个，最多6个）
              </label>
              {newOptions.map((opt, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '6px',
                    backgroundColor: '#eff6ff',
                    color: '#3b82f6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 600,
                    flexShrink: 0
                  }}>
                    {idx + 1}
                  </span>
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => handleOptionChange(idx, e.target.value)}
                    placeholder={`选项 ${idx + 1}`}
                    style={{
                      flex: 1,
                      height: '40px',
                      padding: '0 12px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                      outline: 'none',
                      transition: 'border-color 0.3s ease-out'
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = '#3b82f6')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = '#d1d5db')}
                  />
                  {newOptions.length > 2 && (
                    <button
                      onClick={() => handleRemoveOption(idx)}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        border: '1px solid #fee2e2',
                        backgroundColor: '#fef2f2',
                        color: '#ef4444',
                        cursor: 'pointer',
                        fontSize: '16px',
                        flexShrink: 0,
                        transition: 'background-color 0.2s ease'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fee2e2')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#fef2f2')}
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
                    border: '1px dashed #d1d5db',
                    backgroundColor: '#f9fafb',
                    color: '#6b7280',
                    cursor: 'pointer',
                    fontSize: '14px',
                    transition: 'all 0.2s ease'
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
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{
                  height: '40px',
                  padding: '0 20px',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  backgroundColor: '#ffffff',
                  color: '#4b5563',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                  transition: 'background-color 0.2s ease'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f9fafb')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
              >
                取消
              </button>
              <button
                onClick={handleCreateTopic}
                style={{
                  height: '40px',
                  padding: '0 20px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#3b82f6',
                  color: '#ffffff',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                  transition: 'background-color 0.2s ease'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2563eb')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#3b82f6')}
              >
                创建话题
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
