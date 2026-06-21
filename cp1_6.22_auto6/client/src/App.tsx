import { useState, useEffect, useMemo } from 'react';
import MindMapCanvas from './components/MindMapCanvas';
import { useSocket } from './hooks/useSocket';

interface MindMapItem {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    if (diff < 7 * 86400000) return `${Math.floor(diff / 86400000)}天前`;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  } catch {
    return dateStr;
  }
}

function HomePage({ onOpen, onDelete, onBackFromHome }: {
  onOpen: (id: string) => void;
  onDelete: (id: string, title: string) => void;
  onBackFromHome: () => void;
}) {
  const [maps, setMaps] = useState<MindMapItem[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  const loadMaps = async () => {
    try {
      const res = await fetch('/api/mindmaps');
      const data = await res.json();
      setMaps(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMaps();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || creating) return;
    setCreating(true);
    try {
      const res = await fetch('/api/mindmaps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle.trim() })
      });
      const data = await res.json();
      setNewTitle('');
      onOpen(data.id);
    } catch (e) {
      console.error(e);
    } finally {
      setCreating(false);
    }
  };

  const filteredMaps = useMemo(() => {
    if (!query.trim()) return maps;
    const q = query.toLowerCase();
    return maps.filter(m => m.title.toLowerCase().includes(q));
  }, [maps, query]);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #F7F9FC 0%, #EEF2F8 100%)',
      padding: 0
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #4A90D9 0%, #6B5CE7 100%)',
        padding: '48px 24px 80px',
        color: '#fff'
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{
              width: 48, height: 48,
              borderRadius: 14,
              background: 'rgba(255,255,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 24,
              backdropFilter: 'blur(8px)'
            }}>🧠</div>
            <div>
              <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: '-0.5px' }}>协同思维导图</h1>
              <p style={{ margin: '4px 0 0', fontSize: 14, opacity: 0.85 }}>实时协作 · 高效创作 · 灵感共享</p>
            </div>
          </div>

          <form onSubmit={handleCreate} style={{
            display: 'flex',
            gap: 12,
            marginTop: 32,
            background: 'rgba(255,255,255,0.12)',
            padding: 12,
            borderRadius: 16,
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.15)'
          }}>
            <input
              type="text"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="输入思维导图标题，如：产品需求分析、学习笔记..."
              style={{
                flex: 1,
                padding: '14px 20px',
                borderRadius: 12,
                border: 'none',
                fontSize: 15,
                outline: 'none',
                background: '#fff',
                color: '#1E293B',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
              }}
            />
            <button
              type="submit"
              disabled={creating || !newTitle.trim()}
              style={{
                padding: '14px 28px',
                borderRadius: 12,
                border: 'none',
                background: 'linear-gradient(135deg, #FFD93D, #FFB800)',
                color: '#1E293B',
                fontWeight: 700,
                fontSize: 15,
                cursor: creating || !newTitle.trim() ? 'not-allowed' : 'pointer',
                opacity: creating || !newTitle.trim() ? 0.7 : 1,
                transition: 'all 0.15s',
                boxShadow: '0 4px 12px rgba(255,184,0,0.3)'
              }}
            >
              {creating ? '创建中...' : '＋ 创建导图'}
            </button>
          </form>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '-40px auto 0', padding: '0 24px 80px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20
        }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#1E293B' }}>
            我的导图 <span style={{ color: '#94A3B8', fontWeight: 400, fontSize: 15 }}>（{maps.length}张）</span>
          </h2>
          <div style={{ position: 'relative' }}>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="搜索导图..."
              style={{
                padding: '8px 14px 8px 36px',
                borderRadius: 8,
                border: '1px solid #E0E6ED',
                background: '#fff',
                fontSize: 13,
                width: 200,
                outline: 'none'
              }}
              onFocus={e => e.currentTarget.style.borderColor = '#4A90D9'}
              onBlur={e => e.currentTarget.style.borderColor = '#E0E6ED'}
            />
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', fontSize: 14 }}>🔍</span>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#94A3B8' }}>加载中...</div>
        ) : filteredMaps.length === 0 ? (
          <div style={{
            background: '#fff',
            borderRadius: 16,
            padding: '80px 24px',
            textAlign: 'center',
            border: '1px dashed #E0E6ED'
          }}>
            <div style={{ fontSize: 56, marginBottom: 16, opacity: 0.6 }}>📋</div>
            <div style={{ fontSize: 16, color: '#64748B', marginBottom: 8 }}>
              {query ? '没有找到匹配的导图' : '还没有思维导图'}
            </div>
            <div style={{ fontSize: 13, color: '#94A3B8' }}>
              {query ? '试试其他关键词吧' : '在上方输入标题，创建你的第一张导图吧'}
            </div>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 16
          }}>
            {filteredMaps.map(m => (
              <div
                key={m.id}
                onClick={() => onOpen(m.id)}
                style={{
                  background: '#fff',
                  borderRadius: 14,
                  padding: 20,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  border: '1px solid #E8ECF1',
                  position: 'relative',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.1)';
                  e.currentTarget.style.borderColor = '#4A90D9';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.02)';
                  e.currentTarget.style.borderColor = '#E8ECF1';
                }}
              >
                <button
                  onClick={e => {
                    e.stopPropagation();
                    onDelete(m.id, m.title);
                  }}
                  style={{
                    position: 'absolute',
                    top: 10,
                    right: 10,
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    opacity: 0.3,
                    transition: 'all 0.15s',
                    fontSize: 16,
                    color: '#DC2626',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.background = '#FEF2F2'; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = '0.3'; e.currentTarget.style.background = 'transparent'; }}
                  title="删除"
                >🗑</button>

                <div style={{
                  width: 44, height: 44,
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, #D6E8F8, #E5F0FF)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22,
                  marginBottom: 14
                }}>🧠</div>

                <h3 style={{
                  margin: '0 0 12px',
                  fontSize: 16,
                  fontWeight: 600,
                  color: '#1E293B',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  paddingRight: 28
                }}>{m.title}</h3>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 12,
                  color: '#94A3B8',
                  paddingTop: 12,
                  borderTop: '1px solid #F1F5F9'
                }}>
                  <span title={`创建于 ${m.created_at}`}>📅 {formatDate(m.created_at)}</span>
                  <span title={`最后编辑 ${m.updated_at}`}>✏️ {formatDate(m.updated_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ textAlign: 'center', padding: '32px 24px', color: '#94A3B8', fontSize: 12 }}>
        © 2026 Collaborative MindMap · 多人实时协作思维导图
      </div>
    </div>
  );
}

function EditorPage({ mindmapId, shareToken, onBack }: {
  mindmapId: string | null;
  shareToken: string | null;
  onBack: () => void;
}) {
  const socket = useSocket({
    mindmapId: mindmapId || undefined,
    shareToken: shareToken || undefined
  });
  const [shareModal, setShareModal] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [copying, setCopying] = useState(false);

  const handleShare = async () => {
    if (!mindmapId) return;
    try {
      const res = await fetch(`/api/mindmaps/${mindmapId}/share`, { method: 'POST' });
      const data = await res.json();
      const url = `${window.location.origin}${data.url}`;
      setShareUrl(url);
      setShareModal(true);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopying(true);
      setTimeout(() => setCopying(false), 2000);
    } catch {
      setShareUrl(p => p);
    }
  };

  if (!socket.connected) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#F7F9FC',
        flexDirection: 'column',
        gap: 16
      }}>
        <div style={{
          width: 48, height: 48,
          border: '3px solid #E0E6ED',
          borderTopColor: '#4A90D9',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }}></div>
        <div style={{ color: '#64748B', fontSize: 14 }}>正在连接协作服务...</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const actualId = socket.mindmap?.id || mindmapId || '';

  return (
    <>
      <MindMapCanvas
        mindmapId={actualId}
        nodes={socket.nodes}
        users={socket.users}
        currentUser={socket.currentUser}
        readOnly={socket.readOnly}
        createNode={socket.createNode}
        updateNode={socket.updateNode}
        deleteNode={socket.deleteNode}
        moveCursor={socket.moveCursor}
        setEditingNode={socket.setEditingNode}
        undo={socket.undo}
        redo={socket.redo}
        canUndo={socket.canUndo}
        canRedo={socket.canRedo}
        onBack={onBack}
        onShare={handleShare}
        mindmap={socket.mindmap}
      />
      {shareModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.5)',
            zIndex: 999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(4px)'
          }}
          onClick={() => setShareModal(false)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 18,
              padding: 28,
              width: 460,
              maxWidth: '90vw',
              boxShadow: '0 24px 64px rgba(0,0,0,0.2)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{
              width: 56, height: 56,
              borderRadius: 16,
              background: 'linear-gradient(135deg, #6BCB77, #4CAF50)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
              marginBottom: 16
            }}>🔗</div>
            <h3 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700, color: '#1E293B' }}>分享思维导图</h3>
            <p style={{ margin: '0 0 20px', fontSize: 14, color: '#64748B' }}>
              此链接为只读分享，查看者可以浏览导图但无法编辑。
            </p>
            <div style={{
              display: 'flex',
              gap: 8,
              marginBottom: 20,
              background: '#F1F5F9',
              padding: 8,
              borderRadius: 12
            }}>
              <input
                readOnly
                value={shareUrl}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: '1px solid #E0E6ED',
                  fontSize: 13,
                  background: '#fff',
                  color: '#1E293B',
                  outline: 'none'
                }}
              />
              <button
                onClick={handleCopy}
                style={{
                  padding: '0 18px',
                  borderRadius: 8,
                  border: 'none',
                  background: copying ? 'linear-gradient(135deg, #6BCB77, #4CAF50)' : 'linear-gradient(135deg, #4A90D9, #357ABD)',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  minWidth: 90
                }}
              >
                {copying ? '✓ 已复制' : '复制'}
              </button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShareModal(false)}
                style={{
                  padding: '10px 22px',
                  borderRadius: 8,
                  border: '1px solid #E0E6ED',
                  background: '#fff',
                  cursor: 'pointer',
                  fontSize: 14,
                  color: '#64748B',
                  fontWeight: 500
                }}
              >关闭</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

type Route =
  | { type: 'home' }
  | { type: 'editor'; mindmapId: string }
  | { type: 'share'; token: string };

function parseRoute(): Route {
  const hash = window.location.hash.slice(1);
  const path = hash || window.location.pathname;
  if (path.startsWith('/editor/')) {
    const id = path.split('/editor/')[1];
    return { type: 'editor', mindmapId: id };
  }
  if (path.startsWith('/collab/')) {
    const token = path.split('/collab/')[1];
    return { type: 'share', token };
  }
  return { type: 'home' };
}

export default function App() {
  const [route, setRoute] = useState<Route>(parseRoute());

  useEffect(() => {
    const onPop = () => setRoute(parseRoute());
    window.addEventListener('popstate', onPop);
    window.addEventListener('hashchange', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('hashchange', onPop);
    };
  }, []);

  const navigate = (r: Route) => {
    setRoute(r);
    let url: string;
    if (r.type === 'home') url = '/';
    else if (r.type === 'editor') url = `/editor/${r.mindmapId}`;
    else url = `/collab/${r.token}`;
    if (window.location.pathname === url) return;
    window.history.pushState({}, '', url);
  };

  const handleOpen = (id: string) => navigate({ type: 'editor', mindmapId: id });
  const handleBack = () => navigate({ type: 'home' });

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`确定要删除「${title}」吗？此操作无法撤销。`)) return;
    try {
      await fetch(`/api/mindmaps/${id}`, { method: 'DELETE' });
      setRoute({ type: 'home' });
      setTimeout(() => {
        window.location.reload();
      }, 100);
    } catch (e) {
      console.error(e);
      alert('删除失败');
    }
  };

  if (route.type === 'home') {
    return <HomePage onOpen={handleOpen} onDelete={handleDelete} onBackFromHome={() => {}} />;
  }
  if (route.type === 'editor') {
    return <EditorPage mindmapId={route.mindmapId} shareToken={null} onBack={handleBack} />;
  }
  return <EditorPage mindmapId={null} shareToken={route.token} onBack={handleBack} />;
}
