import React, { useState } from 'react';
import type { Emotion, Record } from '../api';
import EmotionPicker from './EmotionPicker';

const EMOTION_LABELS: Record<string, string> = {
  happy: '快乐',
  sad: '悲伤',
  anxious: '焦虑',
  calm: '平静',
  excited: '兴奋',
};

interface RecordCardProps {
  id: string;
  text: string;
  timestamp: string;
  emotion: Emotion;
  isStarred: boolean;
  onEdit: (id: string, text: string, emotion: Emotion) => void;
  onDelete: (id: string) => void;
  onStar: (id: string) => void;
  onEmotionChange: (id: string, emotion: Emotion) => void;
  width?: number;
  index?: number;
}

export default function RecordCard({
  id,
  text,
  timestamp,
  emotion,
  isStarred,
  onEdit,
  onDelete,
  onStar,
  onEmotionChange,
  width = 320,
  index = 0,
}: RecordCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(text);

  const formattedTime = new Date(timestamp).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  const handleSaveEdit = () => {
    if (editText.trim()) {
      onEdit(id, editText.trim(), emotion);
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setEditText(text);
    setIsEditing(false);
  };

  return (
    <div
      className="record-card card-enter"
      style={{
        width: `${width}px`,
        animationDelay: `${index * 0.05}s`,
        animationFillMode: 'both',
      }}
      onClick={() => {
        if (!isEditing) setIsExpanded(!isExpanded);
      }}
    >
      <div className="card-top">
        <EmotionPicker
          current={emotion}
          onChange={(em) => onEmotionChange(id, em)}
        />
        <span className="card-emotion-label">{EMOTION_LABELS[emotion]}</span>
        <span className="card-time">{formattedTime}</span>
      </div>

      {isEditing ? (
        <div className="card-edit-area">
          <textarea
            className="card-edit-textarea"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            maxLength={500}
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
          <div className="card-edit-actions">
            <button className="card-btn save-btn" onClick={(e) => { e.stopPropagation(); handleSaveEdit(); }}>
              保存
            </button>
            <button className="card-btn cancel-btn" onClick={(e) => { e.stopPropagation(); handleCancelEdit(); }}>
              取消
            </button>
          </div>
        </div>
      ) : (
        <div className={`card-text-wrapper ${isExpanded ? 'expanded' : 'collapsed'}`}>
          <p className="card-text">{text}</p>
          {!isExpanded && <div className="card-text-fade" />}
        </div>
      )}

      {isExpanded && !isEditing && (
        <div className="card-actions">
          <button
            className="card-icon-btn"
            onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
            title="编辑"
          >
            <i className="fas fa-pen"></i>
          </button>
          <button
            className="card-icon-btn"
            onClick={(e) => { e.stopPropagation(); onDelete(id); }}
            title="删除"
          >
            <i className="fas fa-trash"></i>
          </button>
        </div>
      )}

      <button
        className={`card-star-btn ${isStarred ? 'starred' : ''}`}
        onClick={(e) => { e.stopPropagation(); onStar(id); }}
        title={isStarred ? '取消星标' : '添加星标'}
      >
        <i className={isStarred ? 'fas fa-star' : 'far fa-star'}></i>
      </button>

      <style>{`
        .record-card {
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 12px;
          padding: 16px;
          position: relative;
          cursor: pointer;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .record-card:hover {
          border-color: #475569;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
        }
        .card-top {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
        }
        .card-emotion-label {
          font-size: 12px;
          color: #94a3b8;
        }
        .card-time {
          font-size: 12px;
          color: #64748b;
          margin-left: auto;
        }
        .card-text-wrapper {
          position: relative;
        }
        .card-text-wrapper.collapsed {
          max-height: 60px;
          overflow: hidden;
        }
        .card-text-wrapper.expanded .card-text {
          white-space: pre-wrap;
        }
        .card-text {
          font-size: 14px;
          line-height: 1.6;
          color: #e2e8f0;
          word-break: break-word;
        }
        .card-text-fade {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 30px;
          background: linear-gradient(transparent, #1e293b);
          pointer-events: none;
        }
        .card-actions {
          display: flex;
          gap: 8px;
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid #334155;
        }
        .card-icon-btn {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          border: none;
          background: #334155;
          color: #94a3b8;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          transition: color 0.2s, transform 0.2s;
        }
        .card-icon-btn:hover {
          color: #38bdf8;
          transform: rotate(5deg);
        }
        .card-star-btn {
          position: absolute;
          bottom: 12px;
          right: 12px;
          width: 28px;
          height: 28px;
          border: none;
          background: none;
          color: #64748b;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          transition: color 0.2s, transform 0.2s;
        }
        .card-star-btn:hover {
          transform: scale(1.2);
        }
        .card-star-btn.starred {
          color: #fbbf24;
        }
        .card-edit-area {
          margin-top: 4px;
        }
        .card-edit-textarea {
          width: 100%;
          min-height: 80px;
          padding: 8px;
          background: #0f172a;
          border: 1px solid #475569;
          border-radius: 8px;
          color: #e2e8f0;
          font-size: 14px;
          line-height: 1.6;
          resize: vertical;
          outline: none;
          font-family: inherit;
        }
        .card-edit-textarea:focus {
          border-color: #a78bfa;
        }
        .card-edit-actions {
          display: flex;
          gap: 8px;
          margin-top: 8px;
        }
        .card-btn {
          padding: 6px 16px;
          border-radius: 6px;
          border: none;
          font-size: 13px;
          cursor: pointer;
          font-family: inherit;
          transition: background 0.2s;
        }
        .save-btn {
          background: #a78bfa;
          color: #0f172a;
        }
        .save-btn:hover {
          background: #8b5cf6;
        }
        .cancel-btn {
          background: #334155;
          color: #e2e8f0;
        }
        .cancel-btn:hover {
          background: #475569;
        }
      `}</style>
    </div>
  );
}
