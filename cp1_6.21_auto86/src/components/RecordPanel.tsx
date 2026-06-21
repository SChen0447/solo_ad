import { useState } from 'react';
import { format } from 'date-fns';
import { BookOpen, Clock, Calendar, Save } from 'lucide-react';
import { addRecord } from '../utils/storage';

interface RecordPanelProps {
  onRecordAdded: () => void;
}

export default function RecordPanel({ onRecordAdded }: RecordPanelProps) {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('09:00');
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = () => {
    setError('');
    if (!date || !startTime || !endTime) {
      setError('请填写完整信息');
      return;
    }
    const record = addRecord(date, startTime, endTime);
    if (!record) {
      setError('结束时间必须晚于开始时间');
      return;
    }
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
    onRecordAdded();
  };

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <BookOpen size={20} color="#1E88E5" />
        <h2 style={styles.title}>记录阅读</h2>
      </div>

      <div style={styles.field}>
        <label style={styles.label}>
          <Calendar size={14} style={{ marginRight: 6 }} />
          日期
        </label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          style={styles.input}
        />
      </div>

      <div style={styles.field}>
        <label style={styles.label}>
          <Clock size={14} style={{ marginRight: 6 }} />
          开始时间
        </label>
        <input
          type="time"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          style={styles.input}
        />
      </div>

      <div style={styles.field}>
        <label style={styles.label}>
          <Clock size={14} style={{ marginRight: 6 }} />
          结束时间
        </label>
        <input
          type="time"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
          style={styles.input}
        />
      </div>

      <button onClick={handleSubmit} style={styles.button}>
        <Save size={16} style={{ marginRight: 6 }} />
        记录
      </button>

      {error && <div style={styles.error}>{error}</div>}

      <div
        style={{
          ...styles.success,
          opacity: showSuccess ? 1 : 0,
          transform: showSuccess ? 'translateY(0)' : 'translateY(-8px)',
        }}
      >
        ✓ 记录已保存
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: '#fff',
    borderRadius: 8,
    padding: 24,
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    borderLeft: '4px solid #1E88E5',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    transition: 'box-shadow 0.2s ease',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: 600,
    color: '#1E88E5',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontSize: 13,
    color: '#666',
    display: 'flex',
    alignItems: 'center',
  },
  input: {
    fontFamily: 'inherit',
    fontSize: 14,
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: 8,
    outline: 'none',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
    background: '#fff',
    color: '#333',
    width: '100%',
  },
  button: {
    background: '#1E88E5',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '12px 24px',
    fontSize: 15,
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.2s ease, transform 0.2s ease',
  },
  success: {
    background: '#e8f5e9',
    color: '#2e7d32',
    padding: '10px 16px',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
    textAlign: 'center' as const,
    transition: 'opacity 0.3s ease, transform 0.3s ease',
  },
  error: {
    background: '#ffebee',
    color: '#c62828',
    padding: '10px 16px',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
    textAlign: 'center' as const,
  },
};
