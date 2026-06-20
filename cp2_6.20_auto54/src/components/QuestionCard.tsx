import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Question } from '../api';

const cardStyle: React.CSSProperties = {
  width: '100%',
  borderRadius: 8,
  background: '#F4F6F8',
  borderLeft: '3px solid #4A90D9',
  padding: '16px 20px',
  cursor: 'pointer',
  transition: 'box-shadow 0.15s',
  marginBottom: 12,
};

const tagStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '2px 10px',
  borderRadius: 12,
  fontSize: 12,
  background: '#E3F2FD',
  color: '#1565C0',
  marginRight: 6,
  marginBottom: 4,
  transition: 'background 0.15s, color 0.15s',
  cursor: 'pointer',
};

export default function QuestionCard({ question }: { question: Question }) {
  const navigate = useNavigate();
  const [hoveredTag, setHoveredTag] = useState<number | null>(null);

  return (
    <div
      style={cardStyle}
      onClick={() => navigate(`/qna`)}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 2px 12px rgba(74,144,217,0.12)')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
    >
      <div style={{ fontSize: 16, fontWeight: 600, color: '#333', marginBottom: 8 }}>{question.title}</div>
      <div style={{ marginBottom: 8 }}>
        {question.tags.map((tag, i) => (
          <span
            key={i}
            style={{
              ...tagStyle,
              ...(hoveredTag === i ? { background: '#1565C0', color: '#fff' } : {}),
            }}
            onMouseEnter={() => setHoveredTag(i)}
            onMouseLeave={() => setHoveredTag(null)}
            onClick={e => e.stopPropagation()}
          >
            {tag}
          </span>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <img src={question.authorAvatar} alt="" style={{ width: 20, height: 20, borderRadius: '50%' }} />
          <span style={{ fontSize: 12, color: '#888' }}>{question.authorName}</span>
        </div>
        <span style={{ fontSize: 12, color: '#aaa' }}>{question.answers.length} 回答</span>
      </div>
    </div>
  );
}
