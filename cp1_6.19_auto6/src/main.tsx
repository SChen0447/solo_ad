import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import dayjs from 'dayjs';
import { useStore, MoodType, MOOD_EMOJIS, DiaryEntry } from './store';
import Sidebar from './components/Sidebar';
import EntryCard from './components/EntryCard';
import TimelinePanel from './components/TimelinePanel';
import './styles.css';

const CreateModal: React.FC = () => {
  const isCreating = useStore((s) => s.isCreating);
  const setIsCreating = useStore((s) => s.setIsCreating);
  const addEntry = useStore((s) => s.addEntry);
  const selectedDate = useStore((s) => s.selectedDate);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mood, setMood] = useState<MoodType>('calm');
  const [bouncingMood, setBouncingMood] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [image, setImage] = useState<string | undefined>(undefined);
  const [date, setDate] = useState(selectedDate);

  if (!isCreating) return null;

  const handleMoodClick = (m: MoodType) => {
    setMood(m);
    setBouncingMood(m);
    setTimeout(() => setBouncingMood(null), 350);
  };

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim() && tags.length < 3) {
      e.preventDefault();
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (idx: number) => {
    setTags(tags.filter((_, i) => i !== idx));
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
          setImage(canvas.toDataURL('image/jpeg', 0.85));
        }
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    if (!title.trim()) {
      alert('请输入标题');
      return;
    }
    addEntry({
      title: title.trim(),
      content: content.trim(),
      date,
      mood,
      tags,
      image,
    });
    setTitle('');
    setContent('');
    setMood('calm');
    setTags([]);
    setImage(undefined);
    setDate(selectedDate);
  };

  const handleClose = () => {
    setIsCreating(false);
    setTitle('');
    setContent('');
    setMood('calm');
    setTags([]);
    setTagInput('');
    setImage(undefined);
  };

  return (
    <div className="create-modal-overlay" onClick={handleClose}>
      <div className="create-modal" onClick={(e) => e.stopPropagation()}>
        <div className="create-modal-header">
          <div className="create-modal-title">✏️ 新建手账条目</div>
          <button className="create-modal-close" onClick={handleClose}>
            ×
          </button>
        </div>

        <div className="form-row">
          <label className="form-label">日期</label>
          <input
            type="date"
            className="form-input"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div className="form-row">
          <label className="form-label">标题</label>
          <input
            type="text"
            className="form-input"
            placeholder="给今天取个名字吧..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="form-row">
          <label className="form-label">正文（支持简单 Markdown：**加粗**、*斜体*、- 列表）</label>
          <textarea
            className="form-textarea"
            placeholder="记录今天的心情和故事..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </div>

        <div className="form-row">
          <label className="form-label">心情</label>
          <div className="mood-selector">
            {(Object.keys(MOOD_EMOJIS) as MoodType[]).map((m) => (
              <button
                key={m}
                className={`mood-btn ${mood === m ? 'active' : ''} ${bouncingMood === m ? 'bounce' : ''}`}
                onClick={() => handleMoodClick(m)}
                type="button"
              >
                {MOOD_EMOJIS[m]}
              </button>
            ))}
          </div>
        </div>

        <div className="form-row">
          <label className="form-label">标签（最多 3 个，回车添加）</label>
          <div className="tags-container">
            {tags.map((t, i) => (
              <span key={i} className="tag-pill">
                {t}
                <span className="tag-remove" onClick={() => handleRemoveTag(i)}>
                  ×
                </span>
              </span>
            ))}
            {tags.length < 3 && (
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
        </div>

        <div className="form-row">
          <label className="form-label">图片附注（jpg/png，最大 2MB）</label>
          {image ? (
            <div className="entry-image-thumb">
              <img src={image} alt="preview" />
              <button className="entry-image-remove" onClick={() => setImage(undefined)}>
                ×
              </button>
            </div>
          ) : (
            <label className="image-upload-btn">
              <span>📷</span>
              <span>点击上传图片</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/jpg"
                style={{ display: 'none' }}
                onChange={handleImageUpload}
              />
            </label>
          )}
        </div>

        <div className="form-actions">
          <button className="btn btn-secondary" onClick={handleClose}>
            取消
          </button>
          <button className="btn btn-success" onClick={handleSubmit}>
            保存
          </button>
        </div>
      </div>
    </div>
  );
};

const Navbar: React.FC = () => {
  const setIsCreating = useStore((s) => s.setIsCreating);
  const currentView = useStore((s) => s.currentView);
  const setCurrentView = useStore((s) => s.setCurrentView);

  return (
    <nav className="navbar">
      <div className="navbar-title">📔 手账时光</div>
      <div className="navbar-actions">
        <div className="view-toggle">
          <button
            className={`view-toggle-btn ${currentView === 'week' ? 'active' : ''}`}
            onClick={() => setCurrentView('week')}
          >
            周视图
          </button>
          <button
            className={`view-toggle-btn ${currentView === 'month' ? 'active' : ''}`}
            onClick={() => setCurrentView('month')}
          >
            月视图
          </button>
        </div>
        <button className="btn btn-primary" onClick={() => setIsCreating(true)}>
          ✚ 新建条目
        </button>
      </div>
    </nav>
  );
};

const App: React.FC = () => {
  const entries = useStore((s) => s.entries);
  const selectedEntryId = useStore((s) => s.selectedEntryId);
  const selectedDate = useStore((s) => s.selectedDate);

  const filteredEntries = entries.filter((e) => e.date === selectedDate);
  const selectedEntry: DiaryEntry | undefined =
    entries.find((e) => e.id === selectedEntryId) || filteredEntries[0];

  return (
    <div className="app-container">
      <Navbar />
      <div className="main-layout">
        <Sidebar />
        <main className="content-area">
          <TimelinePanel />
          {selectedEntry ? (
            <EntryCard entry={selectedEntry} />
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">📖</div>
              <div className="empty-state-text">
                {dayjs(selectedDate).format('YYYY年MM月DD日')} 还没有记录，点击右上角「新建条目」开始吧～
              </div>
            </div>
          )}
        </main>
      </div>
      <CreateModal />
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
