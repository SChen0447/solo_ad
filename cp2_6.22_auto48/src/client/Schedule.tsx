import React, { useState, useEffect, useCallback, memo } from 'react';
import { Course, Member as MemberType } from '../types';
import { apiFetch } from './App';

const DAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
const TIME_SLOTS = ['08:00-09:30', '09:30-11:00', '11:00-12:30', '12:30-14:00', '14:00-15:30', '15:30-17:00'];

interface ScheduleCellProps {
  course: Course | undefined;
  isMorning: boolean;
  onBook: (courseId: string) => void;
}

const ScheduleCell = memo(function ScheduleCell({ course, isMorning, onBook }: ScheduleCellProps) {
  return (
    <td style={{ padding: 8, borderBottom: '1px solid #334155', borderRight: '1px solid #334155', background: isMorning ? '#F8FAFC0D' : '#E2E8F00D', verticalAlign: 'top' }}>
      {course ? (
        <div style={{ position: 'relative', minHeight: 80, aspectRatio: '1.2/1' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#F1F5F9', marginBottom: 4 }}>{course.name}</div>
          <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 4 }}>{course.coachName}</div>
          <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 8 }}>{course.currentBookings}/{course.maxCapacity}</div>
          {course.currentBookings >= course.maxCapacity ? (
            <div style={{ fontSize: 12, color: '#EF4444', textAlign: 'center' }}>满员</div>
          ) : (
            <button
              onClick={() => onBook(course.id)}
              style={{
                width: 80,
                height: 32,
                borderRadius: 4,
                border: 'none',
                background: '#3B82F6',
                color: '#fff',
                cursor: 'pointer',
                fontSize: 12,
                position: 'absolute',
                bottom: 0,
                right: 0,
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.background = '#2563EB';
                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = '#3B82F6';
                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
              }}
            >
              立即预约
            </button>
          )}
        </div>
      ) : (
        <div style={{ minHeight: 80, aspectRatio: '1.2/1' }} />
      )}
    </td>
  );
}, (prev, next) => {
  if (prev.isMorning !== next.isMorning) return false;
  if (prev.onBook !== next.onBook) return false;
  if (!prev.course && !next.course) return true;
  if (!prev.course || !next.course) return false;
  return (
    prev.course.id === next.course.id &&
    prev.course.currentBookings === next.course.currentBookings &&
    prev.course.maxCapacity === next.course.maxCapacity
  );
});

export default function Schedule() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [members, setMembers] = useState<MemberType[]>([]);
  const [selectedMember, setSelectedMember] = useState<string>('');

  const load = useCallback(() => {
    apiFetch<Course[]>('/courses').then(setCourses).catch(() => {});
    apiFetch<MemberType[]>('/members').then(m => { setMembers(m); if (m.length && !selectedMember) setSelectedMember(m[0].id); }).catch(() => {});
  }, [selectedMember]);

  useEffect(() => { load(); }, [load]);

  const handleBook = async (courseId: string) => {
    if (!selectedMember) return;
    try {
      await apiFetch(`/courses/${courseId}/book`, {
        method: 'POST',
        body: JSON.stringify({ memberId: selectedMember }),
      });
      load();
    } catch { }
  };

  const getCourseForSlot = (day: number, slot: number) => {
    return courses.find(c => c.day === day + 1 && c.timeSlot === slot);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: '#F1F5F9' }}>课程预约</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, color: '#94A3B8' }}>选择会员：</span>
          <select
            value={selectedMember}
            onChange={e => setSelectedMember(e.target.value)}
            style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #334155', background: '#1E293B', color: '#E2E8F0', fontSize: 14 }}
          >
            {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
      </div>

      <div style={{ borderRadius: 16, overflow: 'auto', boxShadow: '0 4px 12px #00000040' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
          <thead>
            <tr>
              <th style={{ padding: '12px 8px', background: '#1E293B', color: '#94A3B8', fontSize: 13, textAlign: 'center', position: 'sticky', top: 0, minWidth: 80 }}>时段</th>
              {DAYS.map(d => (
                <th key={d} style={{ padding: '12px 8px', background: '#1E293B', color: '#94A3B8', fontSize: 13, textAlign: 'center', position: 'sticky', top: 0 }}>{d}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TIME_SLOTS.map((time, slotIdx) => (
              <tr key={slotIdx}>
                <td style={{ padding: '8px', background: '#1E293B', color: '#94A3B8', fontSize: 12, textAlign: 'center', borderBottom: '1px solid #334155' }}>{time}</td>
                {DAYS.map((_, dayIdx) => (
                  <ScheduleCell
                    key={dayIdx}
                    course={getCourseForSlot(dayIdx, slotIdx)}
                    isMorning={slotIdx < 3}
                    onBook={handleBook}
                  />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
