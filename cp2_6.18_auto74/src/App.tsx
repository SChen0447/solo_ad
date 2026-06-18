import { useState, useEffect, useCallback } from 'react';
import TopicBoard from './TopicBoard';
import TopicDetail from './TopicDetail';

const ADJECTIVES = [
  '勇敢的', '智慧的', '快乐的', '神秘的', '温柔的',
  '活泼的', '沉稳的', '好奇的', '热情的', '优雅的',
  '机智的', '谦逊的', '开朗的', '冷静的', '认真的',
];

const ANIMALS = [
  '熊猫', '狐狸', '海豚', '老虎', '兔子',
  '猫头鹰', '蝴蝶', '鲸鱼', '狮子', '猫咪',
  '松鼠', '天鹅', '树懒', '浣熊', '刺猬',
];

function generateNickname(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  return `${adj}${animal}`;
}

function generateUserId(): string {
  return 'u_' + Math.random().toString(36).slice(2, 10);
}

export default function App() {
  const [currentTopicId, setCurrentTopicId] = useState<string | null>(null);
  const [nickname, setNickname] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [isSpinning, setIsSpinning] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    setNickname(generateNickname());
    setUserId(generateUserId());
  }, []);

  const refreshNickname = useCallback(() => {
    setIsSpinning(true);
    setTimeout(() => {
      setNickname(generateNickname());
      setUserId(generateUserId());
      setIsSpinning(false);
    }, 500);
  }, []);

  const goToDetail = (id: string) => {
    setCurrentTopicId(id);
  };

  const goToBoard = () => {
    setCurrentTopicId(null);
  };

  return (
    <div style={styles.app}>
      <nav style={styles.navbar}>
        <div style={styles.navContainer}>
          <div style={styles.navLeft}>
            <h1
              onClick={goToBoard}
              style={{
                ...styles.logo,
                cursor: currentTopicId ? 'pointer' : 'default',
              }}
            >
              🗳️ 匿名投票看板
            </h1>
            {!currentTopicId && !showCreate && (
              <button style={styles.createBtn} onClick={() => setShowCreate(true)}>
                + 创建话题
              </button>
            )}
            {!currentTopicId && showCreate && (
              <button
                style={{ ...styles.createBtn, background: '#6b7280' }}
                onClick={() => setShowCreate(false)}
              >
                取消
              </button>
            )}
          </div>
          <div style={styles.navRight}>
            <button
              onClick={refreshNickname}
              style={{
                ...styles.refreshBtn,
                transform: isSpinning ? 'rotate(360deg)' : 'rotate(0deg)',
                transition: 'transform 0.5s ease-in-out',
              }}
              title="刷新称号"
            >
              🔄
            </button>
            <span style={styles.nicknameTag}>{nickname}</span>
          </div>
        </div>
      </nav>

      <main style={styles.main}>
        <div style={styles.content}>
          {currentTopicId ? (
            <TopicDetail
              topicId={currentTopicId}
              userId={userId}
              nickname={nickname}
              onBack={goToBoard}
            />
          ) : (
            <TopicBoard
              onSelectTopic={goToDetail}
              showCreate={showCreate}
              onCreated={() => setShowCreate(false)}
              userId={userId}
              nickname={nickname}
            />
          )}
        </div>
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    minHeight: '100vh',
    background: '#f9fafb',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    color: '#1f2937',
  },
  navbar: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    height: 56,
    background: '#ffffff',
    borderBottom: '1px solid #e5e7eb',
    zIndex: 100,
    display: 'flex',
    alignItems: 'center',
  },
  navContainer: {
    width: '100%',
    maxWidth: 1200,
    margin: '0 auto',
    padding: '0 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  navRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  logo: {
    fontSize: 18,
    fontWeight: 700,
    margin: 0,
    color: '#1f2937',
  },
  createBtn: {
    background: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    padding: '8px 16px',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.3s ease-out',
  },
  refreshBtn: {
    background: 'none',
    border: 'none',
    fontSize: 20,
    cursor: 'pointer',
    padding: 4,
    lineHeight: 1,
  },
  nicknameTag: {
    background: '#f3f4f6',
    borderRadius: 16,
    padding: '4px 12px',
    fontSize: 14,
    color: '#374151',
    fontWeight: 500,
  },
  main: {
    paddingTop: 72,
    paddingBottom: 32,
  },
  content: {
    maxWidth: 1200,
    margin: '0 auto',
    padding: '0 24px',
  },
};
