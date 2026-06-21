import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, X, Calendar, ArrowLeft, Send } from 'lucide-react';
import type { Portfolio, Comment, ToolCategory } from '../types';
import { DIGITAL_TOOLS, TRADITIONAL_TOOLS } from '../types';
import LazyImage from './LazyImage';

interface PortfolioDetailProps {
  onCommentAdded: () => void;
  onReplyAdded: () => void;
}

const getToolCategory = (tools: string[]): ToolCategory => {
  const hasDigital = tools.some(t => DIGITAL_TOOLS.includes(t));
  const hasTraditional = tools.some(t => TRADITIONAL_TOOLS.includes(t));
  if (hasDigital && hasTraditional) return 'mixed';
  if (hasTraditional) return 'traditional';
  return 'digital';
};

const getTagClass = (category: ToolCategory): string => {
  switch (category) {
    case 'digital': return 'tag-digital';
    case 'traditional': return 'tag-traditional';
    case 'mixed': return 'tag-mixed';
  }
};

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const formatDateTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function PortfolioDetail({ onCommentAdded, onReplyAdded }: PortfolioDetailProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [isSwitching, setIsSwitching] = useState(false);
  const [highlightedComment, setHighlightedComment] = useState<string | null>(null);
  const [commentAuthor, setCommentAuthor] = useState('');
  const [commentContent, setCommentContent] = useState('');
  const [replyContent, setReplyContent] = useState<{ [key: string]: string }>({});
  const [showReplyForm, setShowReplyForm] = useState<{ [key: string]: boolean }>({});
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id) {
      loadPortfolio();
    }
  }, [id]);

  const loadPortfolio = async () => {
    try {
      const res = await fetch(`/api/portfolio/${id}`);
      const data = await res.json();
      if (data.error) {
        navigate('/');
        return;
      }
      setPortfolio(data);
    } catch (error) {
      console.error('Failed to load portfolio:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrevSlide = () => {
    if (!portfolio || isSwitching) return;
    setIsSwitching(true);
    setCurrentSlide(prev => prev === 0 ? portfolio.images.length - 1 : prev - 1);
    setTimeout(() => setIsSwitching(false), 500);
  };

  const handleNextSlide = () => {
    if (!portfolio || isSwitching) return;
    setIsSwitching(true);
    setCurrentSlide(prev => prev === portfolio.images.length - 1 ? 0 : prev + 1);
    setTimeout(() => setIsSwitching(false), 500);
  };

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
  };

  const handleLightboxPrev = () => {
    if (!portfolio || isSwitching) return;
    setIsSwitching(true);
    setLightboxIndex(prev => prev === 0 ? portfolio.images.length - 1 : prev - 1);
    setTimeout(() => setIsSwitching(false), 400);
  };

  const handleLightboxNext = () => {
    if (!portfolio || isSwitching) return;
    setIsSwitching(true);
    setLightboxIndex(prev => prev === portfolio.images.length - 1 ? 0 : prev + 1);
    setTimeout(() => setIsSwitching(false), 400);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent, isLightbox: boolean) => {
    if (touchStart === null) return;
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;
    
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        isLightbox ? handleLightboxNext() : handleNextSlide();
      } else {
        isLightbox ? handleLightboxPrev() : handlePrevSlide();
      }
    }
    setTouchStart(null);
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentAuthor.trim() || !commentContent.trim() || !id) return;

    try {
      await fetch(`/api/portfolio/${id}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author: commentAuthor.trim(),
          content: commentContent.trim(),
        }),
      });
      setCommentAuthor('');
      setCommentContent('');
      onCommentAdded();
      loadPortfolio();
    } catch (error) {
      console.error('Failed to post comment:', error);
    }
  };

  const handleReplySubmit = async (commentId: string) => {
    if (!replyContent[commentId]?.trim() || !id) return;

    try {
      await fetch(`/api/portfolio/${id}/comment/${commentId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reply: replyContent[commentId].trim() }),
      });
      
      setHighlightedComment(commentId);
      setTimeout(() => setHighlightedComment(null), 2000);
      
      setReplyContent(prev => ({ ...prev, [commentId]: '' }));
      setShowReplyForm(prev => ({ ...prev, [commentId]: false }));
      onReplyAdded();
      loadPortfolio();
    } catch (error) {
      console.error('Failed to post reply:', error);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!lightboxOpen) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') handleLightboxPrev();
      if (e.key === 'ArrowRight') handleLightboxNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen, portfolio, isSwitching]);

  if (loading) {
    return (
      <div className="container" style={{ padding: '100px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
        加载中...
      </div>
    );
  }

  if (!portfolio) {
    return (
      <div className="container" style={{ padding: '100px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
        作品不存在
      </div>
    );
  }

  const category = getToolCategory(portfolio.tools);

  return (
    <div className="container">
      <div className="detail-header">
        <button className="back-btn" onClick={() => navigate('/')}>
          <ArrowLeft size={18} />
          返回作品集
        </button>
        
        <h1 className="detail-title">{portfolio.name}</h1>
        
        <div className="detail-meta">
          <span>
            <Calendar size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} />
            {formatDate(portfolio.createdAt)}
          </span>
          <span style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {portfolio.tools.map((tool, i) => (
              <span key={i} className={`tag ${getTagClass(category)}`}>{tool}</span>
            ))}
          </span>
        </div>
        
        <p className="detail-description">{portfolio.description}</p>
      </div>

      <div 
        className="carousel-container"
        ref={carouselRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={(e) => handleTouchEnd(e, false)}
      >
        <div 
          className={`carousel-track ${isSwitching ? 'switching' : ''}`}
          style={{ transform: `translateX(-${currentSlide * 100}%)` }}
        >
          {portfolio.images.map((image, index) => (
            <div 
              key={index} 
              className="carousel-slide"
              onClick={() => openLightbox(index)}
            >
              <LazyImage
                src={image}
                alt={`${portfolio.name} - ${index + 1}`}
              />
            </div>
          ))}
        </div>

        <button className="carousel-btn prev" onClick={handlePrevSlide}>
          <ChevronLeft size={24} />
        </button>
        <button className="carousel-btn next" onClick={handleNextSlide}>
          <ChevronRight size={24} />
        </button>

        <div className="carousel-dots">
          {portfolio.images.map((_, index) => (
            <button
              key={index}
              className={`carousel-dot ${currentSlide === index ? 'active' : ''}`}
              onClick={() => setCurrentSlide(index)}
            />
          ))}
        </div>
      </div>

      <div className="comments-section">
        <h2 className="comments-title">评论区 ({portfolio.comments.length})</h2>

        {portfolio.comments.length === 0 ? (
          <div className="empty-state" style={{ padding: '32px 0' }}>
            暂无评论，来发表第一条评论吧！
          </div>
        ) : (
          <div className="comment-list">
            {portfolio.comments.map((comment: Comment) => (
              <div 
                key={comment.id} 
                className={`comment-item ${highlightedComment === comment.id ? 'highlighted' : ''}`}
              >
                <div className="comment-header">
                  <span className="comment-author">{comment.author}</span>
                  <span className="comment-date">{formatDateTime(comment.createdAt)}</span>
                </div>
                <p className="comment-content">{comment.content}</p>
                
                {comment.reply && (
                  <div className="comment-reply">
                    <div className="reply-label">设计师回复</div>
                    <p className="reply-content">{comment.reply}</p>
                    {comment.replyAt && (
                      <div className="reply-date">{formatDateTime(comment.replyAt)}</div>
                    )}
                  </div>
                )}

                {!comment.reply && (
                  <div>
                    {!showReplyForm[comment.id] ? (
                      <button
                        className="reply-btn"
                        style={{ marginTop: '8px', fontSize: '13px', padding: '6px 12px' }}
                        onClick={() => setShowReplyForm(prev => ({ ...prev, [comment.id]: true }))}
                      >
                        回复评论
                      </button>
                    ) : (
                      <div className="reply-form">
                        <textarea
                          className="reply-input"
                          placeholder="输入回复内容..."
                          value={replyContent[comment.id] || ''}
                          onChange={(e) => setReplyContent(prev => ({ ...prev, [comment.id]: e.target.value }))}
                          rows={2}
                        />
                        <button
                          className="reply-btn"
                          onClick={() => handleReplySubmit(comment.id)}
                        >
                          <Send size={14} />
                        </button>
                        <button
                          className="reply-btn"
                          style={{ background: '#e5e7eb', color: 'var(--text-primary)' }}
                          onClick={() => {
                            setShowReplyForm(prev => ({ ...prev, [comment.id]: false }));
                            setReplyContent(prev => ({ ...prev, [comment.id]: '' }));
                          }}
                        >
                          取消
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <form className="comment-form" onSubmit={handleCommentSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">您的昵称</label>
              <input
                type="text"
                className="form-input"
                placeholder="请输入昵称"
                value={commentAuthor}
                onChange={(e) => setCommentAuthor(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">评论内容</label>
            <textarea
              className="form-textarea"
              placeholder="分享您的想法或提问..."
              value={commentContent}
              onChange={(e) => setCommentContent(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="form-submit">
            发表评论
          </button>
        </form>
      </div>

      {lightboxOpen && (
        <div 
          className="lightbox" 
          onClick={closeLightbox}
          onTouchStart={handleTouchStart}
          onTouchEnd={(e) => handleTouchEnd(e, true)}
        >
          <div 
            className={`lightbox-content ${isSwitching ? 'switching' : ''}`}
            onClick={(e) => e.stopPropagation()}
          >
            <button className="lightbox-close" onClick={closeLightbox}>
              <X size={20} />
            </button>
            
            <button className="lightbox-btn prev" onClick={handleLightboxPrev}>
              <ChevronLeft size={28} />
            </button>
            <button className="lightbox-btn next" onClick={handleLightboxNext}>
              <ChevronRight size={28} />
            </button>

            <img
              src={portfolio.images[lightboxIndex]}
              alt={`${portfolio.name} - ${lightboxIndex + 1}`}
            />
          </div>
        </div>
      )}
    </div>
  );
}
