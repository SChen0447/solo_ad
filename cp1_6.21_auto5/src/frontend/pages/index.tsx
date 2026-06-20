import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { BoardSummary, PRESET_COLORS, generateUserId, getAvatarUrl, User } from '../types';

const Home = () => {
  const router = useRouter();
  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    let userId = localStorage.getItem('board_user_id');
    let userName = localStorage.getItem('board_user_name');
    if (!userId) {
      userId = generateUserId();
      localStorage.setItem('board_user_id', userId);
    }
    if (!userName) {
      const names = ['小明', '小红', '创意达人', '设计师', '产品经理', '灵感猎手'];
      userName = names[Math.floor(Math.random() * names.length)];
      localStorage.setItem('board_user_name', userName);
    }
    setCurrentUser({
      id: userId,
      name: userName,
      avatar: getAvatarUrl(userId),
    });
    fetchBoards();
  }, []);

  const fetchBoards = async () => {
    try {
      const res = await fetch('/api/boards');
      const data = await res.json();
      setBoards(data);
    } catch (e) {
      console.error('Failed to fetch boards:', e);
    }
  };

  const createBoard = async () => {
    if (!newTitle.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDescription.trim(),
          backgroundColor: selectedColor,
        }),
      });
      const board = await res.json();
      setShowCreateModal(false);
      setNewTitle('');
      setNewDescription('');
      setSelectedColor(PRESET_COLORS[0]);
      router.push(`/board/${board.id}`);
    } catch (e) {
      console.error('Failed to create board:', e);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return `${d.getFullYear()}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}`;
  };

  const copyShareLink = (id: string) => {
    const link = `${window.location.origin}/board/${id}`;
    navigator.clipboard.writeText(link);
    alert('分享链接已复制到剪贴板！');
  };

  return (
    <>
      <Head>
        <title>灵感展板 - 创意协作平台</title>
      </Head>
      <div style={styles.container}>
        <header style={styles.header}>
          <div style={styles.headerLeft}>
            <div style={styles.logo}>🎨</div>
            <div>
              <h1 style={styles.title}>灵感展板</h1>
              <p style={styles.subtitle}>团队创意收集与协作平台</p>
            </div>
          </div>
          <div style={styles.headerRight}>
            {currentUser && (
              <div style={styles.userInfo}>
                <img src={currentUser.avatar} alt={currentUser.name} style={styles.avatar} />
                <span style={styles.userName}>{currentUser.name}</span>
              </div>
            )}
            <button style={styles.createBtn} onClick={() => setShowCreateModal(true)}>
              + 创建展板
            </button>
          </div>
        </header>

        <main style={styles.main}>
          {boards.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>📋</div>
              <h2 style={styles.emptyTitle}>还没有展板</h2>
              <p style={styles.emptyDesc}>创建第一个展板，开始收集您的创意灵感</p>
              <button style={styles.createBtnLarge} onClick={() => setShowCreateModal(true)}>
                创建第一个展板
              </button>
            </div>
          ) : (
            <div style={styles.boardGrid}>
              {boards.map((board) => (
                <div key={board.id} style={styles.boardCard} onClick={() => router.push(`/board/${board.id}`)}>
                  <div style={{ ...styles.boardPreview, backgroundColor: board.backgroundColor }}>
                    <div style={styles.boardPattern}></div>
                  </div>
                  <div style={styles.boardInfo}>
                    <h3 style={styles.boardTitle}>{board.title}</h3>
                    <p style={styles.boardDesc}>{board.description || '暂无描述'}</p>
                    <div style={styles.boardMeta}>
                      <span style={styles.metaItem}>📌 {board.cardCount} 张卡片</span>
                      <span style={styles.metaItem}>📅 {formatDate(board.createdAt)}</span>
                    </div>
                    <button
                      style={styles.shareBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        copyShareLink(board.id);
                      }}
                    >
                      🔗 复制分享链接
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

        {showCreateModal && (
          <div style={styles.modalOverlay} onClick={() => setShowCreateModal(false)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <h2 style={styles.modalTitle}>创建新展板</h2>
              <div style={styles.formGroup}>
                <label style={styles.label}>展板标题 *</label>
                <input
                  type="text"
                  style={styles.input}
                  placeholder="给展板起个名字"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  autoFocus
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>描述</label>
                <textarea
                  style={styles.textarea}
                  placeholder="简单描述这个展板的内容"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>背景色</label>
                <div style={styles.colorPicker}>
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      style={{
                        ...styles.colorOption,
                        backgroundColor: color,
                        border: selectedColor === color ? '3px solid #4A90D9' : '2px solid #e0e4e8',
                      }}
                      onClick={() => setSelectedColor(color)}
                    />
                  ))}
                </div>
              </div>
              <div style={styles.modalActions}>
                <button style={styles.cancelBtn} onClick={() => setShowCreateModal(false)}>
                  取消
                </button>
                <button
                  style={styles.confirmBtn}
                  onClick={createBoard}
                  disabled={!newTitle.trim() || loading}
                >
                  {loading ? '创建中...' : '创建展板'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f5f7fa 0%, #e8f4fd 100%)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 40px',
    background: '#fff',
    borderBottom: '1px solid #e8ecf0',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  logo: {
    fontSize: '40px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#2c3e50',
    margin: 0,
  },
  subtitle: {
    fontSize: '13px',
    color: '#7f8c8d',
    margin: '2px 0 0 0',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  avatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    border: '2px solid #e8ecf0',
  },
  userName: {
    fontSize: '14px',
    color: '#34495e',
    fontWeight: 500,
  },
  createBtn: {
    padding: '10px 24px',
    background: 'linear-gradient(135deg, #4A90D9 0%, #357ABD 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 12px rgba(74, 144, 217, 0.3)',
  },
  main: {
    padding: '40px',
    maxWidth: '1400px',
    margin: '0 auto',
  },
  emptyState: {
    textAlign: 'center',
    padding: '100px 20px',
  },
  emptyIcon: {
    fontSize: '80px',
    marginBottom: '20px',
  },
  emptyTitle: {
    fontSize: '24px',
    color: '#2c3e50',
    marginBottom: '8px',
  },
  emptyDesc: {
    fontSize: '15px',
    color: '#7f8c8d',
    marginBottom: '32px',
  },
  createBtnLarge: {
    padding: '14px 36px',
    background: 'linear-gradient(135deg, #4A90D9 0%, #357ABD 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 4px 16px rgba(74, 144, 217, 0.4)',
  },
  boardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '24px',
  },
  boardCard: {
    background: '#fff',
    borderRadius: '12px',
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
  },
  boardPreview: {
    height: '160px',
    position: 'relative',
    overflow: 'hidden',
  },
  boardPattern: {
    position: 'absolute',
    inset: 0,
    backgroundImage: 'radial-gradient(circle, #d0d7de 1px, transparent 1px)',
    backgroundSize: '20px 20px',
    opacity: 0.5,
  },
  boardInfo: {
    padding: '20px',
  },
  boardTitle: {
    fontSize: '17px',
    fontWeight: 600,
    color: '#2c3e50',
    marginBottom: '6px',
  },
  boardDesc: {
    fontSize: '13px',
    color: '#7f8c8d',
    marginBottom: '14px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
  },
  boardMeta: {
    display: 'flex',
    gap: '16px',
    marginBottom: '14px',
  },
  metaItem: {
    fontSize: '12px',
    color: '#95a5a6',
  },
  shareBtn: {
    width: '100%',
    padding: '8px 16px',
    background: '#f0f4f8',
    color: '#4A90D9',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: '#fff',
    borderRadius: '16px',
    padding: '32px',
    width: '480px',
    maxWidth: '90vw',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  },
  modalTitle: {
    fontSize: '22px',
    fontWeight: 700,
    color: '#2c3e50',
    marginBottom: '24px',
  },
  formGroup: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: 600,
    color: '#34495e',
    marginBottom: '8px',
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    border: '2px solid #e0e4e8',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s ease',
  },
  textarea: {
    width: '100%',
    padding: '12px 16px',
    border: '2px solid #e0e4e8',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'inherit',
    transition: 'border-color 0.2s ease',
  },
  colorPicker: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
  },
  colorOption: {
    width: '44px',
    height: '44px',
    borderRadius: '10px',
    cursor: 'pointer',
    padding: 0,
    transition: 'all 0.2s ease',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '28px',
  },
  cancelBtn: {
    padding: '10px 24px',
    background: '#f0f4f8',
    color: '#34495e',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  confirmBtn: {
    padding: '10px 28px',
    background: 'linear-gradient(135deg, #4A90D9 0%, #357ABD 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(74, 144, 217, 0.3)',
  },
};

export default Home;
