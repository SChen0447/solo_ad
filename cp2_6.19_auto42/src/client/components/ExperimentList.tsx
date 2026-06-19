import React, { useState, useRef, useEffect } from 'react';
import { ExperimentInfo } from '../App';

interface Props {
  experiments: ExperimentInfo[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onRefresh: () => void;
}

function ProgressRing({ progress, size = 40 }: { progress: number; size?: number }) {
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedProgress / 100) * circumference;

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedProgress(progress), 50);
    return () => clearTimeout(timer);
  }, [progress]);

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke="rgba(255,179,0,0.15)" strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke="#FFB300" strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.6s ease-out' }}
      />
      <text
        x={size / 2} y={size / 2}
        textAnchor="middle" dominantBaseline="central"
        fill="#FFB300" fontSize={10} fontWeight={600}
        style={{ transform: 'rotate(90deg)', transformOrigin: 'center' }}
      >
        {Math.round(animatedProgress)}%
      </text>
    </svg>
  );
}

export default function ExperimentList({ experiments, selectedId, onSelect, onRefresh }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', date: '', leader: '', description: '' });
  const [submitting, setSubmitting] = useState(false);
  const [flashId, setFlashId] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showForm && formRef.current) {
      formRef.current.style.animation = 'slideInBottom 0.35s ease-out';
    }
  }, [showForm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.date || !formData.leader) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/experiments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const newExp = await res.json();
      setShowForm(false);
      setFormData({ name: '', date: '', leader: '', description: '' });
      onRefresh();
      setFlashId(newExp.id);
      setTimeout(() => setFlashId(null), 1000);
      onSelect(newExp.id);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('确定删除此实验项目？')) return;
    await fetch(`/api/experiments/${id}`, { method: 'DELETE' });
    if (selectedId === id) onSelect(null);
    onRefresh();
  };

  return (
    <div style={{ padding: '16px 12px' }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 16, padding: '0 4px',
      }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#B0AAC8' }}>实验项目</span>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            width: 28, height: 28, borderRadius: 6,
            background: showForm ? 'rgba(255,179,0,0.2)' : '#FFB300',
            border: 'none', color: showForm ? '#FFB300' : '#1A1535',
            fontSize: 16, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          {showForm ? '×' : '+'}
        </button>
      </div>

      {showForm && (
        <div ref={formRef} style={{
          background: '#3A3570', borderRadius: 10, padding: 16,
          marginBottom: 16, border: '1px solid rgba(255,179,0,0.2)',
        }}>
          <form onSubmit={handleSubmit}>
            {[
              { key: 'name', label: '项目名称', type: 'text' },
              { key: 'date', label: '实验日期', type: 'date' },
              { key: 'leader', label: '负责人', type: 'text' },
            ].map(({ key, label, type }) => (
              <div key={key} style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 11, color: '#8884A8', display: 'block', marginBottom: 3 }}>{label}</label>
                <input
                  type={type}
                  value={formData[key as keyof typeof formData]}
                  onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                  style={{
                    width: '100%', padding: '6px 10px', borderRadius: 6,
                    background: '#2A2355', border: '1px solid #4A3F80', color: '#E0E0E0',
                    fontSize: 12, outline: 'none',
                  }}
                  required
                />
              </div>
            ))}
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, color: '#8884A8', display: 'block', marginBottom: 3 }}>简短描述</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                style={{
                  width: '100%', padding: '6px 10px', borderRadius: 6,
                  background: '#2A2355', border: '1px solid #4A3F80', color: '#E0E0E0',
                  fontSize: 12, outline: 'none', resize: 'vertical', minHeight: 48,
                }}
                rows={2}
              />
            </div>
            <button type="submit" disabled={submitting} style={{
              width: '100%', padding: '8px 0', borderRadius: 6,
              background: '#FFB300', color: '#1A1535', border: 'none',
              fontSize: 12, fontWeight: 600, cursor: submitting ? 'wait' : 'pointer',
              opacity: submitting ? 0.7 : 1, transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => { if (!submitting) e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              {submitting ? '创建中...' : '创建项目'}
            </button>
          </form>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {experiments.map((exp, idx) => {
          const progress = exp.progress
            ? exp.progress.total > 0
              ? Math.round((exp.progress.completed / exp.progress.total) * 100)
              : 0
            : 0;
          const isSelected = selectedId === exp.id;
          const isFlash = flashId === exp.id;

          return (
            <div
              key={exp.id}
              onClick={() => onSelect(exp.id)}
              style={{
                padding: '12px 12px',
                borderRadius: 8,
                background: isSelected ? 'rgba(255,179,0,0.08)' : 'transparent',
                borderLeft: isSelected ? '3px solid #FFB300' : '3px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.2s',
                animation: `fadeInUp 0.3s ease-out ${idx * 0.05}s both`,
                ...(isFlash ? { animation: 'highlightFlash 1s ease-out' } : {}),
              }}
              onMouseEnter={(e) => {
                if (!isSelected) e.currentTarget.style.background = 'rgba(255,179,0,0.05)';
              }}
              onMouseLeave={(e) => {
                if (!isSelected) e.currentTarget.style.background = 'transparent';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <ProgressRing progress={progress} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13, fontWeight: 600, color: isSelected ? '#FFB300' : '#E0E0E0',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {exp.name}
                  </div>
                  <div style={{ fontSize: 11, color: '#8884A8', marginTop: 2 }}>
                    {exp.leader} · {exp.date}
                  </div>
                </div>
                <button
                  onClick={(e) => handleDelete(exp.id, e)}
                  style={{
                    background: 'transparent', border: 'none', color: '#E53935',
                    fontSize: 14, cursor: 'pointer', opacity: 0.4, padding: 4,
                    transition: 'opacity 0.2s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.4'; }}
                >✕</button>
              </div>
            </div>
          );
        })}

        {experiments.length === 0 && !showForm && (
          <div style={{ textAlign: 'center', padding: 24, color: '#6B6590', fontSize: 12 }}>
            暂无实验项目<br />点击 + 创建
          </div>
        )}
      </div>
    </div>
  );
}
