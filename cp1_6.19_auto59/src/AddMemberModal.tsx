import React, { useState } from 'react';
import { TimeSlot } from './useScheduleStore';

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; timezone: string; availability: TimeSlot[] }) => void;
  quickAddSlot?: TimeSlot | null;
}

const WEEKDAYS = [
  { value: 0, label: '周日' },
  { value: 1, label: '周一' },
  { value: 2, label: '周二' },
  { value: 3, label: '周三' },
  { value: 4, label: '周四' },
  { value: 5, label: '周五' },
  { value: 6, label: '周六' },
];

const TIMEZONES = [
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Asia/Singapore',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Australia/Sydney',
];

const AddMemberModal: React.FC<AddMemberModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  quickAddSlot,
}) => {
  const [name, setName] = useState('');
  const [timezone, setTimezone] = useState('Asia/Shanghai');
  const [availability, setAvailability] = useState<TimeSlot[]>([]);
  const [newSlot, setNewSlot] = useState<TimeSlot>({
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '12:00',
  });

  React.useEffect(() => {
    if (quickAddSlot) {
      setAvailability((prev) => {
        const exists = prev.some(
          (s) =>
            s.dayOfWeek === quickAddSlot.dayOfWeek &&
            s.startTime === quickAddSlot.startTime &&
            s.endTime === quickAddSlot.endTime
        );
        if (exists) return prev;
        return [...prev, quickAddSlot];
      });
    }
  }, [quickAddSlot]);

  React.useEffect(() => {
    if (!isOpen) {
      setName('');
      setTimezone('Asia/Shanghai');
      setAvailability([]);
      setNewSlot({ dayOfWeek: 1, startTime: '09:00', endTime: '12:00' });
    }
  }, [isOpen]);

  const handleAddSlot = () => {
    if (newSlot.startTime >= newSlot.endTime) return;
    setAvailability((prev) => [...prev, { ...newSlot }]);
  };

  const handleRemoveSlot = (index: number) => {
    setAvailability((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || availability.length === 0) return;
    onSubmit({ name: name.trim(), timezone, availability });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>添加团队成员</h2>
          <button style={styles.closeButton} onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>姓名</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="请输入成员姓名"
              style={styles.input}
              required
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>时区</label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              style={styles.select}
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>可用时间片段</label>
            <div style={styles.slotAdder}>
              <select
                value={newSlot.dayOfWeek}
                onChange={(e) =>
                  setNewSlot((s) => ({ ...s, dayOfWeek: Number(e.target.value) }))
                }
                style={{ ...styles.select, flex: 1 }}
              >
                {WEEKDAYS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
              <input
                type="time"
                value={newSlot.startTime}
                onChange={(e) =>
                  setNewSlot((s) => ({ ...s, startTime: e.target.value }))
                }
                style={{ ...styles.input, flex: 1 }}
              />
              <span style={{ alignSelf: 'center', padding: '0 4px', color: '#666' }}>
                至
              </span>
              <input
                type="time"
                value={newSlot.endTime}
                onChange={(e) =>
                  setNewSlot((s) => ({ ...s, endTime: e.target.value }))
                }
                style={{ ...styles.input, flex: 1 }}
              />
              <button
                type="button"
                onClick={handleAddSlot}
                style={styles.addSlotButton}
              >
                +
              </button>
            </div>
            <p style={styles.hint}>提示：也可在日历网格上直接点击快速添加时段</p>

            {availability.length > 0 && (
              <div style={styles.slotList}>
                {availability.map((slot, idx) => (
                  <div key={idx} style={styles.slotTag}>
                    <span>
                      {WEEKDAYS.find((d) => d.value === slot.dayOfWeek)?.label}{' '}
                      {slot.startTime} - {slot.endTime}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSlot(idx)}
                      style={styles.removeSlotButton}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={styles.actions}>
            <button type="button" onClick={onClose} style={styles.cancelButton}>
              取消
            </button>
            <button
              type="submit"
              style={styles.submitButton}
              disabled={!name.trim() || availability.length === 0}
            >
              确认添加
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    animation: 'fadeIn 0.3s ease-in-out',
  },
  modal: {
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 24,
    width: '90%',
    maxWidth: 520,
    maxHeight: '85vh',
    overflowY: 'auto',
    color: '#fff',
    boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 600,
    margin: 0,
  },
  closeButton: {
    background: 'none',
    border: 'none',
    color: '#999',
    fontSize: 28,
    cursor: 'pointer',
    padding: 0,
    lineHeight: 1,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  label: {
    fontSize: 14,
    color: '#ccc',
    fontWeight: 500,
  },
  input: {
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid #444',
    backgroundColor: '#2a2a2a',
    color: '#fff',
    fontSize: 14,
    transition: 'border-color 0.3s ease-in-out',
  },
  select: {
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid #444',
    backgroundColor: '#2a2a2a',
    color: '#fff',
    fontSize: 14,
  },
  slotAdder: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  addSlotButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#1976d2',
    color: '#fff',
    fontSize: 20,
    border: 'none',
    cursor: 'pointer',
    transition: 'background-color 0.3s ease-in-out',
  },
  hint: {
    fontSize: 12,
    color: '#888',
    margin: '4px 0 0 0',
  },
  slotList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    marginTop: 8,
  },
  slotTag: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    backgroundColor: '#2a2a2a',
    borderRadius: 6,
    fontSize: 13,
  },
  removeSlotButton: {
    background: 'none',
    border: 'none',
    color: '#888',
    fontSize: 18,
    cursor: 'pointer',
    padding: '0 4px',
  },
  actions: {
    display: 'flex',
    gap: 12,
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  cancelButton: {
    padding: '10px 20px',
    borderRadius: 8,
    backgroundColor: 'transparent',
    color: '#ccc',
    border: '1px solid #555',
    fontSize: 14,
    cursor: 'pointer',
    transition: 'all 0.3s ease-in-out',
  },
  submitButton: {
    padding: '10px 20px',
    borderRadius: 8,
    backgroundColor: '#1976d2',
    color: '#fff',
    border: 'none',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.3s ease-in-out',
  },
};

export default AddMemberModal;
