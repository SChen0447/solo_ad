import React, { useState, useEffect } from 'react';
import { api } from './api';
import { TrainingRecord as TrainingRecordType, User, courseTypeLabels } from './types';
import StarRating from './StarRating';

interface TrainingRecordProps {
  currentUser: User;
}

const TrainingRecord: React.FC<TrainingRecordProps> = ({ currentUser }) => {
  const [records, setRecords] = useState<TrainingRecordType[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending_review' | 'completed'>('all');
  const [ratingRecord, setRatingRecord] = useState<TrainingRecordType | null>(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadRecords();
  }, [currentUser.id, filterStatus]);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const data = await api.getTrainingRecords(
        currentUser.role === 'member' ? currentUser.id : undefined,
        filterStatus === 'all' ? undefined : filterStatus
      );
      setRecords(data);
    } catch (error) {
      console.error('加载训练记录失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = records
    .filter(record => {
      if (filterDate) {
        return record.date === filterDate;
      }
      return true;
    })
    .sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.startTime}`).getTime();
      const dateB = new Date(`${b.date}T${b.startTime}`).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

  const handleRateClick = (record: TrainingRecordType) => {
    const recordDate = new Date(`${record.date}T${record.endTime}`);
    const now = new Date();
    const hoursDiff = (now.getTime() - recordDate.getTime()) / (1000 * 60 * 60);

    if (hoursDiff > 24) {
      setSuccessMessage('已超过24小时评价期限');
      setTimeout(() => setSuccessMessage(null), 3000);
      return;
    }

    setRatingRecord(record);
    setRating(0);
    setFeedback('');
    setShowRatingModal(true);
  };

  const handleSubmitRating = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ratingRecord || rating === 0) return;

    setSubmitting(true);
    try {
      await api.rateTraining(ratingRecord.id, rating, feedback || undefined);
      setShowRatingModal(false);
      setSuccessMessage('评价成功！');
      setTimeout(() => setSuccessMessage(null), 3000);
      loadRecords();
    } catch (error) {
      console.error('评价失败:', error);
      setSuccessMessage(error instanceof Error ? error.message : '评价失败');
      setTimeout(() => setSuccessMessage(null), 3000);
    } finally {
      setSubmitting(false);
    }
  };

  const getCourseTypeLabel = (type: string) => {
    return courseTypeLabels[type as keyof typeof courseTypeLabels] || type;
  };

  const canRate = (record: TrainingRecordType) => {
    if (record.status === 'completed') return false;
    const recordDate = new Date(`${record.date}T${record.endTime}`);
    const now = new Date();
    const hoursDiff = (now.getTime() - recordDate.getTime()) / (1000 * 60 * 60);
    return hoursDiff <= 24;
  };

  return (
    <div className="training-records">
      <div className="page-header">
        <h2>📊 训练记录</h2>
        <p className="page-subtitle">查看历史训练记录并为课程打分</p>
      </div>

      {successMessage && (
        <div className="success-alert">
          <span>✓</span> {successMessage}
        </div>
      )}

      <div className="filter-bar">
        <div className="filter-item">
          <label htmlFor="date-filter">日期过滤：</label>
          <input
            type="date"
            id="date-filter"
            value={filterDate}
            onChange={e => setFilterDate(e.target.value)}
          />
        </div>

        <div className="filter-item">
          <label htmlFor="status-filter">状态：</label>
          <select
            id="status-filter"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as typeof filterStatus)}
          >
            <option value="all">全部</option>
            <option value="pending_review">待评价</option>
            <option value="completed">已完成</option>
          </select>
        </div>

        <div className="filter-item">
          <label htmlFor="sort-order">排序：</label>
          <select
            id="sort-order"
            value={sortOrder}
            onChange={e => setSortOrder(e.target.value as 'desc' | 'asc')}
          >
            <option value="desc">最新优先</option>
            <option value="asc">最早优先</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="records-loading">
          <div className="loading-spinner small"></div>
          <p>加载训练记录...</p>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">📭</span>
          <p>暂无训练记录</p>
        </div>
      ) : (
        <div className="records-list">
          {filteredRecords.map((record, index) => (
            <div
              key={record.id}
              className={`record-item ${index % 2 === 0 ? 'even' : 'odd'}`}
            >
              <div className="record-status-icon">
                {record.status === 'completed' ? (
                  <span className="status-completed" title="已完成">✓</span>
                ) : (
                  <span className="status-pending" title="待评价">?</span>
                )}
              </div>

              <div className="record-content">
                <div className="record-header">
                  <h4 className="record-course">
                    {getCourseTypeLabel(record.courseType)}
                  </h4>
                  <span className={`record-badge ${record.status}`}>
                    {record.status === 'completed' ? '已完成' : '待评价'}
                  </span>
                </div>

                <div className="record-details">
                  <div className="detail-item">
                    <span className="detail-icon">👨‍🏫</span>
                    <span>{record.trainerName}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-icon">📅</span>
                    <span>{record.date}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-icon">⏰</span>
                    <span>{record.startTime} - {record.endTime}</span>
                  </div>
                </div>

                {record.rating !== undefined && (
                  <div className="record-rating">
                    <StarRating value={record.rating} readonly size={18} />
                    {record.feedback && (
                      <p className="record-feedback">"{record.feedback}"</p>
                    )}
                  </div>
                )}

                {record.status === 'pending_review' && (
                  <div className="record-actions">
                    <button
                      className={`btn-rate ${canRate(record) ? '' : 'disabled'}`}
                      onClick={() => handleRateClick(record)}
                      disabled={!canRate(record)}
                    >
                      {canRate(record) ? '⭐ 评价课程' : '已过期'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showRatingModal && ratingRecord && (
        <div className="modal-overlay" onClick={() => setShowRatingModal(false)}>
          <div className="modal-content rating-modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowRatingModal(false)}>
              ×
            </button>

            <div className="modal-header">
              <h3>评价课程</h3>
            </div>

            <div className="rating-info">
              <p>
                <strong>{getCourseTypeLabel(ratingRecord.courseType)}</strong>
              </p>
              <p className="text-muted">
                教练：{ratingRecord.trainerName} | {ratingRecord.date} {ratingRecord.startTime}
              </p>
            </div>

            <form onSubmit={handleSubmitRating} className="rating-form">
              <div className="form-group">
                <label>课程评分 *</label>
                <StarRating
                  value={rating}
                  onChange={setRating}
                  size={32}
                />
                {rating === 0 && (
                  <span className="hint-text">请选择评分</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="feedback">训练反馈</label>
                <textarea
                  id="feedback"
                  value={feedback}
                  onChange={e => setFeedback(e.target.value)}
                  placeholder="分享您的训练感受（选填）"
                  rows={4}
                />
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowRatingModal(false)}
                  disabled={submitting}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={submitting || rating === 0}
                >
                  {submitting ? '提交中...' : '提交评价'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrainingRecord;
