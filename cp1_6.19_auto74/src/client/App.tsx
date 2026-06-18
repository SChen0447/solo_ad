import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useStoryStore } from './store';
import Editor from './Editor';
import TreeView from './TreeView';
import { OnlineUser } from '../shared/types';

const App: React.FC = () => {
  const [screen, setScreen] = useState<'login' | 'editor'>('login');
  const [nameInput, setNameInput] = useState('');
  const [joinId, setJoinId] = useState('');
  const [showUsers, setShowUsers] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showTree, setShowTree] = useState(false);
  const [splitRatio, setSplitRatio] = useState(70);
  const [dragging, setDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    story,
    onlineUsers,
    currentUserName,
    setUserName,
    createStory,
    joinStory,
    updateTitle,
    exportStory,
  } = useStoryStore();

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (dragging) {
      const onMove = (e: MouseEvent) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const ratio = ((e.clientX - rect.left) / rect.width) * 100;
        setSplitRatio(Math.max(30, Math.min(90, ratio)));
      };
      const onUp = () => setDragging(false);
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
      return () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };
    }
  }, [dragging]);

  const handleCreate = useCallback(async () => {
    if (!nameInput.trim()) return;
    setUserName(nameInput.trim());
    const id = await createStory();
    await joinStory(id);
    window.history.pushState(null, '', `?story=${id}`);
    setScreen('editor');
  }, [nameInput, setUserName, createStory, joinStory]);

  const handleJoin = useCallback(async () => {
    if (!nameInput.trim() || !joinId.trim()) return;
    setUserName(nameInput.trim());
    joinStory(joinId.trim());
    window.history.pushState(null, '', `?story=${joinId.trim()}`);
    setScreen('editor');
  }, [nameInput, joinId, setUserName, joinStory]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sid = params.get('story');
    if (sid) setJoinId(sid);
  }, []);

  const handleExport = useCallback(() => {
    const json = exportStory();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${story?.title || 'story'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [exportStory, story]);

  if (screen === 'login') {
    return (
      <div style={styles.loginContainer}>
        <div style={styles.loginCard}>
          <h1 style={styles.loginTitle}>📖 故事接龙编辑器</h1>
          <p style={styles.loginSub}>多人实时协作，创造分支叙事</p>
          <input
            style={styles.input}
            placeholder="输入你的昵称"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
          />
          <button style={styles.primaryBtn} onClick={handleCreate}>
            创建新故事
          </button>
          <div style={styles.divider}>
            <span style={styles.dividerText}>或加入已有故事</span>
          </div>
          <input
            style={styles.input}
            placeholder="输入故事邀请链接ID"
            value={joinId}
            onChange={(e) => setJoinId(e.target.value)}
          />
          <button style={styles.secondaryBtn} onClick={handleJoin}>
            加入故事
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.appContainer}>
      <nav style={styles.navbar}>
        <div style={styles.navLeft}>
          {story ? (
            <input
              style={styles.titleInput}
              value={story.title}
              onChange={(e) => updateTitle(e.target.value)}
              placeholder="未命名故事"
            />
          ) : (
            <span style={styles.titleText}>未命名故事</span>
          )}
        </div>
        <div style={styles.navRight}>
          <div style={styles.onlineIndicator}>
            <span style={styles.onlineDot} />
            <span>{onlineUsers.length}</span>
          </div>
          <div style={styles.userPanelWrapper}>
            <button
              style={styles.iconBtn}
              onClick={() => setShowUsers(!showUsers)}
            >
              👥
            </button>
            {showUsers && (
              <div style={styles.userPanel}>
                <div style={styles.panelTitle}>在线用户</div>
                {onlineUsers.map((u: OnlineUser) => (
                  <div key={u.id} style={styles.userItem}>
                    <span style={styles.userDot} />
                    {u.name}
                  </div>
                ))}
              </div>
            )}
          </div>
          <button className="export-btn" style={styles.exportBtn} onClick={handleExport}>
            导出 JSON
          </button>
          {isMobile && (
            <button
              style={styles.iconBtn}
              onClick={() => setShowTree(!showTree)}
            >
              🌳
            </button>
          )}
        </div>
      </nav>

      <div ref={containerRef} style={styles.content}>
        <div
          style={{
            ...styles.editorPane,
            width: isMobile ? '100%' : `${splitRatio}%`,
            display: isMobile && showTree ? 'none' : 'block',
          }}
        >
          <Editor />
        </div>

        {!isMobile && (
          <>
            <div
              className="splitter"
              style={{
                ...styles.splitter,
                backgroundColor: dragging ? '#2196F3' : '#e0e0e0',
              }}
              onMouseDown={() => setDragging(true)}
            />
            <div style={{ ...styles.treePane, width: `${100 - splitRatio}%` }}>
              <TreeView />
            </div>
          </>
        )}

        {isMobile && showTree && (
          <div style={styles.mobileTree}>
            <TreeView />
          </div>
        )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  loginContainer: {
    width: '100vw',
    height: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#F5F7FA',
  },
  loginCard: {
    background: '#fff',
    borderRadius: 12,
    padding: '48px 40px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
    width: 400,
    maxWidth: '90vw',
  },
  loginTitle: {
    fontSize: 24,
    fontWeight: 700,
    marginBottom: 8,
    textAlign: 'center' as const,
  },
  loginSub: {
    color: '#888',
    textAlign: 'center' as const,
    marginBottom: 32,
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    borderRadius: 8,
    border: '1px solid #ddd',
    fontSize: 14,
    outline: 'none',
    marginBottom: 12,
  },
  primaryBtn: {
    width: '100%',
    padding: 12,
    borderRadius: 8,
    border: 'none',
    background: '#2196F3',
    color: '#fff',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    marginBottom: 20,
  },
  secondaryBtn: {
    width: '100%',
    padding: 12,
    borderRadius: 8,
    border: '1px solid #2196F3',
    background: '#fff',
    color: '#2196F3',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
  },
  divider: {
    textAlign: 'center' as const,
    margin: '20px 0',
    position: 'relative' as const,
  },
  dividerText: {
    background: '#fff',
    padding: '0 12px',
    color: '#aaa',
    fontSize: 13,
  },
  appContainer: {
    width: '100vw',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column' as const,
    background: '#F5F7FA',
    overflow: 'hidden',
  },
  navbar: {
    height: 56,
    background: '#fff',
    borderBottom: '1px solid #e8e8e8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 20px',
    flexShrink: 0,
  },
  navLeft: {
    display: 'flex',
    alignItems: 'center',
  },
  navRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  titleInput: {
    border: 'none',
    outline: 'none',
    fontSize: 18,
    fontWeight: 600,
    background: 'transparent',
    color: '#333',
    width: 240,
  },
  titleText: {
    fontSize: 18,
    fontWeight: 600,
    color: '#333',
  },
  onlineIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 14,
    color: '#555',
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: '#4CAF50',
    display: 'inline-block',
  },
  userPanelWrapper: {
    position: 'relative' as const,
  },
  iconBtn: {
    background: 'none',
    border: 'none',
    fontSize: 20,
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: 6,
  },
  userPanel: {
    position: 'absolute' as const,
    top: '100%',
    right: 0,
    background: '#fff',
    borderRadius: 8,
    boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
    padding: 12,
    minWidth: 180,
    zIndex: 100,
  },
  panelTitle: {
    fontWeight: 600,
    fontSize: 14,
    marginBottom: 8,
    color: '#333',
  },
  userItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 0',
    fontSize: 14,
    color: '#555',
  },
  userDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: '#4CAF50',
  },
  exportBtn: {
    padding: '8px 16px',
    borderRadius: 6,
    border: '1px solid #ddd',
    background: '#fff',
    cursor: 'pointer',
    fontSize: 13,
  },
  content: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
    position: 'relative' as const,
  },
  editorPane: {
    height: '100%',
    overflow: 'auto',
    padding: 24,
  },
  splitter: {
    width: 6,
    cursor: 'col-resize',
    flexShrink: 0,
    transition: 'background-color 0.2s',
  },
  treePane: {
    height: '100%',
    overflow: 'auto',
    background: '#FFFFFF',
    boxShadow: '-2px 0 8px rgba(0,0,0,0.05)',
    padding: 24,
  },
  mobileTree: {
    position: 'fixed' as const,
    bottom: 56,
    left: 0,
    right: 0,
    height: '50vh',
    background: '#fff',
    boxShadow: '0 -4px 16px rgba(0,0,0,0.1)',
    overflow: 'auto',
    padding: 16,
    zIndex: 50,
  },
};

export default App;
