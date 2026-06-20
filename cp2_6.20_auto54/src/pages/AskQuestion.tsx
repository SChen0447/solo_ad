import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { postQuestion } from '../api';

const containerStyle: React.CSSProperties = {
  padding: '20px 24px',
  maxWidth: 600,
  margin: '0 auto',
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #E0D5C5',
  fontSize: 14, outline: 'none', fontFamily: 'inherit',
};

export default function AskQuestion() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setSubmitting(true);
    try {
      await postQuestion({
        title,
        content,
        tags: tags.split(/[,，\s]+/).filter(Boolean),
        authorId: 'user1',
        authorName: '小王',
        authorAvatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Felix',
      });
      navigate('/qna');
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={containerStyle}>
      <h2 style={{ fontSize: 22, color: '#333', marginBottom: 20 }}>我要提问</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="问题标题" required style={inputStyle} />
        <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="详细描述你的问题..." required rows={5} style={{ ...inputStyle, resize: 'vertical' }} />
        <input value={tags} onChange={e => setTags(e.target.value)} placeholder="标签（用逗号或空格分隔）" style={inputStyle} />
        <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
          <button type="button" onClick={() => navigate(-1)} style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #ddd', background: '#fff', cursor: 'pointer', fontSize: 14 }}>取消</button>
          <button type="submit" disabled={submitting} style={{
            flex: 1, padding: 10, borderRadius: 8, border: 'none',
            background: 'linear-gradient(135deg, #4A90D9, #357ABD)', color: '#fff', cursor: submitting ? 'not-allowed' : 'pointer',
            fontSize: 14, fontWeight: 600, opacity: submitting ? 0.7 : 1,
          }}>
            {submitting ? '提交中...' : '发布问题'}
          </button>
        </div>
      </form>
    </div>
  );
}
