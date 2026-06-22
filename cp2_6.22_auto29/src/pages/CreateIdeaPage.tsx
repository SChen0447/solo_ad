import React, { useState, useEffect } from 'react';
import { createIdea, getIdeas } from '../api/ideas';
import type { Idea } from '../api/ideas';
import { useAppContext } from '../App';
import IdeaCard from '../components/IdeaCard';

export default function CreateIdeaPage() {
  const { currentUser, showToast } = useAppContext();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [author, setAuthor] = useState(currentUser);
  const [loading, setLoading] = useState(false);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [shakeField, setShakeField] = useState<string | null>(null);

  useEffect(() => {
    getIdeas().then(setIdeas).catch(() => {});
  }, []);

  useEffect(() => {
    setAuthor(currentUser);
  }, [currentUser]);

  const descRemaining = 200 - description.length;
  const descWarning = descRemaining <= 40;

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = '标题必填';
    else if (title.length > 30) newErrors.title = '标题最多30字';
    if (!description.trim()) newErrors.description = '描述必填';
    else if (description.length > 200) newErrors.description = '描述最多200字';
    if (!author.trim()) newErrors.author = '作者必填';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      const firstField = Object.keys(newErrors)[0];
      setShakeField(firstField);
      setTimeout(() => setShakeField(null), 400);
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 1200));
      const newIdea = await createIdea({ title: title.trim(), description: description.trim(), author: author.trim() });
      setIdeas((prev) => [newIdea, ...prev]);
      setTitle('');
      setDescription('');
      showToast('创意提交成功！', 'success');
    } catch (err: any) {
      setShakeField('form');
      setTimeout(() => setShakeField(null), 400);
      showToast(err.message || '提交失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (field: string): React.CSSProperties => ({
    width: '100%',
    padding: '10px 14px',
    borderRadius: 10,
    border: `2px solid ${errors[field] || shakeField === field ? '#EF4444' : '#E5E7EB'}`,
    fontSize: 14,
    outline: 'none',
    transition: 'border-color 0.2s',
    animation: shakeField === field ? 'shake 0.4s ease' : 'none',
    boxSizing: 'border-box',
  });

  return (
    <div style={{ padding: '32px 24px', maxWidth: 800, margin: '0 auto' }}>
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes bounce {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.2); }
        }
        @keyframes underlineIn {
          from { width: 0; }
          to { width: 70%; }
        }
      `}</style>

      <h2 style={{
        fontSize: 24,
        fontWeight: 700,
        color: '#1F2937',
        marginBottom: 24,
      }}>
        ✨ 提交新创意
      </h2>

      <form
        onSubmit={handleSubmit}
        style={{
          background: '#fff',
          borderRadius: 16,
          padding: 28,
          boxShadow: '0px 2px 8px rgba(0,0,0,0.06)',
          border: '2px solid #E5E7EB',
          animation: shakeField === 'form' ? 'shake 0.4s ease' : 'none',
        }}
      >
        <div style={{ marginBottom: 18 }}>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
            标题 <span style={{ fontSize: 12, color: '#9CA3AF' }}>({title.length}/30)</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => { setTitle(e.target.value.slice(0, 30)); setErrors((prev) => ({ ...prev, title: '' })); }}
            placeholder="输入创意标题（最多30字）"
            style={inputStyle('title')}
            maxLength={30}
          />
          {errors.title && <span style={{ fontSize: 12, color: '#EF4444', marginTop: 4 }}>{errors.title}</span>}
        </div>

        <div style={{ marginBottom: 18 }}>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
            描述 <span style={{ fontSize: 12, color: descWarning ? '#EF4444' : '#9CA3AF' }}>(剩余 {descRemaining} 字)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => { setDescription(e.target.value.slice(0, 200)); setErrors((prev) => ({ ...prev, description: '' })); }}
            placeholder="描述你的创意（最多200字）"
            rows={4}
            style={{
              ...inputStyle('description'),
              resize: 'vertical',
              fontFamily: 'inherit',
            }}
            maxLength={200}
          />
          {errors.description && <span style={{ fontSize: 12, color: '#EF4444', marginTop: 4 }}>{errors.description}</span>}
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
            作者姓名
          </label>
          <input
            type="text"
            value={author}
            onChange={(e) => { setAuthor(e.target.value); setErrors((prev) => ({ ...prev, author: '' })); }}
            placeholder="输入作者姓名"
            style={inputStyle('author')}
          />
          {errors.author && <span style={{ fontSize: 12, color: '#EF4444', marginTop: 4 }}>{errors.author}</span>}
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px 0',
            borderRadius: 12,
            border: 'none',
            background: loading ? '#A5B4FC' : '#6366F1',
            color: '#fff',
            fontSize: 16,
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s, transform 0.2s',
            transform: loading ? 'scale(0.98)' : 'scale(1)',
          }}
          onMouseEnter={(e) => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = '#818CF8'; }}
          onMouseLeave={(e) => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = '#6366F1'; }}
        >
          {loading ? '提交中...' : '🚀 提交创意'}
        </button>
      </form>

      {ideas.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <h3 style={{ fontSize: 18, fontWeight: 600, color: '#374151', marginBottom: 16 }}>
            已提交的创意
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
            {ideas.map((idea, i) => (
              <IdeaCard key={idea.id} idea={idea} showVoteButton={false} index={i} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
