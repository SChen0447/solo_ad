import React, { useState } from 'react';
import type { Note } from '@/types';

interface QuoteCardProps {
  note: Note;
  onDelete: (id: string) => void;
}

const QuoteCard: React.FC<QuoteCardProps> = ({ note, onDelete }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(note.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = note.content;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('确定要删除这条摘抄吗？')) {
      onDelete(note.id);
    }
  };

  return (
    <div className="quote-card">
      <div className="quote-mark">"</div>
      <div className="quote-content">
        <p>{note.content}</p>
        <div className="quote-meta">
          <span className="quote-page">第 {note.pageNumber} 页</span>
          <span className="quote-date">
            {new Date(note.createdAt).toLocaleDateString('zh-CN')}
          </span>
        </div>
      </div>
      <div className="quote-actions">
        <button
          className={`copy-btn ${copied ? 'copied' : ''}`}
          onClick={handleCopy}
          aria-label="复制到剪贴板"
        >
          {copied ? (
            <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M20 6 9 17l-5-5" />
              </svg>
              <span>已复制</span>
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              <span>复制</span>
            </>
          )}
        </button>
        <button className="quote-delete-btn" onClick={handleDelete} aria-label="删除摘抄">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default QuoteCard;
