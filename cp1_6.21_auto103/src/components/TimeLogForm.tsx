import React, { useState, useRef, useEffect } from 'react';
import { Clock, Send } from 'lucide-react';
import { Project } from '../types';

interface Props {
  projects: Project[];
  onSubmit: (data: { projectId: string; date: string; hours: number; note: string }) => void;
  onSuccess: () => void;
}

export default function TimeLogForm({ projects, onSubmit, onSuccess }: Props) {
  const [projectId, setProjectId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [hours, setHours] = useState('');
  const [note, setNote] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const hoursRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(() => setShowSuccess(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [showSuccess]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!projectId || !hours) return;

    const hoursNum = parseFloat(hours);
    if (isNaN(hoursNum) || hoursNum <= 0) return;

    const rounded = Math.round(hoursNum * 2) / 2;
    onSubmit({ projectId, date, hours: rounded, note });
    setShowSuccess(true);
    onSuccess();

    setHours('');
    setNote('');
    setTimeout(() => hoursRef.current?.focus(), 50);
  }

  return (
    <div style={{ position: 'relative' }}>
      {showSuccess && (
        <div style={successToastStyle}>
          ✓ 工时记录已添加
        </div>
      )}
      <form onSubmit={handleSubmit} style={formStyle}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px', color: '#1F2937', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={18} /> 记录工时
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>选择项目</label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              style={selectStyle}
              required
            >
              <option value="">请选择项目</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (¥{p.hourlyRate}/h)
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>日期</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={inputStyle}
              required
            />
          </div>
          <div>
            <label style={labelStyle}>时长（小时）</label>
            <input
              ref={hoursRef}
              type="number"
              step="0.5"
              min="0.5"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              style={inputStyle}
              placeholder="如：2.5"
              required
            />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>备注（可选）</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              style={inputStyle}
              placeholder="工作内容描述..."
            />
          </div>
        </div>
        <button
          type="submit"
          style={{
            ...submitBtnStyle,
            opacity: !projectId || !hours ? 0.5 : 1,
            cursor: !projectId || !hours ? 'not-allowed' : 'pointer',
          }}
          disabled={!projectId || !hours}
        >
          <Send size={16} /> 提交记录
        </button>
      </form>
    </div>
  );
}

const formStyle: React.CSSProperties = {
  background: '#FFFFFF',
  borderRadius: '12px',
  padding: '24px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.8rem',
  fontWeight: 500,
  color: '#6B7280',
  marginBottom: '4px',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: '8px',
  border: '1px solid #D1D5DB',
  fontSize: '0.9rem',
  color: '#1F2937',
  outline: 'none',
  transition: 'border-color 0.2s',
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  background: '#fff',
};

const submitBtnStyle: React.CSSProperties = {
  marginTop: '16px',
  width: '100%',
  padding: '10px',
  borderRadius: '8px',
  border: 'none',
  background: '#4F46E5',
  color: '#fff',
  fontSize: '0.9rem',
  fontWeight: 600,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '6px',
  transition: 'background 0.2s',
};

const successToastStyle: React.CSSProperties = {
  position: 'absolute',
  top: '-12px',
  left: '50%',
  transform: 'translateX(-50%)',
  background: '#10B981',
  color: '#fff',
  padding: '8px 20px',
  borderRadius: '8px',
  fontSize: '0.85rem',
  fontWeight: 600,
  zIndex: 10,
  animation: 'fadeSlideDown 0.5s ease',
  whiteSpace: 'nowrap',
};
