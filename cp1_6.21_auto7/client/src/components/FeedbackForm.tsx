import React, { useState } from 'react';

interface FeedbackFormProps {
  onSubmitted: () => void;
}

const CATEGORIES = ['功能建议', 'Bug报告', '其他'];

function FeedbackForm({ onSubmitted }: FeedbackFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('功能建议');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          category,
        }),
      });
      if (res.ok) {
        setTitle('');
        setDescription('');
        setCategory('功能建议');
        onSubmitted();
      }
    } catch (err) {
      console.error('Submit failed:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="feedback-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="title">标题 *</label>
        <input
          id="title"
          type="text"
          placeholder="简要描述反馈内容"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>
      <div className="form-group">
        <label htmlFor="description">描述 *</label>
        <textarea
          id="description"
          placeholder="详细说明反馈的具体情况"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          rows={1}
        />
      </div>
      <div className="form-group">
        <label htmlFor="category">类别</label>
        <select
          id="category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <button type="submit" className="btn-submit" disabled={submitting}>
        {submitting ? '提交中...' : '提交反馈'}
      </button>
    </form>
  );
}

export default FeedbackForm;
