import React, { useState, useEffect, useCallback, useMemo } from 'react';
import StallCard, { StallListItem } from './components/StallCard';
import Leaderboard, { LeaderboardItem } from './components/Leaderboard';

interface Comment {
  id: string;
  stallId: string;
  nickname: string;
  content: string;
  createdAt: number;
}

interface StallDetail extends StallListItem {
  liked: boolean;
  comments: Comment[];
}

type ViewType = 'list' | 'detail' | 'register';

const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - timestamp;
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hour = date.getHours().toString().padStart(2, '0');
  const min = date.getMinutes().toString().padStart(2, '0');
  return `${month}-${day} ${hour}:${min}`;
};

const App: React.FC = () => {
  const [view, setView] = useState<ViewType>('list');
  const [stalls, setStalls] = useState<StallListItem[]>([]);
  const [currentStall, setCurrentStall] = useState<StallDetail | null>(null);
  const [searchText, setSearchText] = useState('');
  const [_isLoading, _setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    ownerNickname: '',
    description: '',
    images: ['', '', '']
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [commentForm, setCommentForm] = useState({ nickname: '', content: '' });
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [likeSubmitting, setLikeSubmitting] = useState(false);

  const [carouselIndex, setCarouselIndex] = useState(0);

  const fetchStalls = useCallback(async () => {
    try {
      const res = await fetch('/api/stalls');
      const json = await res.json();
      setStalls(json.data || []);
    } catch (err) {
      console.error('获取摊位列表失败', err);
    }
  }, []);

  const fetchStallDetail = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/stalls/${id}`);
      if (!res.ok) throw new Error('摊位不存在');
      const json = await res.json();
      setCurrentStall(json.data);
      setCarouselIndex(0);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '获取详情失败');
    }
  }, []);

  const fetchLeaderboard = useCallback(async (): Promise<LeaderboardItem[]> => {
    try {
      const res = await fetch('/api/leaderboard');
      const json = await res.json();
      return json.data || [];
    } catch {
      return [];
    }
  }, []);

  useEffect(() => {
    fetchStalls();
  }, [fetchStalls]);

  const filteredStalls = useMemo(() => {
    if (!searchText.trim()) return stalls;
    const keyword = searchText.trim().toLowerCase();
    return stalls.filter(
      s =>
        s.name.toLowerCase().includes(keyword) ||
        s.ownerNickname.toLowerCase().includes(keyword)
    );
  }, [stalls, searchText]);

  const handleViewDetail = (stallId: string) => {
    fetchStallDetail(stallId);
    setView('detail');
  };

  const handleBackToList = () => {
    setView('list');
    setCurrentStall(null);
    setErrorMsg('');
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = '请输入摊位名称';
    if (!formData.ownerNickname.trim()) errors.ownerNickname = '请输入摊主昵称';
    if (!formData.description.trim()) {
      errors.description = '请输入作品简介';
    } else if (formData.description.length > 200) {
      errors.description = '简介最多200字';
    }
    const validImages = formData.images.filter(img => img.trim());
    if (validImages.length === 0) {
      errors.images = '至少填写1张图片URL';
    } else {
      const invalidIdx = validImages.findIndex(url => !isValidUrl(url));
      if (invalidIdx !== -1) {
        errors.images = `第${invalidIdx + 1}张图片URL格式不正确`;
      }
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const validImages = formData.images.filter(img => img.trim());
      const res = await fetch('/api/stalls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          ownerNickname: formData.ownerNickname,
          description: formData.description,
          images: validImages
        })
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || '创建失败');
      }
      await fetchStalls();
      setFormData({ name: '', ownerNickname: '', description: '', images: ['', '', ''] });
      setView('list');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '创建失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLike = async () => {
    if (!currentStall || likeSubmitting) return;
    setLikeSubmitting(true);
    try {
      const res = await fetch(`/api/stalls/${currentStall.id}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const json = await res.json();
      if (res.ok) {
        const liked = json.liked as boolean;
        const likesCount = json.likesCount as number;
        setCurrentStall(prev =>
          prev ? { ...prev, liked, likesCount, interactionCount: likesCount + prev.commentsCount } : prev
        );
        setStalls(prev =>
          prev.map(s =>
            s.id === currentStall.id
              ? { ...s, likesCount, interactionCount: likesCount + s.commentsCount }
              : s
          )
        );
      } else if (res.status === 429) {
        const likesCount = json.likesCount as number;
        setCurrentStall(prev =>
          prev ? { ...prev, likesCount, interactionCount: likesCount + prev.commentsCount } : prev
        );
      }
    } catch {
      console.error('点赞失败');
    } finally {
      setLikeSubmitting(false);
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStall || commentSubmitting) return;
    if (!commentForm.nickname.trim() || !commentForm.content.trim()) return;
    if (commentForm.content.length > 100) return;

    const optimisticComment: Comment = {
      id: `temp-${Date.now()}`,
      stallId: currentStall.id,
      nickname: commentForm.nickname.trim(),
      content: commentForm.content.trim(),
      createdAt: Date.now()
    };

    const updatedComments = [optimisticComment, ...(currentStall.comments || [])];
    const newCommentsCount = currentStall.commentsCount + 1;

    setCurrentStall(prev =>
      prev
        ? {
            ...prev,
            comments: updatedComments,
            commentsCount: newCommentsCount,
            interactionCount: prev.likesCount + newCommentsCount
          }
        : prev
    );
    setStalls(prev =>
      prev.map(s =>
        s.id === currentStall.id
          ? { ...s, commentsCount: newCommentsCount, interactionCount: s.likesCount + newCommentsCount }
          : s
      )
    );

    const savedNickname = commentForm.nickname;
    setCommentForm({ nickname: savedNickname, content: '' });

    setCommentSubmitting(true);
    try {
      const res = await fetch(`/api/stalls/${currentStall.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nickname: optimisticComment.nickname,
          content: optimisticComment.content
        })
      });
      const json = await res.json();
      if (res.ok) {
        setCurrentStall(prev =>
          prev
            ? {
                ...prev,
                comments: prev.comments.map(c =>
                  c.id === optimisticComment.id ? { ...json.data } : c
                )
              }
            : prev
        );
      } else {
        setCurrentStall(prev =>
          prev
            ? {
                ...prev,
                comments: prev.comments.filter(c => c.id !== optimisticComment.id),
                commentsCount: prev.commentsCount - 1,
                interactionCount: prev.likesCount + (prev.commentsCount - 1)
              }
            : prev
        );
        setStalls(prev =>
          prev.map(s =>
            s.id === currentStall.id
              ? {
                  ...s,
                  commentsCount: s.commentsCount - 1,
                  interactionCount: s.likesCount + (s.commentsCount - 1)
                }
              : s
          )
        );
        alert(json.error || '留言失败，请重试');
      }
    } catch {
      setCurrentStall(prev =>
        prev
          ? {
              ...prev,
              comments: prev.comments.filter(c => c.id !== optimisticComment.id),
              commentsCount: prev.commentsCount - 1,
              interactionCount: prev.likesCount + (prev.commentsCount - 1)
            }
          : prev
      );
      setStalls(prev =>
        prev.map(s =>
          s.id === currentStall.id
            ? {
                ...s,
                commentsCount: s.commentsCount - 1,
                interactionCount: s.likesCount + (s.commentsCount - 1)
              }
            : s
        )
      );
      alert('网络错误，留言失败');
    } finally {
      setCommentSubmitting(false);
    }
  };

  const renderHeader = () => (
    <header className="app-header">
      <div className="header-content">
        <div className="logo" onClick={handleBackToList}>
          <span className="logo-icon">🎪</span>
          <span className="logo-text">创意集市</span>
        </div>
        {view === 'list' && (
          <button className="register-btn" onClick={() => setView('register')}>
            ＋ 注册摊位
          </button>
        )}
        {view !== 'list' && (
          <button className="back-btn" onClick={handleBackToList}>
            ← 返回列表
          </button>
        )}
      </div>
    </header>
  );

  const renderSearchBar = () => (
    <div className="search-bar">
      <div className="search-input-wrap">
        <span className="search-icon">🔍</span>
        <input
          type="text"
          className="search-input"
          placeholder="搜索摊位名称或摊主昵称..."
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
        />
      </div>
    </div>
  );

  const renderListView = () => (
    <div className="list-view">
      {renderSearchBar()}
      <div className="stalls-grid">
        {filteredStalls.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🎨</div>
            <p>{searchText ? '没有找到匹配的摊位' : '暂无摊位，快来注册一个吧！'}</p>
          </div>
        ) : (
          filteredStalls.map(stall => (
            <StallCard key={stall.id} stall={stall} onViewDetail={handleViewDetail} />
          ))
        )}
      </div>
    </div>
  );

  const renderDetailView = () => {
    if (_isLoading || !currentStall) {
      if (errorMsg) {
        return (
          <div className="empty-state">
            <div className="empty-icon">😢</div>
            <p>{errorMsg}</p>
            <button className="primary-btn" onClick={handleBackToList}>
              返回列表
            </button>
          </div>
        );
      }
      return <div className="loading">加载中...</div>;
    }

    const stall = currentStall;
    return (
      <div className="detail-view">
        <div className="detail-header">
          <h1 className="detail-title">{stall.name}</h1>
          <p className="detail-owner">摊主：{stall.ownerNickname}</p>
        </div>

        <div className="detail-body">
          <div className="detail-left">
            <div className="carousel">
              {stall.images.length > 0 && (
                <>
                  <div className="carousel-main">
                    <img src={stall.images[carouselIndex]} alt={`作品${carouselIndex + 1}`} />
                  </div>
                  {stall.images.length > 1 && (
                    <div className="carousel-thumbs">
                      {stall.images.map((img, idx) => (
                        <img
                          key={idx}
                          src={img}
                          alt={`缩略图${idx + 1}`}
                          className={`carousel-thumb ${idx === carouselIndex ? 'active' : ''}`}
                          onClick={() => setCarouselIndex(idx)}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="detail-description">
              <h3 className="section-title">作品简介</h3>
              <p>{stall.description}</p>
            </div>

            <div className="comments-section">
              <h3 className="section-title">
                留言互动 <span className="count-badge">{stall.commentsCount}</span>
              </h3>

              <form className="comment-form" onSubmit={handleCommentSubmit}>
                <div className="comment-row">
                  <input
                    type="text"
                    className="comment-input nickname"
                    placeholder="你的昵称"
                    value={commentForm.nickname}
                    onChange={e => setCommentForm({ ...commentForm, nickname: e.target.value })}
                    maxLength={20}
                  />
                </div>
                <div className="comment-row comment-row-content">
                  <textarea
                    className="comment-input content"
                    placeholder="写下你想说的话（最多100字）"
                    value={commentForm.content}
                    onChange={e =>
                      setCommentForm({
                        ...commentForm,
                        content: e.target.value.slice(0, 100)
                      })
                    }
                    rows={3}
                  />
                  <span className="char-count">{commentForm.content.length}/100</span>
                </div>
                <button
                  type="submit"
                  className="primary-btn comment-submit"
                  disabled={
                    commentSubmitting ||
                    !commentForm.nickname.trim() ||
                    !commentForm.content.trim()
                  }
                >
                  {commentSubmitting ? '提交中...' : '发送留言'}
                </button>
              </form>

              <div className="comments-list">
                {stall.comments.length === 0 ? (
                  <div className="no-comments">还没有留言，来抢沙发吧~</div>
                ) : (
                  stall.comments.map(comment => (
                    <div key={comment.id} className="comment-item">
                      <div className="comment-header">
                        <span className="comment-nickname">{comment.nickname}</span>
                        <span className="comment-time">{formatTime(comment.createdAt)}</span>
                      </div>
                      <div className="comment-content">{comment.content}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="detail-right">
            <div className="action-panel">
              <button
                className={`like-btn ${stall.liked ? 'liked' : ''}`}
                onClick={handleLike}
                disabled={likeSubmitting}
              >
                <span className="like-icon">{stall.liked ? '❤️' : '🤍'}</span>
                <span className="like-count">{stall.likesCount}</span>
              </button>
              <div className="stats-row">
                <div className="stat-box">
                  <div className="stat-number">{stall.likesCount}</div>
                  <div className="stat-label">点赞</div>
                </div>
                <div className="stat-box">
                  <div className="stat-number">{stall.commentsCount}</div>
                  <div className="stat-label">留言</div>
                </div>
                <div className="stat-box highlight">
                  <div className="stat-number">{stall.interactionCount}</div>
                  <div className="stat-label">总热度</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderRegisterView = () => (
    <div className="register-view">
      <h2 className="page-title">🎪 注册创意摊位</h2>
      {errorMsg && <div className="error-banner">{errorMsg}</div>}
      <form className="register-form" onSubmit={handleRegisterSubmit}>
        <div className="form-group">
          <label className="form-label">
            摊位名称 <span className="required">*</span>
          </label>
          <input
            type="text"
            className={`form-input ${formErrors.name ? 'error' : ''}`}
            placeholder="给你的摊位起个响亮的名字吧"
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            maxLength={30}
          />
          {formErrors.name && <div className="form-error">{formErrors.name}</div>}
        </div>

        <div className="form-group">
          <label className="form-label">
            摊主昵称 <span className="required">*</span>
          </label>
          <input
            type="text"
            className={`form-input ${formErrors.ownerNickname ? 'error' : ''}`}
            placeholder="你的昵称"
            value={formData.ownerNickname}
            onChange={e => setFormData({ ...formData, ownerNickname: e.target.value })}
            maxLength={20}
          />
          {formErrors.ownerNickname && (
            <div className="form-error">{formErrors.ownerNickname}</div>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">
            作品简介 <span className="required">*</span>
            <span className="form-hint">（{formData.description.length}/200字）</span>
          </label>
          <textarea
            className={`form-input textarea ${formErrors.description ? 'error' : ''}`}
            placeholder="介绍一下你的创意作品吧"
            value={formData.description}
            onChange={e =>
              setFormData({
                ...formData,
                description: e.target.value.slice(0, 200)
              })
            }
            rows={4}
          />
          {formErrors.description && (
            <div className="form-error">{formErrors.description}</div>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">
            作品图片URL <span className="required">*</span>
            <span className="form-hint">（1-3张）</span>
          </label>
          {formData.images.map((img, idx) => (
            <input
              key={idx}
              type="text"
              className={`form-input image-input ${
                formErrors.images ? 'error' : ''
              }`}
              placeholder={`第${idx + 1}张图片URL（https://...）`}
              value={img}
              onChange={e => {
                const newImages = [...formData.images];
                newImages[idx] = e.target.value;
                setFormData({ ...formData, images: newImages });
              }}
            />
          ))}
          {formErrors.images && <div className="form-error">{formErrors.images}</div>}
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="secondary-btn"
            onClick={() => {
              setView('list');
              setErrorMsg('');
              setFormErrors({});
            }}
          >
            取消
          </button>
          <button
            type="submit"
            className="primary-btn"
            disabled={isSubmitting}
          >
            {isSubmitting ? '提交中...' : '✓ 创建摊位'}
          </button>
        </div>
      </form>
    </div>
  );

  return (
    <div className="app">
      {renderHeader()}
      <main className="main-content">
        {_isLoading && view === 'list' ? (
          <div className="loading">加载中...</div>
        ) : view === 'list' ? (
          renderListView()
        ) : view === 'detail' ? (
          renderDetailView()
        ) : (
          renderRegisterView()
        )}
      </main>
      {view === 'list' && <Leaderboard onRefresh={fetchLeaderboard} />}
    </div>
  );
};

export default App;
