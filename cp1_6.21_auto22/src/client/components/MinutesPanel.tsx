import React, { useState, useRef, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Agenda, Topic, Note } from '../../shared/types';

interface Props {
  agenda: Agenda | null;
  notes: Note[];
  nickname: string;
  onAddNote: (topicId: string, content: string) => void;
  onRetractNote: (noteId: string) => void;
  onUpdateTopics: (agendaId: string, topics: Topic[]) => void;
  onConvertToAction: (topic: Topic, agendaId: string) => void;
  onBack: () => void;
}

const MinutesPanel: React.FC<Props> = ({
  agenda,
  notes,
  nickname,
  onAddNote,
  onRetractNote,
  onUpdateTopics,
  onConvertToAction,
  onBack,
}) => {
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [noteInput, setNoteInput] = useState('');
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [summaryMode, setSummaryMode] = useState(false);
  const notesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (notesEndRef.current) {
      notesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [notes]);

  useEffect(() => {
    if (agenda && agenda.topics.length > 0 && !selectedTopicId) {
      setSelectedTopicId(agenda.topics[0].id);
    }
  }, [agenda, selectedTopicId]);

  if (!agenda) {
    return (
      <div>
        <div className="page-header">
          <h1>📝 议题详情</h1>
        </div>
        <div className="empty-state">
          <div className="empty-icon">📝</div>
          <h3>请先选择一个会议</h3>
          <p>从会议议程列表中选择一个会议查看详情</p>
        </div>
      </div>
    );
  }

  const sortedTopics = [...agenda.topics].sort((a, b) => a.order - b.order);
  const selectedTopic = sortedTopics.find((t) => t.id === selectedTopicId);
  const topicNotes = notes.filter((n) => n.topicId === selectedTopicId);

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragEnd = () => {
    if (dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex) {
      const newTopics = [...sortedTopics];
      const [removed] = newTopics.splice(dragIndex, 1);
      newTopics.splice(dragOverIndex, 0, removed);
      const reordered = newTopics.map((t, i) => ({ ...t, order: i }));
      onUpdateTopics(agenda._id, reordered);
    }
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const toggleComplete = (topic: Topic) => {
    const newTopics = agenda.topics.map((t) =>
      t.id === topic.id ? { ...t, completed: !t.completed } : t
    );
    onUpdateTopics(agenda._id, newTopics);
  };

  const sendNote = () => {
    if (!noteInput.trim() || !selectedTopicId) return;
    onAddNote(selectedTopicId, noteInput.trim());
    setNoteInput('');
  };

  const retractLastNote = () => {
    const myNotes = topicNotes.filter((n) => n.nickname === nickname);
    if (myNotes.length === 0) return;
    const last = myNotes[myNotes.length - 1];
    onRetractNote(last.id);
  };

  const completedCount = agenda.topics.filter((t) => t.completed).length;
  const totalCount = agenda.topics.length;

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-ghost" onClick={onBack}>← 返回</button>
          <h1>{agenda.title}</h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className={`btn ${summaryMode ? 'btn-success' : 'btn-ghost'}`}
            onClick={() => setSummaryMode(!summaryMode)}
          >
            {summaryMode ? '📋 议题列表' : '📊 会议总结'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 16, fontSize: 13, color: 'var(--slate-500)' }}>
        <span>🕐 {new Date(agenda.time).toLocaleString('zh-CN')}</span>
        <span>👥 {agenda.participants.join(', ')}</span>
        <span>
          进度 {completedCount}/{totalCount}
        </span>
      </div>

      {agenda.description && (
        <div className="card" style={{ marginBottom: 16, borderLeft: '4px solid var(--green-400)' }}>
          <p style={{ fontSize: 13, color: 'var(--slate-600)' }}>{agenda.description}</p>
        </div>
      )}

      {summaryMode ? (
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: 'var(--green-800)' }}>
            📊 议题总结
          </h3>
          <div style={{ display: 'grid', gap: 8 }}>
            {sortedTopics.map((topic) => (
              <div
                key={topic.id}
                className="card"
                style={{
                  borderLeft: `4px solid ${topic.completed ? 'var(--green-400)' : 'var(--amber-400)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      background: topic.completed ? 'var(--green-100)' : 'var(--amber-100)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 13,
                    }}
                  >
                    {topic.completed ? '✓' : '○'}
                  </span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--slate-800)' }}>{topic.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--slate-400)' }}>
                      {topic.assignee && `👤 ${topic.assignee}`}
                      {topic.deadline && ` · 📅 ${topic.deadline}`}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {!topic.completed && (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => onConvertToAction(topic, agenda._id)}
                    >
                      转为行动项
                    </button>
                  )}
                  <button className="btn btn-ghost btn-sm" onClick={() => { setSelectedTopicId(topic.id); setSummaryMode(false); }}>
                    查看备注
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, minHeight: 500 }}>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--slate-600)' }}>
              📋 议题列表（拖拽排序）
            </h3>
            {sortedTopics.map((topic, index) => (
              <div key={topic.id}>
                {dragOverIndex === index && dragIndex !== null && dragIndex !== index && (
                  <div className="topic-drag-placeholder" />
                )}
                <div
                  className={`topic-card topic-drag-item ${dragIndex === index ? 'dragging' : ''} ${selectedTopicId === topic.id ? 'active' : ''}`}
                  style={selectedTopicId === topic.id ? { borderColor: 'var(--sky-400)', background: 'var(--sky-50)' } : {}}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  onClick={() => setSelectedTopicId(topic.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input
                      type="checkbox"
                      className="checkbox-done"
                      checked={topic.completed}
                      onChange={() => toggleComplete(topic)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: 14,
                          color: topic.completed ? 'var(--slate-400)' : 'var(--slate-800)',
                          textDecoration: topic.completed ? 'line-through' : 'none',
                        }}
                      >
                        {topic.title}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--slate-400)', marginTop: 2 }}>
                        {topic.assignee && `👤 ${topic.assignee}`}
                        {topic.deadline && ` · 📅 ${topic.deadline}`}
                      </div>
                    </div>
                    <span style={{ cursor: 'grab', color: 'var(--slate-400)', fontSize: 16 }}>⋮⋮</span>
                  </div>
                </div>
              </div>
            ))}
            {dragOverIndex === sortedTopics.length && dragIndex !== null && (
              <div className="topic-drag-placeholder" />
            )}
          </div>

          <div>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--slate-600)' }}>
              💬 讨论备注{selectedTopic ? ` - ${selectedTopic.title}` : ''}
            </h3>
            {selectedTopicId ? (
              <div className="card" style={{ display: 'flex', flexDirection: 'column', height: 460 }}>
                <div className="notes-list" style={{ flex: 1, overflowY: 'auto', marginBottom: 12 }}>
                  {topicNotes.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 32, color: 'var(--slate-400)', fontSize: 13 }}>
                      暂无备注，开始讨论吧
                    </div>
                  ) : (
                    topicNotes.map((note) => (
                      <div key={note.id} className="note-item">
                        <div className="note-meta">
                          <span className="note-nickname">{note.nickname}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span className="note-time">
                              {new Date(note.timestamp).toLocaleTimeString('zh-CN', {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                              })}
                            </span>
                            {note.nickname === nickname && (
                              <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => onRetractNote(note.id)}
                                style={{ fontSize: 11, padding: '1px 4px', color: 'var(--red-400)' }}
                              >
                                撤回
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="note-content">{note.content}</div>
                      </div>
                    ))
                  )}
                  <div ref={notesEndRef} />
                </div>
                <div className="note-input-area">
                  <input
                    className="form-input"
                    placeholder="输入备注内容..."
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendNote()}
                  />
                  <button className="btn btn-primary btn-sm" onClick={sendNote}>
                    发送
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={retractLastNote}
                    title="撤回最近一条"
                  >
                    ↩
                  </button>
                </div>
              </div>
            ) : (
              <div className="card" style={{ textAlign: 'center', padding: 48, color: 'var(--slate-400)', fontSize: 13 }}>
                请在左侧选择一个议题查看备注
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MinutesPanel;
