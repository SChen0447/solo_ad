import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  fetchRecords,
  createRecord,
  updateRecord,
  deleteRecord,
  toggleStar,
} from '../../api';
import type { Emotion, Record } from '../../api';
import RecordCard from '../../components/RecordCard';
import FloatingButton from '../../components/FloatingButton';

const EMOTIONS: { key: Emotion; label: string; color: string }[] = [
  { key: 'happy', label: '快乐', color: '#facc15' },
  { key: 'sad', label: '悲伤', color: '#6366f1' },
  { key: 'anxious', label: '焦虑', color: '#f97316' },
  { key: 'calm', label: '平静', color: '#34d399' },
  { key: 'excited', label: '兴奋', color: '#f472b6' },
];

export default function RecordsPage() {
  const [searchParams] = useSearchParams();
  const [records, setRecords] = useState<Record[]>([]);
  const [loading, setLoading] = useState(true);
  const [emotionFilter, setEmotionFilter] = useState<Emotion | 'all'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchKeyword, setSearchKeyword] = useState(() => searchParams.get('search') || '');

  const loadRecords = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchRecords();
      setRecords(data);
    } catch (err) {
      console.error('Failed to load records:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const handleCreate = async (text: string, emotion?: Emotion) => {
    try {
      const newRecord = await createRecord(text, emotion);
      setRecords((prev) => [newRecord, ...prev]);
    } catch (err) {
      console.error('Failed to create record:', err);
    }
  };

  const handleEdit = async (id: string, text: string, emotion: Emotion) => {
    try {
      const updated = await updateRecord(id, { text, emotion });
      setRecords((prev) => prev.map((r) => (r.id === id ? updated : r)));
    } catch (err) {
      console.error('Failed to update record:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteRecord(id);
      setRecords((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error('Failed to delete record:', err);
    }
  };

  const handleStar = async (id: string) => {
    try {
      const updated = await toggleStar(id);
      setRecords((prev) => prev.map((r) => (r.id === id ? updated : r)));
    } catch (err) {
      console.error('Failed to toggle star:', err);
    }
  };

  const handleEmotionChange = async (id: string, emotion: Emotion) => {
    try {
      const updated = await updateRecord(id, { emotion });
      setRecords((prev) => prev.map((r) => (r.id === id ? updated : r)));
    } catch (err) {
      console.error('Failed to change emotion:', err);
    }
  };

  const filteredRecords = records.filter((r) => {
    if (emotionFilter !== 'all' && r.emotion !== emotionFilter) return false;

    if (searchKeyword && !r.text.toLowerCase().includes(searchKeyword.toLowerCase())) return false;

    if (startDate) {
      const rDate = new Date(r.timestamp).toISOString().split('T')[0];
      if (rDate < startDate) return false;
    }
    if (endDate) {
      const rDate = new Date(r.timestamp).toISOString().split('T')[0];
      if (rDate > endDate) return false;
    }

    return true;
  });

  return (
    <div className="records-page">
      <div className="filters-bar">
        <div className="filter-group">
          <label className="filter-label">情绪筛选</label>
          <div className="emotion-filters">
            <button
              className={`emotion-filter-btn ${emotionFilter === 'all' ? 'active' : ''}`}
              onClick={() => setEmotionFilter('all')}
            >
              全部
            </button>
            {EMOTIONS.map((em) => (
              <button
                key={em.key}
                className={`emotion-filter-btn ${emotionFilter === em.key ? 'active' : ''}`}
                onClick={() => setEmotionFilter(em.key)}
                style={
                  emotionFilter === em.key
                    ? { background: em.color, color: '#0f172a' }
                    : {}
                }
              >
                <span
                  className="filter-dot"
                  style={{ background: em.color }}
                />
                {em.label}
              </button>
            ))}
          </div>
        </div>
        <div className="filter-group">
          <label className="filter-label">日期范围</label>
          <div className="date-filters">
            <input
              type="date"
              className="date-input"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <span className="date-sep">—</span>
            <input
              type="date"
              className="date-input"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
        <div className="filter-group">
          <label className="filter-label">关键词搜索</label>
          <input
            type="text"
            className="search-input"
            placeholder="搜索记录..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="loading-state">
          <i className="fas fa-spinner fa-spin"></i>
          <span>加载中...</span>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="empty-state">
          <i className="far fa-lightbulb" style={{ fontSize: '48px', color: '#475569', marginBottom: '16px' }}></i>
          <p>暂无记录，点击右下角按钮开始记录</p>
        </div>
      ) : (
        <div className="records-grid" key={`${emotionFilter}-${startDate}-${endDate}-${searchKeyword}`}>
          {filteredRecords.map((record, i) => (
            <RecordCard
              key={record.id}
              id={record.id}
              text={record.text}
              timestamp={record.timestamp}
              emotion={record.emotion}
              isStarred={record.isStarred}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onStar={handleStar}
              onEmotionChange={handleEmotionChange}
              index={i}
            />
          ))}
        </div>
      )}

      <FloatingButton onSubmit={handleCreate} />

      <style>{`
        .records-page {
          position: relative;
          min-height: calc(100vh - 104px);
        }
        .filters-bar {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          margin-bottom: 24px;
          padding: 16px;
          background: #1e293b;
          border-radius: 12px;
          border: 1px solid #334155;
        }
        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .filter-label {
          font-size: 12px;
          color: #94a3b8;
          font-weight: 500;
        }
        .emotion-filters {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .emotion-filter-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          border-radius: 16px;
          border: 1px solid #334155;
          background: transparent;
          color: #94a3b8;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;
          font-family: inherit;
        }
        .emotion-filter-btn:hover {
          border-color: #475569;
          color: #e2e8f0;
        }
        .emotion-filter-btn.active {
          border-color: transparent;
          font-weight: 600;
        }
        .filter-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          display: inline-block;
        }
        .date-filters {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .date-input {
          padding: 6px 10px;
          border-radius: 8px;
          border: 1px solid #334155;
          background: #0f172a;
          color: #e2e8f0;
          font-size: 13px;
          font-family: inherit;
          outline: none;
        }
        .date-input:focus {
          border-color: #a78bfa;
        }
        .date-sep {
          color: #475569;
        }
        .search-input {
          padding: 6px 12px;
          border-radius: 8px;
          border: 1px solid #334155;
          background: #0f172a;
          color: #e2e8f0;
          font-size: 13px;
          font-family: inherit;
          outline: none;
          width: 180px;
        }
        .search-input:focus {
          border-color: #a78bfa;
        }
        .search-input::placeholder {
          color: #475569;
        }
        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 80px 0;
          gap: 12px;
          color: #94a3b8;
        }
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 80px 0;
          color: #94a3b8;
        }
      `}</style>
    </div>
  );
}
