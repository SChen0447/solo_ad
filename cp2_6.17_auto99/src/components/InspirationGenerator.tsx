import { useState, useCallback, useEffect, useRef } from 'react';
import type { InspirationItem } from '../App';

interface Props {
  collection: InspirationItem[];
  onCollectionChange: () => void;
}

const InspirationGenerator = ({ collection, onCollectionChange }: Props) => {
  const [currentText, setCurrentText] = useState('');
  const [note, setNote] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isCollected, setIsCollected] = useState(false);
  const [pulseKey, setPulseKey] = useState(0);
  const [starRotate, setStarRotate] = useState(false);
  const noteRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (currentText) {
      const exists = collection.some((item) => item.text === currentText);
      setIsCollected(exists);
      if (exists) {
        const found = collection.find((item) => item.text === currentText)!;
        setNote(found.note);
        setTags([...found.tags]);
      }
    }
  }, [currentText, collection]);

  useEffect(() => {
    if (isEditingNote && noteRef.current) {
      noteRef.current.focus();
    }
  }, [isEditingNote]);

  const generateInspiration = useCallback(async () => {
    setLoading(true);
    setIsEditingNote(false);
    try {
      const res = await fetch('/api/inspiration');
      if (res.ok) {
        const data = (await res.json()) as { text: string };
        setCurrentText(data.text);
        setNote('');
        setTags([]);
      }
    } catch (err) {
      console.error('生成灵感失败:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleGenerateClick = () => {
    setPulseKey((k) => k + 1);
    generateInspiration();
  };

  const toggleCollect = async () => {
    if (!currentText) return;
    setStarRotate(true);
    setTimeout(() => setStarRotate(false), 400);

    try {
      if (isCollected) {
        const existing = collection.find((item) => item.text === currentText);
        if (existing) {
          await fetch(`/api/inspiration/collection/${existing.id}`, { method: 'DELETE' });
          setIsCollected(false);
          setNote('');
          setTags([]);
        }
      } else {
        await fetch('/api/inspiration/collection', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: currentText, note, tags }),
        });
        setIsCollected(true);
      }
      onCollectionChange();
    } catch (err) {
      console.error('收藏操作失败:', err);
    }
  };

  const saveCurrent = async () => {
    if (!currentText || !isCollected) return;
    try {
      await fetch('/api/inspiration/collection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: currentText, note, tags }),
      });
      onCollectionChange();
    } catch (err) {
      console.error('保存失败:', err);
    }
  };

  const addTag = () => {
    const trimmed = tagInput.trim();
    if (!trimmed) return;
    if (tags.length >= 3) return;
    if (tags.includes(trimmed)) {
      setTagInput('');
      return;
    }
    const next = [...tags, trimmed];
    setTags(next);
    setTagInput('');
    if (isCollected) {
      setTimeout(async () => {
        await fetch('/api/inspiration/collection', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: currentText, note, tags: next }),
        });
        onCollectionChange();
      }, 0);
    }
  };

  const removeTag = (tagToRemove: string) => {
    const next = tags.filter((t) => t !== tagToRemove);
    setTags(next);
    if (isCollected) {
      setTimeout(async () => {
        await fetch('/api/inspiration/collection', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: currentText, note, tags: next }),
        });
        onCollectionChange();
      }, 0);
    }
  };

  const handleNoteBlur = () => {
    setIsEditingNote(false);
    saveCurrent();
  };

  return (
    <>
      <style>{`
        .gen-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding-top: 40px;
          gap: 32px;
        }

        .gen-btn {
          width: 200px;
          height: 56px;
          border-radius: 20px;
          background: linear-gradient(135deg, #6b46c1 0%, #a855f7 100%);
          color: #fff;
          font-size: 17px;
          font-weight: 600;
          box-shadow: 0 8px 24px rgba(139, 92, 246, 0.35);
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .gen-btn:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 32px rgba(139, 92, 246, 0.5);
        }
        .gen-btn:active {
          transform: scale(0.95);
        }
        .gen-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
        }

        @keyframes pulseGlow {
          0% { box-shadow: 0 8px 24px rgba(139, 92, 246, 0.35); }
          50% { box-shadow: 0 0 0 8px rgba(168, 85, 247, 0.25), 0 8px 32px rgba(139, 92, 246, 0.6); }
          100% { box-shadow: 0 8px 24px rgba(139, 92, 246, 0.35); }
        }
        .pulse-anim {
          animation: pulseGlow 0.5s ease;
        }

        @keyframes spinStar {
          from { transform: rotate(0deg); }
          to { transform: rotate(180deg); }
        }
        .star-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: rgba(55, 65, 81, 0.6);
          transition: all 0.3s ease;
        }
        .star-btn:hover { background: rgba(75, 85, 99, 0.8); }
        .star-btn.rotate { animation: spinStar 0.4s ease; }
        .star-svg { transition: color 0.3s ease; }

        .regen-btn {
          padding: 0 22px;
          height: 44px;
          border-radius: 12px;
          background: rgba(139, 92, 246, 0.15);
          color: #c4b5fd;
          font-size: 15px;
          font-weight: 500;
          border: 1px solid rgba(139, 92, 246, 0.3);
          transition: all 0.3s ease;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .regen-btn:hover {
          background: rgba(139, 92, 246, 0.25);
          color: #fff;
          transform: translateY(-1px);
        }
        .regen-btn:active { transform: scale(0.97); }

        .inspiration-card {
          background: #1e1e2e;
          border-radius: 16px;
          border: 2px solid #7c3aed;
          padding: 24px;
          width: 500px;
          max-width: 100%;
          box-shadow: 0 12px 40px rgba(124, 58, 237, 0.15);
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .inspiration-text {
          color: #fff;
          font-size: 19px;
          line-height: 1.7;
          font-weight: 500;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .action-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding-top: 4px;
        }

        .note-section, .tags-section {
          border-top: 1px solid rgba(255,255,255,0.06);
          padding-top: 16px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .section-label {
          font-size: 13px;
          color: #9ca3af;
          font-weight: 500;
        }
        .note-display {
          color: #d1d5db;
          font-size: 14px;
          line-height: 1.6;
          padding: 10px 12px;
          background: rgba(55, 65, 81, 0.4);
          border-radius: 10px;
          min-height: 40px;
          cursor: pointer;
          transition: all 0.3s ease;
          border: 1px solid transparent;
        }
        .note-display:hover {
          border-color: rgba(139, 92, 246, 0.4);
          background: rgba(55, 65, 81, 0.6);
        }
        .note-display.empty { color: #6b7280; font-style: italic; }
        .note-input {
          width: 100%;
          min-height: 80px;
          padding: 10px 12px;
          background: #374151;
          color: #fff;
          border: 1px solid #4b5563;
          border-radius: 10px;
          font-size: 14px;
          line-height: 1.6;
          resize: vertical;
          outline: none;
          transition: all 0.3s ease;
        }
        .note-input:focus { border-color: #8b5cf6; box-shadow: 0 0 0 3px rgba(139,92,246,0.2); }

        .tags-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
        }
        .tag-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 5px 12px;
          border-radius: 999px;
          background: #374151;
          color: #d1d5db;
          font-size: 13px;
          transition: all 0.3s ease;
        }
        .tag-pill:hover { transform: scale(1.05); }
        .tag-remove {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          color: #9ca3af;
          font-size: 12px;
          line-height: 1;
          transition: all 0.2s ease;
        }
        .tag-remove:hover { background: rgba(239, 68, 68, 0.3); color: #fca5a5; }

        .tag-input-wrap {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .tag-input {
          flex: 1;
          padding: 7px 12px;
          background: #374151;
          color: #fff;
          border: 1px solid #4b5563;
          border-radius: 10px;
          font-size: 13px;
          outline: none;
          transition: all 0.3s ease;
        }
        .tag-input:focus { border-color: #8b5cf6; box-shadow: 0 0 0 3px rgba(139,92,246,0.2); }
        .tag-add-btn {
          padding: 7px 14px;
          border-radius: 10px;
          background: rgba(139, 92, 246, 0.3);
          color: #c4b5fd;
          font-size: 13px;
          font-weight: 500;
          transition: all 0.3s ease;
        }
        .tag-add-btn:hover:not(:disabled) { background: #8b5cf6; color: #fff; }
        .tag-add-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        .hint-text {
          font-size: 12px;
          color: #6b7280;
        }

        .placeholder-hint {
          color: #6b7280;
          font-size: 15px;
          padding: 20px;
          text-align: center;
        }

        @media (max-width: 768px) {
          .inspiration-card {
            width: 90%;
          }
          .gen-wrapper { padding-top: 20px; }
        }
      `}</style>

      <div className="gen-wrapper">
        <button
          className={`gen-btn ${pulseKey ? 'pulse-anim' : ''}`}
          key={pulseKey}
          onClick={handleGenerateClick}
          disabled={loading}
        >
          {loading ? '生成中…' : (
            <>
              <span style={{ fontSize: 20 }}>✨</span>
              生成灵感
            </>
          )}
        </button>

        {currentText ? (
          <div className="inspiration-card">
            <div className="inspiration-text">{currentText}</div>

            <div className="action-row">
              <button
                className={`star-btn ${starRotate ? 'rotate' : ''}`}
                onClick={toggleCollect}
                title={isCollected ? '取消收藏' : '收藏此灵感'}
              >
                <svg
                  className="star-svg"
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill={isCollected ? '#fbbf24' : 'none'}
                  stroke={isCollected ? '#fbbf24' : '#6b7280'}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </button>

              <button className="regen-btn" onClick={handleGenerateClick} disabled={loading}>
                <span>🔄</span>
                重新生成
              </button>

              <span className="hint-text" style={{ marginLeft: 'auto' }}>
                {isCollected ? '✓ 已收藏' : '点击星标收藏'}
              </span>
            </div>

            <div className="note-section">
              <div className="section-label">📝 个人备注</div>
              {isEditingNote ? (
                <textarea
                  ref={noteRef}
                  className="note-input"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  onBlur={handleNoteBlur}
                  placeholder="记录你的想法、补充细节…"
                />
              ) : (
                <div
                  className={`note-display ${!note ? 'empty' : ''}`}
                  onClick={() => setIsEditingNote(true)}
                >
                  {note || '点击添加备注…'}
                </div>
              )}
            </div>

            <div className="tags-section">
              <div className="section-label">🏷️ 标签（最多3个）</div>
              <div className="tags-list">
                {tags.map((t) => (
                  <span key={t} className="tag-pill">
                    #{t}
                    <button className="tag-remove" onClick={() => removeTag(t)} aria-label="移除标签">×</button>
                  </span>
                ))}
                {tags.length === 0 && <span className="hint-text">暂无标签</span>}
              </div>
              <div className="tag-input-wrap">
                <input
                  className="tag-input"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                  placeholder="输入标签后回车添加"
                  disabled={tags.length >= 3}
                />
                <button
                  className="tag-add-btn"
                  onClick={addTag}
                  disabled={!tagInput.trim() || tags.length >= 3}
                >
                  添加
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="placeholder-hint">
            👆 点击上方按钮，让灵感火花绽放 ✨
          </div>
        )}
      </div>
    </>
  );
};

export default InspirationGenerator;
