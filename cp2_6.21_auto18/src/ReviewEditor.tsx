import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import type { Note, Review, Track } from './types';
import { formatTime } from './utils';
import { useNavigate } from 'react-router-dom';

interface ReviewEditorProps {
  notes: Note[];
  reviews: Review[];
  currentReviewId: string | null;
  currentTrack: Track | null;
  onAddReview: (review: Omit<Review, 'id' | 'createdAt' | 'updatedAt'>) => string;
  onUpdateReview: (review: Review) => void;
  onDeleteReview: (reviewId: string) => void;
  onSelectReview: (id: string | null) => void;
  onSeek: (time: number) => void;
}

const ReviewEditor: React.FC<ReviewEditorProps> = ({
  notes,
  reviews,
  currentReviewId,
  currentTrack,
  onAddReview,
  onUpdateReview,
  onDeleteReview,
  onSelectReview,
  onSeek,
}) => {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [referencedNoteIds, setReferencedNoteIds] = useState<string[]>([]);
  const [draggingNote, setDraggingNote] = useState<Note | null>(null);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const [isDragOverTimeline, setIsDragOverTimeline] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const sortedNotes = useMemo(
    () => [...notes].sort((a, b) => a.time - b.time),
    [notes]
  );

  const referencedNotes = useMemo(
    () => referencedNoteIds.map((id) => notes.find((n) => n.id === id)).filter(Boolean) as Note[],
    [referencedNoteIds, notes]
  );

  const handleNewReview = useCallback(() => {
    setEditingReview(null);
    setTitle('');
    setContent('');
    setReferencedNoteIds([]);
    setShowModal(true);
  }, []);

  const handleEditReview = useCallback((review: Review) => {
    setEditingReview(review);
    setTitle(review.title);
    setContent(review.content);
    setReferencedNoteIds(review.noteIds);
    setShowModal(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setShowModal(false);
    setEditingReview(null);
    setTitle('');
    setContent('');
    setReferencedNoteIds([]);
  }, []);

  const handlePublish = useCallback(() => {
    if (!title.trim()) {
      alert('请输入乐评标题');
      return;
    }

    if (editingReview) {
      onUpdateReview({
        ...editingReview,
        title,
        content,
        noteIds: referencedNoteIds,
        trackId: currentTrack?.id || null,
      });
      navigate(`/review/${editingReview.id}`);
    } else {
      const reviewId = onAddReview({
        title,
        content,
        noteIds: referencedNoteIds,
        trackId: currentTrack?.id || null,
      });
      navigate(`/review/${reviewId}`);
    }

    handleCloseModal();
  }, [title, content, referencedNoteIds, editingReview, currentTrack, onAddReview, onUpdateReview, navigate, handleCloseModal]);

  const handleNoteDragStart = useCallback(
    (note: Note, e: React.MouseEvent) => {
      e.preventDefault();
      setDraggingNote(note);
      setDragPosition({ x: e.clientX, y: e.clientY });
    },
    []
  );

  useEffect(() => {
    if (!draggingNote) return;

    const handleMouseMove = (e: MouseEvent) => {
      setDragPosition({ x: e.clientX, y: e.clientY });

      if (timelineRef.current) {
        const rect = timelineRef.current.getBoundingClientRect();
        const isOver = e.clientX >= rect.left && e.clientX <= rect.right &&
          e.clientY >= rect.top && e.clientY <= rect.bottom;
        setIsDragOverTimeline(isOver);
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (timelineRef.current) {
        const rect = timelineRef.current.getBoundingClientRect();
        const isOver = e.clientX >= rect.left && e.clientX <= rect.right &&
          e.clientY >= rect.top && e.clientY <= rect.bottom;

        if (isOver && draggingNote) {
          if (!referencedNoteIds.includes(draggingNote.id)) {
            setReferencedNoteIds([...referencedNoteIds, draggingNote.id]);
          }
        }
      }

      setDraggingNote(null);
      setIsDragOverTimeline(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingNote, referencedNoteIds]);

  const handleRemoveReferencedNote = useCallback(
    (noteId: string) => {
      setReferencedNoteIds(referencedNoteIds.filter((id) => id !== noteId));
    },
    [referencedNoteIds]
  );

  const handleTimestampInsert = useCallback(
    (note: Note) => {
      const timestamp = formatTime(note.time);
      const textarea = textareaRef.current;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newContent = content.slice(0, start) + `#${timestamp}#` + content.slice(end);
        setContent(newContent);
        setTimeout(() => {
          textarea.focus();
          textarea.selectionStart = textarea.selectionEnd = start + timestamp.length + 2;
        }, 0);
      } else {
        setContent(content + `#${timestamp}#`);
      }
    },
    [content]
  );

  const handleDropImage = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const files = Array.from(e.dataTransfer.files).filter((file) =>
        file.type.startsWith('image/')
      );
      if (files.length > 0) {
        const placeholder = `![图片](${files[0].name})`;
        setContent(content + '\n' + placeholder);
      }
    },
    [content]
  );

  const handleDeleteReview = useCallback(
    (reviewId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (confirm('确定要删除这篇乐评吗？')) {
        onDeleteReview(reviewId);
      }
    },
    [onDeleteReview]
  );

  return (
    <>
      <div style={styles.container}>
        <div style={styles.header}>
          <h3 style={styles.title}>乐评编辑器</h3>
          <button
            onClick={handleNewReview}
            style={styles.newReviewBtn}
          >
            ✏️ 新建乐评
          </button>
        </div>

        <div style={styles.reviewsList}>
          <div style={styles.sectionTitle}>
            <span>我的乐评</span>
            <span style={styles.countBadge}>{reviews.length}</span>
          </div>

          {reviews.length === 0 ? (
            <div style={styles.emptyState}>
              <span style={styles.emptyIcon}>📝</span>
              <span style={styles.emptyText}>还没有乐评</span>
              <span style={styles.emptyHint}>点击上方按钮创建第一篇</span>
            </div>
          ) : (
            <div style={styles.reviewItems}>
              {reviews.map((review) => (
                <div
                  key={review.id}
                  onClick={() => handleEditReview(review)}
                  style={{
                    ...styles.reviewItem,
                    backgroundColor:
                      currentReviewId === review.id
                        ? 'rgba(74, 144, 217, 0.15)'
                        : 'transparent',
                  }}
                >
                  <div style={styles.reviewItemHeader}>
                    <span style={styles.reviewItemTitle}>
                      {review.title || '无标题'}
                    </span>
                    <button
                      onClick={(e) => handleDeleteReview(review.id, e)}
                      style={styles.deleteBtn}
                      title="删除"
                    >
                      🗑️
                    </button>
                  </div>
                  <div style={styles.reviewItemMeta}>
                    <span>{new Date(review.updatedAt).toLocaleDateString()}</span>
                    <span>·</span>
                    <span>{review.noteIds.length} 条笔记</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={styles.notesListSection}>
          <div style={styles.sectionTitle}>
            <span>笔记列表</span>
            <span style={styles.countBadge}>{notes.length}</span>
          </div>
          <div style={styles.notesHint}>拖拽笔记到编辑器以引用</div>

          {sortedNotes.length === 0 ? (
            <div style={styles.emptyState}>
              <span style={styles.emptyIcon}>🎵</span>
              <span style={styles.emptyText}>暂无笔记</span>
              <span style={styles.emptyHint}>在波形图上点击添加</span>
            </div>
          ) : (
            <div style={styles.draggableNotes}>
              {sortedNotes.map((note) => (
                <div
                  key={note.id}
                  onMouseDown={(e) => handleNoteDragStart(note, e)}
                  style={{
                    ...styles.draggableNote,
                    opacity:
                      draggingNote?.id === note.id
                        ? 0.5
                        : referencedNoteIds.includes(note.id)
                        ? 0.6
                        : 1,
                  }}
                  title="拖拽到编辑器引用"
                >
                  <span style={styles.dragNoteTime}>
                    {formatTime(note.time)}
                  </span>
                  <span style={styles.dragNoteText}>
                    {note.text || '(空笔记)'}
                  </span>
                  {referencedNoteIds.includes(note.id) && (
                    <span style={styles.referencedBadge}>✓</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {draggingNote && (
        <div
          style={{
            ...styles.dragGhost,
            left: dragPosition.x + 10,
            top: dragPosition.y + 10,
          }}
        >
          <div style={styles.dragGhostTime}>
            {formatTime(draggingNote.time)}
          </div>
          <div style={styles.dragGhostText}>
            {draggingNote.text || '(空笔记)'}
          </div>
        </div>
      )}

      {showModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>
                {editingReview ? '编辑乐评' : '新建乐评'}
              </h2>
              <button onClick={handleCloseModal} style={styles.closeBtn}>
                ✕
              </button>
            </div>

            <div style={styles.modalBody}>
              <div style={styles.modalLeft}>
                <div style={styles.timelineSection}>
                  <div style={styles.modalSectionTitle}>
                    波形概览 & 引用区
                  </div>
                  <div
                    ref={timelineRef}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDropImage}
                    style={{
                      ...styles.timelineArea,
                      borderColor: isDragOverTimeline
                        ? '#4A90D9'
                        : 'var(--border-color)',
                      backgroundColor: isDragOverTimeline
                        ? 'rgba(74, 144, 217, 0.1)'
                        : 'var(--bg-primary)',
                    }}
                  >
                    {currentTrack?.audioBuffer ? (
                      <MiniWaveform audioBuffer={currentTrack.audioBuffer} />
                    ) : (
                      <div style={styles.noTrackHint}>
                        请先选择一首音乐
                      </div>
                    )}

                    <div style={styles.referencedNotesRow}>
                      {referencedNotes.map((note, index) => (
                        <div
                          key={note.id}
                          style={{
                            ...styles.referencedNoteMini,
                            left: currentTrack?.duration
                              ? `${(note.time / currentTrack.duration) * 100}%`
                              : '0%',
                          }}
                          title={note.text}
                        >
                          <span style={styles.referenceNumber}>
                            {index + 1}
                          </span>
                          <button
                            onClick={() => handleRemoveReferencedNote(note.id)}
                            style={styles.removeRefBtn}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={styles.referencedNotesList}>
                    <div style={styles.modalSectionTitle}>已引用笔记</div>
                    {referencedNotes.length === 0 ? (
                      <div style={styles.noRefsHint}>
                        拖拽笔记到上方区域引用
                      </div>
                    ) : (
                      <div style={styles.refNotesList}>
                        {referencedNotes.map((note, index) => (
                          <div key={note.id} style={styles.refNoteItem}>
                            <span style={styles.refNoteNumber}>
                              {index + 1}
                            </span>
                            <div style={styles.refNoteContent}>
                              <div style={styles.refNoteTime}>
                                {formatTime(note.time)}
                              </div>
                              <div style={styles.refNoteText}>
                                {note.text}
                              </div>
                            </div>
                            <button
                              onClick={() => handleTimestampInsert(note)}
                              style={styles.insertBtn}
                              title="插入时间戳到正文"
                            >
                              ➕
                            </button>
                            <button
                              onClick={() => handleRemoveReferencedNote(note.id)}
                              style={styles.removeBtn}
                              title="移除引用"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div style={styles.modalRight}>
                <div style={styles.modalSectionTitle}>乐评内容</div>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="输入乐评标题..."
                  style={styles.titleInput}
                />

                <div style={styles.editorHint}>
                  支持 Markdown 格式，拖入图片插入，使用 #时间戳# 添加跳转链接
                </div>

                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={
                    '# 乐评标题\n\n在这里写下你的乐评...\n\n使用 #0:30# 格式添加可点击的时间戳'
                  }
                  style={styles.editor}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDropImage}
                />

                <div style={styles.previewSection}>
                  <div style={styles.modalSectionTitle}>预览</div>
                  <div
                    style={styles.previewContent}
                    dangerouslySetInnerHTML={{
                      __html: renderMarkdown(content),
                    }}
                  />
                </div>
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button onClick={handleCloseModal} style={styles.cancelModalBtn}>
                取消
              </button>
              <button onClick={handlePublish} style={styles.publishBtn}>
                🚀 发布乐评
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const MiniWaveform: React.FC<{ audioBuffer: AudioBuffer }> = ({ audioBuffer }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = container.clientWidth;
    const height = 60;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    const channelData = audioBuffer.getChannelData(0);
    const samples = width * 2;
    const blockSize = Math.floor(channelData.length / samples);
    const filteredData: number[] = [];

    for (let i = 0; i < samples; i++) {
      let sum = 0;
      for (let j = 0; j < blockSize; j++) {
        sum += Math.abs(channelData[i * blockSize + j] || 0);
      }
      filteredData.push(sum / blockSize);
    }

    const maxVal = Math.max(...filteredData, 0.01);
    const centerY = height / 2;
    const amplitude = (height * 0.7) / 2;

    for (let i = 0; i < width; i++) {
      const dataIndex = i * 2;
      const val = (filteredData[dataIndex] || 0) / maxVal;
      const x = i;
      const yTop = centerY - val * amplitude;
      const yBottom = centerY + val * amplitude;

      const gradient = ctx.createLinearGradient(0, yTop, 0, yBottom);
      gradient.addColorStop(0, 'rgba(74, 144, 217, 0.4)');
      gradient.addColorStop(0.5, 'rgba(74, 144, 217, 0.8)');
      gradient.addColorStop(1, 'rgba(74, 144, 217, 0.4)');

      ctx.fillStyle = gradient;
      ctx.fillRect(x, yTop, 1, yBottom - yTop);
    }
  }, [audioBuffer]);

  return (
    <div ref={containerRef} style={styles.miniWaveformContainer}>
      <canvas ref={canvasRef} style={styles.miniWaveformCanvas} />
    </div>
  );
};

function renderMarkdown(text: string): string {
  let html = text
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/#(\d+:\d+(?:\.\d+)?)#/g, '<a href="#" class="timestamp-link" data-time="$1">#$1#</a>')
    .replace(/\n/g, '<br>');

  return html;
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '320px',
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: '8px 0 0 8px',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    backdropFilter: 'blur(12px)',
    flexShrink: 0,
  },
  header: {
    padding: '16px',
    borderBottom: '1px solid var(--border-color)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    flexShrink: 0,
  },
  title: {
    fontSize: '16px',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  newReviewBtn: {
    padding: '10px 16px',
    borderRadius: '6px',
    background: 'linear-gradient(135deg, #6C63FF, #A78BFA)',
    color: 'white',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'all 0.2s ease',
  },
  reviewsList: {
    padding: '12px 16px',
    borderBottom: '1px solid var(--border-color)',
    flexShrink: 0,
    maxHeight: '200px',
    overflowY: 'auto',
  },
  sectionTitle: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    marginBottom: '10px',
  },
  countBadge: {
    backgroundColor: 'var(--bg-card)',
    padding: '2px 8px',
    borderRadius: '10px',
    fontSize: '11px',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '20px',
    gap: '6px',
  },
  emptyIcon: {
    fontSize: '28px',
    opacity: 0.5,
  },
  emptyText: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
  },
  emptyHint: {
    fontSize: '11px',
    color: 'var(--text-secondary)',
    opacity: 0.7,
  },
  reviewItems: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  reviewItem: {
    padding: '10px 12px',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
  },
  reviewItemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '4px',
  },
  reviewItemTitle: {
    fontSize: '13px',
    fontWeight: 500,
    color: 'var(--text-primary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    flex: 1,
  },
  deleteBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    padding: '2px 4px',
    opacity: 0.6,
    transition: 'opacity 0.2s ease',
  },
  reviewItemMeta: {
    display: 'flex',
    gap: '6px',
    fontSize: '11px',
    color: 'var(--text-secondary)',
  },
  notesListSection: {
    flex: 1,
    padding: '12px 16px',
    overflowY: 'auto',
    minHeight: 0,
  },
  notesHint: {
    fontSize: '11px',
    color: 'var(--text-secondary)',
    marginBottom: '10px',
    opacity: 0.8,
  },
  draggableNotes: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  draggableNote: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 10px',
    backgroundColor: 'var(--bg-card)',
    borderRadius: '6px',
    cursor: 'grab',
    transition: 'all 0.2s ease',
    userSelect: 'none',
  },
  dragNoteTime: {
    fontSize: '11px',
    color: 'var(--accent-blue)',
    fontFamily: 'monospace',
    flexShrink: 0,
  },
  dragNoteText: {
    flex: 1,
    fontSize: '12px',
    color: 'var(--text-primary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  referencedBadge: {
    fontSize: '12px',
    color: 'var(--accent-blue)',
  },
  dragGhost: {
    position: 'fixed',
    width: '180px',
    padding: '10px',
    backgroundColor: 'var(--bg-card)',
    borderRadius: '6px',
    boxShadow: 'var(--shadow-lg)',
    pointerEvents: 'none',
    zIndex: 9999,
    opacity: 0.9,
  },
  dragGhostTime: {
    fontSize: '11px',
    color: 'var(--accent-blue)',
    fontFamily: 'monospace',
    marginBottom: '4px',
  },
  dragGhostText: {
    fontSize: '12px',
    color: 'var(--text-primary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
    backdropFilter: 'blur(4px)',
    animation: 'fadeIn 0.2s ease',
  },
  modalContent: {
    width: '90%',
    maxWidth: '1200px',
    height: '85vh',
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: '12px',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: 'var(--shadow-lg)',
  },
  modalHeader: {
    padding: '16px 24px',
    borderBottom: '1px solid var(--border-color)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexShrink: 0,
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  closeBtn: {
    width: '32px',
    height: '32px',
    borderRadius: '6px',
    backgroundColor: 'transparent',
    color: 'var(--text-secondary)',
    border: 'none',
    cursor: 'pointer',
    fontSize: '18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
  },
  modalBody: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
  },
  modalLeft: {
    width: '350px',
    borderRight: '1px solid var(--border-color)',
    display: 'flex',
    flexDirection: 'column',
    padding: '16px',
    gap: '16px',
    overflowY: 'auto',
    flexShrink: 0,
  },
  modalSectionTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    marginBottom: '8px',
  },
  timelineArea: {
    position: 'relative',
    minHeight: '100px',
    border: '2px dashed var(--border-color)',
    borderRadius: '8px',
    padding: '12px',
    transition: 'all 0.2s ease',
  },
  noTrackHint: {
    height: '60px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    color: 'var(--text-secondary)',
  },
  miniWaveformContainer: {
    width: '100%',
    position: 'relative',
  },
  miniWaveformCanvas: {
    display: 'block',
    width: '100%',
  },
  referencedNotesRow: {
    position: 'relative',
    height: '24px',
    marginTop: '8px',
  },
  referencedNoteMini: {
    position: 'absolute',
    top: 0,
    transform: 'translateX(-50%)',
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    backgroundColor: 'var(--accent-blue)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontSize: '10px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'transform 0.2s ease',
  },
  referenceNumber: {
    fontSize: '10px',
  },
  removeRefBtn: {
    position: 'absolute',
    top: '-4px',
    right: '-4px',
    width: '14px',
    height: '14px',
    borderRadius: '50%',
    backgroundColor: 'var(--accent-coral)',
    color: 'white',
    border: 'none',
    fontSize: '10px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    lineHeight: 1,
  },
  referencedNotesList: {
    marginTop: '8px',
  },
  noRefsHint: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    textAlign: 'center',
    padding: '12px',
    backgroundColor: 'var(--bg-card)',
    borderRadius: '6px',
  },
  refNotesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  refNoteItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 10px',
    backgroundColor: 'var(--bg-card)',
    borderRadius: '6px',
  },
  refNoteNumber: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    backgroundColor: 'var(--accent-blue)',
    color: 'white',
    fontSize: '10px',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  refNoteContent: {
    flex: 1,
    minWidth: 0,
  },
  refNoteTime: {
    fontSize: '10px',
    color: 'var(--accent-blue)',
    fontFamily: 'monospace',
  },
  refNoteText: {
    fontSize: '12px',
    color: 'var(--text-primary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  insertBtn: {
    width: '24px',
    height: '24px',
    borderRadius: '4px',
    backgroundColor: 'transparent',
    color: 'var(--accent-blue)',
    border: 'none',
    cursor: 'pointer',
    fontSize: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  removeBtn: {
    width: '20px',
    height: '20px',
    borderRadius: '4px',
    backgroundColor: 'transparent',
    color: 'var(--text-secondary)',
    border: 'none',
    cursor: 'pointer',
    fontSize: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  modalRight: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    padding: '16px',
    overflowY: 'auto',
    gap: '12px',
  },
  titleInput: {
    width: '100%',
    padding: '12px 14px',
    fontSize: '18px',
    fontWeight: 600,
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    borderRadius: '6px',
    color: 'var(--text-primary)',
  },
  editorHint: {
    fontSize: '11px',
    color: 'var(--text-secondary)',
    padding: '0 4px',
  },
  editor: {
    width: '100%',
    minHeight: '200px',
    padding: '12px 14px',
    fontSize: '14px',
    lineHeight: 1.6,
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    borderRadius: '6px',
    color: 'var(--text-primary)',
    resize: 'vertical',
    fontFamily: 'inherit',
  },
  previewSection: {
    marginTop: '8px',
  },
  previewContent: {
    padding: '12px 14px',
    backgroundColor: 'var(--bg-card)',
    borderRadius: '6px',
    fontSize: '14px',
    lineHeight: 1.6,
    color: 'var(--text-primary)',
    minHeight: '80px',
  },
  modalFooter: {
    padding: '16px 24px',
    borderTop: '1px solid var(--border-color)',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    flexShrink: 0,
  },
  cancelModalBtn: {
    padding: '10px 20px',
    borderRadius: '6px',
    backgroundColor: 'var(--bg-card)',
    color: 'var(--text-primary)',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s ease',
  },
  publishBtn: {
    padding: '10px 24px',
    borderRadius: '6px',
    background: 'linear-gradient(135deg, #6C63FF, #A78BFA)',
    color: 'white',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'all 0.2s ease',
  },
  timelineSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
};

export default ReviewEditor;
