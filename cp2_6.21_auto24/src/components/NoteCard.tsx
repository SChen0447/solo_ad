import React, { useState } from 'react';

interface Comment {
  userId: string;
  content: string;
  date: string;
}

interface NoteCardProps {
  note: {
    id: string;
    bookId: string;
    rating: number;
    content: string;
    date: string;
    comments: Comment[];
    userName: string;
    userId: string;
    userAvatar: string;
    bookTitle: string;
    bookCover: string;
  };
  onComment: (noteId: string, content: string) => void;
  getUserAvatar: (userId: string) => string;
  getUserName: (userId: string) => string;
}

const NoteCard: React.FC<NoteCardProps> = ({ note, onComment, getUserAvatar, getUserName }) => {
  const [expanded, setExpanded] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');

  const handleSendComment = () => {
    if (!commentText.trim()) return;
    onComment(note.id, commentText.trim());
    setCommentText('');
  };

  const isLong = note.content.length > 60;

  return (
    <div
      style={{
        width: 280,
        borderRadius: 16,
        background: '#fff',
        border: '2px solid #E5E7EB',
        overflow: 'hidden',
        transition: 'border-color 0.2s, transform 0.2s, box-shadow 0.2s',
        cursor: 'default',
        marginBottom: 16,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = '#C4B5FD';
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 12px rgba(139,92,246,0.15)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = '#E5E7EB';
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
      }}
    >
      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <img
            src={note.userAvatar}
            alt={note.userName}
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              border: '2px solid #8B5CF6',
              objectFit: 'cover',
            }}
          />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{note.userName}</div>
            <div style={{ fontSize: 11, color: '#9CA3AF' }}>{note.date}</div>
          </div>
        </div>
        <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 8 }}>
          📖 {note.bookTitle}
        </div>
        <div style={{ marginBottom: 8 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <span
              key={i}
              style={{
                fontSize: 16,
                color: i < note.rating ? '#F59E0B' : '#D1D5DB',
              }}
            >
              ★
            </span>
          ))}
        </div>
        <div
          style={{
            fontSize: 13,
            color: '#374151',
            lineHeight: 1.6,
            display: '-webkit-box',
            WebkitLineClamp: expanded ? undefined : 3,
            WebkitBoxOrient: 'vertical',
            overflow: expanded ? 'visible' : 'hidden',
            textOverflow: expanded ? undefined : 'ellipsis',
          }}
        >
          {note.content}
        </div>
        {isLong && (
          <span
            onClick={() => setExpanded(!expanded)}
            style={{ fontSize: 12, color: '#8B5CF6', cursor: 'pointer', marginTop: 4, display: 'inline-block' }}
          >
            {expanded ? '收起' : '展开'}
          </span>
        )}
        <div
          onClick={() => setShowComments(!showComments)}
          style={{
            fontSize: 12,
            color: '#9CA3AF',
            marginTop: 10,
            cursor: 'pointer',
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLSpanElement).style.color = '#8B5CF6';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLSpanElement).style.color = '#9CA3AF';
          }}
        >
          💬 {note.comments.length} 条评论
        </div>
      </div>
      {showComments && (
        <div style={{ borderTop: '1px solid #F3F4F6', padding: 12, background: '#FAFAFA' }}>
          {note.comments.map((c, idx) => (
            <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
              <img
                src={getUserAvatar(c.userId)}
                alt=""
                style={{ width: 20, height: 20, borderRadius: '50%', border: '1px solid #E5E7EB', flexShrink: 0 }}
              />
              <div>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#6B7280' }}>{getUserName(c.userId)}</span>
                <span style={{ fontSize: 12, color: '#374151', marginLeft: 6 }}>{c.content}</span>
              </div>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendComment()}
              placeholder="写评论..."
              style={{
                flex: 1,
                padding: '6px 12px',
                borderRadius: 20,
                border: '1px solid #E5E7EB',
                fontSize: 12,
                outline: 'none',
                background: '#fff',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => {
                (e.currentTarget as HTMLInputElement).style.borderColor = '#8B5CF6';
              }}
              onBlur={(e) => {
                (e.currentTarget as HTMLInputElement).style.borderColor = '#E5E7EB';
              }}
            />
            <button
              onClick={handleSendComment}
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                border: 'none',
                background: commentText.trim() ? '#8B5CF6' : '#D1D5DB',
                color: '#fff',
                fontSize: 12,
                cursor: commentText.trim() ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s',
                flexShrink: 0,
              }}
            >
              ↑
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NoteCard;
