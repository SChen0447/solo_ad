import React, { useState } from 'react';
import { detectConflicts } from './utils/conflictDetection';
import type { Member, TimeSlot, Event as CalendarEvent, ConflictResult } from './utils/conflictDetection';

interface EventManagerProps {
  teamId: string;
  members: Member[];
  slots: TimeSlot[];
  currentDate: Date;
  conflictResult: ConflictResult | null;
  onCreateEvent: (event: Omit<CalendarEvent, 'id' | 'created_at'>) => void;
  onCheckConflicts: (rangeStart: string, rangeEnd: string, durationMinutes: number) => void;
  onClearConflict: () => void;
}

const EventManager: React.FC<EventManagerProps> = ({
  teamId,
  members,
  slots,
  currentDate,
  conflictResult,
  onCreateEvent,
  onCheckConflicts,
  onClearConflict,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [category, setCategory] = useState<'work' | 'personal' | 'team'>('team');
  const [isChecking, setIsChecking] = useState(false);
  const [quickResult, setQuickResult] = useState<ConflictResult | null>(null);

  const handleQuickCheck = () => {
    const rangeStart = new Date(startDate + 'T00:00:00').toISOString();
    const rangeEnd = new Date(endDate + 'T23:59:59').toISOString();
    const result = detectConflicts(members, slots, rangeStart, rangeEnd, durationMinutes);
    setQuickResult(result);
  };

  const handleServerCheck = async () => {
    setIsChecking(true);
    const rangeStart = new Date(startDate + 'T00:00:00').toISOString();
    const rangeEnd = new Date(endDate + 'T23:59:59').toISOString();
    await onCheckConflicts(rangeStart, rangeEnd, durationMinutes);
    setIsChecking(false);
  };

  const handleCreateEvent = (slotStart: string, slotEnd: string) => {
    if (!eventTitle.trim()) {
      alert('请输入活动名称');
      return;
    }
    onCreateEvent({
      team_id: teamId,
      title: eventTitle.trim(),
      start_time: slotStart,
      end_time: slotEnd,
      category,
    });
    setEventTitle('');
    setIsOpen(false);
    onClearConflict();
  };

  const formatDateTime = (isoStr: string) => {
    const d = new Date(isoStr);
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    return `${month}月${day}日 ${hours}:${minutes}`;
  };

  const durationLabels = [
    { value: 15, label: '15分钟' },
    { value: 30, label: '30分钟' },
    { value: 60, label: '1小时' },
    { value: 90, label: '1.5小时' },
    { value: 120, label: '2小时' },
  ];

  if (!isOpen) {
    return (
      <button
        style={styles.fab}
        onClick={() => setIsOpen(true)}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'scale(1.05)';
          e.currentTarget.style.boxShadow = '0 6px 20px rgba(49, 130, 206, 0.4)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(49, 130, 206, 0.3)';
        }}
      >
        + 新建活动
      </button>
    );
  }

  const displayResult = conflictResult || quickResult;

  return (
    <div style={styles.overlay} onClick={() => setIsOpen(false)}>
      <div style={styles.panel} onClick={e => e.stopPropagation()}>
        <div style={styles.panelHeader}>
          <h3 style={styles.panelTitle}>创建活动</h3>
          <button
            style={styles.closeBtn}
            onClick={() => {
              setIsOpen(false);
              onClearConflict();
              setQuickResult(null);
            }}
          >
            ✕
          </button>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>活动名称</label>
          <input
            type="text"
            style={styles.input}
            value={eventTitle}
            onChange={e => setEventTitle(e.target.value)}
            placeholder="例如：周会、团建、评审..."
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>活动类别</label>
          <div style={styles.categoryButtons}>
            {[
              { value: 'work', label: '工作', color: '#dd6b20' },
              { value: 'personal', label: '个人', color: '#805ad5' },
              { value: 'team', label: '团队', color: '#3182ce' },
            ].map(cat => (
              <button
                key={cat.value}
                style={{
                  ...styles.categoryBtn,
                  ...(category === cat.value ? {
                    backgroundColor: cat.color,
                    color: 'white',
                    borderColor: cat.color,
                  } : {}),
                }}
                onClick={() => setCategory(cat.value as 'work' | 'personal' | 'team')}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        <div style={styles.formRow}>
          <div style={{ ...styles.formGroup, flex: 1 }}>
            <label style={styles.label}>开始日期</label>
            <input
              type="date"
              style={styles.input}
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />
          </div>
          <div style={{ ...styles.formGroup, flex: 1, marginLeft: '12px' }}>
            <label style={styles.label}>结束日期</label>
            <input
              type="date"
              style={styles.input}
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
            />
          </div>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>活动时长</label>
          <div style={styles.durationButtons}>
            {durationLabels.map(d => (
              <button
                key={d.value}
                style={{
                  ...styles.durationBtn,
                  ...(durationMinutes === d.value ? {
                    backgroundColor: '#3182ce',
                    color: 'white',
                    borderColor: '#3182ce',
                  } : {}),
                }}
                onClick={() => setDurationMinutes(d.value)}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <div style={styles.buttonRow}>
          <button
            style={styles.secondaryBtn}
            onClick={handleQuickCheck}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            ⚡ 快速检测
          </button>
          <button
            style={styles.primaryBtn}
            onClick={handleServerCheck}
            disabled={isChecking}
            onMouseEnter={e => {
              if (!isChecking) e.currentTarget.style.transform = 'scale(1.02)';
            }}
            onMouseLeave={e => {
              if (!isChecking) e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            {isChecking ? '检测中...' : '🔍 精确检测'}
          </button>
        </div>

        {displayResult && (
          <div style={styles.resultSection}>
            <div style={styles.resultHeader}>
              <span style={styles.resultTitle}>检测结果</span>
              <span style={styles.resultCount}>
                {displayResult.availableSlots.length} 个可用时段
              </span>
            </div>

            <div style={styles.resultList}>
              {displayResult.availableSlots.length === 0 ? (
                <div style={styles.emptyResult}>
                  <span style={{ fontSize: '24px', marginBottom: '8px' }}>😔</span>
                  <p style={styles.emptyText}>没有找到所有人都空闲的时段</p>
                  <p style={styles.emptyHint}>试试扩大日期范围或缩短活动时长</p>
                </div>
              ) : (
                displayResult.availableSlots.map((slot, i) => {
                  const startTime = new Date(slot.start);
                  const endTime = new Date(slot.end);
                  const totalMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
                  return (
                    <div key={i} style={styles.resultItem}>
                      <div style={styles.resultTime}>
                        {formatDateTime(slot.start)} - {formatDateTime(slot.end)}
                      </div>
                      <div style={styles.resultMeta}>
                        <span style={styles.availableBadge}>
                          {members.length}/{members.length} 人可用
                        </span>
                        <span style={styles.durationBadge}>
                          {Math.floor(totalMinutes / 60)}小时{totalMinutes % 60 > 0 ? `${totalMinutes % 60}分` : ''}
                        </span>
                      </div>
                      <button
                        style={styles.bookBtn}
                        onClick={() => handleCreateEvent(slot.start, 
                          new Date(new Date(slot.start).getTime() + durationMinutes * 60 * 1000).toISOString()
                        )}
                        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                      >
                        选这个
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {displayResult.partialConflicts.length > 0 && (
              <div style={styles.partialSection}>
                <p style={styles.partialTitle}>部分冲突时段 ({displayResult.partialConflicts.length})</p>
                <div style={styles.partialList}>
                  {displayResult.partialConflicts.slice(0, 3).map((p, i) => (
                    <div key={i} style={styles.partialItem}>
                      <span>{formatDateTime(p.start)}</span>
                      <span style={styles.partialCount}>
                        {p.availableCount}/{members.length} 人可用
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        input:focus {
          border-color: #3182ce !important;
          box-shadow: 0 0 0 3px rgba(49, 130, 206, 0.3) !important;
        }
      `}</style>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  fab: {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    padding: '14px 24px',
    fontSize: '14px',
    fontWeight: '600',
    color: 'white',
    backgroundColor: '#3182ce',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(49, 130, 206, 0.3)',
    transition: 'all 0.2s ease',
    zIndex: 50,
  },
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    animation: 'fadeIn 0.2s ease',
  },
  panel: {
    backgroundColor: 'white',
    borderRadius: '12px',
    width: '100%',
    maxWidth: '480px',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    animation: 'slideUp 0.3s ease',
  },
  panelHeader: {
    padding: '20px 24px',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  panelTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#2d3748',
    margin: 0,
  },
  closeBtn: {
    fontSize: '20px',
    color: '#a0aec0',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: '4px',
    transition: 'all 0.2s ease',
  },
  formGroup: {
    marginBottom: '16px',
  },
  formRow: {
    display: 'flex',
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '500',
    color: '#4a5568',
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '14px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    outline: 'none',
    transition: 'all 0.2s ease',
    boxSizing: 'border-box',
  },
  categoryButtons: {
    display: 'flex',
    gap: '8px',
  },
  categoryBtn: {
    flex: 1,
    padding: '10px',
    fontSize: '13px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    backgroundColor: 'white',
    color: '#4a5568',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontWeight: '500',
  },
  durationButtons: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  durationBtn: {
    padding: '8px 14px',
    fontSize: '12px',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
    backgroundColor: 'white',
    color: '#4a5568',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  buttonRow: {
    display: 'flex',
    gap: '12px',
    marginBottom: '20px',
  },
  primaryBtn: {
    flex: 1,
    padding: '12px',
    fontSize: '14px',
    fontWeight: '600',
    color: 'white',
    backgroundColor: '#3182ce',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'transform 0.2s ease',
  },
  secondaryBtn: {
    flex: 1,
    padding: '12px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#3182ce',
    backgroundColor: 'white',
    border: '1px solid #3182ce',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'transform 0.2s ease',
  },
  resultSection: {
    borderTop: '1px solid #e2e8f0',
    paddingTop: '16px',
  },
  resultHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  resultTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#2d3748',
  },
  resultCount: {
    fontSize: '12px',
    color: '#38a169',
    fontWeight: '500',
  },
  resultList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    maxHeight: '240px',
    overflowY: 'auto',
  },
  resultItem: {
    padding: '12px',
    backgroundColor: '#f7fafc',
    borderRadius: '8px',
    borderLeft: '4px solid #38a169',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  resultTime: {
    fontSize: '13px',
    fontWeight: '500',
    color: '#2d3748',
  },
  resultMeta: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  availableBadge: {
    fontSize: '11px',
    padding: '2px 8px',
    backgroundColor: '#c6f6d5',
    color: '#22543d',
    borderRadius: '10px',
    fontWeight: '500',
  },
  durationBadge: {
    fontSize: '11px',
    padding: '2px 8px',
    backgroundColor: '#e2e8f0',
    color: '#4a5568',
    borderRadius: '10px',
  },
  bookBtn: {
    alignSelf: 'flex-end',
    padding: '6px 14px',
    fontSize: '12px',
    fontWeight: '600',
    color: 'white',
    backgroundColor: '#38a169',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'transform 0.2s ease',
    marginTop: '4px',
  },
  emptyResult: {
    padding: '24px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: '14px',
    color: '#718096',
    margin: '0 0 4px 0',
  },
  emptyHint: {
    fontSize: '12px',
    color: '#a0aec0',
    margin: 0,
  },
  partialSection: {
    marginTop: '12px',
    paddingTop: '12px',
    borderTop: '1px dashed #e2e8f0',
  },
  partialTitle: {
    fontSize: '12px',
    color: '#d69e2e',
    margin: '0 0 8px 0',
    fontWeight: '500',
  },
  partialList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  partialItem: {
    fontSize: '12px',
    color: '#718096',
    padding: '6px 8px',
    backgroundColor: '#fffff0',
    borderRadius: '4px',
    display: 'flex',
    justifyContent: 'space-between',
  },
  partialCount: {
    color: '#d69e2e',
    fontWeight: '500',
  },
};

export default EventManager;
