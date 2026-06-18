import { useState, useEffect, useCallback, useMemo } from 'react';
import { useStoryStore } from './stores/useStoryStore';
import { useWebSocket } from './hooks/useWebSocket';
import { StoryTimeline } from './components/StoryTimeline';
import { StoryEditor } from './components/StoryEditor';
import type { Character } from './utils/storyParser';

const styles: Record<string, React.CSSProperties> = {
  app: {
    width: '100%',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
  },
  header: {
    padding: '16px 32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    background: 'rgba(255, 251, 240, 0.6)',
    borderBottom: '1px solid rgba(180, 150, 110, 0.2)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  title: {
    fontSize: '22px',
    fontWeight: 700,
    color: '#5d4e37',
    letterSpacing: '0.5px',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  onlineUsers: {
    display: 'flex',
    alignItems: 'center',
  },
  avatarStack: {
    display: 'flex',
  },
  avatarCircle: {
    width: 34,
    height: 34,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontSize: 16,
    fontWeight: 600,
    border: '2px solid rgba(255,255,255,0.8)',
    marginLeft: -8,
    animation: 'avatarPop 0.3s ease-out',
    cursor: 'default',
    transition: 'transform 0.2s ease',
  },
  mainContainer: {
    flex: 1,
    display: 'flex',
    maxWidth: 1400,
    margin: '0 auto',
    width: '100%',
    padding: '24px 16px',
    gap: 24,
  },
  sidebar: {
    width: 280,
    flexShrink: 0,
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    background: 'rgba(255, 251, 240, 0.55)',
    borderRadius: 16,
    padding: 20,
    border: '1px solid rgba(180, 150, 110, 0.15)',
    alignSelf: 'flex-start',
    position: 'sticky',
    top: 88,
    maxHeight: 'calc(100vh - 120px)',
    overflowY: 'auto',
  },
  sidebarTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: '#5d4e37',
    marginBottom: 16,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addBtn: {
    padding: '6px 14px',
    borderRadius: 12,
    border: 'none',
    background: 'linear-gradient(135deg, #8ab17d 0%, #6b8f5e 100%)',
    color: 'white',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  characterGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 10,
  },
  characterCard: {
    padding: 12,
    borderRadius: 12,
    background: 'rgba(255, 255, 255, 0.6)',
    border: '1px solid rgba(180, 150, 110, 0.15)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    cursor: 'pointer',
    transition: 'all 0.25s ease',
  },
  characterEmoji: {
    fontSize: 28,
  },
  characterName: {
    fontSize: 13,
    fontWeight: 600,
    color: '#5d4e37',
  },
  characterActions: {
    display: 'flex',
    gap: 4,
    marginTop: 4,
  },
  iconBtn: {
    padding: '4px 8px',
    borderRadius: 8,
    border: 'none',
    background: 'rgba(93, 78, 55, 0.08)',
    color: '#5d4e37',
    fontSize: 12,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  contentArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
    minWidth: 0,
  },
  branchSelector: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 20px',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    background: 'rgba(255, 251, 240, 0.55)',
    borderRadius: 16,
    border: '1px solid rgba(180, 150, 110, 0.15)',
  },
  branchLabel: {
    fontSize: 14,
    fontWeight: 600,
    color: '#5d4e37',
  },
  branchSelect: {
    padding: '8px 14px',
    borderRadius: 12,
    border: '1px solid rgba(180, 150, 110, 0.3)',
    background: 'rgba(255, 255, 255, 0.8)',
    color: '#5d4e37',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    outline: 'none',
  },
  branchChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 12px',
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 600,
    color: 'white',
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(93, 78, 55, 0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    backdropFilter: 'blur(4px)',
  },
  modal: {
    padding: 28,
    borderRadius: 20,
    background: 'rgba(255, 251, 240, 0.95)',
    minWidth: 320,
    border: '1px solid rgba(180, 150, 110, 0.2)',
    boxShadow: '0 20px 60px rgba(93, 78, 55, 0.2)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: '#5d4e37',
    marginBottom: 20,
  },
  formRow: {
    marginBottom: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: '#5d4e37',
  },
  formInput: {
    padding: '10px 14px',
    borderRadius: 12,
    border: '1px solid rgba(180, 150, 110, 0.3)',
    background: 'rgba(255, 255, 255, 0.8)',
    color: '#5d4e37',
    fontSize: 14,
    outline: 'none',
    transition: 'all 0.2s ease',
  },
  modalActions: {
    display: 'flex',
    gap: 12,
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  cancelBtn: {
    padding: '10px 20px',
    borderRadius: 12,
    border: '1px solid rgba(180, 150, 110, 0.3)',
    background: 'transparent',
    color: '#5d4e37',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  submitBtn: {
    padding: '10px 20px',
    borderRadius: 12,
    border: 'none',
    background: 'linear-gradient(135deg, #8ab17d 0%, #6b8f5e 100%)',
    color: 'white',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 13,
    color: '#5d4e37',
    fontWeight: 500,
  },
};

export default function StoryApp() {
  const { send } = useWebSocket();
  const {
    currentUser,
    onlineUsers,
    branches,
    currentBranchId,
    setCurrentBranch,
    characters,
    addCharacter,
    updateCharacter,
    removeCharacter,
    storyTitle,
    editingUsers,
    currentBranchId: activeBranchId,
  } = useStoryStore();

  const [showCharacterModal, setShowCharacterModal] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);
  const [charName, setCharName] = useState('');
  const [charEmoji, setCharEmoji] = useState('😊');
  const [isDark, setIsDark] = useState(false);
  const [prevParagraphCount, setPrevParagraphCount] = useState(0);
  const [isBranchSwitching, setIsBranchSwitching] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDark(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const currentBranch = useMemo(
    () => branches.find((b) => b.id === currentBranchId) || null,
    [branches, currentBranchId]
  );

  const currentParagraphs = useMemo(() => {
    if (!currentBranchId) return [];
    return useStoryStore.getState().paragraphs[currentBranchId] || [];
  }, [currentBranchId, useStoryStore.getState().paragraphs]);

  useEffect(() => {
    if (currentParagraphs.length > prevParagraphCount && prevParagraphCount > 0) {
      import('./utils/sound').then((m) => m.playDingSound());
    }
    setPrevParagraphCount(currentParagraphs.length);
  }, [currentParagraphs.length, prevParagraphCount]);

  const handleBranchChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setIsBranchSwitching(true);
      setTimeout(() => {
        setCurrentBranch(e.target.value);
        send({ type: 'switch-branch', data: { branchId: e.target.value } });
        setTimeout(() => setIsBranchSwitching(false), 400);
      }, 200);
    },
    [setCurrentBranch, send]
  );

  const openAddCharacter = () => {
    setEditingCharacter(null);
    setCharName('');
    setCharEmoji('😊');
    setShowCharacterModal(true);
  };

  const openEditCharacter = (c: Character) => {
    setEditingCharacter(c);
    setCharName(c.name);
    setCharEmoji(c.emoji);
    setShowCharacterModal(true);
  };

  const submitCharacter = async () => {
    if (!charName.trim() || !charEmoji.trim()) return;
    if (editingCharacter) {
      await fetch(`/api/characters/${editingCharacter.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: charName.trim(), emoji: charEmoji.trim() }),
      });
    } else {
      await fetch('/api/characters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: charName.trim(), emoji: charEmoji.trim() }),
      });
    }
    setShowCharacterModal(false);
  };

  const deleteCharacter = async (id: string) => {
    await fetch(`/api/characters/${id}`, { method: 'DELETE' });
  };

  const darkBg = isDark
    ? { background: 'rgba(40, 40, 45, 0.6)', color: '#e8e0d0', borderColor: 'rgba(255,255,255,0.08)' }
    : {};

  const otherEditors = Object.values(editingUsers).filter(
    (e) => e.userId !== currentUser?.id && e.branchId === activeBranchId
  );

  return (
    <div style={styles.app}>
      <style>{`
        @keyframes avatarPop {
          0% { transform: scale(0); opacity: 0; }
          60% { transform: scale(1.2); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
        @keyframes fadeScaleOut {
          from { opacity: 1; transform: translateX(0) scale(1); }
          to { opacity: 0; transform: translateX(-60px) scale(0.92); }
        }
        @keyframes fadeScaleIn {
          from { opacity: 0; transform: translateX(60px) scale(0.92); }
          to { opacity: 1; transform: translateX(0) scale(1); }
        }
        .branch-switch-exit { animation: fadeScaleOut 0.2s ease forwards; }
        .branch-switch-enter { animation: fadeScaleIn 0.3s ease forwards; }
        button:hover { filter: brightness(0.93); transform: scale(0.97); }
        button:active { transform: scale(0.94); }
        .char-card:hover { transform: translateY(-3px); box-shadow: 0 8px 20px rgba(93, 78, 55, 0.12); }
        .char-card:hover .glow { opacity: 0.5; }
      `}</style>

      <header style={{ ...styles.header, ...(isDark ? { background: 'rgba(35, 35, 40, 0.7)', color: '#e8e0d0', borderColor: 'rgba(255,255,255,0.08)' } : {}) }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 28 }}>📖</span>
          <h1 style={{ ...styles.title, ...(isDark ? { color: '#e8e0d0' } : {}) }}>{storyTitle}</h1>
        </div>
        <div style={styles.headerRight}>
          {currentUser && (
            <div style={styles.userInfo}>
              <span
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  background: currentUser.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 16,
                }}
              >
                {currentUser.avatar}
              </span>
              <span style={isDark ? { color: '#e8e0d0' } : {}}>{currentUser.name}</span>
            </div>
          )}
          <div style={styles.onlineUsers}>
            <div style={styles.avatarStack}>
              {onlineUsers.slice(0, 6).map((user, idx) => (
                <div
                  key={user.id}
                  title={user.name}
                  style={{
                    ...styles.avatarCircle,
                    background: user.color,
                    zIndex: 10 - idx,
                    marginLeft: idx === 0 ? 0 : -8,
                  }}
                >
                  {user.avatar}
                </div>
              ))}
              {onlineUsers.length > 6 && (
                <div style={{ ...styles.avatarCircle, background: '#8a7b65', zIndex: 0, marginLeft: -8 }}>
                  +{onlineUsers.length - 6}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div style={styles.mainContainer}>
        <aside style={{ ...styles.sidebar, ...darkBg }}>
          <div style={styles.sidebarTitle}>
            <span style={isDark ? { color: '#e8e0d0' } : {}}>角色管理</span>
            <button style={styles.addBtn} onClick={openAddCharacter}>+ 添加</button>
          </div>
          <div style={styles.characterGrid}>
            {characters.map((c) => (
              <div
                key={c.id}
                className="char-card"
                style={{ ...styles.characterCard, position: 'relative', overflow: 'hidden' }}
                onClick={() => openEditCharacter(c)}
              >
                <div
                  className="glow"
                  style={{
                    position: 'absolute',
                    top: -20,
                    right: -20,
                    width: 60,
                    height: 60,
                    borderRadius: '50%',
                    background: `radial-gradient(circle, ${c.color} 0%, transparent 70%)`,
                    opacity: 0,
                    transition: 'opacity 0.3s ease',
                    pointerEvents: 'none',
                  }}
                />
                <div style={{ ...styles.characterEmoji, position: 'relative', zIndex: 1 }}>{c.emoji}</div>
                <div
                  style={{
                    ...styles.characterName,
                    color: c.color,
                    position: 'relative',
                    zIndex: 1,
                  }}
                >
                  {c.name}
                </div>
                <div style={styles.characterActions} onClick={(e) => e.stopPropagation()}>
                  <button
                    style={styles.iconBtn}
                    onClick={() => openEditCharacter(c)}
                  >
                    编辑
                  </button>
                  <button
                    style={{ ...styles.iconBtn, color: '#c44536' }}
                    onClick={() => deleteCharacter(c.id)}
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
            {characters.length === 0 && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 20, color: '#8a7b65', fontSize: 13 }}>
                暂无角色，点击上方按钮添加
              </div>
            )}
          </div>
        </aside>

        <div style={styles.contentArea}>
          <div style={{ ...styles.branchSelector, ...darkBg }}>
            <span style={{ ...styles.branchLabel, ...(isDark ? { color: '#e8e0d0' } : {}) }}>时间线分支：</span>
            {currentBranch && (
              <span style={{ ...styles.branchChip, background: currentBranch.color }}>
                ● {currentBranch.name}
              </span>
            )}
            <select
              style={styles.branchSelect}
              value={currentBranchId || ''}
              onChange={handleBranchChange}
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <div style={{ flex: 1 }} />
            {otherEditors.length > 0 && (
              <div style={{ fontSize: 13, color: '#8a7b65', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ animation: 'blink 0.8s infinite' }}>▋</span>
                {otherEditors.map((e) => e.userName).join('、')} 正在输入...
              </div>
            )}
          </div>

          <div className={isBranchSwitching ? 'branch-switch-exit' : 'branch-switch-enter'} key={currentBranchId}>
            <StoryTimeline />
          </div>

          <StoryEditor />
        </div>
      </div>

      {showCharacterModal && (
        <div style={styles.modalOverlay} onClick={() => setShowCharacterModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>
              {editingCharacter ? '编辑角色' : '添加角色'}
            </h2>
            <div style={styles.formRow}>
              <label style={styles.formLabel}>角色名字</label>
              <input
                style={styles.formInput}
                value={charName}
                onChange={(e) => setCharName(e.target.value)}
                placeholder="例如：小明"
                autoFocus
              />
            </div>
            <div style={styles.formRow}>
              <label style={styles.formLabel}>头像 emoji</label>
              <input
                style={styles.formInput}
                value={charEmoji}
                onChange={(e) => setCharEmoji(e.target.value)}
                placeholder="例如：👦"
              />
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                {['👦', '👧', '🧙', '🦊', '🐱', '🐶', '🦄', '👨‍🦰', '👩‍🦱', '🧝'].map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => setCharEmoji(emoji)}
                    style={{
                      padding: '6px 10px',
                      borderRadius: 8,
                      border: charEmoji === emoji ? '2px solid #8ab17d' : '1px solid rgba(180, 150, 110, 0.2)',
                      background: 'white',
                      fontSize: 18,
                      cursor: 'pointer',
                    }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
            <div style={styles.modalActions}>
              <button style={styles.cancelBtn} onClick={() => setShowCharacterModal(false)}>
                取消
              </button>
              <button style={styles.submitBtn} onClick={submitCharacter}>
                确定
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
