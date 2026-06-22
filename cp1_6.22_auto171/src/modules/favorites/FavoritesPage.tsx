import React, { useState, useEffect, useRef, useCallback } from 'react';
import { fetchRecords, toggleStar } from '../../api';
import type { Emotion, Record } from '../../api';
import RecordCard from '../../components/RecordCard';

const STORAGE_KEY = 'mindtrace_favorites_order';

function getStoredOrder(): string[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveStoredOrder(ids: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

export default function FavoritesPage() {
  const [starredRecords, setStarredRecords] = useState<Record[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragNodeRef = useRef<HTMLDivElement | null>(null);

  const loadFavorites = useCallback(async () => {
    try {
      setLoading(true);
      const allRecords = await fetchRecords();
      const starred = allRecords.filter((r) => r.isStarred);
      const storedOrder = getStoredOrder();
      const ordered = [...starred].sort((a, b) => {
        const aIdx = storedOrder.indexOf(a.id);
        const bIdx = storedOrder.indexOf(b.id);
        if (aIdx === -1 && bIdx === -1) return 0;
        if (aIdx === -1) return 1;
        if (bIdx === -1) return -1;
        return aIdx - bIdx;
      });
      setStarredRecords(ordered);
    } catch (err) {
      console.error('Failed to load favorites:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  const handleStar = async (id: string) => {
    try {
      await toggleStar(id);
      setStarredRecords((prev) => {
        const updated = prev.filter((r) => r.id !== id);
        saveStoredOrder(updated.map((r) => r.id));
        return updated;
      });
    } catch (err) {
      console.error('Failed to toggle star:', err);
    }
  };

  const handleEdit = async () => {};
  const handleDelete = async () => {};
  const handleEmotionChange = async () => {};

  const handleDragStart = (index: number, e: React.DragEvent<HTMLDivElement>) => {
    setDragIndex(index);
    dragNodeRef.current = e.currentTarget as HTMLDivElement;
    e.currentTarget.style.transform = 'scale(1.05)';
    e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.4)';
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (index: number, e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.style.transform = '';
    e.currentTarget.style.boxShadow = '';
    if (dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex) {
      setStarredRecords((prev) => {
        const newList = [...prev];
        const [draggedItem] = newList.splice(dragIndex, 1);
        newList.splice(dragOverIndex, 0, draggedItem);
        saveStoredOrder(newList.map((r) => r.id));
        return newList;
      });
    }
    setDragIndex(null);
    setDragOverIndex(null);
    dragNodeRef.current = null;
  };

  if (loading) {
    return (
      <div className="loading-state">
        <i className="fas fa-spinner fa-spin"></i>
        <span>加载中...</span>
      </div>
    );
  }

  if (starredRecords.length === 0) {
    return (
      <div className="empty-state">
        <i className="far fa-star" style={{ fontSize: '48px', color: '#475569', marginBottom: '16px' }}></i>
        <p>暂无星标记录，在主页中为重要记录添加星标吧</p>
      </div>
    );
  }

  return (
    <div className="favorites-page">
      <h2 className="page-title">
        <i className="fas fa-star" style={{ color: '#fbbf24', marginRight: '8px' }}></i>
        收藏夹
      </h2>
      <p className="page-subtitle">拖拽卡片可调整顺序</p>
      <div className="favorites-grid">
        {starredRecords.map((record, i) => (
          <div
            key={record.id}
            draggable
            onDragStart={(e) => handleDragStart(i, e)}
            onDragOver={(e) => handleDragOver(i, e)}
            onDragEnd={(e) => handleDragEnd(e)}
            style={{
              transition: 'transform 0.2s, box-shadow 0.2s',
              opacity: dragOverIndex === i ? 0.6 : 1,
              cursor: 'grab',
            }}
          >
            <RecordCard
              id={record.id}
              text={record.text}
              timestamp={record.timestamp}
              emotion={record.emotion}
              isStarred={record.isStarred}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onStar={handleStar}
              onEmotionChange={handleEmotionChange}
              width={240}
              index={i}
            />
          </div>
        ))}
      </div>

      <style>{`
        .favorites-page {
          position: relative;
        }
        .page-title {
          font-size: 22px;
          font-weight: 700;
          color: #e2e8f0;
          margin-bottom: 4px;
          display: flex;
          align-items: center;
        }
        .page-subtitle {
          font-size: 13px;
          color: #64748b;
          margin-bottom: 24px;
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
