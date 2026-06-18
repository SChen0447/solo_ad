import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { useStore } from '../store';
import type { Annotation } from '../types';

interface Props {
  designId: string;
  annotation: Annotation | null;
}

export default function CommentPanel({ designId, annotation }: Props) {
  const { addComment, username } = useStore();
  const [inputValue, setInputValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [animatingCommentId, setAnimatingCommentId] = useState<string | null>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [annotation?.comments.length]);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    }) + ' ' + date.toLocaleDateString('zh-CN', {
      month: '2-digit',
      day: '2-digit'
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annotation || !inputValue.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const content = inputValue.trim();
    setInputValue('');

    try {
      await addComment(designId, annotation.id, content);
      toast.success('评论已提交');
    } catch {
      toast.error('评论提交失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  };

  if (!annotation) {
    return (
      <aside className="comment-panel">
        <div className="panel-empty">
          <div className="panel-empty-icon">💬</div>
          <h3 className="panel-empty-title">选择标注查看评论</h3>
          <p className="panel-empty-text">
            点击 Canvas 上的任意标注查看和添加评论
          </p>
          <div className="panel-tips">
            <div className="tip-item">
              <span className="tip-badge">1</span>
              <span>拖拽创建圆形标注</span>
            </div>
            <div className="tip-item">
              <span className="tip-badge">2</span>
              <span>Ctrl + 拖拽创建箭头</span>
            </div>
            <div className="tip-item">
              <span className="tip-badge">3</span>
              <span>点击标注进行评论</span>
            </div>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="comment-panel">
      <div className="panel-header">
        <div className="panel-title-row">
          <h3 className="panel-title">
            {annotation.type === 'circle' ? '⭕ 圆形标注' : '➡️ 箭头标注'}
          </h3>
          <span className="comment-count">{annotation.comments.length} 条评论</span>
        </div>
        <p className="panel-subtitle">
          位置: ({Math.round(annotation.x)}, {Math.round(annotation.y)})
        </p>
      </div>

      <div className="comments-list">
        {annotation.comments.length === 0 ? (
          <div className="no-comments">
            <p>还没有评论，快来发表第一条吧！</p>
          </div>
        ) : (
          annotation.comments.map((comment, index) => (
            <div
              key={comment.id}
              className={`comment-bubble ${index === annotation.comments.length - 1 ? 'comment-new' : ''}`}
              ref={index === annotation.comments.length - 1 ? commentsEndRef : null}
            >
              <div className="comment-header">
                <span className="comment-author">{comment.author}</span>
                <span className="comment-time">{formatTime(comment.timestamp)}</span>
              </div>
              <p className="comment-content">{comment.content}</p>
            </div>
          ))
        )}
        <div ref={commentsEndRef} />
      </div>

      <form className="comment-input-form" onSubmit={handleSubmit}>
        <div className="current-user">
          <span className="user-avatar">{username.charAt(0)}</span>
          <span className="user-name">{username}</span>
        </div>
        <textarea
          className="comment-textarea"
          placeholder="写下你的评论，按回车提交..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={3}
          disabled={isSubmitting}
        />
        <div className="input-actions">
          <span className="hint-text">Enter 发送，Shift+Enter 换行</span>
          <button
            type="submit"
            className="submit-btn"
            disabled={!inputValue.trim() || isSubmitting}
          >
            {isSubmitting ? '发送中...' : '发送'}
          </button>
        </div>
      </form>
    </aside>
  );
}
