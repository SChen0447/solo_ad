import React from 'react';
import { Post, Tag } from '../types';

interface PostCardProps {
  post: Post;
  tags: Tag[];
  onSelect: (post: Post) => void;
  onToggleTop: (postId: string) => void;
  onToggleFeatured: (postId: string) => void;
  isAdmin?: boolean;
}

const PostCard: React.FC<PostCardProps> = ({
  post,
  tags,
  onSelect,
  onToggleTop,
  onToggleFeatured,
  isAdmin = true
}) => {
  const tag = tags.find(t => t.id === post.tag);
  const plainContent = post.content.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
  const summary = plainContent.length > 100 
    ? plainContent.substring(0, 100) + '...' 
    : plainContent;

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    
    return date.toLocaleDateString('zh-CN');
  };

  const getInitial = (name: string): string => {
    return name.charAt(0).toUpperCase();
  };

  return (
    <article 
      className={`post-card ${post.isTop ? 'post-card--top' : ''}`}
      onClick={() => onSelect(post)}
    >
      {post.isFeatured && (
        <div className="post-card__featured-badge">
          <span>精华</span>
        </div>
      )}
      
      {post.isTop && (
        <div className="post-card__top-badge">
          <span>置顶</span>
        </div>
      )}

      <div className="post-card__avatar">
        <div 
          className="avatar-circle"
          style={{ backgroundColor: post.authorAvatar }}
        >
          {getInitial(post.author)}
        </div>
      </div>

      <div className="post-card__content">
        <h3 className="post-card__title">
          {post.title}
        </h3>
        
        <p className="post-card__summary">{summary}</p>
        
        <div className="post-card__meta">
          {tag && (
            <span 
              className="post-card__tag"
              style={{ 
                backgroundColor: `${tag.color}15`,
                color: tag.color
              }}
            >
              {tag.name}
            </span>
          )}
          <span className="post-card__author">{post.author}</span>
          <span className="post-card__time">{formatDate(post.createdAt)}</span>
        </div>
      </div>

      {isAdmin && (
        <div 
          className="post-card__actions"
          onClick={e => e.stopPropagation()}
        >
          <button
            className={`action-btn action-btn--top ${post.isTop ? 'action-btn--active' : ''}`}
            onClick={() => onToggleTop(post.id)}
            title={post.isTop ? '取消置顶' : '置顶'}
          >
            📌
          </button>
          <button
            className={`action-btn action-btn--featured ${post.isFeatured ? 'action-btn--active' : ''}`}
            onClick={() => onToggleFeatured(post.id)}
            title={post.isFeatured ? '取消加精' : '加精'}
          >
            ⭐
          </button>
        </div>
      )}
    </article>
  );
};

export default PostCard;
