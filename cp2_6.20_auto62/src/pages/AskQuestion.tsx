import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { postQuestion, CURRENT_USER } from '../api';

export default function AskQuestion() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t) && tags.length < 5) {
      setTags([...tags, t]);
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim() || submitting) return;
    setSubmitting(true);
    try {
      await postQuestion({
        title: title.trim(),
        content: content.trim(),
        tags,
        authorId: CURRENT_USER.id,
        authorName: CURRENT_USER.name,
      });
      navigate('/qa');
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">发布问题</h1>
      </div>

      <div className="ask-form">
        <div className="form-group">
          <label className="form-label">问题标题</label>
          <input
            className="form-input"
            type="text"
            placeholder="请简要描述你的问题"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">问题描述</label>
          <textarea
            className="form-textarea"
            placeholder="详细描述你的问题，让邻居们更好地帮助你"
            value={content}
            onChange={e => setContent(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">标签（最多5个）</label>
          <div className="tags-input-container">
            {tags.map(tag => (
              <span key={tag} className="tag-chip">
                {tag}
                <button onClick={() => removeTag(tag)}>×</button>
              </span>
            ))}
            <input
              className="form-input"
              style={{ flex: 1, minWidth: 120 }}
              type="text"
              placeholder="输入标签后按回车"
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
            />
          </div>
        </div>

        <button
          className="form-submit-btn"
          onClick={handleSubmit}
          disabled={!title.trim() || !content.trim() || submitting}
        >
          {submitting ? '发布中...' : '发布问题'}
        </button>
      </div>
    </div>
  );
}
