import { useState, useEffect, useCallback, useRef, FormEvent } from 'react';
import ChartPanel from '../components/ChartPanel';
import { Feedback, Status, FeedbackType, FeedbackListResponse } from '../types';

function AdminPage() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [listKey, setListKey] = useState(0);
  const [noteContent, setNoteContent] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [addingNote, setAddingNote] = useState(false);
  const notesListRef = useRef<HTMLDivElement>(null);

  const fetchFeedbacks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: '10',
        type: typeFilter,
        status: statusFilter,
      });
      const response = await fetch(`/api/feedback?${params}`);
      const data: FeedbackListResponse = await response.json();
      setFeedbacks(data.data);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (error) {
      console.error('Failed to fetch feedbacks:', error);
    } finally {
      setLoading(false);
    }
  }, [page, typeFilter, statusFilter]);

  useEffect(() => {
    fetchFeedbacks();
  }, [fetchFeedbacks]);

  useEffect(() => {
    setPage(1);
    setListKey((prev) => prev + 1);
  }, [typeFilter, statusFilter]);

  useEffect(() => {
    if (notesListRef.current && isDetailOpen) {
      notesListRef.current.scrollTop = 0;
    }
  }, [selectedFeedback?.notes.length, isDetailOpen]);

  const handleCardClick = (feedback: Feedback) => {
    setSelectedFeedback(feedback);
    setIsDetailOpen(true);
    setNoteContent('');
  };

  const handleCloseDetail = () => {
    setIsDetailOpen(false);
    setTimeout(() => {
      setSelectedFeedback(null);
    }, 300);
  };

  const handleStatusChange = async (newStatus: Status) => {
    if (!selectedFeedback || updatingStatus) return;
    setUpdatingStatus(true);
    try {
      const response = await fetch(`/api/feedback/${selectedFeedback.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (response.ok) {
        const updatedFeedback: Feedback = await response.json();
        setSelectedFeedback(updatedFeedback);
        setFeedbacks((prev) =>
          prev.map((f) => (f.id === updatedFeedback.id ? updatedFeedback : f))
        );
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleAddNote = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedFeedback || !noteContent.trim() || addingNote) return;

    setAddingNote(true);
    try {
      const response = await fetch(`/api/feedback/${selectedFeedback.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: noteContent.trim() }),
      });
      if (response.ok) {
        const updatedFeedback: Feedback = await response.json();
        setSelectedFeedback(updatedFeedback);
        setFeedbacks((prev) =>
          prev.map((f) => (f.id === updatedFeedback.id ? updatedFeedback : f))
        );
        setNoteContent('');
      }
    } catch (error) {
      console.error('Failed to add note:', error);
    } finally {
      setAddingNote(false);
    }
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusLabel = (status: Status): string => {
    const labels: Record<Status, string> = {
      [Status.PENDING]: '待审',
      [Status.IN_PROGRESS]: '进行中',
      [Status.COMPLETED]: '已完成',
      [Status.CLOSED]: '关闭',
    };
    return labels[status];
  };

  const getStatusClass = (status: Status): string => {
    const classes: Record<Status, string> = {
      [Status.PENDING]: 'status-pending',
      [Status.IN_PROGRESS]: 'status-progress',
      [Status.COMPLETED]: 'status-completed',
      [Status.CLOSED]: 'status-closed',
    };
    return classes[status];
  };

  const getTypeLabel = (type: FeedbackType): string => {
    const labels: Record<FeedbackType, string> = {
      [FeedbackType.FEATURE]: '功能建议',
      [FeedbackType.BUG]: 'Bug报告',
      [FeedbackType.OTHER]: '其他',
    };
    return labels[type];
  };

  const getTypeClass = (type: FeedbackType): string => {
    const classes: Record<FeedbackType, string> = {
      [FeedbackType.FEATURE]: 'type-feature',
      [FeedbackType.BUG]: 'type-bug',
      [FeedbackType.OTHER]: 'type-other',
    };
    return classes[type];
  };

  const renderPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, page - Math.floor(maxVisible / 2));
    const end = Math.min(totalPages, start + maxVisible - 1);
    start = Math.max(1, end - maxVisible + 1);

    for (let i = start; i <= end; i++) {
      pages.push(
        <button
          key={i}
          className={`page-btn ${i === page ? 'active' : ''}`}
          onClick={() => setPage(i)}
        >
          {i}
        </button>
      );
    }
    return pages;
  };

  return (
    <div className="admin-page fade-in">
      <ChartPanel />

      <div className="filter-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label className="label" style={{ margin: 0, whiteSpace: 'nowrap' }}>
            类型:
          </label>
          <select
            className="select"
            style={{ width: 'auto', minWidth: '120px' }}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="all">全部</option>
            {Object.values(FeedbackType).map((t) => (
              <option key={t} value={t}>
                {getTypeLabel(t)}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label className="label" style={{ margin: 0, whiteSpace: 'nowrap' }}>
            状态:
          </label>
          <select
            className="select"
            style={{ width: 'auto', minWidth: '120px' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">全部</option>
            {Object.values(Status).map((s) => (
              <option key={s} value={s}>
                {getStatusLabel(s)}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginLeft: 'auto', color: '#718096', fontSize: '14px' }}>
          共 {total} 条反馈
        </div>
      </div>

      {loading ? (
        <div className="empty-state">
          <div className="empty-icon">⏳</div>
          <p>加载中...</p>
        </div>
      ) : feedbacks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <p>暂无反馈数据</p>
        </div>
      ) : (
        <>
          <div className="feedback-list" key={listKey}>
            {feedbacks.map((feedback) => (
              <div
                key={feedback.id}
                className="card fade-in"
                onClick={() => handleCardClick(feedback)}
              >
                <div className="feedback-header">
                  <h3 className="feedback-title">{feedback.title}</h3>
                  <span className={`status-tag ${getStatusClass(feedback.status)}`}>
                    {getStatusLabel(feedback.status)}
                  </span>
                </div>
                <div className="feedback-meta">
                  <span className={`type-badge ${getTypeClass(feedback.type)}`}>
                    {getTypeLabel(feedback.type)}
                  </span>
                  <span>{formatDate(feedback.createdAt)}</span>
                  {feedback.notes.length > 0 && (
                    <span>💬 {feedback.notes.length} 条备注</span>
                  )}
                </div>
                <p className="feedback-desc">
                  {feedback.description.length > 100
                    ? feedback.description.slice(0, 100) + '...'
                    : feedback.description}
                </p>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="page-btn"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                上一页
              </button>
              {renderPageNumbers()}
              <button
                className="page-btn"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                下一页
              </button>
            </div>
          )}
        </>
      )}

      <div
        className={`detail-overlay ${isDetailOpen ? 'show' : ''}`}
        onClick={handleCloseDetail}
      />
      <div className={`detail-panel ${isDetailOpen ? 'open' : ''}`}>
        {selectedFeedback && (
          <>
            <div className="detail-header">
              <h3 style={{ fontSize: '18px', fontWeight: 600 }}>反馈详情</h3>
              <button className="close-btn" onClick={handleCloseDetail}>
                ×
              </button>
            </div>
            <div className="detail-body">
              <div className="detail-section">
                <h4>标题</h4>
                <p>{selectedFeedback.title}</p>
              </div>
              <div className="detail-section">
                <h4>类型</h4>
                <span className={`type-badge ${getTypeClass(selectedFeedback.type)}`}>
                  {getTypeLabel(selectedFeedback.type)}
                </span>
              </div>
              <div className="detail-section">
                <h4>提交时间</h4>
                <p>{formatDate(selectedFeedback.createdAt)}</p>
              </div>
              <div className="detail-section">
                <h4>当前状态</h4>
                <select
                  className="select"
                  value={selectedFeedback.status}
                  onChange={(e) => handleStatusChange(e.target.value as Status)}
                  disabled={updatingStatus}
                >
                  {Object.values(Status).map((s) => (
                    <option key={s} value={s}>
                      {getStatusLabel(s)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="detail-section">
                <h4>描述</h4>
                <p style={{ whiteSpace: 'pre-wrap' }}>{selectedFeedback.description}</p>
              </div>
            </div>

            <div className="notes-section">
              <h4 style={{ marginBottom: '12px', color: '#1a2332' }}>
                内部备注 ({selectedFeedback.notes.length})
              </h4>
              <div className="notes-list" ref={notesListRef}>
                {selectedFeedback.notes.length === 0 ? (
                  <p style={{ color: '#a0aec0', textAlign: 'center', padding: '20px' }}>
                    暂无备注
                  </p>
                ) : (
                  [...selectedFeedback.notes]
                    .sort(
                      (a, b) =>
                        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                    )
                    .map((note) => (
                      <div key={note.id} className="note-item">
                        <div className="note-header">
                          <span className="note-author">{note.author}</span>
                          <span className="note-time">{formatDate(note.createdAt)}</span>
                        </div>
                        <p className="note-content">{note.content}</p>
                      </div>
                    ))
                )}
              </div>
              <form onSubmit={handleAddNote}>
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <textarea
                    className="textarea"
                    placeholder="添加备注（最多500字）"
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    maxLength={500}
                    style={{ minHeight: '80px' }}
                  />
                  <div
                    style={{
                      textAlign: 'right',
                      fontSize: '12px',
                      color: '#a0aec0',
                      marginTop: '4px',
                    }}
                  >
                    {noteContent.length}/500
                  </div>
                </div>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: '100%' }}
                  disabled={!noteContent.trim() || addingNote}
                >
                  {addingNote ? '添加中...' : '添加备注'}
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default AdminPage;
