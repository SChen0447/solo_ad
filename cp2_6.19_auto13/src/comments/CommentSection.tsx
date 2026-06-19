import { useState } from 'react';
import { Send } from 'lucide-react';
import { useGalleryStore } from '@/store/galleryStore';

interface CommentSectionProps {
  paintingId: string;
}

export default function CommentSection({ paintingId }: CommentSectionProps) {
  const comments = useGalleryStore((s) => s.getPaintingComments(paintingId));
  const addComment = useGalleryStore((s) => s.addComment);
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    addComment(paintingId, trimmed);
    setInput('');
  };

  return (
    <div>
      <h3 className="font-display text-lg font-semibold text-gallery-text mb-4">
        评论 ({comments.length})
      </h3>

      <form onSubmit={handleSubmit} className="flex gap-2 mb-5">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="写下你的评论…"
          className="flex-1 bg-gallery-card border border-gallery-deep/40 rounded-lg px-3 py-2 text-sm
            text-gallery-text placeholder-gallery-muted/50
            focus:outline-none focus:border-gallery-accent/50 transition-colors"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="px-3 py-2 rounded-lg bg-gallery-accent text-white text-sm font-medium
            disabled:opacity-30 disabled:cursor-not-allowed
            hover:bg-gallery-accent/90 transition-colors flex items-center gap-1.5"
        >
          <Send size={14} />
          发送
        </button>
      </form>

      <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
        {comments.length === 0 ? (
          <p className="text-sm text-gallery-muted text-center py-4">暂无评论，来写第一条吧</p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="animate-fade-in">
              <div className="flex items-start gap-3">
                <img
                  src={comment.avatar}
                  alt={comment.username}
                  className="w-8 h-8 rounded-full object-cover flex-shrink-0 ring-1 ring-gallery-deep/30"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium text-gallery-text">{comment.username}</span>
                    <span className="text-[10px] text-gallery-muted/60">{comment.timestamp}</span>
                  </div>
                  <p className="text-sm text-gallery-text/80 mt-0.5 leading-relaxed">{comment.content}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
