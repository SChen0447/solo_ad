import React, { useState, useEffect, useCallback } from 'react';
import { Member as MemberType } from '../types';
import { apiFetch } from './App';

export default function Member() {
  const [members, setMembers] = useState<MemberType[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formLevel, setFormLevel] = useState<'普通' | '银卡' | '金卡'>('普通');
  const [formCount, setFormCount] = useState(10);
  const [shakeId, setShakeId] = useState<string | null>(null);

  const load = useCallback(() => {
    apiFetch<MemberType[]>('/members').then(setMembers).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!formName.trim()) return;
    await apiFetch('/members', {
      method: 'POST',
      body: JSON.stringify({ name: formName, level: formLevel, remainingCount: formCount }),
    });
    setFormName('');
    setFormLevel('普通');
    setFormCount(10);
    setShowForm(false);
    load();
  };

  const handleCheckIn = async (id: string) => {
    try {
      await apiFetch(`/members/${id}/checkin`, { method: 'POST' });
      setShakeId(id);
      setTimeout(() => setShakeId(null), 300);
      load();
    } catch { }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: '#F1F5F9' }}>会员管理</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            padding: '8px 20px',
            background: '#3B82F6',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          + 添加会员
        </button>
      </div>

      {showForm && (
        <div style={{
          width: 400,
          background: '#1E293B',
          borderRadius: 12,
          padding: 24,
          marginBottom: 24,
          boxShadow: '0 4px 12px #00000040',
        }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 14, color: '#94A3B8', marginBottom: 6 }}>姓名</label>
            <input
              value={formName}
              onChange={e => setFormName(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #334155', background: '#0F172A', color: '#E2E8F0', fontSize: 14 }}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 14, color: '#94A3B8', marginBottom: 6 }}>会员等级</label>
            <select
              value={formLevel}
              onChange={e => setFormLevel(e.target.value as any)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #334155', background: '#0F172A', color: '#E2E8F0', fontSize: 14 }}
            >
              <option value="普通">普通</option>
              <option value="银卡">银卡</option>
              <option value="金卡">金卡</option>
            </select>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 14, color: '#94A3B8', marginBottom: 6 }}>剩余次数</label>
            <input
              type="number"
              value={formCount}
              onChange={e => setFormCount(Number(e.target.value))}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #334155', background: '#0F172A', color: '#E2E8F0', fontSize: 14 }}
            />
          </div>
          <button
            onClick={handleAdd}
            style={{ padding: '8px 24px', background: '#3B82F6', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}
          >
            确认添加
          </button>
        </div>
      )}

      <div style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 12px #00000040' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#1E293B' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 14, color: '#94A3B8', position: 'sticky', top: 0, background: '#1E293B' }}>姓名</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 14, color: '#94A3B8', position: 'sticky', top: 0, background: '#1E293B' }}>会员等级</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 14, color: '#94A3B8', position: 'sticky', top: 0, background: '#1E293B' }}>剩余次数</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 14, color: '#94A3B8', position: 'sticky', top: 0, background: '#1E293B' }}>签到</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m, i) => (
              <tr
                key={m.id}
                style={{
                  height: 48,
                  background: i % 2 === 0 ? '#0F172A' : '#1E293B',
                  transition: 'background 0.2s',
                  animation: shakeId === m.id ? 'shake 0.3s ease' : 'none',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = '#334155'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = i % 2 === 0 ? '#0F172A' : '#1E293B'; }}
              >
                <td style={{ padding: '12px 16px', fontSize: 14, color: '#E2E8F0' }}>{m.name}</td>
                <td style={{ padding: '12px 16px', fontSize: 14 }}>
                  <span style={{
                    padding: '2px 10px',
                    borderRadius: 12,
                    fontSize: 12,
                    background: m.level === '金卡' ? '#F59E0B22' : m.level === '银卡' ? '#94A3B822' : '#3B82F622',
                    color: m.level === '金卡' ? '#F59E0B' : m.level === '银卡' ? '#94A3B8' : '#3B82F6',
                  }}>
                    {m.level}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', fontSize: 14, color: '#E2E8F0' }}>{m.remainingCount}</td>
                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                  <button
                    disabled={m.remainingCount <= 0}
                    onClick={() => handleCheckIn(m.id)}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 6,
                      border: 'none',
                      background: m.remainingCount > 0 ? '#22C55E' : '#6B7280',
                      color: '#fff',
                      cursor: m.remainingCount > 0 ? 'pointer' : 'not-allowed',
                      fontSize: 14,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    ✓
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          50% { transform: translateX(4px); }
          75% { transform: translateX(-4px); }
        }
      `}</style>
    </div>
  );
}
