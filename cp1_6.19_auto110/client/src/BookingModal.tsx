import React, { useState } from 'react';
import { api } from './api';
import { TimeSlot, User, CourseType } from './types';

interface BookingModalProps {
  slot: TimeSlot;
  currentUser: User;
  courseTypes: [CourseType, string][];
  onClose: () => void;
  onSuccess: () => void;
}

const BookingModal: React.FC<BookingModalProps> = ({
  slot,
  currentUser,
  courseTypes,
  onClose,
  onSuccess,
}) => {
  const [courseType, setCourseType] = useState<CourseType>('strength');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await api.createBooking({
        timeSlotId: slot.id,
        memberId: currentUser.id,
        memberName: currentUser.name,
        courseType,
        notes: notes || undefined,
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : '预约失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content booking-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          ×
        </button>

        <div className="modal-header">
          <h3>预约课程</h3>
        </div>

        <div className="booking-info">
          <div className="info-row">
            <span className="info-label">教练：</span>
            <span className="info-value">{slot.trainerName}</span>
          </div>
          <div className="info-row">
            <span className="info-label">专长：</span>
            <span className="info-value">{slot.specialty}</span>
          </div>
          <div className="info-row">
            <span className="info-label">日期：</span>
            <span className="info-value">{slot.date}</span>
          </div>
          <div className="info-row">
            <span className="info-label">时间：</span>
            <span className="info-value highlight">
              {slot.startTime} - {slot.endTime}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="booking-form">
          <div className="form-group">
            <label htmlFor="courseType">课程类型 *</label>
            <select
              id="courseType"
              value={courseType}
              onChange={e => setCourseType(e.target.value as CourseType)}
              required
            >
              {courseTypes.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="notes">备注</label>
            <textarea
              id="notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="请输入训练目标或特殊需求（选填）"
              rows={3}
            />
          </div>

          {error && (
            <div className="error-alert">
              <span>⚠</span> {error}
            </div>
          )}

          <div className="form-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={submitting}
            >
              取消
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={submitting}
            >
              {submitting ? '提交中...' : '确认预约'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BookingModal;
