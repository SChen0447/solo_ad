import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import VoteRoom from './VoteRoom';
import { Vote, HistoryVote, CreateVoteResponse } from './types';

const getVoterId = (): string => {
  let voterId = localStorage.getItem('flashvote_voter_id');
  if (!voterId) {
    voterId = uuidv4();
    localStorage.setItem('flashvote_voter_id', voterId);
  }
  return voterId;
};

const loadHistory = (): HistoryVote[] => {
  try {
    const stored = localStorage.getItem('flashvote_history');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveToHistory = (vote: Vote): void => {
  const history = loadHistory();
  const existingIndex = history.findIndex(h => h.id === vote.id);
  const historyItem: HistoryVote = {
    id: vote.id,
    title: vote.title,
    createdAt: vote.createdAt,
    isClosed: vote.isClosed,
    viewedAt: Date.now()
  };

  if (existingIndex >= 0) {
    history[existingIndex] = historyItem;
  } else {
    history.unshift(historyItem);
  }

  localStorage.setItem('flashvote_history', JSON.stringify(history.slice(0, 50)));
};

const App = () => {
  const [votes, setVotes] = useState<Vote[]>([]);
  const [history, setHistory] = useState<HistoryVote[]>([]);
  const [currentVote, setCurrentVote] = useState<Vote | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creatorIds, setCreatorIds] = useState<Record<string, string>>({});

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const socketRef = useRef<Socket | null>(null);
  const voterIdRef = useRef(getVoterId());

  useEffect(() => {
    const startTime = Date.now();
    const historyData = loadHistory();
    setHistory(historyData);

    const fetchVotes = async () => {
      try {
        const res = await fetch('/api/votes');
        const data = await res.json();
        setVotes(data);
      } catch (err) {
        console.error('获取投票列表失败:', err);
      } finally {
        const elapsed = Date.now() - startTime;
        if (elapsed < 500) {
          setTimeout(() => setIsLoading(false), 500 - elapsed);
        } else {
          setIsLoading(false);
        }
      }
    };

    fetchVotes();
  }, []);

  useEffect(() => {
    const socket = io('/', {
      transports: ['websocket', 'polling']
    });
    socketRef.current = socket;

    socket.on('voteCreated', (vote: Vote) => {
      setVotes(prev => [vote, ...prev]);
    });

    socket.on('voteUpdated', (vote: Vote) => {
      setVotes(prev => prev.map(v => v.id === vote.id ? vote : v));
      if (currentVote?.id === vote.id) {
        setCurrentVote(vote);
      }
      setHistory(prev => prev.map(h =>
        h.id === vote.id ? { ...h, isClosed: vote.isClosed } : h
      ));
    });

    socket.on('voteClosed', (vote: Vote) => {
      setVotes(prev => prev.map(v => v.id === vote.id ? { ...v, isClosed: true } : v));
      if (currentVote?.id === vote.id) {
        setCurrentVote({ ...vote, isClosed: true });
      }
      setHistory(prev => prev.map(h =>
        h.id === vote.id ? { ...h, isClosed: true } : h
      ));
    });

    return () => {
      socket.disconnect();
    };
  }, [currentVote?.id]);

  const handleAddOption = useCallback(() => {
    if (options.length < 6) {
      setOptions(prev => [...prev, '']);
    }
  }, [options.length]);

  const handleRemoveOption = useCallback((index: number) => {
    if (options.length > 2) {
      setOptions(prev => prev.filter((_, i) => i !== index));
    }
  }, [options.length]);

  const handleOptionChange = useCallback((index: number, value: string) => {
    setOptions(prev => prev.map((opt, i) => i === index ? value : opt));
  }, []);

  const handleClearOption = useCallback((index: number) => {
    setOptions(prev => prev.map((opt, i) => i === index ? '' : opt));
  }, []);

  const handleCreateVote = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validOptions = options.filter(opt => opt.trim().length > 0);

    if (!title.trim()) {
      setError('请输入投票标题');
      return;
    }

    if (validOptions.length < 2) {
      setError('至少需要2个有效选项');
      return;
    }

    try {
      const res = await fetch('/api/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          options: validOptions
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || '创建投票失败');
      }

      const data: CreateVoteResponse = await res.json();
      setCreatorIds(prev => ({ ...prev, [data.vote.id]: data.creatorId }));
      setTitle('');
      setDescription('');
      setOptions(['', '']);
      setShowCreateForm(false);
      setCurrentVote(data.vote);
      saveToHistory(data.vote);
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建投票失败');
    }
  }, [title, description, options]);

  const handleVoteClick = useCallback((vote: Vote) => {
    saveToHistory(vote);
    setHistory(prev => {
      const existingIndex = prev.findIndex(h => h.id === vote.id);
      const historyItem: HistoryVote = {
        id: vote.id,
        title: vote.title,
        createdAt: vote.createdAt,
        isClosed: vote.isClosed,
        viewedAt: Date.now()
      };

      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = historyItem;
        return updated;
      } else {
        return [historyItem, ...prev];
      }
    });
    setCurrentVote(vote);
  }, []);

  const handleBack = useCallback(() => {
    setCurrentVote(null);
  }, []);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (currentVote) {
    return (
      <VoteRoom
        vote={currentVote}
        onBack={handleBack}
        voterId={voterIdRef.current}
        creatorId={creatorIds[currentVote.id]}
        socket={socketRef.current}
      />
    );
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">
          <span className="logo-icon">⚡</span>
          FlashVote
        </h1>
        <p className="app-subtitle">轻量级实时投票系统</p>
      </header>

      <main className="main-content">
        {!showCreateForm ? (
          <button
            className="create-btn"
            onClick={() => setShowCreateForm(true)}
          >
            + 创建新投票
          </button>
        ) : (
          <div className="create-form-card">
            <h2>创建投票</h2>
            <form onSubmit={handleCreateVote}>
              <div className="form-group">
                <label htmlFor="title">投票标题 *</label>
                <input
                  type="text"
                  id="title"
                  value={title}
                  onChange={e => {
                    if (e.target.value.length <= 50) {
                      setTitle(e.target.value);
                    }
                  }}
                  placeholder="例如：选择下周团建活动"
                  className={`title-input ${title.length >= 50 ? 'input-overlimit' : ''}`}
                />
                <div className={`char-counter ${title.length >= 50 ? 'overlimit' : ''}`}>
                  {title.length}/50
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="description">描述（可选）</label>
                <textarea
                  id="description"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="添加一些说明..."
                  rows={2}
                  maxLength={500}
                />
              </div>

              <div className="form-group">
                <label>选项 *（2-6个）</label>
                {options.slice(0, 6).map((option, index) => (
                  <div key={index} className="option-input-row">
                    <input
                      type="text"
                      value={option}
                      onChange={e => handleOptionChange(index, e.target.value)}
                      placeholder={`选项 ${index + 1}`}
                      maxLength={200}
                    />
                    <button
                      type="button"
                      className="clear-option-btn"
                      onClick={() => handleClearOption(index)}
                      title="清空内容"
                      disabled={!option}
                    >
                      ⟲
                    </button>
                    {options.length > 2 && (
                      <button
                        type="button"
                        className="remove-option-btn"
                        onClick={() => handleRemoveOption(index)}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                {options.length > 6 && (
                  <div className="option-warning warning-max">
                    ⚠ 最多6个选项，已自动隐藏多余项
                  </div>
                )}
                {options.length < 6 && (
                  <button
                    type="button"
                    className="add-option-btn"
                    onClick={handleAddOption}
                  >
                    + 添加选项
                  </button>
                )}
                {(() => {
                  const validCount = options.filter(opt => opt.trim().length > 0).length;
                  if (validCount < 2) {
                    return (
                      <div className="option-warning warning-min">
                        ⚠ 至少需要2个有效选项（当前 {validCount} 个）
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>

              {error && <div className="error-message">{error}</div>}

              <div className="form-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => {
                    setShowCreateForm(false);
                    setError(null);
                    setTitle('');
                    setDescription('');
                    setOptions(['', '']);
                  }}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className={`submit-btn ${
                    options.filter(opt => opt.trim().length > 0).length < 2 ||
                    !title.trim() ||
                    title.length >= 50
                      ? 'disabled'
                      : ''
                  }`}
                  disabled={
                    options.filter(opt => opt.trim().length > 0).length < 2 ||
                    !title.trim() ||
                    title.length >= 50
                  }
                >
                  创建投票
                </button>
              </div>
            </form>
          </div>
        )}

        {history.length > 0 && (
          <section className="section">
            <h2 className="section-title">历史记录</h2>
            <div className="vote-grid">
              {history.map(item => {
                const fullVote = votes.find(v => v.id === item.id);
                const vote = fullVote || item;
                return (
                  <div
                    key={item.id}
                    className="vote-card"
                    onClick={() => {
                      if (fullVote) {
                        handleVoteClick(fullVote);
                      } else {
                        fetch(`/api/votes/${item.id}`)
                          .then(res => res.json())
                          .then(data => {
                            if (data && !data.error) {
                              handleVoteClick(data);
                            }
                          });
                      }
                    }}
                  >
                    <div className="vote-card-header">
                      <h3 className="vote-card-title">{item.title}</h3>
                      <span className={`status-badge ${item.isClosed ? 'closed' : 'active'}`}>
                        {item.isClosed ? '已结束' : '进行中'}
                      </span>
                    </div>
                    <div className="vote-card-footer">
                      <span className="vote-card-time">
                        创建于 {formatDate(item.createdAt)}
                      </span>
                      {'options' in vote && (
                        <span className="vote-card-participants">
                          {vote.options.reduce((sum: number, opt) => sum + opt.votes, 0)} 人参与
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {!isLoading && votes.length > 0 && (
          <section className="section">
            <h2 className="section-title">全部投票</h2>
            <div className="vote-grid">
              {votes.map(vote => (
                <div
                  key={vote.id}
                  className="vote-card"
                  onClick={() => handleVoteClick(vote)}
                >
                  <div className="vote-card-header">
                    <h3 className="vote-card-title">{vote.title}</h3>
                    <span className={`status-badge ${vote.isClosed ? 'closed' : 'active'}`}>
                      {vote.isClosed ? '已结束' : '进行中'}
                    </span>
                  </div>
                  {vote.description && (
                    <p className="vote-card-desc">{vote.description}</p>
                  )}
                  <div className="vote-card-footer">
                    <span className="vote-card-time">
                      {formatDate(vote.createdAt)}
                    </span>
                    <span className="vote-card-participants">
                      {vote.options.reduce((sum, opt) => sum + opt.votes, 0)} 人参与
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {!isLoading && votes.length === 0 && history.length === 0 && !showCreateForm && (
          <div className="empty-state">
            <div className="empty-icon">📊</div>
            <h3>还没有投票</h3>
            <p>点击上方按钮创建第一个投票吧！</p>
          </div>
        )}

        {isLoading && (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>加载中...</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
