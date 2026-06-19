import React from 'react';
import { Post, Tag } from '../types';
import CommentList from './CommentList';

interface PostDetailProps {
  post: Post;
  tags: Tag[];
  onBack: () => void;
  onToggleTop: (postId: string) => void;
  onToggleFeatured: (postId: string) => void;
  isAdmin?: boolean;
}

const PostDetail: React.FC<PostDetailProps> = ({
  post,
  tags,
  onBack,
  onToggleTop,
  onToggleFeatured,
  isAdmin = true
}) => {
  const tag = tags.find(t => t.id === post.tag);

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getInitial = (name: string): string => {
    return name.charAt(0).toUpperCase();
  };

  const renderMarkdown = (content: string): React.ReactNode => {
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let inCodeBlock = false;
    let codeContent: string[] = [];
    let listItems: string[] = [];

    const flushList = () => {
      if (listItems.length > 0) {
        elements.push(
          <ul key={`list-${elements.length}`} className="md-list">
            {listItems.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        );
        listItems = [];
      }
    };

    lines.forEach((line, index) => {
      if (line.startsWith('```')) {
        flushList();
        if (inCodeBlock) {
          elements.push(
            <pre key={`code-${elements.length}`} className="md-code">
              <code>{codeContent.join('\n')}</code>
            </pre>
          );
          codeContent = [];
          inCodeBlock = false;
        } else {
          inCodeBlock = true;
        }
        return;
      }

      if (inCodeBlock) {
        codeContent.push(line);
        return;
      }

      if (line.startsWith('## ')) {
        flushList();
        elements.push(
          <h2 key={`h2-${index}`} className="md-h2">
            {line.substring(3)}
          </h2>
        );
      } else if (line.startsWith('### ')) {
        flushList();
        elements.push(
          <h3 key={`h3-${index}`} className="md-h3">
            {line.substring(4)}
          </h3>
        );
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        listItems.push(line.substring(2));
      } else if (line.trim() === '') {
        flushList();
        elements.push(<br key={`br-${index}`} />);
      } else {
        flushList();
        elements.push(
          <p key={`p-${index}`} className="md-p">
            {line}
          </p>
        );
      }
    });

    flushList();

    if (inCodeBlock && codeContent.length > 0) {
      elements.push(
        <pre key={`code-end`} className="md-code">
          <code>{codeContent.join('\n')}</code>
        </pre>
      );
    }

    return elements;
  };

  return (
    <div className="post-detail fade-in">
      <button className="post-detail__back" onClick={onBack}>
        ← 返回列表
      </button>

      <article className="post-detail__content">
        <div className="post-detail__header">
          <h1 className="post-detail__title">{post.title}</h1>
          
          <div className="post-detail__meta">
            {tag && (
              <span 
                className="post-detail__tag"
                style={{ 
                  backgroundColor: `${tag.color}15`,
                  color: tag.color
                }}
              >
                {tag.name}
              </span>
            )}
            
            <div className="post-detail__author">
              <div 
                className="avatar-circle"
                style={{ backgroundColor: post.authorAvatar }}
              >
                {getInitial(post.author)}
              </div>
              <div>
                <div className="post-detail__author-name">{post.author}</div>
                <div className="post-detail__date">{formatDate(post.createdAt)}</div>
              </div>
            </div>

            {isAdmin && (
              <div className="post-detail__actions">
                <button
                  className={`action-btn action-btn--top ${post.isTop ? 'action-btn--active' : ''}`}
                  onClick={() => onToggleTop(post.id)}
                >
                  📌 {post.isTop ? '取消置顶' : '置顶'}
                </button>
                <button
                  className={`action-btn action-btn--featured ${post.isFeatured ? 'action-btn--active' : ''}`}
                  onClick={() => onToggleFeatured(post.id)}
                >
                  ⭐ {post.isFeatured ? '取消加精' : '加精'}
                </button>
              </div>
            )}
          </div>

          {(post.isTop || post.isFeatured) && (
            <div className="post-detail__badges">
              {post.isTop && (
                <span className="badge badge--top">置顶</span>
              )}
              {post.isFeatured && (
                <span className="badge badge--featured">精华</span>
              )}
            </div>
          )}
        </div>

        <div className="post-detail__body">
          {renderMarkdown(post.content)}
        </div>
      </article>

      <div className="post-detail__comments">
        <CommentList postId={post.id} />
      </div>
    </div>
  );
};

export default PostDetail;
