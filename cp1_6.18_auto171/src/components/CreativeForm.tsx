import React, { useState } from 'react';
import { useDataStore } from '../dataStore';
import { categoryLabels } from '../dataStore';
import type { CreativeCategory } from '../types';

interface CreativeFormProps {
  onClose?: () => void;
}

const CreativeForm: React.FC<CreativeFormProps> = function CreativeForm({ onClose }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<CreativeCategory>('tech');
  const [isExpanded, setIsExpanded] = useState(false);

  const addCreative = useDataStore((state) => state.addCreative);
  const currentUserId = useDataStore((state) => state.currentUserId);
  const currentUserName = useDataStore((state) => state.currentUserName);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    addCreative({
      title: title.trim(),
      description: description.trim(),
      category,
      authorId: currentUserId,
      authorName: currentUserName,
    });

    setTitle('');
    setDescription('');
    setCategory('tech');
    setIsExpanded(false);
    onClose?.();
  };

  const categories: CreativeCategory[] = ['tech', 'art', 'life', 'business'];

  if (!isExpanded) {
    return (
      <button
        className="create-button"
        onClick={() => setIsExpanded(true)}
      >
        <span className="plus-icon">+</span>
        发布你的创意
      </button>
    );
  }

  return (
    <div className="creative-form-container slide-in">
      <form className="creative-form" onSubmit={handleSubmit}>
        <div className="form-header">
          <h3>✨ 发布新创意</h3>
          <button
            type="button"
            className="close-button"
            onClick={() => setIsExpanded(false)}
          >
            ×
          </button>
        </div>

        <div className="form-group">
          <label htmlFor="title">标题</label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, 50))}
            placeholder="给你的创意起个响亮的名字..."
            maxLength={50}
            autoFocus
          />
          <span className="char-count">{title.length}/50</span>
        </div>

        <div className="form-group">
          <label htmlFor="description">描述</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 300))}
            placeholder="详细描述你的创意..."
            rows={4}
            maxLength={300}
          />
          <span className="char-count">{description.length}/300</span>
        </div>

        <div className="form-group">
          <label>类别</label>
          <div className="category-options">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`category-option ${category === cat ? 'active' : ''}`}
                onClick={() => setCategory(cat)}
              >
                {categoryLabels[cat]}
              </button>
            ))}
          </div>
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="cancel-button"
            onClick={() => setIsExpanded(false)}
          >
            取消
          </button>
          <button
            type="submit"
            className="submit-button"
            disabled={!title.trim() || !description.trim()}
          >
            发布创意
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreativeForm;
