import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGlobal } from '../App';
import { updateProgress, addNote, deleteNote, removeFromReadingList, Note } from '../api';
import ProgressBar from '../components/ProgressBar';

function formatTime(ts: number) {
  const d = new Date(ts * 1000);
  return d.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function NoteItem({ note, onDelete, bookId }: { note: Note; onDelete: () => void; bookId: number }) {
  const [expanded, setExpanded] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    setTimeout(async () => {
      await deleteNote(bookId, note.id);
      onDelete();
    }, 280);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{
        opacity: deleting ? 0 : 1,
        x: deleting ? 20 : 0,
        scale: deleting ? 0.8 : 1,
        height: deleting ? 0 : 'auto'
      }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      style={{
        position: 'relative',
        paddingLeft: '20px',
        marginBottom: deleting ? 0 : '16px',
        overflow: deleting ? 'hidden' : 'visible'
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 3,
          top: 8,
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #F5A623, #F7B94F)',
          boxShadow: '0 0 0 4px #F9F6F0'
        }}
      />
      <div
        style={{
          background: '#fff',
          borderRadius: '10px',
          padding: '14px 16px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
          border: '1px solid #f0ebe3'
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: expanded ? '8px' : 0,
            cursor: 'pointer'
          }}
          onClick={() => setExpanded(!expanded)}
        >
          <span style={{ fontSize: '12px', color: '#999' }}>{formatTime(note.created_at)}</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={(e) => {
                e.stopPropagation();
                handleDelete();
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#c00',
                cursor: 'pointer',
                fontSize: '12px',
                padding: '2px 6px',
                borderRadius: '4px'
              }}
            >
              删除
            </motion.button>
            <motion.span
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              style={{ fontSize: '12px', color: '#999' }}
            >
              ▼
            </motion.span>
          </div>
        </div>
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ overflow: 'hidden' }}
            >
              <p style={{ fontSize: '14px', lineHeight: 1.7, color: '#444', whiteSpace: 'pre-wrap' }}>
                {note.content}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export default function Tracker() {
  const { readingList, refreshReadingList } = useGlobal();
  const [inputPages, setInputPages] = useState<Record<number, string>>({});
  const [noteInputs, setNoteInputs] = useState<Record<number, string>>({});
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const todayMinutes = readingList.reduce((sum, b) => {
    const today = new Date().toISOString().slice(0, 10);
    const todays = b.daily_reading.filter(d => d.date === today);
    return sum + todays.reduce((s, d) => s + d.minutes, 0);
  }, 0);

  const totalPagesRead = readingList.reduce((sum, b) => sum + b.current_page, 0);

  const handleAddPage = async (bookId: number, currentPage: number) => {
    setUpdatingId(bookId);
    try {
      await updateProgress(bookId, currentPage + 1);
      await refreshReadingList();
    } catch (e) {
      console.error(e);
    } finally {
      setTimeout(() => setUpdatingId(null), 300);
    }
  };

  const handleSetPage = async (bookId: number, val: string, totalPages: number) => {
    const n = parseInt(val);
    if (isNaN(n)) return;
    const clamped = Math.max(0, Math.min(n, totalPages));
    setUpdatingId(bookId);
    try {
      await updateProgress(bookId, clamped);
      await refreshReadingList();
      setInputPages(p => ({ ...p, [bookId]: '' }));
    } catch (e) {
      console.error(e);
    } finally {
      setTimeout(() => setUpdatingId(null), 300);
    }
  };

  const handleAddNote = async (bookId: number) => {
    const content = (noteInputs[bookId] || '').trim();
    if (!content) return;
    try {
      await addNote(bookId, content);
      await refreshReadingList();
      setNoteInputs(p => ({ ...p, [bookId]: '' }));
    } catch (e) {
      console.error(e);
    }
  };

  const handleRemove = async (bookId: number) => {
    if (!confirm('确定要从阅读清单中移除这本书吗？')) return;
    try {
      await removeFromReadingList(bookId);
      await refreshReadingList();
    } catch (e) {
      console.error(e);
    }
  };

  if (readingList.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ textAlign: 'center', padding: '80px 20px' }}
      >
        <div style={{ fontSize: '72px', marginBottom: '20px' }}>📖</div>
        <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#333', marginBottom: '12px' }}>
          还没有开始阅读哦
        </h2>
        <p style={{ color: '#888', fontSize: '15px' }}>
          去首页挑选一些感兴趣的书籍加入阅读清单吧！
        </p>
      </motion.div>
    );
  }

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: '28px' }}
      >
        <h1 style={{ fontSize: '30px', fontWeight: 700, color: '#222', marginBottom: '8px' }}>
          阅读进度追踪
        </h1>
        <p style={{ fontSize: '15px', color: '#777', marginBottom: '20px' }}>
          记录每一次阅读，见证成长的足迹
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px'
          }}
        >
          <motion.div
            whileHover={{ y: -3 }}
            style={{
              background: 'linear-gradient(135deg, #F5A623, #F7B94F)',
              borderRadius: '14px',
              padding: '20px',
              color: '#fff'
            }}
          >
            <div style={{ fontSize: '13px', opacity: 0.9, marginBottom: '6px' }}>今日阅读</div>
            <div style={{ fontSize: '28px', fontWeight: 700 }}>{todayMinutes} <span style={{ fontSize: '16px', fontWeight: 400 }}>分钟</span></div>
          </motion.div>
          <motion.div
            whileHover={{ y: -3 }}
            style={{
              background: 'linear-gradient(135deg, #4A90D9, #6AA8E8)',
              borderRadius: '14px',
              padding: '20px',
              color: '#fff'
            }}
          >
            <div style={{ fontSize: '13px', opacity: 0.9, marginBottom: '6px' }}>正在阅读</div>
            <div style={{ fontSize: '28px', fontWeight: 700 }}>{readingList.length} <span style={{ fontSize: '16px', fontWeight: 400 }}>本书</span></div>
          </motion.div>
          <motion.div
            whileHover={{ y: -3 }}
            style={{
              background: 'linear-gradient(135deg, #52C41A, #73D13D)',
              borderRadius: '14px',
              padding: '20px',
              color: '#fff'
            }}
          >
            <div style={{ fontSize: '13px', opacity: 0.9, marginBottom: '6px' }}>累计阅读</div>
            <div style={{ fontSize: '28px', fontWeight: 700 }}>{totalPagesRead} <span style={{ fontSize: '16px', fontWeight: 400 }}>页</span></div>
          </motion.div>
        </div>
      </motion.div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <AnimatePresence mode="popLayout">
          {readingList.map(book => {
            const pct = Math.round(book.current_page / book.total_pages * 100);
            return (
              <motion.div
                key={book.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 40, scale: 0.9 }}
                transition={{ duration: 0.3 }}
                style={{
                  background: '#fff',
                  borderRadius: '16px',
                  padding: '24px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
                }}
              >
                <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', flexWrap: 'wrap' }}>
                  <img
                    src={book.cover}
                    alt={book.title}
                    style={{
                      width: 110,
                      aspectRatio: '3 / 4.2',
                      objectFit: 'cover',
                      borderRadius: '10px',
                      boxShadow: '0 6px 16px rgba(0,0,0,0.12)',
                      flexShrink: 0
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 240 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '6px' }}>
                      <div>
                        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#222', marginBottom: '4px' }}>
                          {book.title}
                        </h2>
                        <p style={{ fontSize: '13px', color: '#888' }}>作者：{book.author}</p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span
                          style={{
                            padding: '4px 12px',
                            borderRadius: '14px',
                            background: pct === 100 ? 'linear-gradient(135deg, #52C41A, #73D13D)' : 'linear-gradient(135deg, #F5A623, #F7B94F)',
                            color: '#fff',
                            fontSize: '13px',
                            fontWeight: 600
                          }}
                        >
                          {pct === 100 ? '🎉 已读完' : `进度 ${pct}%`}
                        </span>
                        <button
                          onClick={() => handleRemove(book.id)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '8px',
                            border: '1px solid #eee',
                            background: '#fff',
                            color: '#c00',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          移除
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <ProgressBar
                    key={updatingId === book.id ? `u-${book.id}-${Date.now()}` : `b-${book.id}`}
                    value={book.current_page}
                    total={book.total_pages}
                    height={16}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', flexWrap: 'wrap' }}>
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleAddPage(book.id, book.current_page)}
                    disabled={book.current_page >= book.total_pages}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '8px',
                      border: 'none',
                      background: book.current_page >= book.total_pages ? '#ccc' : 'linear-gradient(135deg, #F5A623, #F7B94F)',
                      color: '#fff',
                      fontWeight: 600,
                      cursor: book.current_page >= book.total_pages ? 'not-allowed' : 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    + 1 页
                  </motion.button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="number"
                      min="0"
                      max={book.total_pages}
                      placeholder="跳转到页码"
                      value={inputPages[book.id] || ''}
                      onChange={e => setInputPages(p => ({ ...p, [book.id]: e.target.value }))}
                      style={{
                        padding: '9px 14px',
                        borderRadius: '8px',
                        border: '1px solid #e0dcd4',
                        fontSize: '14px',
                        width: 130,
                        outline: 'none'
                      }}
                    />
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleSetPage(book.id, inputPages[book.id] || '', book.total_pages)}
                      style={{
                        padding: '9px 16px',
                        borderRadius: '8px',
                        border: '1px solid #4A90D9',
                        background: '#fff',
                        color: '#4A90D9',
                        fontWeight: 500,
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                    >
                      跳转
                    </motion.button>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #f0ebe3', paddingTop: '20px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#333', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    📝 阅读笔记 <span style={{ fontSize: '13px', color: '#999', fontWeight: 400 }}>({book.notes.length})</span>
                  </h3>

                  <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                    <textarea
                      placeholder="记录下你的阅读感悟..."
                      value={noteInputs[book.id] || ''}
                      onChange={e => setNoteInputs(p => ({ ...p, [book.id]: e.target.value }))}
                      rows={2}
                      style={{
                        flex: 1,
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: '1px solid #e0dcd4',
                        fontSize: '14px',
                        fontFamily: 'inherit',
                        resize: 'vertical',
                        outline: 'none',
                        minHeight: 44
                      }}
                    />
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleAddNote(book.id)}
                      disabled={!(noteInputs[book.id] || '').trim()}
                      style={{
                        alignSelf: 'flex-end',
                        padding: '10px 20px',
                        borderRadius: '10px',
                        border: 'none',
                        background: !(noteInputs[book.id] || '').trim() ? '#ccc' : 'linear-gradient(135deg, #4A90D9, #6AA8E8)',
                        color: '#fff',
                        fontWeight: 600,
                        cursor: !(noteInputs[book.id] || '').trim() ? 'not-allowed' : 'pointer',
                        fontSize: '14px'
                      }}
                    >
                      添加
                    </motion.button>
                  </div>

                  {book.notes.length === 0 ? (
                    <p style={{ textAlign: 'center', padding: '20px', color: '#bbb', fontSize: '13px' }}>
                      还没有笔记，写下你的第一条笔记吧 ✍️
                    </p>
                  ) : (
                    <div style={{ position: 'relative' }}>
                      <div
                        style={{
                          position: 'absolute',
                          left: 7,
                          top: 0,
                          bottom: 0,
                          width: 2,
                          background: 'linear-gradient(to bottom, #F5A623, #F7B94F)',
                          borderRadius: 2
                        }}
                      />
                      {book.notes.map(note => (
                        <NoteItem
                          key={note.id}
                          note={note}
                          bookId={book.id}
                          onDelete={() => refreshReadingList()}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
