import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Room, ResultsResponse, Comment, VoteType } from '../../shared/types';
import ChartBar from '../components/ChartBar';
import ChartPie from '../components/ChartPie';

const ResultPage: React.FC = () => {
  const { code = '' } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [room, setRoom] = useState<Room | null>(null);
  const [results, setResults] = useState<ResultsResponse | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [chartType, setChartType] = useState<'bar' | 'pie'>('bar');
  const [chartVisible, setChartVisible] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminKey, setAdminKey] = useState('');
  const [adminError, setAdminError] = useState('');
  const [adminActionLoading, setAdminActionLoading] = useState(false);
  const newCommentIdsRef = useRef<Set<string>>(new Set());
  const pollRef = useRef<number | null>(null);

  const loadAll = async () => {
    try {
      const [roomRes, resultsRes, commentsRes] = await Promise.all([
        fetch(`/api/room/${code}`),
        fetch(`/api/room/${code}/results`),
        fetch(`/api/room/${code}/comments`),
      ]);
      if (!roomRes.ok) throw new Error('房间不存在');
      const roomData: Room = await roomRes.json();
      const resultsData: ResultsResponse = await resultsRes.json();
      const commentsData: Comment[] = await commentsRes.json();
      setRoom(roomData);
      setResults(resultsData);
      setComments((prev) => {
        const newIds = new Set(commentsData.map((c) => c.id));
        commentsData.forEach((c) => {
          if (!prev.find((p) => p.id === c.id)) {
            newCommentIdsRef.current.add(c.id);
          }
        });
        prev.forEach((c) => newCommentIdsRef.current.has(c.id) || null);
        return commentsData;
      });
    } catch (err) {
      setError('房间不存在或已失效');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    pollRef.current = window.setInterval(loadAll, 3000);
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, [code]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      newCommentIdsRef.current.clear();
    }, 600);
    return () => window.clearTimeout(t);
  }, [comments]);

  const handleChartSwitch = (type: 'bar' | 'pie') => {
    if (type === chartType) return;
    setChartVisible(false);
    window.setTimeout(() => {
      setChartType(type);
      setChartVisible(true);
    }, 200);
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = commentText.trim();
    if (!content || content.length > 200 || submittingComment) return;
    setSubmittingComment(true);
    try {
      const res = await fetch(`/api/room/${code}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error('发布失败');
      setCommentText('');
      await loadAll();
    } catch (err) {
      setError('发布评论失败');
    } finally {
      setSubmittingComment(false);
    }
  };

  const verifyAdmin = async () => {
    setAdminError('');
    if (!adminKey.trim()) {
      setAdminError('请输入管理密钥');
      return;
    }
    try {
      const res = await fetch(`/api/room/${code}/export?key=${encodeURIComponent(adminKey.trim())}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as any).error || '密钥错误');
      }
      setShowAdmin(true);
    } catch (err: any) {
      setAdminError(err.message || '密钥错误');
    }
  };

  const adminAction = async (action: 'end' | 'reset' | 'delete') => {
    if (adminActionLoading) return;
    if (action === 'reset' && !window.confirm('确认重置所有投票数据？此操作不可恢复。')) return;
    if (action === 'delete' && !window.confirm('确认删除整个房间？所有数据将被清除。')) return;
    if (action === 'end' && !window.confirm('确认结束投票？参与者将无法继续投票。')) return;
    setAdminActionLoading(true);
    try {
      const res = await fetch(
        `/api/room/${code}/admin?key=${encodeURIComponent(adminKey.trim())}&action=${action}`,
        { method: 'DELETE' }
      );
      if (!res.ok) throw new Error('操作失败');
      if (action === 'delete') {
        alert('房间已删除');
        navigate('/');
        return;
      }
      await loadAll();
      alert('操作成功');
    } catch (err) {
      setAdminError('操作失败');
    } finally {
      setAdminActionLoading(false);
    }
  };

  const handleExport = async () => {
    if (adminActionLoading) return;
    setAdminActionLoading(true);
    try {
      const res = await fetch(`/api/room/${code}/export?key=${encodeURIComponent(adminKey.trim())}`);
      if (!res.ok) throw new Error('导出失败');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vote-${code}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setAdminError('导出失败');
    } finally {
      setAdminActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={pageStyle}>
        <div style={{ color: '#a0aec0', textAlign: 'center', padding: '40px' }}>加载中...</div>
      </div>
    );
  }

  if (error || !room || !results) {
    return (
      <div style={pageStyle}>
        <div
          style={{
            backgroundColor: '#2d3748',
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '420px',
            margin: '0 auto',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>😕</div>
          <div style={{ color: '#fc8181', fontSize: '18px', marginBottom: '16px' }}>
            {error || '房间不存在'}
          </div>
          <button
            onClick={() => navigate('/')}
            style={{
              padding: '10px 24px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: '#6b46c1',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '15px',
              fontWeight: 600,
            }}
          >
            返回大厅
          </button>
        </div>
      </div>
    );
  }

  const voteTypeLabels: Record<VoteType, string> = {
    single: '单选',
    multiple: '多选',
    ranking: '排序',
  };

  return (
    <div style={{ ...pageStyle, paddingBottom: '100px' }}>
      <div style={{ maxWidth: '960px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
            <span
              style={{
                padding: '4px 12px',
                backgroundColor: 'rgba(107, 70, 193, 0.25)',
                color: '#b794f4',
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              {voteTypeLabels[room.voteType]}
            </span>
            {room.isEnded && (
              <span
                style={{
                  padding: '4px 12px',
                  backgroundColor: 'rgba(229, 62, 62, 0.2)',
                  color: '#fc8181',
                  borderRadius: '20px',
                  fontSize: '13px',
                  fontWeight: 600,
                }}
              >
                已结束
              </span>
            )}
            <span
              style={{
                padding: '4px 12px',
                backgroundColor: 'rgba(49, 130, 206, 0.2)',
                color: '#63b3ed',
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              共 {results.totalVotes} 票
            </span>
          </div>
          <h1 style={{ color: '#e2e8f0', fontSize: '26px', fontWeight: 700, marginBottom: '6px' }}>
            {room.title}
          </h1>
          {room.description && (
            <p style={{ color: '#a0aec0', fontSize: '14px', margin: 0 }}>{room.description}</p>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '8px',
            marginBottom: '24px',
          }}
        >
          <button
            onClick={() => navigate(`/vote/${code}`)}
            style={{
              padding: '8px 20px',
              borderRadius: '10px',
              border: '2px solid #4a5568',
              backgroundColor: 'transparent',
              color: '#e2e8f0',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            返回投票
          </button>
          <button
            onClick={() => setShowAdmin(!showAdmin)}
            style={{
              padding: '8px 20px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: 'rgba(107, 70, 193, 0.2)',
              color: '#b794f4',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {showAdmin ? '关闭管理' : '管理面板'}
          </button>
        </div>

        {showAdmin && (
          <div
            style={{
              backgroundColor: '#2d3748',
              borderRadius: '16px',
              padding: '20px 24px',
              marginBottom: '24px',
            }}
          >
            <div style={{ color: '#e2e8f0', fontSize: '16px', fontWeight: 600, marginBottom: '14px' }}>
              管理面板
            </div>
            {!adminKey && (
              <div>
                <div style={{ color: '#a0aec0', fontSize: '13px', marginBottom: '8px' }}>
                  请输入8位管理密钥
                </div>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <input
                    type="text"
                    value={adminKey}
                    onChange={(e) => setAdminKey(e.target.value.toUpperCase())}
                    placeholder="XXXXXXXX"
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '2px solid #4a5568',
                      backgroundColor: '#1a202c',
                      color: '#e2e8f0',
                      fontSize: '14px',
                      outline: 'none',
                      letterSpacing: '2px',
                      fontFamily: 'monospace',
                    }}
                    maxLength={8}
                  />
                  <button
                    onClick={verifyAdmin}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: '#6b46c1',
                      color: '#fff',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    验证
                  </button>
                </div>
                {adminError && (
                  <div style={{ color: '#fc8181', fontSize: '13px' }}>{adminError}</div>
                )}
              </div>
            )}
            {adminKey && !showAdmin ? null : adminKey && (
              <div>
                <div style={{ color: '#48bb78', fontSize: '13px', marginBottom: '14px' }}>
                  ✓ 已验证管理员身份
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  <button
                    onClick={() => adminAction('end')}
                    disabled={room.isEnded || adminActionLoading}
                    style={adminBtnPurple}
                  >
                    {room.isEnded ? '已结束' : '结束投票'}
                  </button>
                  <button
                    onClick={() => adminAction('reset')}
                    disabled={adminActionLoading}
                    style={adminBtnWarn}
                  >
                    重置投票
                  </button>
                  <button
                    onClick={handleExport}
                    disabled={adminActionLoading}
                    style={adminBtnPurple}
                  >
                    导出CSV
                  </button>
                  <button
                    onClick={() => adminAction('delete')}
                    disabled={adminActionLoading}
                    style={adminBtnDanger}
                  >
                    删除房间
                  </button>
                </div>
                {adminError && (
                  <div style={{ color: '#fc8181', fontSize: '13px', marginTop: '10px' }}>
                    {adminError}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div
          style={{
            backgroundColor: '#2d3748',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div style={{ color: '#e2e8f0', fontSize: '18px', fontWeight: 600 }}>投票结果</div>
            <div
              style={{
                display: 'flex',
                backgroundColor: '#1a202c',
                borderRadius: '10px',
                padding: '4px',
              }}
            >
              <button
                onClick={() => handleChartSwitch('bar')}
                style={{
                  padding: '6px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: chartType === 'bar' ? '#6b46c1' : 'transparent',
                  color: '#e2e8f0',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                条形图
              </button>
              <button
                onClick={() => handleChartSwitch('pie')}
                style={{
                  padding: '6px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: chartType === 'pie' ? '#6b46c1' : 'transparent',
                  color: '#e2e8f0',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                饼图
              </button>
            </div>
          </div>

          <div
            style={{
              opacity: chartVisible ? 1 : 0,
              transition: 'opacity 0.4s ease-in-out',
              minHeight: '300px',
            }}
            className="charts-area"
          >
            {chartType === 'bar' ? (
              <ChartBar
                data={results.results}
                showWeightedScore={room.voteType === 'ranking'}
              />
            ) : (
              <ChartPie data={results.results} />
            )}
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#2d3748',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}
        >
          <div style={{ color: '#e2e8f0', fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>
            💬 讨论区 <span style={{ color: '#a0aec0', fontSize: '13px', fontWeight: 400 }}>({comments.length})</span>
          </div>

          {comments.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '24px',
                color: '#a0aec0',
                fontSize: '14px',
              }}
            >
              还没有评论，来发表第一条吧~
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '360px', overflowY: 'auto' }}>
              {comments.map((c) => {
                const isNew = newCommentIdsRef.current.has(c.id);
                return (
                  <div
                    key={c.id}
                    style={{
                      backgroundColor: '#1a202c',
                      borderRadius: '12px',
                      padding: '14px 16px',
                      animation: isNew ? 'commentFadeIn 0.3s ease-out' : 'none',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: '6px',
                        alignItems: 'center',
                      }}
                    >
                      <span
                        style={{
                          color: '#b794f4',
                          fontSize: '13px',
                          fontWeight: 600,
                        }}
                      >
                        匿名用户
                      </span>
                      <span style={{ color: '#718096', fontSize: '12px' }}>
                        {formatTime(c.createdAt)}
                      </span>
                    </div>
                    <div style={{ color: '#e2e8f0', fontSize: '14px', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {c.content}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: 'rgba(26, 32, 44, 0.95)',
          backdropFilter: 'blur(12px)',
          padding: '14px 24px',
          borderTop: '1px solid #2d3748',
          zIndex: 100,
        }}
      >
        <form
          onSubmit={handleSubmitComment}
          style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', gap: '10px' }}
        >
          <input
            type="text"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value.slice(0, 200))}
            placeholder="发表匿名评论（最多200字）..."
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: '12px',
              border: '2px solid #4a5568',
              backgroundColor: '#2d3748',
              color: '#e2e8f0',
              fontSize: '14px',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            disabled={!commentText.trim() || submittingComment}
            style={{
              padding: '12px 24px',
              borderRadius: '12px',
              border: 'none',
              backgroundColor: commentText.trim() ? '#6b46c1' : '#4a5568',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 600,
              cursor: commentText.trim() && !submittingComment ? 'pointer' : 'not-allowed',
            }}
          >
            {submittingComment ? '发送中...' : '发送'}
          </button>
        </form>
      </div>

      <style>{`
        @keyframes commentFadeIn {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @media (max-width: 768px) {
          .charts-area { overflow-x: auto; }
        }
      `}</style>
    </div>
  );
};

function formatTime(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  if (sameDay) return `${hh}:${mm}`;
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${mo}-${dd} ${hh}:${mm}`;
}

const pageStyle: React.CSSProperties = {
  padding: '32px 24px',
  minHeight: '100vh',
  boxSizing: 'border-box',
};

const adminBtnPurple: React.CSSProperties = {
  padding: '10px 18px',
  borderRadius: '8px',
  border: 'none',
  backgroundColor: '#6b46c1',
  color: '#fff',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
};

const adminBtnWarn: React.CSSProperties = {
  padding: '10px 18px',
  borderRadius: '8px',
  border: 'none',
  backgroundColor: '#ed8936',
  color: '#fff',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
};

const adminBtnDanger: React.CSSProperties = {
  padding: '10px 18px',
  borderRadius: '8px',
  border: 'none',
  backgroundColor: '#e53e3e',
  color: '#fff',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
};

export default ResultPage;
