import React, { useState, useCallback, useEffect } from 'react';
import TopicBoard from './TopicBoard';
import TopicDetail from './TopicDetail';

const ADJECTIVES = [
  '勇敢的', '智慧的', '灵动的', '温柔的', '热烈的',
  '沉静的', '敏捷的', '坚毅的', '洒脱的', '优雅的',
];
const ANIMALS = [
  '熊猫', '狐狸', '猎豹', '海豚', '雄鹰',
  '白鲸', '雪豹', '火烈鸟', '独角兽', '猫头鹰',
];

const AVATAR_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#6366f1',
];

function generateNickname(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  return `${adj}${animal}`;
}

function generateUserId(): string {
  return 'user_' + Math.random().toString(36).substring(2, 10);
}

function getRandomAvatarColor(): string {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}

export default function App() {
  const [userId] = useState(generateUserId);
  const [nickname, setNickname] = useState(generateNickname);
  const [avatarColor] = useState(getRandomAvatarColor);
  const [currentView, setCurrentView] = useState<'board' | 'detail'>('board');
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [spinning, setSpinning] = useState(false);

  const handleSelectTopic = useCallback((id: string) => {
    setSelectedTopicId(id);
    setCurrentView('detail');
  }, []);

  const handleBack = useCallback(() => {
    setSelectedTopicId(null);
    setCurrentView('board');
  }, []);

  const handleRefreshNickname = useCallback(() => {
    setSpinning(true);
    setTimeout(() => {
      setNickname(generateNickname());
      setSpinning(false);
    }, 500);
  }, []);

  useEffect(() => {
    localStorage.setItem('voting_user_id', userId);
  }, [userId]);

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 56,
        background: '#fff',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        zIndex: 1000,
        boxSizing: 'border-box',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1
            onClick={handleBack}
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: '#1f2937',
              cursor: 'pointer',
              margin: 0,
            }}
          >
            🗳️ 匿名投票看板
          </h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            background: '#f3f4f6',
            borderRadius: 16,
            padding: '4px 12px',
            fontSize: 14,
            color: '#374151',
          }}>
            {nickname}
          </span>
          <button
            onClick={handleRefreshNickname}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 18,
              transition: 'transform 0.5s ease-in-out',
              transform: spinning ? 'rotate(360deg)' : 'rotate(0deg)',
              padding: 4,
              lineHeight: 1,
            }}
          >
            🔄
          </button>
        </div>
      </nav>

      <div style={{
        maxWidth: 1200,
        margin: '0 auto',
        padding: '72px 24px 24px',
      }}>
        {currentView === 'board' && (
          <TopicBoard onSelectTopic={handleSelectTopic} />
        )}
        {currentView === 'detail' && selectedTopicId && (
          <TopicDetail
            topicId={selectedTopicId}
            onBack={handleBack}
            userId={userId}
            nickname={nickname}
            avatarColor={avatarColor}
          />
        )}
      </div>
    </div>
  );
}
