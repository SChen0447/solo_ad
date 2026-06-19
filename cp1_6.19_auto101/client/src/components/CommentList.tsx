import React, { useState } from 'react';
import { Send } from 'lucide-react';
import type { Comment } from '@shared/types';

interface CommentListProps {
  comments: Comment[];
  onAddComment: (content: string, author: string) => void;
}

const CommentList: React.FC<CommentListProps> = ({ comments, onAddComment }) => {
  const [newComment, setNewComment] = useState('');
  const [author, setAuthor] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !author.trim()) return;
    
    onAddComment(newComment.trim(), author.trim());
    setNewComment('');
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const sortedComments = [...comments].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="mt-6">
      <h5 className="text-sm font-medium mb-4" style={{ color: 'var(--text-primary)' }}>
        评论 ({comments.length})
      </h5>
      
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="你的名字"
            className="flex-1 px-3 py-2 rounded-lg text-sm transition-transform hover-scale focus:outline-none focus:ring-2"
            style={{
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
            }}
          />
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="添加评论..."
            className="flex-1 px-3 py-2 rounded-lg text-sm transition-transform hover-scale focus:outline-none focus:ring-2"
            style={{
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
            }}
          />
          <button
            type="submit"
            disabled={!newComment.trim() || !author.trim()}
            className="px-4 py-2 rounded-lg transition-transform hover-scale disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: 'var(--accent)',
              color: 'var(--bg-primary)',
              border: 'none',
            }}
          >
            <Send size={16} />
          </button>
        </div>
      </form>
      
      <div className="space-y-4 max-h-64 overflow-y-auto scrollbar-thin">
        {sortedComments.length === 0 ? (
          <p className="text-sm text-center py-4" style={{ color: 'var(--text-secondary)' }}>
            暂无评论
          </p>
        ) : (
          sortedComments.map((comment) => (
            <div
              key={comment.id}
              className="p-3 rounded-lg"
              style={{ backgroundColor: 'var(--bg-primary)' }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium" style={{ color: 'var(--accent)' }}>
                  {comment.author}
                </span>
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {formatDate(comment.createdAt)}
                </span>
              </div>
              <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                {comment.content}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CommentList;
