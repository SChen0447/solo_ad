import { useState, useEffect, useCallback } from 'react';
import TopicBoard from './TopicBoard';
import TopicDetail from './TopicDetail';

const adjectives = ['勇敢的', '智慧的', '活泼的', '温柔的', '神秘的', '可爱的', '冷静的', '热情的', '机灵的', '沉稳的', '开朗的', '认真的'];
const animals = ['熊猫', '狐狸', '兔子', '猫咪', '老虎', '狮子', '松鼠', '海豚', '猫头鹰', '小鹿', '企鹅', '考拉'];

function generateNickname(): string {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const animal = animals[Math.floor(Math.random() * animals.length)];
  return `${adj}${animal}`;
}

type Route = { page: 'board' } | { page: 'detail'; topicId: string };

export default function App() {
  const [route, setRoute] = useState<Route>({ page: 'board' });
  const [nickname, setNickname] = useState<string>(() => generateNickname());
  const [isSpinning, setIsSpinning] = useState(false);

  const refreshNickname = useCallback(() => {
    setIsSpinning(true);
    setTimeout(() => {
      setNickname(generateNickname());
      setIsSpinning(false);
    }, 500);
  }, []);

  const navigateToBoard = useCallback(() => setRoute({ page: 'board' }), []);
  const navigateToDetail = useCallback((topicId: string) => setRoute({ page: 'detail', topicId }), []);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      <nav
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: 56,
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e5e7eb',
          zIndex: 100,
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            height: '100%',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div
            onClick={navigateToBoard}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              fontSize: 18,
              fontWeight: 700,
              color: '#1f2937',
            }}
          >
            <span style={{ fontSize: 24 }}>🗳️</span>
            <span>匿名投票看板</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={refreshNickname}
              title="刷新称号"
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                border: '1px solid #e5e7eb',
                backgroundColor: '#ffffff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
                transition: 'all 0.3s ease-out',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f3f4f6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#ffffff';
              }}
            >
              <span style={{ display: 'inline-block', animation: isSpinning ? 'spin 0.5s ease-in-out' : 'none' }}>
                🔄
              </span>
            </button>
            <div
              style={{
                backgroundColor: '#f3f4f6',
                borderRadius: 16,
                padding: '4px 12px',
                fontSize: 14,
                color: '#374151',
                fontWeight: 500,
              }}
            >
              {nickname}
            </div>
          </div>
        </div>
      </nav>

      <main style={{ paddingTop: 56, minHeight: '100vh' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px' }}>
          {route.page === 'board' && (
            <TopicBoard nickname={nickname} onSelectTopic={navigateToDetail} />
          )}
          {route.page === 'detail' && (
            <TopicDetail
              topicId={route.topicId}
              nickname={nickname}
              onBack={navigateToBoard}
            />
          )}
        </div>
      </main>
    </div>
  );
}
