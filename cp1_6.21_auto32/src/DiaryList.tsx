import { useState, useEffect } from 'react';
import type { Diary } from './types';
import { EMOTIONS, getEmotionMeta } from './types';

type FilterParams = {
  startDate: string;
  endDate: string;
  emotions: string[];
};

type Props = {
  diaries: Diary[];
  loading: boolean;
  filter: FilterParams;
  onFilterChange: (f: FilterParams) => void;
  onEdit: (d: Diary) => void;
  onDelete: (id: string) => void;
  selectedId: string | null;
};

const PREVIEW_LEN = 50;

function formatDateLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${y}-${m}-${d}T00:00:00`);
  const diff = Math.round((today.getTime() - target.getTime()) / 86400000);
  if (diff === 0) return '今天';
  if (diff === 1) return '昨天';
  if (diff <= 6) return `${diff}天前`;
  return `${y}年${parseInt(m, 10)}月${parseInt(d, 10)}日`;
}

export default function DiaryList({
  diaries,
  loading,
  filter,
  onFilterChange,
  onEdit,
  onDelete,
  selectedId,
}: Props) {
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [tagDropdown, setTagDropdown] = useState(false);

  useEffect(() => {
    const close = () => setTagDropdown(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  const toggleEmotion = (type: string) => {
    const cur = filter.emotions;
    const next = cur.includes(type)
      ? cur.filter((e) => e !== type)
      : [...cur, type];
    onFilterChange({ ...filter, emotions: next });
  };

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRemovingId(id);
    setTimeout(() => {
      onDelete(id);
      setRemovingId(null);
    }, 280);
  };

  const today = new Date().toISOString().slice(0, 10);
  const defaultStart = new Date(Date.now() - 86400000 * 29).toISOString().slice(0, 10);

  return (
    <div className="card">
      <h2 className="section-title">📖 我的日记 <span style={{ fontSize: 13, fontWeight: 400, color: '#b89494', marginLeft: 6 }}>（共 {diaries.length} 条）</span></h2>

      <div className="filter-bar" style={{ marginBottom: 18 }}>
        <div className="filter-row">
          <div className="filter-item">
            <div className="filter-label">开始日期</div>
            <input
              type="date"
              className="filter-input"
              value={filter.startDate}
              max={today}
              onChange={(e) => onFilterChange({ ...filter, startDate: e.target.value })}
            />
          </div>
          <div className="filter-item">
            <div className="filter-label">结束日期</div>
            <input
              type="date"
              className="filter-input"
              value={filter.endDate}
              max={today}
              onChange={(e) => onFilterChange({ ...filter, endDate: e.target.value })}
            />
          </div>
        </div>
        <div className="filter-row">
          <div className="filter-item" style={{ position: 'relative' }}>
            <div className="filter-label">情绪标签（多选）</div>
            <div className="tag-filter-dropdown">
              <button
                type="button"
                className="filter-input"
                style={{
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  flexWrap: 'wrap',
                  minHeight: 40,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setTagDropdown((v) => !v);
                }}
              >
                {filter.emotions.length === 0 ? (
                  <span style={{ color: '#c9a9a9' }}>全部情绪</span>
                ) : (
                  filter.emotions.map((t) => {
                    const meta = getEmotionMeta(t);
                    return (
                      <span
                        key={t}
                        className="tag-chip selected"
                        style={{ background: meta?.bg, color: meta?.color, borderRadius: 8, padding: '2px 8px', fontSize: 11 }}
                      >
                        {meta?.emoji} {t}
                      </span>
                    );
                  })
                )}
                <span style={{ marginLeft: 'auto', color: '#b89494', fontSize: 12 }}>▼</span>
              </button>
              {tagDropdown && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: 6,
                    background: 'white',
                    borderRadius: 12,
                    boxShadow: '0 12px 32px rgba(204,153,153,0.2)',
                    padding: 10,
                    zIndex: 10,
                    border: '1px solid #f5d5d5',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="tag-list-filter" style={{ marginBottom: 8 }}>
                    {EMOTIONS.map((em) => {
                      const isSel = filter.emotions.includes(em.type);
                      return (
                        <span
                          key={em.type}
                          className={`tag-chip ${isSel ? 'selected' : ''}`}
                          style={{
                            background: isSel ? em.bg : 'rgba(253,240,240,0.6)',
                            color: isSel ? em.color : '#9f7a7a',
                            borderColor: isSel ? em.color : 'transparent',
                          }}
                          onClick={() => toggleEmotion(em.type)}
                        >
                          {em.emoji} {em.type}
                        </span>
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 6, borderTop: '1px dashed #f5d5d5' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => onFilterChange({ ...filter, emotions: [] })}
                      style={{ padding: '5px 12px', fontSize: 12 }}
                    >
                      清空
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => {
                        onFilterChange({ ...filter, startDate: defaultStart, endDate: today });
                        setTagDropdown(false);
                      }}
                      style={{ padding: '5px 12px', fontSize: 12 }}
                    >
                      最近30天
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="diary-list">
        {loading && (
          <div className="empty-state">
            <div className="empty-state-emoji">⏳</div>
            <div>加载中...</div>
          </div>
        )}
        {!loading && diaries.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-emoji">🍃</div>
            <div style={{ marginBottom: 6 }}>暂无日记</div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>点击右上角"新日记"开始记录吧</div>
          </div>
        )}
        {!loading && diaries.map((d, idx) => {
          const preview = d.content.length > PREVIEW_LEN
            ? d.content.slice(0, PREVIEW_LEN) + '...'
            : d.content;
          const isActive = selectedId === d.id;
          const isRemoving = removingId === d.id;
          return (
            <div
              key={d.id}
              className={`diary-item ${isActive ? 'active' : ''} ${isRemoving ? 'removing' : ''}`}
              style={{ animationDelay: `${Math.min(idx * 40, 400)}ms` }}
              onClick={() => onEdit(d)}
            >
              <div className="diary-item-header">
                <div>
                  <div className="diary-date">{formatDateLabel(d.date)}</div>
                  <div style={{ fontSize: 11, color: '#d4b4b4', marginTop: 2 }}>
                    {new Date(d.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <div className="diary-actions">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(d);
                    }}
                  >
                    编辑
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={(e) => handleDeleteClick(d.id, e)}
                  >
                    删除
                  </button>
                </div>
              </div>
              <div className="diary-tags">
                {d.emotions.map((e) => {
                  const meta = getEmotionMeta(e.type);
                  return (
                    <span
                      key={e.type}
                      className="tag-chip"
                      style={{ background: meta?.bg, color: meta?.color }}
                    >
                      <span style={{ fontSize: 13 }}>{meta?.emoji}</span>
                      {e.type}
                      <span className="diary-intensity" style={{ marginLeft: 4 }}>
                        强度 {e.intensity}
                      </span>
                    </span>
                  );
                })}
              </div>
              <div className="diary-preview">{preview}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
