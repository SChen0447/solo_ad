import React from 'react';
import type { Note } from '@/types';

interface NoteTimelineProps {
  notes: Note[];
  onEdit: (note: Note) => void;
  onDelete: (id: string) => void;
}

const formatDate = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
};

const formatTime = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
};

const NoteTimeline: React.FC<NoteTimelineProps> = ({ notes, onEdit, onDelete }) => {
  if (notes.length === 0) {
    return (
      <div className="timeline-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
        </svg>
        <p>还没有笔记，在左侧开始记录吧～</p>
      </div>
    );
  }

  const grouped = notes.reduce<Record<string, Note[]>>((acc, note) => {
    const key = formatDate(note.createdAt);
    if (!acc[key]) acc[key] = [];
    acc[key].push(note);
    return acc;
  }, {});

  return (
    <div className="note-timeline">
      <h3 className="timeline-title">笔记时间线</h3>
      <div className="timeline-scroll">
        {Object.entries(grouped).map(([date, dayNotes], groupIdx) => (
          <div key={date} className="timeline-group">
            <div className="timeline-date">
              <span className="date-dot" />
              <span className="date-text">{date}</span>
            </div>
            <div className="timeline-cards">
              {dayNotes.map((note, idx) => (
                <div
                  key={note.id}
                  className={`timeline-card ${note.isQuote ? 'is-quote' : ''}`}
                  style={{ animationDelay: `${groupIdx * 80 + idx * 50}ms` }}
                >
                  <div className="card-top">
                    <div className="card-head">
                      {note.isQuote && <span className="quote-badge">摘抄</span>}
                      <span className="note-page">第 {note.pageNumber} 页</span>
                      <span className="note-time">{formatTime(note.createdAt)}</span>
                    </div>
                    <div className="card-actions">
                      <button
                        className="icon-btn"
                        onClick={() => onEdit(note)}
                        title="编辑"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                        </svg>
                      </button>
                      <button
                        className="icon-btn delete"
                        onClick={() => {
                          if (confirm('确定删除这条笔记吗？')) onDelete(note.id);
                        }}
                        title="删除"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  {note.title && <h4 className="note-title">{note.title}</h4>}
                  <p className="note-content">{note.content}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NoteTimeline;
