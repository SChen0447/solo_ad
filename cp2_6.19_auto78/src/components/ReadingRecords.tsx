import { useState, useEffect } from 'react';
import type { BorrowRecord } from '../types';

interface ReadingRecordsProps {
  readerName: string;
}

function ReadingRecords({ readerName }: ReadingRecordsProps) {
  const [records, setRecords] = useState<BorrowRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        const res = await fetch(`/api/records?readerName=${encodeURIComponent(readerName)}`);
        const data = await res.json();
        setRecords(data);
      } catch (error) {
        console.error('Failed to fetch records:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRecords();
  }, [readerName]);

  const handleProgressChange = async (recordId: string, progress: number) => {
    try {
      const res = await fetch(`/api/records/${recordId}/progress`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ progress }),
      });
      if (res.ok) {
        const updatedRecord = await res.json();
        setRecords((prev) =>
          prev.map((r) => (r.id === recordId ? updatedRecord : r))
        );
      }
    } catch (error) {
      console.error('Failed to update progress:', error);
    }
  };

  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const readingCount = records.filter((r) => r.status === 'reading').length;
  const completedCount = records.filter((r) => r.status === 'completed').length;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">我的阅读</h1>
        <p className="page-subtitle">
          正在阅读 {readingCount} 本 · 已完成 {completedCount} 本
        </p>
      </div>

      {isLoading ? (
        <div className="empty-state">
          <div className="empty-state-icon">📖</div>
          <div className="empty-state-text">加载中...</div>
        </div>
      ) : records.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📚</div>
          <div className="empty-state-text">暂无阅读记录，去图书大厅借一本吧</div>
        </div>
      ) : (
        <div className="reading-records">
          {records.map((record) => (
            <div key={record.id} className="record-card">
              <img
                src={record.bookCover}
                alt={record.bookTitle}
                className="record-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'https://picsum.photos/seed/placeholder/200/280';
                }}
              />
              <div className="record-info">
                <div className="record-title">{record.bookTitle}</div>
                <div className="record-dates">
                  借阅：{formatDate(record.borrowDate)}
                  {record.returnDate && ` · 归还：${formatDate(record.returnDate)}`}
                </div>
                <span
                  className={`record-status status-${record.status}`}
                >
                  {record.status === 'reading' ? '📖 阅读中' : '✓ 已完成'}
                </span>
              </div>
              <div className="progress-wrapper">
                <div className="progress-label">
                  <span>阅读进度</span>
                  <span>{record.progress}%</span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${record.progress}%` }}
                  />
                </div>
                {record.status === 'reading' && (
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={record.progress}
                    onChange={(e) =>
                      handleProgressChange(record.id, Number(e.target.value))
                    }
                    className="progress-slider"
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ReadingRecords;
