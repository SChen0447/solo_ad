import { useState, useEffect, useCallback } from 'react';
import TopicBoard from './TopicBoard';
import TopicDetail from './TopicDetail';

const adjectives = ['勇敢的', '智慧的', '冷静的', '活泼的', '温柔的', '坚强的', '机智的', '快乐的', '沉稳的', '灵动的'];
const animals = ['熊猫', '狐狸', '鲨鱼', '老鹰', '狮子', '兔子', '老虎', '海豚', '猫头鹰', '猎豹'];

const generateNickname = (): string => {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const animal = animals[Math.floor(Math.random() * animals.length)];
  return adj + animal;
};

const generateUserId = (): string => {
  return 'user_' + Math.random().toString(36).substr(2, 9);
};

function App() {
  const [currentView, setCurrentView] = useState<'board' | 'detail'>('board');
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [nickname, setNickname] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    setNickname(generateNickname());
    setUserId(generateUserId());
  }, []);

  const handleRefreshNickname = useCallback(() => {
    setIsRefreshing(true);
    setTimeout(() => {
      setNickname(generateNickname());
      setIsRefreshing(false);
    }, 500);
  }, []);

  const handleTopicClick = useCallback((topicId: string) => {
    setSelectedTopicId(topicId);
    setCurrentView('detail');
  }, []);

  const handleBackToBoard = useCallback(() => {
    setCurrentView('board');
    setSelectedTopicId(null);
  }, []);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '56px',
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e5e7eb',
        zIndex: 100,
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
        }}>
          <div 
            style={{ 
              fontSize: '18px', 
              fontWeight: 'bold', 
              color: '#1f2937',
              cursor: currentView === 'detail' ? 'pointer' : 'default',
            }}
            onClick={currentView === 'detail' ? handleBackToBoard : undefined}
          >
            {currentView === 'detail' ? '← 返回看板' : '匿名投票看板'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              backgroundColor: '#f3f4f6',
              borderRadius: '16px',
              padding: '4px 12px',
              fontSize: '14px',
              color: '#4b5563',
            }}>
              {nickname}
            </div>
            <button
              onClick={handleRefreshNickname}
              className={isRefreshing ? 'spin' : ''}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: '#eff6ff',
                color: '#3b82f6',
                fontSize: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background-color 0.3s ease-out',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#dbeafe';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#eff6ff';
              }}
              title="刷新称号"
            >
              🔄
            </button>
          </div>
        </div>
      </nav>

      <main style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '80px 24px 40px',
      }}>
        {currentView === 'board' && (
          <TopicBoard onTopicClick={handleTopicClick} />
        )}
        {currentView === 'detail' && selectedTopicId && (
          <TopicDetail 
            topicId={selectedTopicId} 
            userId={userId}
            nickname={nickname}
            onBack={handleBackToBoard}
          />
        )}
      </main>
    </div>
  );
}

export default App;
