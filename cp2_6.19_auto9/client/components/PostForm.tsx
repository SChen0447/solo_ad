import React, { useState } from 'react';
import { Tag } from '../types';

interface PostFormProps {
  tags: Tag[];
  onSubmit: (title: string, content: string, tag: string, author: string) => void;
}

const PostForm: React.FC<PostFormProps> = ({ tags, onSubmit }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedTag, setSelectedTag] = useState(tags[0]?.id || '');
  const [isExpanded, setIsExpanded] = useState(false);
  const [author] = useState('当前用户');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    
    onSubmit(title.trim(), content.trim(), selectedTag, author);
    setTitle('');
    setContent('');
    setIsExpanded(false);
  };

  return (
    <div className="post-form">
      <form onSubmit={handleSubmit}>
        <div className="post-form__header">
          <input
            type="text"
            className="post-form__title-input"
            placeholder="发布新帖子..."
            value={title}
            onChange={e => setTitle(e.target.value)}
            onFocus={() => setIsExpanded(true)}
          />
        </div>
        
        {isExpanded && (
          <div className="post-form__expanded fade-in">
            <textarea
              className="post-form__content-input"
              placeholder="写下你的想法...（支持 Markdown 格式）"
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={5}
            />
            
            <div className="post-form__footer">
              <div className="post-form__tag-selector">
                <label>选择标签：</label>
                <div className="post-form__tags">
                  {tags.map(tag => (
                    <button
                      key={tag.id}
                      type="button"
                      className={`post-form__tag-btn ${selectedTag === tag.id ? 'post-form__tag-btn--active' : ''}`}
                      onClick={() => setSelectedTag(tag.id)}
                      style={{
                        backgroundColor: selectedTag === tag.id ? tag.color : 'transparent',
                        color: selectedTag === tag.id ? '#fff' : tag.color,
                        borderColor: tag.color
                      }}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="post-form__actions">
                <button
                  type="button"
                  className="post-form__cancel-btn"
                  onClick={() => setIsExpanded(false)}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="post-form__submit-btn"
                  disabled={!title.trim() || !content.trim()}
                >
                  发布
                </button>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default PostForm;
