import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import type { Performance } from '../types';
import '../styles/performance-modal.css';

interface PerformanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  performance: Performance | null;
  defaultDate?: string;
}

const PerformanceModal: React.FC<PerformanceModalProps> = ({
  isOpen,
  onClose,
  performance,
  defaultDate,
}) => {
  const { state, addPerformance, updatePerformance, deletePerformance } = useApp();
  const [artistId, setArtistId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [venue, setVenue] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (performance) {
        setArtistId(performance.artistId);
        setDate(performance.date);
        setTime(performance.time);
        setVenue(performance.venue);
        setNotes(performance.notes);
      } else {
        setArtistId(state.artists[0]?.id || '');
        setDate(defaultDate || '');
        setTime('20:00');
        setVenue('');
        setNotes('');
      }
    }
  }, [isOpen, performance, defaultDate, state.artists]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!artistId || !date || !time || !venue) return;

    setSubmitting(true);
    try {
      if (performance) {
        await updatePerformance(performance.id, { date, time, venue, notes });
      } else {
        await addPerformance({ artistId, date, time, venue, notes });
      }
      onClose();
    } catch (err) {
      console.error('Failed to save performance:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!performance || !confirm('确定要删除这个演出吗？')) return;
    try {
      await deletePerformance(performance.id);
      onClose();
    } catch (err) {
      console.error('Failed to delete performance:', err);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h2 className="modal-title">
          {performance ? '编辑演出' : '添加演出'}
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">艺术家 *</label>
            <select
              className="form-input"
              value={artistId}
              onChange={e => setArtistId(e.target.value)}
            >
              <option value="">选择艺术家</option>
              {state.artists.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">日期 *</label>
              <input
                type="date"
                className="form-input"
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">时间 *</label>
              <input
                type="time"
                className="form-input"
                value={time}
                onChange={e => setTime(e.target.value)}
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">场馆 *</label>
            <input
              type="text"
              className="form-input"
              value={venue}
              onChange={e => setVenue(e.target.value)}
              placeholder="演出场馆名称"
            />
          </div>
          <div className="form-group">
            <label className="form-label">备注</label>
            <textarea
              className="form-textarea"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="演出备注信息..."
            />
          </div>
          <div className="form-actions">
            {performance && (
              <button
                type="button"
                className="btn-danger"
                onClick={handleDelete}
              >
                删除
              </button>
            )}
            <div style={{ flex: 1 }} />
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
              disabled={submitting || !artistId || !date || !time || !venue}
            >
              {submitting ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PerformanceModal;
