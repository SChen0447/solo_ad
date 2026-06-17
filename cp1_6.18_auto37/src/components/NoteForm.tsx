import React, { useState, useEffect, useRef } from 'react';
import { MOOD_ORDER, MOOD_COLORS } from '../types';

interface NoteFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (note: { content: string; mood: string; createdAt: string }) => void;
  defaultDate?: string;
}

function formatDateTimeForInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

const NoteForm: React.FC<NoteFormProps> = function NoteForm({ isOpen, onClose, onSubmit, defaultDate }) {
  const [content, setContent] = useState('');
  const [mood, setMood] = useState('sunny-yellow');
  const [dateTime, setDateTime] = useState(formatDateTimeForInput(new Date()));
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setContent('');
      setMood('sunny-yellow');
      setDateTime(defaultDate ? formatDateTimeForInput(new Date(defaultDate)) : formatDateTimeForInput(new Date()));
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 300);
    }
  }, [isOpen, defaultDate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !mood) return;

    const createdAt = new Date(dateTime).toISOString();
    onSubmit({
      content: content.trim(),
      mood,
      createdAt
    });
    onClose();
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const charCount = content.length;
  const isOverLimit = charCount > 140;

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">日期时间</label>
            <input
              type="datetime-local"
              className="datetime-input"
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">选择心情</label>
            <div className="mood-picker">
              {MOOD_ORDER.map((moodKey) => {
                const moodData = MOOD_COLORS[moodKey];
                return (
                  <button
                    key={moodKey}
                    type="button"
                    className={`mood-option ${mood === moodKey ? 'selected' : ''}`}
                    style={{ backgroundColor: moodData.hex }}
                    onClick={() => setMood(moodKey)}
                    data-icon={moodData.icon}
                    title={moodData.name}
                  />
                );
              })}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">记录心情</label>
            <textarea
              ref={textareaRef}
              className="textarea-input"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="写下此刻的想法..."
              maxLength={150}
            />
            <div className={`char-count ${isOverLimit ? 'limit' : ''}`}>
              {charCount}/140
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              取消
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!content.trim() || isOverLimit}
            >
              记录
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NoteForm;
