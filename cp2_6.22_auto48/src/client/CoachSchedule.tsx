import React, { useState, useEffect, useCallback } from 'react';
import { Coach, ScheduleSlot } from '../types';
import { apiFetch } from './App';

const DAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
const SLOT_COUNT = 24;
const START_HOUR = 8;

export default function CoachSchedule() {
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [selectedCoach, setSelectedCoach] = useState<string>('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [formDay, setFormDay] = useState(1);
  const [formStartSlot, setFormStartSlot] = useState(0);
  const [formEndSlot, setFormEndSlot] = useState(2);
  const [formCourseName, setFormCourseName] = useState('');
  const [formRoom, setFormRoom] = useState('');

  const load = useCallback(() => {
    apiFetch<Coach[]>('/coaches').then(c => { setCoaches(c); if (c.length && !selectedCoach) setSelectedCoach(c[0].id); }).catch(() => {});
  }, [selectedCoach]);

  useEffect(() => { load(); }, [load]);

  const coach = coaches.find(c => c.id === selectedCoach);

  const handleAddSchedule = async () => {
    if (!formCourseName || !formRoom) return;
    await apiFetch(`/coaches/${selectedCoach}/schedule`, {
      method: 'POST',
      body: JSON.stringify({ day: formDay, startSlot: formStartSlot, endSlot: formEndSlot, courseName: formCourseName, room: formRoom }),
    });
    setShowAddForm(false);
    setFormCourseName('');
    setFormRoom('');
    load();
  };

  const getSlotLabel = (slotIndex: number) => {
    const totalMinutes = slotIndex * 30;
    const hours = START_HOUR + Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  const getSlotsForDay = (day: number): ScheduleSlot[] => {
    if (!coach) return [];
    return coach.schedule.filter(s => s.day === day);
  };

  const renderGanttCell = (day: number, slot: number) => {
    const slots = getSlotsForDay(day);
    const matching = slots.find(s => slot >= s.startSlot && slot < s.endSlot);
    if (matching && slot === matching.startSlot) {
      const span = matching.endSlot - matching.startSlot;
      return (
        <div
          key={`${day}-${slot}`}
          style={{
            gridRow: `span ${span}`,
            background: '#22C55E',
            borderRadius: 4,
            padding: '4px 6px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            color: '#fff',
            fontSize: 12,
            minHeight: span * 28,
          }}
        >
          <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{matching.courseName}</div>
          <div style={{ opacity: 0.8 }}>{matching.room}</div>
        </div>
      );
    }
    if (matching && slot > matching.startSlot && slot < matching.endSlot) {
      return null;
    }
    return (
      <div key={`${day}-${slot}`} style={{ background: '#475569', borderRadius: 2, minHeight: 28 }} />
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: '#F1F5F9' }}>教练排班</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <select
            value={selectedCoach}
            onChange={e => setSelectedCoach(e.target.value)}
            style={{
              width: 240,
              height: 40,
              borderRadius: 8,
              background: '#1E293B',
              border: 'none',
              color: '#E2E8F0',
              fontSize: 14,
              padding: '0 12px',
              cursor: 'pointer',
              appearance: 'none',
            }}
          >
            {coaches.map(c => <option key={c.id} value={c.id}>{c.name} - {c.specialty}</option>)}
          </select>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: '#F59E0B',
              border: 'none',
              color: '#fff',
              fontSize: 24,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'transform 0.4s ease-out',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'rotate(180deg)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'rotate(0)'; }}
          >
            +
          </button>
        </div>
      </div>

      {showAddForm && (
        <div style={{
          background: '#1E293B',
          borderRadius: 12,
          padding: 24,
          marginBottom: 24,
          boxShadow: '0 4px 12px #00000040',
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
          alignItems: 'flex-end',
        }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#94A3B8', marginBottom: 4 }}>星期</label>
            <select value={formDay} onChange={e => setFormDay(Number(e.target.value))} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #334155', background: '#0F172A', color: '#E2E8F0', fontSize: 13 }}>
              {DAYS.map((d, i) => <option key={i} value={i + 1}>{d}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#94A3B8', marginBottom: 4 }}>开始时段</label>
            <select value={formStartSlot} onChange={e => setFormStartSlot(Number(e.target.value))} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #334155', background: '#0F172A', color: '#E2E8F0', fontSize: 13 }}>
              {Array.from({ length: SLOT_COUNT }, (_, i) => <option key={i} value={i}>{getSlotLabel(i)}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#94A3B8', marginBottom: 4 }}>结束时段</label>
            <select value={formEndSlot} onChange={e => setFormEndSlot(Number(e.target.value))} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #334155', background: '#0F172A', color: '#E2E8F0', fontSize: 13 }}>
              {Array.from({ length: SLOT_COUNT + 1 }, (_, i) => <option key={i} value={i}>{getSlotLabel(i)}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#94A3B8', marginBottom: 4 }}>课程名称</label>
            <input value={formCourseName} onChange={e => setFormCourseName(e.target.value)} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #334155', background: '#0F172A', color: '#E2E8F0', fontSize: 13, width: 120 }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#94A3B8', marginBottom: 4 }}>教室</label>
            <input value={formRoom} onChange={e => setFormRoom(e.target.value)} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #334155', background: '#0F172A', color: '#E2E8F0', fontSize: 13, width: 80 }} />
          </div>
          <button onClick={handleAddSchedule} style={{ padding: '6px 20px', borderRadius: 8, border: 'none', background: '#3B82F6', color: '#fff', cursor: 'pointer', fontSize: 13 }}>确认添加</button>
        </div>
      )}

      <div style={{ borderRadius: 16, overflow: 'auto', boxShadow: '0 4px 12px #00000040', background: '#1E293B' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
          <thead>
            <tr>
              <th style={{ padding: '10px 8px', background: '#0F172A', color: '#94A3B8', fontSize: 12, textAlign: 'center', position: 'sticky', top: 0, minWidth: 60 }}>时间</th>
              {DAYS.map(d => (
                <th key={d} style={{ padding: '10px 8px', background: '#0F172A', color: '#94A3B8', fontSize: 12, textAlign: 'center', position: 'sticky', top: 0 }}>{d}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: SLOT_COUNT }, (_, slotIdx) => (
              <tr key={slotIdx}>
                <td style={{ padding: '4px 8px', background: '#0F172A', color: '#64748B', fontSize: 11, textAlign: 'center', borderBottom: '1px solid #1E293B', whiteSpace: 'nowrap' }}>
                  {slotIdx % 2 === 0 ? getSlotLabel(slotIdx) : ''}
                </td>
                {DAYS.map((_, dayIdx) => (
                  <td key={dayIdx} style={{ padding: 2, borderBottom: '1px solid #1E293B', borderRight: '1px solid #1E293B', verticalAlign: 'top' }}>
                    {renderGanttCell(dayIdx + 1, slotIdx)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
