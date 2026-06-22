import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import VoteCard from './VoteCard';
import ResultChart from './ResultChart';

interface PollOption {
  id: string;
  text: string;
  voteCount: number;
  voters?: string[];
}

interface Poll {
  id: string;
  code: string;
  title: string;
  options: PollOption[];
  totalVotes: number;
  isClosed: boolean;
  isCreator?: boolean;
  creatorId?: string;
}

interface CreatedPoll {
  id: string;
  code: string;
  title: string;
  creatorId: string;
}

const VOTER_ID_KEY = 'lunchvote_voter_id';

function getVoterId(): string {
  let id = localStorage.getItem(VOTER_ID_KEY);
  if (!id) {
    id = uuidv4();
    localStorage.setItem(VOTER_ID_KEY, id);
  }
  return id;
}

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [createdPolls, setCreatedPolls] = useState<CreatedPoll[]>([]);
  const [currentPoll, setCurrentPoll] = useState<Poll | null>(null);
  const [currentCreatorId, setCurrentCreatorId] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [votedOptionId, setVotedOptionId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newOptions, setNewOptions] = useState(['', '']);
  const [joinCode, setJoinCode] = useState('');
  const [joinCodeError, setJoinCodeError] = useState('');
  const [createError, setCreateError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const voterIdRef = useRef(getVoterId());

  useEffect(() => {
    const saved = localStorage.getItem('lunchvote_created_polls');
    if (saved) {
      try {
        setCreatedPolls(JSON.parse(saved));
      } catch {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('lunchvote_created_polls', JSON.stringify(createdPolls));
  }, [createdPolls]);

  useEffect(() => {
    socketRef.current = io({
      transports: ['websocket', 'polling'],
    });

    socketRef.current.on('poll_update', (poll: Poll) => {
      setCurrentPoll(poll);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  const joinPoll = useCallback(async (code: string, creatorId?: string) => {
    setIsLoading(true);
    setJoinCodeError('');
    try {
      const url = creatorId
        ? `/api/polls/${code}/details?creatorId=${creatorId}`
        : `/api/polls/${code}`;
      const res = await fetch(url);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '投票不存在');
      }
      const poll = await res.json();
      setCurrentPoll(poll);
      setCurrentCreatorId(creatorId || null);
      setHasVoted(false);
      setVotedOptionId(null);
      socketRef.current?.emit('join_poll', code);
      setSidebarOpen(false);
    } catch (err: any) {
      setJoinCodeError(err.message || '加入失败');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createPoll = async () => {
    setCreateError('');
    if (!newTitle.trim()) {
      setCreateError('请输入投票标题');
      return;
    }
    const validOptions = newOptions.filter(o => o.trim());
    if (validOptions.length < 2) {
      setCreateError('至少需要2个有效选项');
      return;
    }
    if (validOptions.length > 8) {
      setCreateError('最多只能有8个选项');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/polls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          options: validOptions,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '创建失败');
      }
      const poll = await res.json();
      setCreatedPolls(prev => [
        { id: poll.id, code: poll.code, title: poll.title, creatorId: poll.creatorId },
        ...prev,
      ]);
      setNewTitle('');
      setNewOptions(['', '']);
      setShowCreateForm(false);
      await joinPoll(poll.code, poll.creatorId);
    } catch (err: any) {
      setCreateError(err.message || '创建失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVote = (optionId: string) => {
    if (!currentPoll || currentPoll.isClosed || hasVoted) return;
    socketRef.current?.emit('vote', {
      code: currentPoll.code,
      optionId,
      voterId: voterIdRef.current,
    });
    setHasVoted(true);
    setVotedOptionId(optionId);
  };

  const handleReset = () => {
    if (!currentPoll || !currentCreatorId) return;
    socketRef.current?.emit('reset_poll', {
      code: currentPoll.code,
      creatorId: currentCreatorId,
    });
    setHasVoted(false);
    setVotedOptionId(null);
  };

  const handleClose = () => {
    if (!currentPoll || !currentCreatorId) return;
    socketRef.current?.emit('close_poll', {
      code: currentPoll.code,
      creatorId: currentCreatorId,
    });
  };

  const addOption = () => {
    if (newOptions.length < 8) {
      setNewOptions([...newOptions, '']);
    }
  };

  const removeOption = (idx: number) => {
    if (newOptions.length > 2) {
      setNewOptions(newOptions.filter((_, i) => i !== idx));
    }
  };

  const updateOption = (idx: number, value: string) => {
    const next = [...newOptions];
    next[idx] = value;
    setNewOptions(next);
  };

  const handleOptionKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (newOptions[idx].trim() && newOptions.length < 8) {
        addOption();
        setTimeout(() => {
          const inputs = document.querySelectorAll('.option-input');
          const nextInput = inputs[idx + 1] as HTMLInputElement;
          if (nextInput) nextInput.focus();
        }, 50);
      }
    }
  };

  const copyCode = async () => {
    if (!currentPoll) return;
    try {
      await navigator.clipboard.writeText(currentPoll.code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // fallback
      const textarea = document.createElement('textarea');
      textarea.value = currentPoll.code;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const validateJoinCode = (code: string): boolean => {
    return /^[A-Za-z0-9]{6}$/.test(code);
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (!validateJoinCode(code)) {
      setJoinCodeError('请输入6位字母数字组合');
      return;
    }
    joinPoll(code);
  };

  const isCurrentPollCreator = currentPoll?.isCreator || (currentPoll && currentCreatorId && createdPolls.some(p => p.code === currentPoll.code && p.creatorId === currentCreatorId));

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', backgroundColor: '#121212', color: '#FFFFFF', overflow: 'hidden' }}>
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 99,
            display: 'none',
          }}
          className="mobile-overlay"
        />
      )}

      <aside
        style={{
          width: 280,
          minWidth: 280,
          backgroundColor: '#1E1E1E',
          borderRight: '1px solid #2A2A2A',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          zIndex: 100,
          transition: 'transform 0.3s ease',
        }}
        className={sidebarOpen ? 'sidebar-open' : ''}
      >
        <div style={{ padding: '20px 16px', borderBottom: '1px solid #2A2A2A' }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#BB86FC', marginBottom: 4 }}>
            🍽️ LunchVote
          </h1>
          <p style={{ fontSize: 12, color: '#888' }}>实时午餐投票</p>
        </div>

        <div style={{ padding: 12, overflowY: 'auto', flex: 1 }}>
          <div style={{ marginBottom: 16 }}>
            <form onSubmit={handleJoinSubmit}>
              <label style={{ fontSize: 12, color: '#AAA', display: 'block', marginBottom: 6 }}>
                输入投票码加入
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase().slice(0, 6);
                    setJoinCode(val);
                    if (val && !validateJoinCode(val)) {
                      setJoinCodeError('请输入6位字母数字组合');
                    } else {
                      setJoinCodeError('');
                    }
                  }}
                  placeholder="ABC123"
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    backgroundColor: '#2A2A2A',
                    border: joinCodeError ? '1px solid #FF5252' : '1px solid #3A3A3A',
                    borderRadius: 8,
                    color: '#FFF',
                    fontSize: 14,
                    outline: 'none',
                    letterSpacing: 2,
                    textTransform: 'uppercase',
                    transition: 'border-color 0.2s',
                  }}
                />
                <button
                  type="submit"
                  disabled={isLoading}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#BB86FC',
                    color: '#121212',
                    border: 'none',
                    borderRadius: 8,
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    opacity: isLoading ? 0.6 : 1,
                    transition: 'background-color 0.2s',
                  }}
                >
                  加入
                </button>
              </div>
              {joinCodeError && (
                <p style={{ fontSize: 11, color: '#FF5252', marginTop: 6 }}>{joinCodeError}</p>
              )}
            </form>
          </div>

          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: 'rgba(187, 134, 252, 0.15)',
              color: '#BB86FC',
              border: '1px solid rgba(187, 134, 252, 0.3)',
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              marginBottom: 12,
              transition: 'background-color 0.2s',
            }}
          >
            {showCreateForm ? '✕ 取消创建' : '+ 创建新投票'}
          </button>

          {showCreateForm && (
            <div
              style={{
                padding: 12,
                backgroundColor: '#252525',
                borderRadius: 12,
                marginBottom: 16,
                border: '1px solid #2A2A2A',
              }}
            >
              <label style={{ fontSize: 12, color: '#AAA', display: 'block', marginBottom: 6 }}>
                投票标题
              </label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="今天吃什么？"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  backgroundColor: '#2A2A2A',
                  border: '1px solid #3A3A3A',
                  borderRadius: 8,
                  color: '#FFF',
                  fontSize: 13,
                  outline: 'none',
                  marginBottom: 10,
                }}
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ fontSize: 12, color: '#AAA' }}>
                  选项
                </label>
                <span style={{
                  fontSize: 11,
                  color: newOptions.length >= 8 ? '#FF5252' : '#BB86FC',
                  fontWeight: 600,
                  fontFamily: 'monospace',
                }}>
                  已添加 {newOptions.length}/8 个选项
                </span>
              </div>
              {newOptions.map((opt, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => updateOption(idx, e.target.value)}
                    onKeyDown={(e) => handleOptionKeyDown(e, idx)}
                    placeholder={`选项 ${idx + 1}${idx === newOptions.length - 1 && newOptions.length < 8 ? '（回车快速添加）' : ''}`}
                    className="option-input"
                    style={{
                      flex: 1,
                      padding: '6px 10px',
                      backgroundColor: '#2A2A2A',
                      border: '1px solid #3A3A3A',
                      borderRadius: 6,
                      color: '#FFF',
                      fontSize: 12,
                      outline: 'none',
                    }}
                  />
                  {newOptions.length > 2 && (
                    <button
                      onClick={() => removeOption(idx)}
                      style={{
                        padding: '0 10px',
                        backgroundColor: 'transparent',
                        color: '#FF5252',
                        border: '1px solid rgba(255,82,82,0.3)',
                        borderRadius: 6,
                        cursor: 'pointer',
                        fontSize: 14,
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={addOption}
                disabled={newOptions.length >= 8}
                style={{
                  width: '100%',
                  padding: '6px',
                  backgroundColor: newOptions.length >= 8 ? 'rgba(255, 82, 82, 0.1)' : 'transparent',
                  color: newOptions.length >= 8 ? '#FF5252' : '#888',
                  border: newOptions.length >= 8 ? '1px solid rgba(255, 82, 82, 0.3)' : '1px dashed #3A3A3A',
                  borderRadius: 6,
                  cursor: newOptions.length >= 8 ? 'not-allowed' : 'pointer',
                  fontSize: 12,
                  marginBottom: 10,
                  opacity: newOptions.length >= 8 ? 0.6 : 1,
                  transition: 'all 0.2s',
                }}
              >
                {newOptions.length >= 8 ? '✕ 已达最大选项数' : '+ 添加选项'}
              </button>

              {createError && (
                <p style={{ fontSize: 11, color: '#FF5252', marginBottom: 8 }}>{createError}</p>
              )}

              <button
                onClick={createPoll}
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: '10px',
                  backgroundColor: '#BB86FC',
                  color: '#121212',
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.6 : 1,
                }}
              >
                {isLoading ? '创建中...' : '创建投票'}
              </button>
            </div>
          )}

          <div style={{ fontSize: 12, color: '#888', fontWeight: 600, marginBottom: 8, padding: '0 4px' }}>
            我的投票
          </div>
          {createdPolls.length === 0 ? (
            <p style={{ fontSize: 12, color: '#555', padding: '8px 4px' }}>暂无创建的投票</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {createdPolls.map((poll) => (
                <button
                  key={poll.id}
                  onClick={() => joinPoll(poll.code, poll.creatorId)}
                  style={{
                    padding: '10px 12px',
                    backgroundColor: currentPoll?.code === poll.code ? 'rgba(187, 134, 252, 0.2)' : '#252525',
                    border: currentPoll?.code === poll.code ? '1px solid rgba(187, 134, 252, 0.4)' : '1px solid #2A2A2A',
                    borderRadius: 10,
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#FFF', marginBottom: 4 }}>
                    {poll.title}
                  </div>
                  <div style={{ fontSize: 11, color: '#BB86FC', letterSpacing: 1.5, fontFamily: 'monospace' }}>
                    {poll.code}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </aside>

      <main style={{ flex: 1, overflow: 'auto', padding: 0, position: 'relative' }}>
        <div
          onClick={() => setSidebarOpen(true)}
          style={{
            display: 'none',
            position: 'absolute',
            top: 16,
            left: 16,
            zIndex: 50,
            padding: '8px 12px',
            backgroundColor: '#1E1E1E',
            borderRadius: 8,
            border: '1px solid #2A2A2A',
            cursor: 'pointer',
            color: '#FFF',
            fontSize: 18,
          }}
          className="menu-toggle"
        >
          ☰
        </div>

        {!currentPoll ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 40 }}>
            <div style={{ textAlign: 'center', maxWidth: 480 }}>
              <div style={{ fontSize: 64, marginBottom: 24 }}>🍜</div>
              <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12, color: '#FFF' }}>
                午餐吃什么？
              </h2>
              <p style={{ fontSize: 14, color: '#888', lineHeight: 1.6, marginBottom: 32 }}>
                创建实时投票，分享投票码给同事，
                <br />
                实时查看结果汇总，再也不用微信群接龙了。
              </p>
              <button
                onClick={() => {
                  setShowCreateForm(true);
                  setSidebarOpen(true);
                }}
                style={{
                  padding: '14px 32px',
                  backgroundColor: '#BB86FC',
                  color: '#121212',
                  border: 'none',
                  borderRadius: 12,
                  fontWeight: 700,
                  fontSize: 15,
                  cursor: 'pointer',
                  boxShadow: '0 4px 20px rgba(187, 134, 252, 0.3)',
                }}
              >
                开始创建投票
              </button>
            </div>
          </div>
        ) : (
          <div style={{ padding: '40px 32px', maxWidth: 1200, margin: '0 auto' }}>
            <div
              style={{
                padding: 24,
                background: 'linear-gradient(135deg, rgba(187, 134, 252, 0.1), rgba(187, 134, 252, 0.02))',
                backdropFilter: 'blur(12px)',
                borderRadius: 16,
                border: '1px solid rgba(187, 134, 252, 0.2)',
                marginBottom: 24,
                boxShadow: '0 4px 24px rgba(0, 0, 0, 0.3)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <h2 style={{ fontSize: 26, fontWeight: 700, color: '#FFF' }}>{currentPoll.title}</h2>
                    {currentPoll.isClosed && (
                      <span style={{
                        padding: '4px 10px',
                        backgroundColor: 'rgba(255, 82, 82, 0.2)',
                        color: '#FF5252',
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 600,
                      }}>
                        已关闭
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <div
                      onClick={copyCode}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '4px 12px',
                        backgroundColor: 'rgba(187, 134, 252, 0.2)',
                        color: '#BB86FC',
                        borderRadius: 6,
                        fontSize: 13,
                        fontFamily: 'monospace',
                        letterSpacing: 2,
                        fontWeight: 600,
                        cursor: 'pointer',
                        border: '1px solid rgba(187, 134, 252, 0.3)',
                        transition: 'all 0.2s',
                      }}
                      title="点击复制投票码"
                    >
                      投票码: {currentPoll.code}
                      <span style={{
                        fontSize: 11,
                        fontFamily: 'sans-serif',
                        letterSpacing: 'normal',
                        fontWeight: 500,
                        color: copiedCode ? '#4CAF50' : 'rgba(187, 134, 252, 0.6)',
                      }}>
                        {copiedCode ? '✓ 已复制' : '📋 复制'}
                      </span>
                    </div>
                    <span style={{ fontSize: 13, color: '#888' }}>
                      👥 {currentPoll.totalVotes} 人参与
                    </span>
                  </div>
                </div>

                {isCurrentPollCreator && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={handleReset}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: 'rgba(255, 193, 7, 0.15)',
                        color: '#FFC107',
                        border: '1px solid rgba(255, 193, 7, 0.3)',
                        borderRadius: 8,
                        fontWeight: 500,
                        fontSize: 13,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      🔄 重置
                    </button>
                    {!currentPoll.isClosed && (
                      <button
                        onClick={handleClose}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: 'rgba(255, 82, 82, 0.15)',
                          color: '#FF5252',
                          border: '1px solid rgba(255, 82, 82, 0.3)',
                          borderRadius: 8,
                          fontWeight: 500,
                          fontSize: 13,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                      >
                        🔒 关闭投票
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }} className="main-grid">
              <VoteCard
                options={currentPoll.options}
                isClosed={currentPoll.isClosed}
                hasVoted={hasVoted}
                votedOptionId={votedOptionId}
                totalVotes={currentPoll.totalVotes}
                onVote={handleVote}
                showVoters={!!isCurrentPollCreator}
              />

              <ResultChart options={currentPoll.options} totalVotes={currentPoll.totalVotes} />
            </div>
          </div>
        )}
      </main>

      <style>{`
        @media (max-width: 768px) {
          aside {
            position: fixed !important;
            top: 0;
            left: 0;
            height: 100vh !important;
            transform: translateX(-100%);
          }
          aside.sidebar-open {
            transform: translateX(0);
          }
          .mobile-overlay {
            display: block !important;
          }
          .menu-toggle {
            display: block !important;
          }
          main {
            padding-top: 60px !important;
          }
          .main-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
