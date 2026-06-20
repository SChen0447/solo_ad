import { useState, useEffect, useCallback, useRef, createContext, useContext, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  User, Workspace, Document, Version, Comment, Activity,
  CursorWithUser, ConflictData, WorkspaceMemberWithUser,
  UserRole, Toast, View
} from './types';
import Editor from './components/editor';
import VersionHistory from './components/versionHistory';
import CommentSidebar from './components/commentSidebar';
import PermissionPanel from './components/permissionPanel';

const SocketContext = createContext<Socket | null>(null);
const UserContext = createContext<{ user: User | null; login: (name: string) => Promise<boolean> }>({ user: null, login: async () => false });
const ToastContext = createContext<{ toasts: Toast[]; showToast: (t: Omit<Toast, 'id'>) => string; hideToast: (id: string) => void }>({
  toasts: [],
  showToast: () => '',
  hideToast: () => {}
});

export { SocketContext, UserContext, ToastContext };

function useToast() { return useContext(ToastContext); }
function useSocket() { return useContext(SocketContext); }
function useCurrentUser() { return useContext(UserContext); }

function Avatar({ user, size = 32, showBorder = true, style = {} }: { user: User; size?: number; showBorder?: boolean; style?: React.CSSProperties }) {
  return (
    <div title={user.name} style={{
      width: size, height: size, borderRadius: '50%', background: user.color, color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.45, fontWeight: 600,
      border: showBorder ? `2px solid ${user.color}` : 'none',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)', flexShrink: 0, ...style,
    }}>{user.avatar}</div>
  );
}

function LoadingSpinner({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 0.8s linear infinite' }}>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </svg>
  );
}

const btnPrimary: React.CSSProperties = {
  padding: '10px 20px', borderRadius: 10, border: 'none',
  background: 'linear-gradient(135deg, #3498db, #2980b9)', color: '#fff',
  fontSize: 14, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s',
  display: 'flex', alignItems: 'center', gap: 8,
};
const btnSecondary: React.CSSProperties = {
  padding: '10px 20px', borderRadius: 10, border: '1.5px solid #e5e7eb',
  background: '#fff', color: '#374151', fontSize: 14, fontWeight: 500,
  cursor: 'pointer', transition: 'all 0.15s',
};

function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title?: string }) {
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.5)',
      backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, animation: 'fadeIn 0.15s ease',
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: '#fff', borderRadius: 16, padding: 28, minWidth: 420,
        maxWidth: '90vw', maxHeight: '90vh', overflow: 'auto',
        boxShadow: '0 24px 48px rgba(0, 0, 0, 0.2)',
        animation: 'zoomIn 0.18s ease',
      }}>
        {title && <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20, color: '#1a1a2e' }}>{title}</h3>}
        {children}
        <style>{`
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes zoomIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
        `}</style>
      </div>
    </div>
  );
}

function ToastContainer({ toasts }: { toasts: Toast[] }) {
  return (
    <div style={{
      position: 'fixed', top: 20, right: 20, zIndex: 9999, display: 'flex',
      flexDirection: 'column', gap: 10, pointerEvents: 'none',
    }}>
      {toasts.map((t) => {
        const colors = {
          success: { bg: '#10b981', icon: '✓' },
          error: { bg: '#ef4444', icon: '!' },
          info: { bg: '#3b82f6', icon: 'i' },
          loading: { bg: '#6366f1', icon: '' },
        } as const;
        const c = colors[t.type];
        return (
          <div key={t.id} style={{
            background: '#fff', borderRadius: 12, padding: '12px 16px 12px 12px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
            display: 'flex', alignItems: 'center', gap: 12,
            minWidth: 260, animation: 'toastIn 0.2s ease',
            pointerEvents: 'auto',
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8, background: c.bg, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: 14, flexShrink: 0,
            }}>{t.type === 'loading' ? <LoadingSpinner size={14} /> : c.icon}</div>
            <div style={{ fontSize: 14, color: '#1f2937', fontWeight: 500 }}>{t.message}</div>
            <style>{`@keyframes toastIn { from { transform: translateX(120%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
          </div>
        );
      })}
    </div>
  );
}

function roleLabel(r: UserRole) {
  return ({ owner: '所有者', editor: '编辑者', commenter: '评论者', viewer: '查看者' } as const)[r];
}
function formatRelativeTime(t: number): string {
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60000);
  if (m < 1) return '刚刚';
  if (m < 60) return `${m}分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}小时前`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}天前`;
  return new Date(t).toLocaleDateString();
}

function LoginPage() {
  const { login } = useCurrentUser();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  const demoUsers = ['张三', '李四', '王五'];

  const handleLogin = async (n?: string) => {
    const loginName = n || name.trim();
    if (!loginName) { showToast({ type: 'error', message: '请输入您的名字' }); return; }
    setLoading(true);
    const ok = await login(loginName);
    setLoading(false);
    if (!ok) showToast({ type: 'error', message: '登录失败' });
  };

  return (
    <div style={{
      minHeight: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #e3f2fd 0%, #f5faff 50%, #ffffff 100%)', padding: 24,
    }}>
      <div style={{
        width: '100%', maxWidth: 440, background: '#fff', borderRadius: 16,
        padding: 48, boxShadow: '0 20px 60px rgba(52, 152, 219, 0.15)',
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: 16,
          background: 'linear-gradient(135deg, #3498db, #2980b9)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: 28, marginBottom: 24,
        }}>📝</div>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8, color: '#1a1a2e' }}>欢迎使用协作文档</h1>
        <p style={{ color: '#6b7280', marginBottom: 32, fontSize: 14 }}>小团队的在线协作平台，告别版本混乱</p>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 14, color: '#374151', marginBottom: 8, fontWeight: 500 }}>您的名字</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            placeholder="请输入您的名字"
            style={{
              width: '100%', padding: '12px 16px', borderRadius: 10,
              border: '1.5px solid #e5e7eb', fontSize: 15, outline: 'none', transition: 'border-color 0.2s',
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = '#3498db')}
            onBlur={(e) => (e.currentTarget.style.borderColor = '#e5e7eb')}
          />
        </div>
        <button onClick={() => handleLogin()} disabled={loading} style={{
          ...btnPrimary, width: '100%', padding: '13px 24px', fontSize: 15,
          opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer',
          justifyContent: 'center', marginBottom: 28,
        }}
          onMouseOver={(e) => !loading && (e.currentTarget.style.transform = 'translateY(-1px)')}
          onMouseOut={(e) => (e.currentTarget.style.transform = 'translateY(0)')}>
          {loading && <LoadingSpinner />}{loading ? '登录中...' : '进入工作空间'}
        </button>
        <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 12 }}>或选择演示账号快速登录：</div>
        <div style={{ display: 'flex', gap: 10 }}>
          {demoUsers.map((u) => (
            <button key={u} onClick={() => handleLogin(u)} disabled={loading}
              style={{
                flex: 1, padding: '10px 12px', borderRadius: 10,
                border: '1.5px solid #e0e7ff', background: '#f8faff', color: '#4338ca',
                fontSize: 14, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s',
              }}
              onMouseOver={(e) => { e.currentTarget.style.background = '#eef2ff'; e.currentTarget.style.borderColor = '#c7d2fe'; }}
              onMouseOut={(e) => { e.currentTarget.style.background = '#f8faff'; e.currentTarget.style.borderColor = '#e0e7ff'; }}>
              {u}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function WorkspaceSelector({ user, workspaces, onCreate, onJoin, onEnter }: {
  user: User; workspaces: Workspace[];
  onCreate: (name: string) => Promise<Workspace | null>;
  onJoin: (code: string) => Promise<boolean>;
  onEnter: (workspaceId: string) => void;
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [newName, setNewName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const handleCreate = async () => {
    if (!newName.trim()) return showToast({ type: 'error', message: '请输入工作空间名称' });
    setLoading(true);
    const ws = await onCreate(newName.trim());
    setLoading(false);
    if (ws) { showToast({ type: 'success', message: '创建成功' }); setShowCreate(false); setNewName(''); onEnter(ws.id); }
  };
  const handleJoin = async () => {
    if (!inviteCode.trim()) return showToast({ type: 'error', message: '请输入邀请码' });
    setLoading(true);
    const ok = await onJoin(inviteCode.trim());
    setLoading(false);
    if (ok) { showToast({ type: 'success', message: '加入成功' }); setShowJoin(false); setInviteCode(''); }
  };

  return (
    <div style={{ minHeight: '100%', background: 'linear-gradient(180deg, #f5faff 0%, #ffffff 100%)', padding: 40 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 40 }}>
          <div>
            <h1 style={{ fontSize: 32, fontWeight: 700, color: '#1a1a2e', marginBottom: 8 }}>我的工作空间</h1>
            <p style={{ color: '#6b7280', fontSize: 15 }}>选择或创建一个工作空间开始协作</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => setShowJoin(true)} style={{
              padding: '10px 20px', borderRadius: 10, border: '1.5px solid #3498db',
              background: '#fff', color: '#3498db', fontSize: 14, fontWeight: 500,
              cursor: 'pointer', transition: 'all 0.15s',
            }}
              onMouseOver={(e) => (e.currentTarget.style.background = '#ebf5fb')}
              onMouseOut={(e) => (e.currentTarget.style.background = '#fff')}>加入工作空间</button>
            <button onClick={() => setShowCreate(true)} style={{
              padding: '10px 20px', borderRadius: 10, border: 'none',
              background: 'linear-gradient(135deg, #3498db, #2980b9)', color: '#fff',
              fontSize: 14, fontWeight: 500, cursor: 'pointer', transition: 'transform 0.15s',
            }}
              onMouseOver={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
              onMouseOut={(e) => (e.currentTarget.style.transform = 'translateY(0)')}>+ 创建工作空间</button>
            <Avatar user={user} size={40} />
          </div>
        </div>

        {workspaces.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '80px 40px', background: '#fff',
            borderRadius: 16, border: '2px dashed #dbeafe',
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🏢</div>
            <h3 style={{ fontSize: 20, marginBottom: 8, color: '#1a1a2e' }}>还没有工作空间</h3>
            <p style={{ color: '#6b7280', marginBottom: 24 }}>创建一个新工作空间或使用邀请码加入</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button onClick={() => setShowCreate(true)} style={{
                padding: '12px 24px', borderRadius: 10,
                background: 'linear-gradient(135deg, #3498db, #2980b9)', color: '#fff',
                border: 'none', fontWeight: 500, cursor: 'pointer',
              }}>创建工作空间</button>
              <button onClick={() => setShowJoin(true)} style={{
                padding: '12px 24px', borderRadius: 10, background: '#fff',
                color: '#3498db', border: '1.5px solid #3498db', fontWeight: 500, cursor: 'pointer',
              }}>加入工作空间</button>
            </div>
          </div>
        ) : (
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20,
          }}>
            {workspaces.map((ws) => (
              <div key={ws.id} onClick={() => onEnter(ws.id)} style={{
                background: '#fff', borderRadius: 14, padding: 24, cursor: 'pointer',
                transition: 'all 0.2s', border: '1px solid #f1f5f9',
              }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 12px 28px rgba(52, 152, 219, 0.15)';
                  e.currentTarget.style.borderColor = '#bfdbfe';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.borderColor = '#f1f5f9';
                }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 12,
                  background: 'linear-gradient(135deg, #e0f2fe, #bfdbfe)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, marginBottom: 16,
                }}>📁</div>
                <h3 style={{ fontSize: 17, fontWeight: 600, color: '#1a1a2e', marginBottom: 6 }}>{ws.name}</h3>
                <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: 16 }}>
                  {ws.members.length} 位成员 · {ws.documentIds.length} 个文档
                </p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex' }}>
                    {ws.members.slice(0, 4).map((m, idx) => {
                      const u: User = {
                        id: m.userId, name: m.userId,
                        avatar: m.userId.charAt(m.userId.length - 1).toUpperCase(),
                        color: `hsl(${(m.userId.length * 47) % 360}, 65%, 55%)`,
                      };
                      return <div key={m.userId} style={{ marginLeft: idx > 0 ? -8 : 0 }}><Avatar user={u} size={28} showBorder={false} /></div>;
                    })}
                  </div>
                  <span style={{ fontSize: 13, color: '#3498db', fontWeight: 500 }}>进入 →</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <Modal onClose={() => setShowCreate(false)} title="创建工作空间">
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 8 }}>工作空间名称</label>
            <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="例如：产品团队工作空间" autoFocus
              style={{
                width: '100%', padding: '12px 16px', borderRadius: 10,
                border: '1.5px solid #e5e7eb', fontSize: 15, outline: 'none',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = '#3498db')}
              onBlur={(e) => (e.currentTarget.style.borderColor = '#e5e7eb')} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button onClick={() => setShowCreate(false)} style={btnSecondary}
              onMouseOver={(e) => (e.currentTarget.style.background = '#f1f5f9')}
              onMouseOut={(e) => (e.currentTarget.style.background = '#fff')}>取消</button>
            <button onClick={handleCreate} disabled={loading} style={{ ...btnPrimary, opacity: loading ? 0.7 : 1 }}>
              {loading ? '创建中...' : '创建'}
            </button>
          </div>
        </Modal>
      )}

      {showJoin && (
        <Modal onClose={() => setShowJoin(false)} title="加入工作空间">
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 8 }}>邀请码</label>
            <input type="text" value={inviteCode} onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              placeholder="输入 6 位邀请码" autoFocus
              style={{
                width: '100%', padding: '12px 16px', borderRadius: 10,
                border: '1.5px solid #e5e7eb', fontSize: 15, letterSpacing: 2,
                textTransform: 'uppercase', outline: 'none',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = '#3498db')}
              onBlur={(e) => (e.currentTarget.style.borderColor = '#e5e7eb')} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button onClick={() => setShowJoin(false)} style={btnSecondary}
              onMouseOver={(e) => (e.currentTarget.style.background = '#f1f5f9')}
              onMouseOut={(e) => (e.currentTarget.style.background = '#fff')}>取消</button>
            <button onClick={handleJoin} disabled={loading} style={{ ...btnPrimary, opacity: loading ? 0.7 : 1 }}>
              {loading ? '加入中...' : '加入'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function WorkspaceView({
  user, workspace, documents, members, activities, onlineMembers,
  onBack, onOpenDoc, onCreateDoc, onShowPermissions,
}: {
  user: User; workspace: Workspace; documents: Document[];
  members: WorkspaceMemberWithUser[]; activities: Activity[]; onlineMembers: string[];
  onBack: () => void; onOpenDoc: (docId: string) => void;
  onCreateDoc: (title: string) => Promise<Document | null>;
  onShowPermissions: () => void;
}) {
  const [showCreateDoc, setShowCreateDoc] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);

  const userRole = useMemo(
    () => workspace.members.find((m) => m.userId === user.id)?.role || 'viewer',
    [workspace, user.id]
  );
  const canEdit = userRole === 'owner' || userRole === 'editor';

  const handleCreate = async () => {
    if (!newTitle.trim()) return showToast({ type: 'error', message: '请输入文档标题' });
    setLoading(true);
    const doc = await onCreateDoc(newTitle.trim());
    setLoading(false);
    if (doc) { showToast({ type: 'success', message: '文档创建成功' }); setShowCreateDoc(false); setNewTitle(''); onOpenDoc(doc.id); }
  };
  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(workspace.inviteCode);
      setCopied(true); showToast({ type: 'success', message: '邀请码已复制' });
      setTimeout(() => setCopied(false), 2000);
    } catch { showToast({ type: 'info', message: `邀请码：${workspace.inviteCode}` }); }
  };

  return (
    <div style={{ display: 'flex', height: '100%', background: '#f8fafc' }}>
      <div style={{
        width: leftCollapsed ? 56 : 260, background: '#2c2f36', color: '#e5e7eb',
        display: 'flex', flexDirection: 'column', transition: 'width 0.2s', flexShrink: 0,
      }}>
        <div style={{
          padding: '16px 14px', display: 'flex', alignItems: 'center', gap: 10,
          borderBottom: '1px solid #374151', minHeight: 60,
        }}>
          <button onClick={onBack} style={{
            width: 32, height: 32, borderRadius: 8, background: 'transparent',
            border: 'none', color: '#e5e7eb', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}
            onMouseOver={(e) => (e.currentTarget.style.background = '#374151')}
            onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}>←</button>
          {!leftCollapsed && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 14, fontWeight: 600,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>{workspace.name}</div>
              <div style={{ fontSize: 11, color: '#9ca3af' }}>{onlineMembers.length}/{members.length} 在线</div>
            </div>
          )}
        </div>

        {!leftCollapsed && (
          <>
            <div style={{ padding: '14px 12px' }}>
              <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 8, paddingLeft: 4 }}>邀请码</div>
              <div onClick={copyInvite} style={{
                background: '#374151', borderRadius: 8, padding: '8px 12px',
                fontSize: 14, fontWeight: 600, letterSpacing: 2,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                cursor: 'pointer', transition: 'background 0.15s',
              }}
                onMouseOver={(e) => (e.currentTarget.style.background = '#4b5563')}
                onMouseOut={(e) => (e.currentTarget.style.background = '#374151')}>
                <span>{workspace.inviteCode}</span>
                <span style={{ fontSize: 12, opacity: 0.7 }}>{copied ? '✓' : '复制'}</span>
              </div>
            </div>

            <div style={{ padding: '0 12px 12px', flex: 1, overflowY: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: '#9ca3af', paddingLeft: 4 }}>文档 ({documents.length})</div>
                {canEdit && (
                  <button onClick={() => setShowCreateDoc(true)} style={{
                    background: 'transparent', border: 'none', color: '#60a5fa',
                    fontSize: 18, cursor: 'pointer', padding: '2px 6px', borderRadius: 4,
                  }}
                    onMouseOver={(e) => (e.currentTarget.style.background = '#374151')}
                    onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}>+</button>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {documents.length === 0 ? (
                  <div style={{ fontSize: 12, color: '#6b7280', padding: 12, textAlign: 'center' }}>暂无文档</div>
                ) : documents.map((doc) => (
                  <div key={doc.id} onClick={() => onOpenDoc(doc.id)} style={{
                    padding: '10px 12px', borderRadius: 8, cursor: 'pointer', transition: 'background 0.1s',
                  }}
                    onMouseOver={(e) => (e.currentTarget.style.background = '#374151')}
                    onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}>
                    <div style={{
                      fontSize: 13, fontWeight: 500, marginBottom: 4,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>📄 {doc.title}</div>
                    <div style={{ fontSize: 11, color: '#9ca3af' }}>
                      {new Date(doc.updatedAt).toLocaleDateString()} · v{doc.version}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ padding: '12px', borderTop: '1px solid #374151' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: '#9ca3af', paddingLeft: 4 }}>成员 ({members.length})</div>
                {userRole === 'owner' && (
                  <button onClick={onShowPermissions} style={{
                    background: 'transparent', border: 'none', color: '#60a5fa',
                    fontSize: 12, cursor: 'pointer', padding: '2px 6px', borderRadius: 4,
                  }}>管理</button>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {members.slice(0, 6).map((m) => (
                  <div key={m.user.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ position: 'relative' }}>
                      <Avatar user={m.user} size={26} showBorder={false} />
                      <span style={{
                        position: 'absolute', bottom: -2, right: -2,
                        width: 8, height: 8, borderRadius: '50%',
                        background: onlineMembers.includes(m.user.id) ? '#22c55e' : '#9ca3af',
                        border: '2px solid #2c2f36',
                      }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 12, fontWeight: 500,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>{m.user.name}</div>
                      <div style={{ fontSize: 10, color: '#9ca3af' }}>{roleLabel(m.role)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        <div style={{
          padding: leftCollapsed ? '8px' : '12px', borderTop: '1px solid #374151',
          display: 'flex', alignItems: 'center', gap: leftCollapsed ? 0 : 10,
          justifyContent: leftCollapsed ? 'center' : 'flex-start',
        }}>
          <button onClick={() => setLeftCollapsed(!leftCollapsed)} style={{
            width: 32, height: 32, borderRadius: 8, background: 'transparent',
            border: 'none', color: '#e5e7eb', cursor: 'pointer', flexShrink: 0,
          }}
            onMouseOver={(e) => (e.currentTarget.style.background = '#374151')}
            onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}>
            {leftCollapsed ? '»' : '«'}
          </button>
          {!leftCollapsed && (
            <>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 13, fontWeight: 500,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>{user.name}</div>
                <div style={{ fontSize: 11, color: '#9ca3af' }}>{roleLabel(userRole)}</div>
              </div>
              <Avatar user={user} size={28} showBorder={false} />
            </>
          )}
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{
          background: '#fff', borderBottom: '1px solid #e5e7eb',
          padding: '16px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#1a1a2e' }}>{workspace.name}</div>
            <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
              {documents.length} 个文档 · {members.length} 位成员
            </div>
          </div>
          {canEdit && (
            <button onClick={() => setShowCreateDoc(true)} style={{
              padding: '10px 20px', borderRadius: 10, border: 'none',
              background: 'linear-gradient(135deg, #3498db, #2980b9)', color: '#fff',
              fontSize: 14, fontWeight: 500, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6, transition: 'transform 0.15s',
            }}
              onMouseOver={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
              onMouseOut={(e) => (e.currentTarget.style.transform = 'translateY(0)')}>+ 新建文档</button>
          )}
        </div>

        <div style={{
          flex: 1, padding: 28, overflowY: 'auto',
          display: 'grid', gridTemplateColumns: '1fr 320px', gap: 28,
        }}>
          <div>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16,
            }}>
              {documents.length === 0 && (
                <div style={{
                  gridColumn: '1 / -1', background: '#fff', borderRadius: 14, padding: 60,
                  textAlign: 'center', border: '2px dashed #dbeafe',
                }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>📄</div>
                  <h3 style={{ marginBottom: 8, color: '#1a1a2e' }}>开始创建文档</h3>
                  <p style={{ color: '#6b7280' }}>创建第一个文档，与团队成员实时协作</p>
                </div>
              )}
              {documents.map((doc) => (
                <div key={doc.id} onClick={() => onOpenDoc(doc.id)} style={{
                  background: '#fff', borderRadius: 12, padding: 20, cursor: 'pointer',
                  border: '1px solid #f1f5f9', transition: 'all 0.2s',
                }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 20px rgba(52, 152, 219, 0.12)';
                    e.currentTarget.style.borderColor = '#bfdbfe';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.borderColor = '#f1f5f9';
                  }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: 'linear-gradient(135deg, #e0f2fe, #bfdbfe)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18, marginBottom: 14,
                  }}>📄</div>
                  <div style={{
                    fontSize: 15, fontWeight: 600, color: '#1a1a2e', marginBottom: 6,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>{doc.title}</div>
                  <div style={{ fontSize: 12, color: '#9ca3af', lineHeight: 1.6 }}>
                    更新于 {new Date(doc.updatedAt).toLocaleDateString()}<br />版本 {doc.version}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{
            background: '#fff', borderRadius: 14, padding: 20, border: '1px solid #f1f5f9',
            height: 'fit-content', position: 'sticky', top: 20,
          }}>
            <div style={{
              fontSize: 15, fontWeight: 600, color: '#1a1a2e', marginBottom: 16,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>📋 实时活动</div>
            <ActivityList activities={activities} users={members} onDocClick={onOpenDoc} />
          </div>
        </div>
      </div>

      {showCreateDoc && (
        <Modal onClose={() => setShowCreateDoc(false)} title="新建文档">
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 8 }}>文档标题</label>
            <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="例如：产品需求文档" autoFocus
              style={{
                width: '100%', padding: '12px 16px', borderRadius: 10,
                border: '1.5px solid #e5e7eb', fontSize: 15, outline: 'none',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = '#3498db')}
              onBlur={(e) => (e.currentTarget.style.borderColor = '#e5e7eb')} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button onClick={() => setShowCreateDoc(false)} style={btnSecondary}
              onMouseOver={(e) => (e.currentTarget.style.background = '#f1f5f9')}
              onMouseOut={(e) => (e.currentTarget.style.background = '#fff')}>取消</button>
            <button onClick={handleCreate} disabled={loading} style={{ ...btnPrimary, opacity: loading ? 0.7 : 1 }}>
              {loading ? <LoadingSpinner size={14} /> : null}{loading ? ' 创建中...' : '创建文档'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function ActivityList({ activities, users, onDocClick }: {
  activities: Activity[]; users: WorkspaceMemberWithUser[]; onDocClick?: (docId: string) => void;
}) {
  const getUser = (id: string): User => {
    const m = users.find((u) => u.user.id === id);
    if (m) return m.user;
    return { id, name: id, avatar: '?', color: `hsl(${(id.length * 47) % 360}, 65%, 55%)` };
  };
  if (activities.length === 0) {
    return <div style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center', padding: 20 }}>暂无活动记录</div>;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxHeight: 500, overflowY: 'auto' }}>
      {activities.map((a) => {
        const actor = getUser(a.userId);
        return (
          <div key={a.id} onClick={() => a.documentId && onDocClick && onDocClick(a.documentId)} style={{
            display: 'flex', gap: 10, padding: 8, borderRadius: 8,
            cursor: a.documentId ? 'pointer' : 'default', transition: 'background 0.1s',
          }}
            onMouseOver={(e) => a.documentId && (e.currentTarget.style.background = '#f8fafc')}
            onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}>
            <Avatar user={actor} size={28} showBorder={false} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, color: '#374151', lineHeight: 1.5 }}>
                <span style={{ fontWeight: 600, color: '#1a1a2e' }}>{actor.name}</span>
                {' '}{a.content}
              </div>
              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 3 }}>{formatRelativeTime(a.createdAt)}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ConflictModal({ conflict, user, members, onResolve, onCancel }: {
  conflict: ConflictData; user: User; members: WorkspaceMemberWithUser[];
  onResolve: (content: string) => void; onCancel: () => void;
}) {
  const [choice, setChoice] = useState<'mine' | 'theirs' | 'merge'>('merge');
  const [mergedContent, setMergedContent] = useState('');
  const otherId = conflict.user1Id === user.id ? conflict.user2Id : conflict.user1Id;
  const myContent = conflict.user1Id === user.id ? conflict.user1Content : conflict.user2Content;
  const theirContent = conflict.user1Id === user.id ? conflict.user2Content : conflict.user1Content;
  const otherUser = members.find((m) => m.user.id === otherId)?.user || {
    id: otherId, name: otherId, avatar: '?', color: '#9ca3af',
  };

  useEffect(() => { setMergedContent(`${myContent} / ${theirContent}`); }, []);

  const handleConfirm = () => {
    let final = '';
    if (choice === 'mine') final = conflict.baseContent.slice(0, conflict.rangeStart) + myContent + conflict.baseContent.slice(conflict.rangeEnd);
    else if (choice === 'theirs') final = conflict.baseContent.slice(0, conflict.rangeStart) + theirContent + conflict.baseContent.slice(conflict.rangeEnd);
    else final = conflict.baseContent.slice(0, conflict.rangeStart) + mergedContent + conflict.baseContent.slice(conflict.rangeEnd);
    onResolve(final);
  };

  const optionStyle = (active: boolean): React.CSSProperties => ({
    padding: 14, borderRadius: 10, border: `2px solid ${active ? '#3498db' : '#e5e7eb'}`,
    background: active ? '#eff6ff' : '#fff', cursor: 'pointer',
    transition: 'all 0.15s', marginBottom: 10,
  });

  return (
    <Modal onClose={onCancel} title="⚠️ 检测到编辑冲突">
      <div style={{ fontSize: 14, color: '#4b5563', marginBottom: 20, lineHeight: 1.6 }}>
        您和 <span style={{ fontWeight: 600, color: otherUser.color }}>{otherUser.name}</span> 同时编辑了同一段文字，请选择如何处理：
      </div>

      <div onClick={() => setChoice('mine')} style={optionStyle(choice === 'mine')}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div style={{
            width: 20, height: 20, borderRadius: '50%',
            border: choice === 'mine' ? '6px solid #3498db' : '2px solid #d1d5db',
            transition: 'all 0.15s',
          }} />
          <Avatar user={user} size={22} showBorder={false} />
          <span style={{ fontWeight: 600, color: '#1a1a2e' }}>保留我的版本</span>
        </div>
        <div style={{ fontSize: 13, color: '#6b7280', paddingLeft: 28, background: '#f9fafb', borderRadius: 6, padding: 8, marginLeft: 28 }}>
          {myContent || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>（空文本）</span>}
        </div>
      </div>

      <div onClick={() => setChoice('theirs')} style={optionStyle(choice === 'theirs')}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div style={{
            width: 20, height: 20, borderRadius: '50%',
            border: choice === 'theirs' ? '6px solid #3498db' : '2px solid #d1d5db',
            transition: 'all 0.15s',
          }} />
          <Avatar user={otherUser} size={22} showBorder={false} />
          <span style={{ fontWeight: 600, color: '#1a1a2e' }}>采纳对方版本</span>
        </div>
        <div style={{ fontSize: 13, color: '#6b7280', background: '#f9fafb', borderRadius: 6, padding: 8, marginLeft: 28 }}>
          {theirContent || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>（空文本）</span>}
        </div>
      </div>

      <div onClick={() => setChoice('merge')} style={optionStyle(choice === 'merge')}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div style={{
            width: 20, height: 20, borderRadius: '50%',
            border: choice === 'merge' ? '6px solid #3498db' : '2px solid #d1d5db',
            transition: 'all 0.15s',
          }} />
          <span style={{ fontWeight: 600, color: '#1a1a2e' }}>手动合并</span>
        </div>
        <textarea
          value={mergedContent}
          onChange={(e) => { setMergedContent(e.target.value); setChoice('merge'); }}
          onClick={(e) => e.stopPropagation()}
          disabled={choice !== 'merge'}
          placeholder="请编辑合并后的内容..."
          style={{
            width: '100%', minHeight: 80, padding: 10, borderRadius: 8,
            border: choice === 'merge' ? '1.5px solid #3498db' : '1.5px solid #e5e7eb',
            fontSize: 13, outline: 'none', resize: 'vertical',
            marginLeft: 28, maxWidth: 'calc(100% - 28px)',
            background: choice === 'merge' ? '#fff' : '#f9fafb',
            opacity: choice === 'merge' ? 1 : 0.5,
          }}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
        <button onClick={onCancel} style={btnSecondary}
          onMouseOver={(e) => (e.currentTarget.style.background = '#f1f5f9')}
          onMouseOut={(e) => (e.currentTarget.style.background = '#fff')}>稍后处理</button>
        <button onClick={handleConfirm} style={btnPrimary}
          onMouseOver={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
          onMouseOut={(e) => (e.currentTarget.style.transform = 'translateY(0)')}>确认解决</button>
      </div>
    </Modal>
  );
}

export default function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<View>({ name: 'login' });
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [workspaceDocs, setWorkspaceDocs] = useState<Document[]>([]);
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMemberWithUser[]>([]);
  const [workspaceActivities, setWorkspaceActivities] = useState<Activity[]>([]);
  const [onlineMembers, setOnlineMembers] = useState<string[]>([]);
  const [currentDoc, setCurrentDoc] = useState<Document | null>(null);
  const [docVersions, setDocVersions] = useState<Version[]>([]);
  const [docComments, setDocComments] = useState<Comment[]>([]);
  const [docCursors, setDocCursors] = useState<CursorWithUser[]>([]);
  const [userRole, setUserRole] = useState<UserRole>('viewer');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showPermissions, setShowPermissions] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [previewVersion, setPreviewVersion] = useState<Version | null>(null);
  const [pendingConflict, setPendingConflict] = useState<ConflictData | null>(null);
  const [saving, setSaving] = useState(false);
  const [rollingBack, setRollingBack] = useState(false);
  const [showVersionPanel, setShowVersionPanel] = useState(false);
  const [showCommentPanel, setShowCommentPanel] = useState(false);
  const toastIdRef = useRef(0);

  const showToast = useCallback((t: Omit<Toast, 'id'>): string => {
    const id = `toast-${++toastIdRef.current}`;
    setToasts((prev) => [...prev, { ...t, id }]);
    if (t.type !== 'loading') setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 3000);
    return id;
  }, []);
  const hideToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((x) => x.id !== id));
  }, []);

  useEffect(() => {
    const s = io('http://localhost:3001', { transports: ['websocket', 'polling'], reconnection: true, reconnectionAttempts: 5 });
    setSocket(s);
    return () => { s.disconnect(); };
  }, []);

  useEffect(() => {
    if (!socket || !user) return;
    const handlers: Array<{ ev: string; fn: (...args: any[]) => void }> = [
      { ev: 'workspace:member-joined', fn: ({ members }: { members: WorkspaceMemberWithUser[] }) => setWorkspaceMembers(members) },
      { ev: 'workspace:members-updated', fn: ({ members }: { members: WorkspaceMemberWithUser[] }) => setWorkspaceMembers(members) },
      { ev: 'workspace:documents-updated', fn: ({ documents }: { documents: Document[] }) => setWorkspaceDocs(documents) },
      { ev: 'workspace:activity-added', fn: ({ activities }: { activities: Activity[] }) => setWorkspaceActivities(activities) },
      { ev: 'workspace:user-online', fn: ({ onlineMembers: om }: { onlineMembers: string[] }) => setOnlineMembers(om) },
      { ev: 'document:created', fn: ({ documents }: { documents: Document[] }) => setWorkspaceDocs(documents) },
      {
        ev: 'document:title-updated', fn: ({ document }: { document: Document }) => {
          setCurrentDoc((prev) => (prev && prev.id === document.id ? document : prev));
          setWorkspaceDocs((prev) => prev.map((d) => (d.id === document.id ? document : d)));
        },
      },
      { ev: 'version:created', fn: ({ versions }: { versions: Version[] }) => setDocVersions(versions) },
      {
        ev: 'document:rollback', fn: ({ document, versions }: { document: Document; versions: Version[] }) => {
          setCurrentDoc(document); setDocVersions(versions); setPreviewVersion(null);
          showToast({ type: 'success', message: '已回滚到历史版本' });
        },
      },
      { ev: 'comment:created', fn: ({ comments }: { comments: Comment[] }) => setDocComments(comments) },
      { ev: 'comment:updated', fn: ({ comments }: { comments: Comment[] }) => setDocComments(comments) },
      {
        ev: 'cursor:updated', fn: ({ cursor, user: cu }: { cursor: any; user: User }) => {
          setDocCursors((prev) => {
            const others = prev.filter((c) => c.user.id !== cu.id);
            return [...others, { cursor, user: cu }];
          });
        },
      },
      { ev: 'document:user-leave', fn: ({ userId }: { userId: string }) => setDocCursors((prev) => prev.filter((c) => c.user.id !== userId)) },
      {
        ev: 'conflict:detected', fn: ({ conflict }: { conflict: ConflictData }) => {
          if (conflict.user1Id === user.id || conflict.user2Id === user.id) setPendingConflict(conflict);
        },
      },
      { ev: 'conflict:resolved', fn: () => { setPendingConflict(null); showToast({ type: 'info', message: '冲突已被其他成员解决' }); } },
    ];
    handlers.forEach(({ ev, fn }) => socket.on(ev, fn));
    return () => { handlers.forEach(({ ev, fn }) => socket.off(ev, fn)); };
  }, [socket, user, showToast]);

  const login = useCallback(async (name: string): Promise<boolean> => {
    if (!socket) return false;
    return new Promise((resolve) => {
      socket.emit('user:login', { name }, (res: any) => {
        if (res?.success) {
          setUser(res.user); setWorkspaces(res.workspaces || []); resolve(true);
        } else resolve(false);
      });
    });
  }, [socket]);

  const createWorkspace = useCallback(async (name: string): Promise<Workspace | null> => {
    if (!socket) return null;
    return new Promise((resolve) => {
      socket.emit('workspace:create', { name }, (res: any) => {
        if (res?.success) { setWorkspaces((prev) => [...prev, res.workspace]); resolve(res.workspace); }
        else resolve(null);
      });
    });
  }, [socket]);

  const joinWorkspace = useCallback(async (code: string): Promise<boolean> => {
    if (!socket || !user) return false;
    return new Promise((resolve) => {
      socket.emit('workspace:join', { inviteCode: code }, (res: any) => {
        if (res?.success) {
          setWorkspaces((prev) => prev.some((w) => w.id === res.workspace.id) ? prev : [...prev, res.workspace]);
          resolve(true);
        } else resolve(false);
      });
    });
  }, [socket, user]);

  const enterWorkspace = useCallback(async (workspaceId: string) => {
    if (!socket) return;
    socket.emit('workspace:enter', { workspaceId }, (res: any) => {
      if (res?.success) {
        setCurrentWorkspace(res.workspace); setWorkspaceDocs(res.documents);
        setWorkspaceMembers(res.members); setWorkspaceActivities(res.activities);
        setOnlineMembers(res.onlineMembers || []);
        setView({ name: 'workspace', workspaceId });
      }
    });
  }, [socket]);

  const createDocument = useCallback(async (title: string): Promise<Document | null> => {
    if (!socket || !currentWorkspace) return null;
    return new Promise((resolve) => {
      socket.emit('document:create', { workspaceId: currentWorkspace.id, title }, (res: any) => {
        resolve(res?.success ? res.document : null);
      });
    });
  }, [socket, currentWorkspace]);

  const openDocument = useCallback(async (documentId: string) => {
    if (!socket || !currentWorkspace) return;
    socket.emit('document:open', { documentId }, (res: any) => {
      if (res?.success) {
        setCurrentDoc(res.document); setDocVersions(res.versions);
        setDocComments(res.comments);
        setDocCursors((res.cursors || []).map((c: any) => c));
        setUserRole(res.role); setShowVersionPanel(false); setShowCommentPanel(false);
        setView({ name: 'document', workspaceId: currentWorkspace.id, documentId });
      }
    });
  }, [socket, currentWorkspace]);

  const closeDocument = useCallback(() => {
    if (socket && currentDoc) socket.emit('document:leave', { documentId: currentDoc.id });
    setCurrentDoc(null); setDocCursors([]); setPreviewVersion(null); setShowVersionHistory(false);
    if (currentWorkspace) setView({ name: 'workspace', workspaceId: currentWorkspace.id });
  }, [socket, currentDoc, currentWorkspace]);

  const goWorkspaceHome = useCallback(() => {
    if (socket && currentDoc) socket.emit('document:leave', { documentId: currentDoc.id });
    setCurrentDoc(null); setDocCursors([]); setPreviewVersion(null); setShowVersionHistory(false);
  }, [socket, currentDoc]);

  const saveVersion = useCallback(async (message: string = ''): Promise<boolean> => {
    if (!socket || !currentDoc) return false;
    const id = showToast({ type: 'loading', message: '正在保存版本...' });
    setSaving(true);
    return new Promise((resolve) => {
      socket.emit('version:create', { documentId: currentDoc.id, message }, (res: any) => {
        hideToast(id); setSaving(false);
        if (res?.success) { showToast({ type: 'success', message: '版本保存成功' }); resolve(true); }
        else { showToast({ type: 'error', message: res?.error || '保存失败' }); resolve(false); }
      });
    });
  }, [socket, currentDoc, showToast, hideToast]);

  const rollbackVersion = useCallback(async (versionId: string): Promise<boolean> => {
    if (!socket || !currentDoc) return false;
    const id = showToast({ type: 'loading', message: '正在回滚...' });
    setRollingBack(true);
    return new Promise((resolve) => {
      socket.emit('version:rollback', { documentId: currentDoc.id, versionId }, (res: any) => {
        hideToast(id); setRollingBack(false);
        if (res?.success) resolve(true);
        else { showToast({ type: 'error', message: res?.error || '回滚失败' }); resolve(false); }
      });
    });
  }, [socket, currentDoc, showToast, hideToast]);

  const addComment = useCallback(async (content: string, position?: number): Promise<Comment | null> => {
    if (!socket || !currentDoc) return null;
    return new Promise((resolve) => {
      socket.emit('comment:create', { documentId: currentDoc.id, content, position }, (res: any) => {
        resolve(res?.success ? res.comment : null);
      });
    });
  }, [socket, currentDoc]);

  const replyComment = useCallback(async (commentId: string, content: string): Promise<boolean> => {
    if (!socket || !currentDoc) return false;
    return new Promise((resolve) => {
      socket.emit('comment:reply', { documentId: currentDoc.id, commentId, content }, (res: any) => resolve(res?.success));
    });
  }, [socket, currentDoc]);

  const toggleResolveComment = useCallback(async (commentId: string, resolved: boolean): Promise<boolean> => {
    if (!socket || !currentDoc) return false;
    return new Promise((resolve) => {
      const ev = resolved ? 'comment:resolve' : 'comment:unresolve';
      socket.emit(ev, { documentId: currentDoc.id, commentId }, (res: any) => resolve(res?.success));
    });
  }, [socket, currentDoc]);

  const updateMemberRole = useCallback(async (targetUserId: string, role: UserRole): Promise<boolean> => {
    if (!socket || !currentWorkspace) return false;
    return new Promise((resolve) => {
      socket.emit('workspace:update-role', { workspaceId: currentWorkspace.id, targetUserId, role }, (res: any) => {
        if (res?.success) { showToast({ type: 'success', message: '权限已更新' }); resolve(true); }
        else { showToast({ type: 'error', message: res?.error || '操作失败' }); resolve(false); }
      });
    });
  }, [socket, currentWorkspace, showToast]);

  const removeMember = useCallback(async (targetUserId: string): Promise<boolean> => {
