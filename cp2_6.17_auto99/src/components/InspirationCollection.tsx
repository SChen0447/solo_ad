import { useState, useMemo, useEffect, useRef } from 'react';
import type { InspirationItem } from '../App';

interface Props {
  collection: InspirationItem[];
  onCollectionChange: () => void;
}

type SortOrder = 'desc' | 'asc';

const InspirationCollection = ({ collection, onCollectionChange }: Props) => {
  const [filterTag, setFilterTag] = useState<string>('__all__');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [animKey, setAnimKey] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNote, setEditNote] = useState('');
  const [editTagsInput, setEditTagsInput] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState('');
  const noteRef = useRef<HTMLTextAreaElement>(null);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    collection.forEach((item) => item.tags.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [collection]);

  const filtered = useMemo(() => {
    let list = collection.slice(0, 100);
    if (filterTag !== '__all__') {
      list = list.filter((item) => item.tags.includes(filterTag));
    }
    list.sort((a, b) => {
      const diff = a.timestamp - b.timestamp;
      return sortOrder === 'desc' ? -diff : diff;
    });
    return list;
  }, [collection, filterTag, sortOrder]);

  useEffect(() => {
    setAnimKey((k) => k + 1);
  }, [filterTag, sortOrder, collection.length]);

  useEffect(() => {
    if (editingId && noteRef.current) {
      noteRef.current.focus();
    }
  }, [editingId]);

  const startEdit = (item: InspirationItem) => {
    setEditingId(item.id);
    setEditNote(item.note);
    setEditTagsInput([...item.tags]);
    setTagDraft('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditNote('');
    setEditTagsInput([]);
    setTagDraft('');
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const item = collection.find((i) => i.id === editingId);
    if (!item) return;
    try {
      await fetch('/api/inspiration/collection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: item.text,
          note: editNote,
          tags: editTagsInput,
        }),
      });
      onCollectionChange();
    } catch (err) {
      console.error('保存失败:', err);
    } finally {
      cancelEdit();
    }
  };

  const deleteItem = async (id: string) => {
    try {
      await fetch(`/api/inspiration/collection/${id}`, { method: 'DELETE' });
      onCollectionChange();
    } catch (err) {
      console.error('删除失败:', err);
    }
  };

  const addEditTag = () => {
    const t = tagDraft.trim();
    if (!t) return;
    if (editTagsInput.length >= 3) return;
    if (editTagsInput.includes(t)) {
      setTagDraft('');
      return;
    }
    setEditTagsInput([...editTagsInput, t]);
    setTagDraft('');
  };

  const removeEditTag = (t: string) => {
    setEditTagsInput(editTagsInput.filter((x) => x !== t));
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${day} ${hh}:${mm}`;
  };

  return (
    <>
      <style>{`
        .collection-wrapper {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .collection-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
        }
        .collection-title {
          font-size: 24px;
          font-weight: 700;
          color: #fff;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .collection-count {
          font-size: 14px;
          font-weight: 500;
          padding: 4px 12px;
          border-radius: 999px;
          background: rgba(139, 92, 246, 0.2);
          color: #c4b5fd;
        }

        .filter-bar {
          display: flex;
          gap: 14px;
          align-items: center;
          flex-wrap: wrap;
          padding: 16px 20px;
          background: rgba(30, 30, 46, 0.6);
          border: 1px solid rgba(139, 92, 246, 0.15);
          border-radius: 16px;
          backdrop-filter: blur(4px);
        }
        .filter-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .filter-label {
          font-size: 13px;
          color: #9ca3af;
          font-weight: 500;
        }
        .filter-select {
          padding: 8px 34px 8px 14px;
          background: #374151;
          color: #fff;
          border: 1px solid #4b5563;
          border-radius: 10px;
          font-size: 14px;
          outline: none;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 12px center;
          transition: all 0.3s ease;
          cursor: pointer;
        }
        .filter-select:hover { border-color: #6b7280; }
        .filter-select:focus { border-color: #8b5cf6; box-shadow: 0 0 0 3px rgba(139,92,246,0.2); }

        .grid-container {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 24px;
        }

        @keyframes staggerFadeIn {
          from { opacity: 0; transform: translateY(12px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .collect-card {
          height: 200px;
          background: #2a2a3e;
          border-radius: 12px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          position: relative;
          border: 1px solid rgba(255,255,255,0.04);
          transition: all 0.3s ease;
          opacity: 0;
          animation: staggerFadeIn 0.5s ease forwards;
          overflow: hidden;
        }
        .collect-card:hover {
          transform: translateY(-4px);
          border-color: rgba(139, 92, 246, 0.35);
          box-shadow: 0 12px 32px rgba(0,0,0,0.3);
        }

        .card-text {
          color: #fff;
          font-size: 15px;
          line-height: 1.55;
          font-weight: 600;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          flex-shrink: 0;
        }

        .card-note-wrap {
          flex: 1;
          min-height: 0;
          display: flex;
          flex-direction: column;
        }
        .card-note-display {
          font-size: 13px;
          line-height: 1.5;
          color: #9ca3af;
          padding: 8px 10px;
          background: rgba(55, 65, 81, 0.5);
          border-radius: 8px;
          cursor: pointer;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
          transition: all 0.3s ease;
          border: 1px solid transparent;
          flex: 1;
        }
        .card-note-display:hover {
          border-color: rgba(139, 92, 246, 0.4);
          color: #d1d5db;
        }
        .card-note-display.empty { color: #6b7280; font-style: italic; }
        .card-note-edit {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .card-note-input {
          flex: 1;
          min-height: 0;
          padding: 8px 10px;
          background: #374151;
          color: #fff;
          border: 1px solid #4b5563;
          border-radius: 8px;
          font-size: 13px;
          line-height: 1.5;
          resize: none;
          outline: none;
          transition: all 0.3s ease;
        }
        .card-note-input:focus { border-color: #8b5cf6; box-shadow: 0 0 0 3px rgba(139,92,246,0.2); }
        .edit-tag-row {
          display: flex;
          gap: 6px;
          align-items: center;
          flex-wrap: wrap;
        }
        .edit-tag-input {
          flex: 1;
          min-width: 0;
          padding: 5px 10px;
          background: #374151;
          color: #fff;
          border: 1px solid #4b5563;
          border-radius: 8px;
          font-size: 12px;
          outline: none;
          transition: all 0.3s ease;
        }
        .edit-tag-input:focus { border-color: #8b5cf6; }
        .edit-actions {
          display: flex;
          gap: 6px;
          justify-content: flex-end;
        }
        .edit-btn {
          padding: 4px 10px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 500;
          transition: all 0.2s ease;
        }
        .edit-btn.save { background: #8b5cf6; color: #fff; }
        .edit-btn.save:hover { background: #7c3aed; }
        .edit-btn.cancel { background: rgba(107, 114, 128, 0.4); color: #d1d5db; }
        .edit-btn.cancel:hover { background: rgba(107, 114, 128, 0.6); }

        .card-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          flex-shrink: 0;
        }
        .card-tag {
          padding: 3px 10px;
          border-radius: 999px;
          background: #374151;
          color: #d1d5db;
          font-size: 11px;
          font-weight: 500;
          transition: all 0.3s ease;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        .card-tag:hover { transform: scale(1.05); }
        .card-tag-rm {
          display: inline-flex;
          width: 14px;
          height: 14px;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          color: #9ca3af;
          font-size: 10px;
          line-height: 1;
          transition: all 0.2s ease;
        }
        .card-tag-rm:hover { background: rgba(239,68,68,0.3); color: #fca5a5; }

        .card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-shrink: 0;
          padding-top: 4px;
          border-top: 1px solid rgba(255,255,255,0.04);
        }
        .card-date {
          font-size: 11px;
          color: #6b7280;
        }
        .card-actions {
          display: flex;
          gap: 4px;
        }
        .icon-btn {
          width: 26px;
          height: 26px;
          border-radius: 8px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #6b7280;
          transition: all 0.2s ease;
        }
        .icon-btn:hover { background: rgba(139,92,246,0.2); color: #c4b5fd; }
        .icon-btn.del:hover { background: rgba(239,68,68,0.2); color: #fca5a5; }

        .empty-state {
          grid-column: 1 / -1;
          padding: 80px 20px;
          text-align: center;
          color: #6b7280;
        }
        .empty-emoji { font-size: 56px; margin-bottom: 16px; }
        .empty-title { font-size: 18px; font-weight: 600; color: #9ca3af; margin-bottom: 8px; }
        .empty-desc { font-size: 14px; line-height: 1.6; }

        @media (max-width: 768px) {
          .grid-container {
            grid-template-columns: 1fr;
          }
          .filter-bar { flex-direction: column; align-items: stretch; }
          .filter-group { justify-content: space-between; }
          .filter-select { flex: 1; }
        }
      `}</style>

      <div className="collection-wrapper">
        <div className="collection-header">
          <div className="collection-title">
            📚 我的收藏
            <span className="collection-count">{collection.length} 条灵感</span>
          </div>
        </div>

        <div className="filter-bar">
          <div className="filter-group">
            <span className="filter-label">🏷️ 标签筛选</span>
            <select
              className="filter-select"
              value={filterTag}
              onChange={(e) => setFilterTag(e.target.value)}
            >
              <option value="__all__">全部 ({collection.length})</option>
              {allTags.map((t) => {
                const cnt = collection.filter((i) => i.tags.includes(t)).length;
                return (
                  <option key={t} value={t}>
                    #{t} ({cnt})
                  </option>
                );
              })}
            </select>
          </div>

          <div className="filter-group">
            <span className="filter-label">⏱️ 排序方式</span>
            <select
              className="filter-select"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as SortOrder)}
            >
              <option value="desc">收藏时间（最新优先）</option>
              <option value="asc">收藏时间（最早优先）</option>
            </select>
          </div>

          {filterTag !== '__all__' && (
            <div style={{ marginLeft: 'auto' }}>
              <button
                className="edit-btn cancel"
                onClick={() => setFilterTag('__all__')}
              >
                清除筛选
              </button>
            </div>
          )}
        </div>

        <div className="grid-container" key={animKey}>
          {filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-emoji">
                {collection.length === 0 ? '🪄' : '🔍'}
              </div>
              <div className="empty-title">
                {collection.length === 0 ? '还没有收藏任何灵感' : '没有符合条件的灵感'}
              </div>
              <div className="empty-desc">
                {collection.length === 0
                  ? '前往首页生成并收藏你的第一条创意灵感吧！'
                  : '试试切换筛选标签或排序方式'}
              </div>
            </div>
          ) : (
            filtered.map((item, idx) => (
              <div
                key={item.id}
                className="collect-card"
                style={{ animationDelay: `${Math.min(idx * 40, 2000)}ms` }}
              >
                <div className="card-text">{item.text}</div>

                <div className="card-note-wrap">
                  {editingId === item.id ? (
                    <div className="card-note-edit">
                      <textarea
                        ref={noteRef}
                        className="card-note-input"
                        value={editNote}
                        onChange={(e) => setEditNote(e.target.value)}
                        placeholder="编辑备注…"
                      />
                      <div className="edit-tag-row">
                        {editTagsInput.map((t) => (
                          <span key={t} className="card-tag">
                            #{t}
                            <button
                              className="card-tag-rm"
                              onClick={() => removeEditTag(t)}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                        <input
                          className="edit-tag-input"
                          placeholder={editTagsInput.length >= 3 ? '最多3个标签' : '输入标签…'}
                          value={tagDraft}
                          disabled={editTagsInput.length >= 3}
                          onChange={(e) => setTagDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addEditTag();
                            }
                          }}
                        />
                      </div>
                      <div className="edit-actions">
                        <button className="edit-btn cancel" onClick={cancelEdit}>
                          取消
                        </button>
                        <button className="edit-btn save" onClick={saveEdit}>
                          保存
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`card-note-display ${!item.note ? 'empty' : ''}`}
                      onClick={() => startEdit(item)}
                    >
                      {item.note || '📝 点击编辑备注…'}
                    </div>
                  )}
                </div>

                {editingId !== item.id && (
                  <>
                    <div className="card-tags">
                      {item.tags.length === 0 ? (
                        <span style={{ fontSize: 11, color: '#6b7280' }}>无标签</span>
                      ) : (
                        item.tags.map((t) => (
                          <span
                            key={t}
                            className="card-tag"
                            onClick={(e) => {
                              e.stopPropagation();
                              setFilterTag(t);
                            }}
                            style={{ cursor: filterTag === t ? 'default' : 'pointer' }}
                            title={filterTag === t ? '' : `点击筛选 #${t}`}
                          >
                            #{t}
                          </span>
                        ))
                      )}
                    </div>
                    <div className="card-footer">
                      <span className="card-date">{formatDate(item.timestamp)}</span>
                      <div className="card-actions">
                        <button
                          className="icon-btn"
                          onClick={() => startEdit(item)}
                          title="编辑"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          className="icon-btn del"
                          onClick={() => {
                            if (confirm('确定要删除这条灵感吗？')) deleteItem(item.id);
                          }}
                          title="删除"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};

export default InspirationCollection;
