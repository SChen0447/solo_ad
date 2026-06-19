import { useState, useEffect, useCallback } from 'react';
import type { BorrowRecord } from '../types';

interface ReadingRecordsProps {
  apiBase: string;
  onUpdateProgress: (recordId: string, progress: number) => Promise<void>;
}

function formatDate(ts?: number): string {
  if (!ts) return '—';
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function ReadingRecords({ apiBase, onUpdateProgress }: ReadingRecordsProps) {
  const [records, setRecords] = useState<BorrowRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [_draggingId, setDraggingId] = useState<string | null>(null);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/records`);
      const data: BorrowRecord[] = await res.json();
      setRecords(data.sort((a, b) => b.borrowedAt - a.borrowedAt));
    } catch (err) {
      console.error('获取借阅记录失败:', err);
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const handleProgressChange = useCallback(
    async (recordId: string, newProgress: number) => {
      const clamped = Math.max(0, Math.min(100, Math.round(newProgress)));
      setRecords((prev) =>
        prev.map((r) =>
          r.id === recordId
            ? {
                ...r,
                readingProgress: clamped,
                status: clamped === 100 && r.returnedAt ? 'completed' : r.status,
              }
            : r
        )
      );
      try {
        await onUpdateProgress(recordId, clamped);
      } catch (err) {
        console.error('更新进度失败:', err);
        fetchRecords();
      }
    },
    [onUpdateProgress, fetchRecords]
  );

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">📝 我的阅读记录</h1>
        <div style={{ color: 'var(--color-text-light)', fontSize: '14px' }}>
          共 {records.length} 本图书
        </div>
      </div>

      {loading ? (
        <div className="empty-state">
          <div className="empty-state-icon">⏳</div>
          <div className="empty-state-text">加载中...</div>
        </div>
      ) : records.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📚</div>
          <div className="empty-state-text">
            还没有借阅记录，去图书借阅大厅挑一本喜欢的书吧！
          </div>
        </div>
      ) : (
        <div className="records-list">
          {records.map((record) => {
            const isReading = record.status === 'reading';
            return (
              <div key={record.id} className="record-card">
                <div className="record-book-info">
                  <div className="record-book-title">
                    《{record.bookTitle}》
                    <span className={`record-status-tag ${record.status}`}>
                      {isReading ? '📖 阅读中' : '✅ 已完成'}
                    </span>
                  </div>
                  <div className="record-dates">
                    <span>
                      <strong>借阅：</strong>
                      {formatDate(record.borrowedAt)}
                    </span>
                    <span>
                      <strong>归还：</strong>
                      {formatDate(record.returnedAt)}
                    </span>
                  </div>
                </div>

                <div className="record-progress-wrapper">
                  <div className="progress-header">
                    <span>阅读进度</span>
                    <span
                      style={{
                        fontWeight: 700,
                        color:
                          record.readingProgress === 100
                            ? 'var(--color-primary)'
                            : 'var(--color-accent)',
                      }}
                    >
                      {record.readingProgress}%
                    </span>
                  </div>
                  <div
                    className="progress-bar"
                    style={{ display: isReading ? 'none' : undefined }}
                  >
                    <div
                      className="progress-fill"
                      style={{ width: `${record.readingProgress}%` }}
                    />
                  </div>
                  {isReading && (
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={record.readingProgress}
                      onChange={(e) =>
                        handleProgressChange(record.id, Number(e.target.value))
                      }
                      onMouseDown={() => setDraggingId(record.id)}
                      onMouseUp={() => setDraggingId(null)}
                      onTouchStart={() => setDraggingId(record.id)}
                      onTouchEnd={() => setDraggingId(null)}
                      className="progress-input"
                      style={
                        {
                          '--progress': `${record.readingProgress}%`,
                        } as React.CSSProperties
                      }
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
