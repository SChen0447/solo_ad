import React, { useState, useEffect, useMemo } from 'react';
import type { Material, PlatformType, PlatformValidation } from '../types';
import { platformApi } from '../api';
import './PlatformPreview.css';

interface PlatformPreviewProps {
  material: Material;
}

const PLATFORM_CONFIG: Record<PlatformType, { name: string; color: string }> = {
  weibo: { name: '微博', color: '#E6162D' },
  xiaohongshu: { name: '小红书', color: '#FE2C55' },
  wechat: { name: '公众号', color: '#07C160' },
};

const PLATFORM_LIMITS: Record<PlatformType, { title: number; content: number }> = {
  weibo: { title: 0, content: 140 },
  xiaohongshu: { title: 20, content: 1000 },
  wechat: { title: 64, content: 5000 },
};

const PlatformPreview: React.FC<PlatformPreviewProps> = ({ material }) => {
  const [activePlatform, setActivePlatform] = useState<PlatformType>('weibo');
  const [validations, setValidations] = useState<Record<PlatformType, PlatformValidation | null>>({
    weibo: null,
    xiaohongshu: null,
    wechat: null,
  });
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');
  const [isAnimating, setIsAnimating] = useState(false);
  const [weiboStats, setWeiboStats] = useState({ likes: 23, reposts: 5, comments: 8, liked: false });
  const [xhsStats, setXhsStats] = useState({ likes: '2.3k', liked: false });
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    const validateAll = async () => {
      const results = await platformApi.validateAll(material.title, material.content);
      const newValidations: Record<PlatformType, PlatformValidation | null> = {
        weibo: null,
        xiaohongshu: null,
        wechat: null,
      };
      results.forEach((v) => {
        newValidations[v.platform as PlatformType] = v;
      });
      setValidations(newValidations);
    };
    validateAll();
  }, [material.title, material.content]);

  const platforms: PlatformType[] = ['weibo', 'xiaohongshu', 'wechat'];

  const handlePlatformChange = (platform: PlatformType) => {
    if (platform === activePlatform) return;
    const currentIndex = platforms.indexOf(activePlatform);
    const targetIndex = platforms.indexOf(platform);
    setSlideDirection(targetIndex > currentIndex ? 'right' : 'left');
    setIsAnimating(true);
    setTimeout(() => {
      setActivePlatform(platform);
      setTimeout(() => setIsAnimating(false), 50);
    }, 350);
  };

  const truncateText = (text: string, limit: number) => {
    if (limit <= 0 || text.length <= limit) return { text, truncated: false };
    return { text: text.slice(0, limit) + '...', truncated: true };
  };

  const currentValidation = validations[activePlatform];
  const hasTruncateRisk = currentValidation?.truncateRisk || false;
  const limits = PLATFORM_LIMITS[activePlatform];

  const renderWeiboPreview = () => {
    const contentTruncated = truncateText(material.content, limits.content);

    const handleLike = (e: React.MouseEvent) => {
      e.stopPropagation();
      setWeiboStats((prev) => ({
        ...prev,
        liked: !prev.liked,
        likes: prev.liked ? prev.likes - 1 : prev.likes + 1,
      }));
    };

    const handleRepost = (e: React.MouseEvent) => {
      e.stopPropagation();
      setWeiboStats((prev) => ({ ...prev, reposts: prev.reposts + 1 }));
      alert('转发成功！');
    };

    const handleComment = (e: React.MouseEvent) => {
      e.stopPropagation();
      setShowCommentModal(true);
    };

    const handleFollow = (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsFollowing(!isFollowing);
    };

    return (
      <div className="weibo-preview">
        <div className="weibo-header">
          <div className="weibo-avatar">微</div>
          <div className="weibo-user-info">
            <div className="weibo-username">内容创作者</div>
            <div className="weibo-time">刚刚 来自 微博网页版</div>
          </div>
          <button
            className={`weibo-follow-btn ${isFollowing ? 'following' : ''}`}
            onClick={handleFollow}
          >
            {isFollowing ? '已关注' : '+ 关注'}
          </button>
        </div>
        <div className="weibo-content">
          {contentTruncated.truncated ? (
            <>
              <span>{material.content.slice(0, limits.content)}</span>
              <span className="truncate-highlight" title={`溢出${material.content.length - limits.content}字`}>
                {material.content.slice(limits.content)}
              </span>
            </>
          ) : (
            <span>{material.content}</span>
          )}
        </div>
        {material.images.length > 0 && (
          <div className="weibo-images">
            {material.images.slice(0, 9).map((img, idx) => (
              <div key={idx} className="weibo-image-item">
                <img src={img} alt="" />
              </div>
            ))}
          </div>
        )}
        <div className="weibo-footer">
          <div className="weibo-action" onClick={handleComment}>
            <span className="action-icon">💬</span>
            <span>{weiboStats.comments > 0 ? weiboStats.comments : '评论'}</span>
          </div>
          <div className="weibo-action" onClick={handleRepost}>
            <span className="action-icon">🔄</span>
            <span>{weiboStats.reposts > 0 ? weiboStats.reposts : '转发'}</span>
          </div>
          <div
            className={`weibo-action ${weiboStats.liked ? 'liked' : ''}`}
            onClick={handleLike}
          >
            <span className="action-icon">{weiboStats.liked ? '❤️' : '👍'}</span>
            <span>{weiboStats.likes > 0 ? weiboStats.likes : '赞'}</span>
          </div>
        </div>

        {showCommentModal && (
          <div className="comment-modal-overlay" onClick={(e) => { e.stopPropagation(); setShowCommentModal(false); }}>
            <div className="comment-modal" onClick={(e) => e.stopPropagation()}>
              <div className="comment-modal-header">
                <h4>发表评论</h4>
                <button onClick={() => setShowCommentModal(false)}>×</button>
              </div>
              <div className="comment-modal-body">
                <textarea
                  placeholder="说点什么吧..."
                  style={{
                    width: '100%',
                    minHeight: 80,
                    padding: 10,
                    border: '1px solid var(--border-color)',
                    borderRadius: 6,
                    resize: 'none',
                    fontSize: 14,
                  }}
                />
              </div>
              <div className="comment-modal-footer">
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setWeiboStats((prev) => ({ ...prev, comments: prev.comments + 1 }));
                    setShowCommentModal(false);
                    alert('评论发送成功！');
                  }}
                  style={{ padding: '6px 16px' }}
                >
                  发送
                </button>
              </div>
            </div>
            <style>{`
              .comment-modal-overlay {
                position: fixed;
                top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
              }
              .comment-modal {
                background: white;
                border-radius: 12px;
                width: 90%;
                max-width: 400px;
                overflow: hidden;
              }
              .comment-modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 16px 20px;
                border-bottom: 1px solid var(--border-color);
              }
              .comment-modal-header h4 { margin: 0;
              }
              .comment-modal-header button {
                font-size: 20px;
                background: none;
                border: none;
                cursor: pointer;
                color: var(--text-secondary);
              }
              .comment-modal-body {
                padding: 16px 20px;
              }
              .comment-modal-footer {
                padding: 12px 20px;
                border-top: 1px solid var(--border-color);
                display: flex;
                justify-content: flex-end;
              }
            `}</style>
          </div>
        )}
      </div>
    );
  };

  const renderXiaohongshuPreview = () => {
    const titleTruncated = truncateText(material.title, limits.title);
    const contentTruncated = truncateText(material.content, limits.content);
    return (
      <div className="xiaohongshu-preview">
        {material.images.length > 0 && (
          <div className="xhs-image-container">
            <img src={material.images[0]} alt="" className="xhs-main-image" />
            {material.images.length > 1 && (
              <div className="xhs-image-count">{material.images.length}图</div>
            )}
          </div>
        )}
        <div className="xhs-content">
          <div className="xhs-title">
            {titleTruncated.truncated ? (
              <>
                <span>{material.title.slice(0, limits.title)}</span>
                <span className="truncate-highlight" title={`标题溢出${material.title.length - limits.title}字`}>
                  {material.title.slice(limits.title)}
                </span>
              </>
            ) : (
              <span>{material.title}</span>
            )}
          </div>
          <div className="xhs-text">
            {contentTruncated.truncated ? (
              <>
                <span>{material.content.slice(0, limits.content)}</span>
                <span className="truncate-highlight" title={`正文溢出${material.content.length - limits.content}字`}>
                  {material.content.slice(limits.content)}
                </span>
              </>
            ) : (
              <span>{material.content}</span>
            )}
          </div>
          <div className="xhs-tags">
            {material.tags.map((tag, idx) => (
              <span key={idx} className="xhs-tag">#{tag}</span>
            ))}
          </div>
        </div>
        <div className="xhs-footer">
          <div className="xhs-author">
            <div className="xhs-avatar">小</div>
            <span>小红书创作者</span>
          </div>
          <div
            className={`xhs-likes ${xhsStats.liked ? 'liked' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              setXhsStats((prev) => ({
                ...prev,
                liked: !prev.liked,
                likes: prev.liked ? '2.3k' : '2.4k',
              }));
            }}
            style={{ cursor: 'pointer' }}
          >
            <span>{xhsStats.liked ? '❤️' : '🤍'}</span>
            <span>{xhsStats.likes}</span>
          </div>
        </div>
      </div>
    );
  };

  const renderWechatPreview = () => {
    const titleTruncated = truncateText(material.title, limits.title);
    return (
      <div className="wechat-preview">
        <div className="wechat-header">
          <div className="wechat-avatar">公</div>
          <div className="wechat-info">
            <div className="wechat-account">公众号名称</div>
            <div className="wechat-time">今天 09:00</div>
          </div>
        </div>
        <div className="wechat-article">
          {material.images.length > 0 && (
            <div className="wechat-cover">
              <img src={material.images[0]} alt="" />
            </div>
          )}
          <h3 className="wechat-title">
            {titleTruncated.truncated ? (
              <>
                <span>{material.title.slice(0, limits.title)}</span>
                <span className="truncate-highlight" title={`标题溢出${material.title.length - limits.title}字`}>
                  {material.title.slice(limits.title)}
                </span>
              </>
            ) : (
              <span>{material.title}</span>
            )}
          </h3>
          <div className="wechat-meta">
            <span>阅读 1256</span>
            <span>作者 小编</span>
          </div>
          <div className="wechat-content">
            <p>{material.content}</p>
          </div>
        </div>
        <div className="wechat-footer">
          <div className="wechat-action">
            <span>👍</span>
            <span>赞</span>
          </div>
          <div className="wechat-action">
            <span>💬</span>
            <span>留言</span>
          </div>
          <div className="wechat-action">
            <span>⭐</span>
            <span>收藏</span>
          </div>
          <div className="wechat-action">
            <span>↗️</span>
            <span>分享</span>
          </div>
        </div>
      </div>
    );
  };

  const renderPreview = () => {
    switch (activePlatform) {
      case 'weibo':
        return renderWeiboPreview();
      case 'xiaohongshu':
        return renderXiaohongshuPreview();
      case 'wechat':
        return renderWechatPreview();
      default:
        return null;
    }
  };

  return (
    <div className="platform-preview-container">
      <div className="preview-header">
        <h3 className="preview-title">平台预览</h3>
        <div className="platform-tabs">
          {platforms.map((platform) => {
            const config = PLATFORM_CONFIG[platform];
            const validation = validations[platform];
            const hasRisk = validation?.truncateRisk;
            return (
              <button
                key={platform}
                className={`platform-tab ${activePlatform === platform ? 'active' : ''} ${hasRisk ? 'has-risk' : ''}`}
                onClick={() => handlePlatformChange(platform)}
                style={{
                  borderColor: activePlatform === platform ? config.color : undefined,
                  color: activePlatform === platform ? config.color : undefined,
                }}
              >
                {config.name}
                {hasRisk && <span className="risk-dot" title="存在截断风险">!</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div className={`preview-content ${hasTruncateRisk ? 'has-risk-border' : ''} ${isAnimating ? 'animating' : ''} slide-${slideDirection}`}>
        {renderPreview()}
      </div>

      {hasTruncateRisk && (
        <div className="risk-warning">
          <span className="warning-icon">⚠️</span>
          <span>
            该平台存在截断风险：
            {currentValidation?.titleOverflow ? `标题溢出${currentValidation.titleOverflow}字 ` : ''}
            {currentValidation?.contentOverflow ? `正文溢出${currentValidation.contentOverflow}字` : ''}
          </span>
        </div>
      )}

      <div className="stats-section">
        <h4>平台字数统计</h4>
        <div className="stats-list">
          {platforms.map((platform) => {
            const config = PLATFORM_CONFIG[platform];
            const validation = validations[platform];
            const contentLen = material.content.length;
            const contentLimit = PLATFORM_LIMITS[platform].content;
            const percentage = Math.min((contentLen / contentLimit) * 100, 100);
            const isOverflow = validation?.truncateRisk;
            return (
              <div key={platform} className="stat-item">
                <div className="stat-label">
                  <span className="stat-platform" style={{ color: config.color }}>
                    {config.name}
                  </span>
                  <span className={`stat-count ${isOverflow ? 'overflow' : ''}`}>
                    {contentLen}/{contentLimit}
                  </span>
                </div>
                <div className="stat-bar-bg">
                  <div
                    className="stat-bar-fill"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: isOverflow ? 'var(--danger-color)' : config.color,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PlatformPreview;
