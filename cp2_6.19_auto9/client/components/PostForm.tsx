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
  const [showPreview, setShowPreview] = useState(false);

  const currentTag = tags.find(t => t.id === selectedTag);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    
    onSubmit(title.trim(), content.trim(), selectedTag, author);
    setTitle('');
    setContent('');
    setIsExpanded(false);
    setShowPreview(false);
  };

  const renderMarkdown = (text: string): React.ReactNode => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let inCodeBlock = false;
    let codeContent: string[] = [];
    let listItems: string[] = [];

    const flushList = () => {
      if (listItems.length > 0) {
        elements.push(
          <ul key={`list-${elements.length}`} className="md-list">
            {listItems.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        );
        listItems = [];
      }
    };

    lines.forEach((line, index) => {
      if (line.startsWith('```')) {
        flushList();
        if (inCodeBlock) {
          elements.push(
            <pre key={`code-${elements.length}`} className="md-code">
              <code>{codeContent.join('\n')}</code>
            </pre>
          );
          codeContent = [];
          inCodeBlock = false;
        } else {
          inCodeBlock = true;
        }
        return;
      }

      if (inCodeBlock) {
        codeContent.push(line);
        return;
      }

      if (line.startsWith('## ')) {
        flushList();
        elements.push(
          <h2 key={`h2-${index}`} className="md-h2">
            {line.substring(3)}
          </h2>
        );
      } else if (line.startsWith('### ')) {
        flushList();
        elements.push(
          <h3 key={`h3-${index}`} className="md-h3">
            {line.substring(4)}
          </h3>
        );
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        listItems.push(line.substring(2));
      } else if (line.trim() === '') {
        flushList();
      } else {
        flushList();
        elements.push(
          <p key={`p-${index}`} className="md-p">
            {line}
          </p>
        );
      }
    });

    flushList();

    if (inCodeBlock && codeContent.length > 0) {
      elements.push(
        <pre key={`code-end`} className="md-code">
          <code>{codeContent.join('\n')}</code>
        </pre>
      );
    }

    return elements;
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
          {!isExpanded && currentTag && (
            <div 
              className="post-form__tag-preview"
              style={{ 
                backgroundColor: `${currentTag.color}15`,
                color: currentTag.color,
                borderColor: currentTag.color
              }}
            >
              {currentTag.name}
            </div>
          )}
        </div>
        
        {isExpanded && (
          <div className="post-form__expanded fade-in">
            <div className="post-form__tag-section">
              <label className="post-form__section-label">
                选择话题标签
              </label>
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

            <div className="post-form__content-section">
              <div className="post-form__content-header">
                <label className="post-form__section-label">
                  帖子内容 <span className="post-form__hint">（支持 Markdown 格式）</span>
                </label>
                <button
                  type="button"
                  className={`post-form__preview-toggle ${showPreview ? 'post-form__preview-toggle--active' : ''}`}
                  onClick={() => setShowPreview(!showPreview)}
                >
                  {showPreview ? '✏️ 编辑' : '👁 预览'}
                </button>
              </div>
              
              {showPreview ? (
                <div className="post-form__preview">
                  {content.trim() ? (
                    renderMarkdown(content)
                  ) : (
                    <div className="post-form__preview-empty">
                      暂无内容可预览，请先输入帖子内容
                    </div>
                  )}
                </div>
              ) : (
                <textarea
                  className="post-form__content-input"
                  placeholder="写下你的想法、技术分享或问题讨论..."
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  rows={6}
                />
              )}
            </div>
            
            <div className="post-form__footer">
              <div className="post-form__tip">
                {selectedTag ? (
                  <span>
                    已选择标签：
                    <strong style={{ color: currentTag?.color }}>
                      {currentTag?.name}
                    </strong>
                  </span>
                ) : (
                  <span className="post-form__warning">请选择一个标签</span>
                )}
              </div>
              
              <div className="post-form__actions">
                <button
                  type="button"
                  className="post-form__cancel-btn"
                  onClick={() => {
                    setIsExpanded(false);
                    setShowPreview(false);
                  }}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="post-form__submit-btn"
                  disabled={!title.trim() || !content.trim() || !selectedTag}
                >
                  发布帖子
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
