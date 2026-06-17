import { useState } from 'react';
import type { Note, Comment } from '../types';
import './NoteCard.scss';

interface NoteCardProps {
  note: Note;
  onLike: (noteId: number) => void;
}

function NoteCard({ note, onLike }: NoteCardProps) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [comments, setComments] = useState<Comment[]>(note.comments || []);
  const [expandedReplies, setExpandedReplies] = useState<Set<number>>(new Set());
  const [likeAnimating, setLikeAnimating] = useState(false);
  const [tempLiked, setTempLiked] = useState(note.is_liked);
  const [tempLikesCount, setTempLikesCount] = useState(note.likes_count);

  const userInitial = note.user?.nickname?.charAt(0) || '?';
  const avatarColor = note.user?.avatar_color || '#8BC34A';

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderMarkdown = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, i) => {
      let processed = line
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/^- (.+)$/, '• $1');
      return (
        <p key={i} className="note-card__content-line" dangerouslySetInnerHTML={{ __html: processed || '&nbsp;' }} />
      );
    });
  };

  const handleLikeClick = () => {
    if (likeAnimating) return;
    
    setLikeAnimating(true);
    
    const newLiked = !tempLiked;
    const newCount = tempLikesCount + (newLiked ? 1 : -1);
    
    setTempLiked(newLiked);
    setTempLikesCount(newCount);
    
    setTimeout(() => {
      setLikeAnimating(false);
    }, 200);
    
    onLike(note.id);
  };

  const handleSubmitComment = () => {
    if (!commentText.trim()) return;
    
    const newComment: Comment = {
      id: Date.now(),
      user_id: 0,
      note_id: note.id,
      content: commentText,
      parent_id: replyTo?.id,
      created_at: new Date().toISOString(),
      user: {
        id: 0,
        email: '',
        nickname: '我',
        avatar_color: '#8BC34A',
        total_spent: 0,
      },
    };

    if (replyTo) {
      setComments((prev) =>
        prev.map((c) =>
          c.id === replyTo.parent_id || c.id === replyTo.id
            ? {
                ...c,
                replies: [...(c.replies || []), newComment],
              }
            : c
        )
      );
    } else {
      setComments((prev) => [newComment, ...prev]);
    }

    setCommentText('');
    setReplyTo(null);
  };

  const toggleReplies = (commentId: number) => {
    setExpandedReplies((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) {
        next.delete(commentId);
      } else {
        next.add(commentId);
      }
      return next;
    });
  };

  const CommentItem = ({ comment, depth = 0 }: { comment: Comment; depth?: number }) => {
    const initial = comment.user?.nickname?.charAt(0) || '?';
    const color = comment.user?.avatar_color || '#8BC34A';
    const replies = comment.replies || [];
    const isExpanded = expandedReplies.has(comment.id);
    const maxRepliesPerLevel = 5;
    const visibleReplies = isExpanded ? replies : replies.slice(0, maxRepliesPerLevel);
    const hiddenCount = replies.length - maxRepliesPerLevel;
    const hasMoreReplies = hiddenCount > 0 && !isExpanded;

    return (
      <div className={`comment-item ${depth > 0 ? 'comment-item--reply' : ''}`}>
        <div className="comment-item__avatar" style={{ backgroundColor: color }}>
          {initial}
        </div>
        <div className="comment-item__content">
          <div className="comment-item__header">
            <span className="comment-item__name">{comment.user?.nickname}</span>
            <span className="comment-item__time">{formatDate(comment.created_at)}</span>
          </div>
          <p className="comment-item__text">{comment.content}</p>
          {depth === 0 && (
            <button
              className="comment-item__reply-btn"
              onClick={() => setReplyTo(comment)}
            >
              回复
            </button>
          )}
          
          {replies.length > 0 && (
            <div className="comment-replies">
              {visibleReplies.map((reply) => (
                <CommentItem key={reply.id} comment={reply} depth={depth + 1} />
              ))}
              {hasMoreReplies && (
                <button
                  className="view-more-replies"
                  onClick={() => toggleReplies(comment.id)}
                >
                  查看 {hiddenCount} 条回复 ↓
                </button>
              )}
              {isExpanded && hiddenCount > 0 && (
                <button
                  className="view-more-replies view-more-replies--collapse"
                  onClick={() => toggleReplies(comment.id)}
                >
                  收起回复 ↑
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="note-card">
      <div className="note-card__header">
        <div className="note-card__user">
          <div className="note-card__avatar" style={{ backgroundColor: avatarColor }}>
            {userInitial}
          </div>
          <div className="note-card__user-info">
            <span className="note-card__username">{note.user?.nickname}</span>
            <span className="note-card__time">{formatDate(note.created_at)}</span>
          </div>
        </div>
        {note.bean && (
          <div className="note-card__bean-info">
            <span className="note-card__bean-name">{note.bean.name}</span>
            <span className="note-card__bean-origin">{note.bean.origin}</span>
          </div>
        )}
      </div>

      <div className="note-card__content">{renderMarkdown(note.content)}</div>

      {note.flavor_tags && note.flavor_tags.length > 0 && (
        <div className="note-card__flavors">
          {note.flavor_tags.map((tag) => (
            <span key={tag} className="note-flavor-tag">
              #{tag}
            </span>
          ))}
        </div>
      )}

      {note.images && note.images.length > 0 && (
        <div className="note-card__images">
          {note.images.map((img, idx) => (
            <img key={idx} src={img} alt="" className="note-card__image" />
          ))}
        </div>
      )}

      <div className="note-card__rating">
        <div className="note-card__rating-stars">
          {[...Array(10)].map((_, i) => (
            <span
              key={i}
              className={`note-star ${i < note.rating ? 'note-star--filled' : ''}`}
            >
              ★
            </span>
          ))}
        </div>
        <span className="note-card__rating-value">{note.rating}/10</span>
      </div>

      <div className="note-card__actions">
        <button
          className={`action-btn ${tempLiked ? 'action-btn--liked' : ''} ${likeAnimating ? 'action-btn--animating' : ''}`}
          onClick={handleLikeClick}
        >
          <span className="action-btn__icon">{tempLiked ? '❤️' : '🤍'}</span>
          <span>{tempLikesCount}</span>
        </button>
        <button
          className={`action-btn ${showComments ? 'action-btn--active' : ''}`}
          onClick={() => setShowComments(!showComments)}
        >
          <span className="action-btn__icon">💬</span>
          <span>{note.comments_count + comments.length - (note.comments?.length || 0) || note.comments_count}</span>
        </button>
      </div>

      {showComments && (
        <div className="note-card__comments">
          <div className="comment-input">
            <div className="comment-input__avatar" style={{ backgroundColor: '#8BC34A' }}>
              我
            </div>
            <div className="comment-input__field">
              {replyTo && (
                <div className="comment-input__reply-to">
                  回复 @{replyTo.user?.nickname}
                  <button onClick={() => setReplyTo(null)}>×</button>
                </div>
              )}
              <input
                type="text"
                placeholder="写下你的评论..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSubmitComment()}
              />
            </div>
            <button className="comment-input__submit" onClick={handleSubmitComment}>
              发送
            </button>
          </div>

          <div className="comments-list">
            {comments.length === 0 ? (
              <p className="no-comments">暂无评论，来发表第一条评论吧！</p>
            ) : (
              comments.map((comment) => (
                <CommentItem key={comment.id} comment={comment} />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default NoteCard;
