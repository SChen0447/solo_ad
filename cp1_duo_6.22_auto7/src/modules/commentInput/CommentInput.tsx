import { useState, useCallback } from 'react';
import type { Comment, SortField, SortOrder } from '@/shared/types';

interface CommentInputProps {
  comments: Comment[];
  onCommentsChange: (comments: Comment[]) => void;
  onAnalyze: () => void;
  hasAnalyzed: boolean;
}

const MAX_COMMENTS = 50;

export default function CommentInput({ comments, onCommentsChange, onAnalyze, hasAnalyzed }: CommentInputProps) {
  const [content, setContent] = useState('');
  const [rating, setRating] = useState(5);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [hoverRating, setHoverRating] = useState(0);

  const handleAdd = useCallback(() => {
    if (!content.trim()) return;
    if (comments.length >= MAX_COMMENTS) return;
    const newComment: Comment = {
      id: crypto.randomUUID(),
      content: content.trim(),
      rating,
      date,
    };
    onCommentsChange([...comments, newComment]);
    setContent('');
  }, [content, rating, date, comments, onCommentsChange]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text');
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length > 1) {
      e.preventDefault();
      const remaining = MAX_COMMENTS - comments.length;
      const toAdd = lines.slice(0, remaining).map(line => ({
        id: crypto.randomUUID(),
        content: line.trim(),
        rating: 3,
        date: new Date().toISOString().split('T')[0],
      }));
      onCommentsChange([...comments, ...toAdd]);
    }
  }, [comments, onCommentsChange]);

  const handleDelete = useCallback((id: string) => {
    onCommentsChange(comments.filter(c => c.id !== id));
  }, [comments, onCommentsChange]);

  const sorted = [...comments].sort((a, b) => {
    let cmp = 0;
    if (sortField === 'rating') cmp = a.rating - b.rating;
    else cmp = a.date.localeCompare(b.date);
    return sortOrder === 'desc' ? -cmp : cmp;
  });

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const renderStars = (r: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span key={i} style={{ color: i < r ? '#fbc02d' : '#e0e0e0', fontSize: 14 }}>★</span>
    ));
  };

  const renderInputStars = () => {
    return Array.from({ length: 5 }, (_, i) => {
      const val = i + 1;
      return (
        <span
          key={i}
          onClick={() => setRating(val)}
          onMouseEnter={() => setHoverRating(val)}
          onMouseLeave={() => setHoverRating(0)}
          style={{
            color: val <= (hoverRating || rating) ? '#fbc02d' : '#e0e0e0',
            fontSize: 22,
            cursor: 'pointer',
            transition: 'color 0.15s',
          }}
        >
          ★
        </span>
      );
    });
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>评论列表</h2>
        <span style={styles.count}>{comments.length}/{MAX_COMMENTS}</span>
      </div>

      <div style={styles.sortBar}>
        <button
          onClick={() => toggleSort('rating')}
          style={{
            ...styles.sortBtn,
            color: sortField === 'rating' ? '#1a237e' : '#9e9e9e',
            fontWeight: sortField === 'rating' ? 700 : 400,
          }}
        >
          星级 {sortField === 'rating' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
        </button>
        <button
          onClick={() => toggleSort('date')}
          style={{
            ...styles.sortBtn,
            color: sortField === 'date' ? '#1a237e' : '#9e9e9e',
            fontWeight: sortField === 'date' ? 700 : 400,
          }}
        >
          日期 {sortField === 'date' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
        </button>
      </div>

      <div style={styles.list}>
        {sorted.map(c => (
          <div key={c.id} style={styles.card}>
            <div style={styles.cardHeader}>
              <div>{renderStars(c.rating)}</div>
              <span style={styles.cardDate}>{c.date}</span>
              <button onClick={() => handleDelete(c.id)} style={styles.deleteBtn}>×</button>
            </div>
            <p style={styles.cardContent}>{c.content}</p>
          </div>
        ))}
        {comments.length === 0 && (
          <div style={styles.empty}>暂无评论，请在下方添加</div>
        )}
      </div>

      <div style={styles.inputArea}>
        <div style={styles.inputRow}>
          <div style={styles.starInput}>{renderInputStars()}</div>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            style={styles.dateInput}
          />
        </div>
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          onPaste={handlePaste}
          placeholder="输入评论内容（支持粘贴多条，每行一条）"
          style={styles.textarea}
          rows={3}
        />
        <div style={styles.btnRow}>
          <button
            onClick={handleAdd}
            disabled={!content.trim() || comments.length >= MAX_COMMENTS}
            style={{
              ...styles.addBtn,
              opacity: (!content.trim() || comments.length >= MAX_COMMENTS) ? 0.5 : 1,
            }}
          >
            添加评论
          </button>
          <button
            onClick={onAnalyze}
            disabled={comments.length === 0}
            style={{
              ...styles.analyzeBtn,
              opacity: comments.length === 0 ? 0.5 : 1,
            }}
          >
            {hasAnalyzed ? '重新分析' : '开始分析'}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    border: '1px solid #e8e8e8',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px 8px',
  },
  title: {
    margin: 0,
    fontSize: 16,
    fontWeight: 700,
    color: '#1a237e',
  },
  count: {
    fontSize: 12,
    color: '#9e9e9e',
  },
  sortBar: {
    display: 'flex',
    gap: 8,
    padding: '4px 20px 12px',
    borderBottom: '1px solid #f0f0f0',
  },
  sortBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 12,
    padding: '4px 8px',
    borderRadius: 4,
    transition: 'all 0.15s',
  },
  list: {
    flex: 1,
    overflowY: 'auto',
    padding: '12px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  card: {
    padding: '12px 14px',
    borderRadius: 8,
    backgroundColor: '#fafafa',
    border: '1px solid #f0f0f0',
    transition: 'box-shadow 0.2s',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  cardDate: {
    fontSize: 11,
    color: '#bdbdbd',
    flex: 1,
  },
  deleteBtn: {
    background: 'none',
    border: 'none',
    color: '#bdbdbd',
    cursor: 'pointer',
    fontSize: 16,
    padding: '0 4px',
    lineHeight: 1,
    transition: 'color 0.15s',
  },
  cardContent: {
    margin: 0,
    fontSize: 13,
    lineHeight: 1.6,
    color: '#424242',
  },
  empty: {
    textAlign: 'center',
    color: '#bdbdbd',
    fontSize: 13,
    padding: '40px 0',
  },
  inputArea: {
    padding: '16px 20px',
    borderTop: '1px solid #f0f0f0',
    backgroundColor: '#fafafa',
  },
  inputRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  starInput: {
    display: 'flex',
    gap: 2,
  },
  dateInput: {
    fontSize: 12,
    padding: '4px 8px',
    border: '1px solid #e0e0e0',
    borderRadius: 6,
    color: '#424242',
    outline: 'none',
  },
  textarea: {
    width: '100%',
    boxSizing: 'border-box',
    padding: 10,
    borderRadius: 8,
    border: '1px solid #e0e0e0',
    fontSize: 13,
    lineHeight: 1.6,
    resize: 'none',
    outline: 'none',
    fontFamily: "'Noto Sans SC', sans-serif",
    transition: 'border-color 0.15s',
  },
  btnRow: {
    display: 'flex',
    gap: 8,
    marginTop: 10,
  },
  addBtn: {
    flex: 1,
    padding: '8px 0',
    border: '1px solid #1a237e',
    borderRadius: 8,
    background: '#ffffff',
    color: '#1a237e',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  analyzeBtn: {
    flex: 1,
    padding: '8px 0',
    border: 'none',
    borderRadius: 8,
    background: '#1a237e',
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
};
