import React, { useState } from 'react';
import dayjs from 'dayjs';
import {
  DiaryEntry,
  MoodType,
  MOOD_EMOJIS,
  useStore,
} from '../store';

const renderMarkdown = (text: string): React.ReactNode => {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let inList = false;
  let listItems: React.ReactNode[] = [];

  const flushList = (idx: number) => {
    if (inList) {
      elements.push(<ul key={`list-${idx}`}>{listItems}</ul>);
      listItems = [];
      inList = false;
    }
  };

  const renderInline = (str: string): React.ReactNode => {
    const parts: React.ReactNode[] = [];
    const regex = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
    let lastIndex = 0;
    let match;
    let key = 0;

    while ((match = regex.exec(str)) !== null) {
      if (match.index > lastIndex) {
        parts.push(str.slice(lastIndex, match.index));
      }
      const token = match[0];
      if (token.startsWith('**')) {
        parts.push(<strong key={key++}>{token.slice(2, -2)}</strong>);
      } else if (token.startsWith('*')) {
        parts.push(<em key={key++}>{token.slice(1, -1)}</em>);
      }
      lastIndex = match.index + token.length;
    }
    if (lastIndex < str.length) {
      parts.push(str.slice(lastIndex));
    }
    return parts.length === 0 ? str : parts;
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      inList = true;
      listItems.push(
        <li key={idx}>{renderInline(trimmed.slice(2))}</li>
      );
    } else if (trimmed === '') {
      flushList(idx);
    } else {
      flushList(idx);
      elements.push(<p key={idx}>{renderInline(trimmed)}</p>);
    }
  });
  flushList(lines.length);

  return elements;
};

interface Props {
  entry: DiaryEntry;
}

const EntryCard: React.FC<Props> = ({ entry }) => {
  const updateEntry = useStore((s) => s.updateEntry);
  const deleteEntry = useStore((s) => s.deleteEntry);
  const setSelectedEntryId = useStore((s) => s.setSelectedEntryId);

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(entry.title);
  const [editContent, setEditContent] = useState(entry.content);
  const [bouncingMood, setBouncingMood] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [showImageModal, setShowImageModal] = useState(false);

  const handleMoodClick = (m: MoodType) => {
    updateEntry(entry.id, { mood: m });
    setBouncingMood(m);
    setTimeout(() => setBouncingMood(null), 350);
  };

  const handleRemoveTag = (idx: number) => {
    const newTags = entry.tags.filter((_, i) => i !== idx);
    updateEntry(entry.id, { tags: newTags });
  };

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim() && entry.tags.length < 3) {
      e.preventDefault();
      updateEntry(entry.id, { tags: [...entry.tags, tagInput.trim()] });
      setTagInput('');
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('图片大小不能超过 2MB');
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
      alert('仅支持 jpg/png 格式');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSize = 400;
        let w = img.width;
        let h = img.height;
        if (w > h && w > maxSize) {
          h = (h * maxSize) / w;
          w = maxSize;
        } else if (h > maxSize) {
          w = (w * maxSize) / h;
          h = maxSize;
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          updateEntry(entry.id, { image: canvas.toDataURL('image/jpeg', 0.85) });
        }
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    updateEntry(entry.id, { image: undefined });
  };

  const handleSave = () => {
    if (!editTitle.trim()) {
      alert('标题不能为空');
      return;
    }
    updateEntry(entry.id, {
      title: editTitle.trim(),
      content: editContent.trim(),
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditTitle(entry.title);
    setEditContent(entry.content);
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (confirm('确定要删除这条手账记录吗？')) {
      deleteEntry(entry.id);
      setSelectedEntryId(null);
    }
  };

  const d = dayjs(entry.date);

  return (
    <>
      <article className="entry-card">
        <div className="entry-date-badge">
          <span className="day">{d.format('DD')}</span>
          <span className="month">{d.format('MMM')}</span>
        </div>

        {isEditing ? (
          <input
            type="text"
            className="entry-title-input"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder="请输入标题"
            autoFocus
          />
        ) : (
          <h1 className="entry-title">{entry.title}</h1>
        )}

        {isEditing ? (
          <textarea
            className="entry-body-textarea"
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            placeholder="记录你的故事...（支持 **加粗**、*斜体*、- 列表）"
          />
        ) : (
          <div className="entry-body">{renderMarkdown(entry.content)}</div>
        )}

        <div className="entry-section-label">今日心情</div>
        <div className="mood-selector">
          {(Object.keys(MOOD_EMOJIS) as MoodType[]).map((m) => (
            <button
              key={m}
              type="button"
              className={`mood-btn ${entry.mood === m ? 'active' : ''} ${bouncingMood === m ? 'bounce' : ''}`}
              onClick={() => handleMoodClick(m)}
            >
              {MOOD_EMOJIS[m]}
            </button>
          ))}
        </div>

        <div className="entry-section-label">标签</div>
        <div className="tags-container">
          {entry.tags.map((t, i) => (
            <span key={i} className="tag-pill">
              {t}
              <span className="tag-remove" onClick={() => handleRemoveTag(i)}>
                ×
              </span>
            </span>
          ))}
          {entry.tags.length < 3 && (
            <input
              type="text"
              className="tag-input"
              placeholder="添加标签"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleAddTag}
            />
          )}
        </div>

        <div className="entry-section-label">图片附注</div>
        <div className="entry-image-section">
          {entry.image ? (
            <div className="entry-image-thumb" onClick={() => setShowImageModal(true)}>
              <img src={entry.image} alt="entry" />
              <button
                className="entry-image-remove"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveImage();
                }}
              >
                ×
              </button>
            </div>
          ) : (
            <label className="image-upload-btn">
              <span>📷</span>
              <span>添加图片</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/jpg"
                style={{ display: 'none' }}
                onChange={handleImageUpload}
              />
            </label>
          )}
        </div>

        <div className="entry-card-actions">
          {isEditing ? (
            <>
              <button className="btn btn-secondary" onClick={handleCancel}>
                取消
              </button>
              <button className="btn btn-success" onClick={handleSave}>
                保存
              </button>
            </>
          ) : (
            <>
              <button className="btn btn-primary" onClick={() => setIsEditing(true)}>
                ✏️ 编辑
              </button>
              <button className="btn btn-danger" onClick={handleDelete}>
                🗑️ 删除
              </button>
            </>
          )}
        </div>
      </article>

      {showImageModal && entry.image && (
        <div className="image-modal-overlay" onClick={() => setShowImageModal(false)}>
          <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
            <img src={entry.image} alt="preview" />
          </div>
        </div>
      )}
    </>
  );
};

export default EntryCard;
