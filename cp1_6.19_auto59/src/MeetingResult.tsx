import React, { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { useScheduleStore, Suggestion } from './useScheduleStore';

interface MeetingResultProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateMeeting?: (startTime: string, endTime: string, duration: number) => void;
}

const MeetingResult: React.FC<MeetingResultProps> = ({
  isOpen,
  onClose,
  onCreateMeeting,
}) => {
  const { getCommonFreeSlots, suggestions, meetings, exportToICS, members, isLoading } =
    useScheduleStore();
  const [activeTab, setActiveTab] = useState<'common' | 'suggestions'>('common');

  const commonSlots = useMemo(() => getCommonFreeSlots(), [getCommonFreeSlots]);

  const handleExportICS = () => {
    const icsData = exportToICS();
    const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `meetings-${format(new Date(), 'yyyyMMdd')}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCreateFromSlot = (slot: { start: Date; end: Date }) => {
    if (onCreateMeeting) {
      onCreateMeeting(
        slot.start.toISOString(),
        slot.end.toISOString(),
        30
      );
    }
  };

  const handleCreateFromSuggestion = (suggestion: Suggestion) => {
    if (onCreateMeeting) {
      const start = parseISO(suggestion.startTime);
      const end = parseISO(suggestion.endTime);
      const duration = (end.getTime() - start.getTime()) / 60000;
      onCreateMeeting(suggestion.startTime, suggestion.endTime, duration);
    }
  };

  const formatTimeRange = (start: Date | string, end: Date | string) => {
    const s = typeof start === 'string' ? parseISO(start) : start;
    const e = typeof end === 'string' ? parseISO(end) : end;
    return `${format(s, 'MM月dd日 HH:mm')} - ${format(e, 'HH:mm')}`;
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>会议排程结果</h2>
          <div style={styles.headerActions}>
            <button
              onClick={handleExportICS}
              style={styles.exportButton}
              disabled={meetings.length === 0}
            >
              导出日历 (.ics)
            </button>
            <button style={styles.closeButton} onClick={onClose}>
              ×
            </button>
          </div>
        </div>

        <div style={styles.tabs}>
          <button
            onClick={() => setActiveTab('common')}
            style={{
              ...styles.tabButton,
              ...(activeTab === 'common' ? styles.tabButtonActive : {}),
            }}
          >
            共同空闲时段 ({commonSlots.length})
          </button>
          <button
            onClick={() => setActiveTab('suggestions')}
            style={{
              ...styles.tabButton,
              ...(activeTab === 'suggestions' ? styles.tabButtonActive : {}),
            }}
          >
            建议时间 ({suggestions.length})
          </button>
        </div>

        <div style={styles.content}>
          {isLoading ? (
            <div style={styles.loading}>加载中...</div>
          ) : activeTab === 'common' ? (
            commonSlots.length === 0 ? (
              <div style={styles.emptyState}>
                <div style={styles.emptyIcon}>📅</div>
                <p style={styles.emptyText}>
                  暂无所有成员都空闲的时间段
                </p>
                <p style={styles.emptyHint}>
                  请尝试调整成员的可用时间，或查看"建议时间"标签
                </p>
              </div>
            ) : (
              <div style={styles.slotList}>
                {commonSlots.map((slot, idx) => (
                  <div key={idx} style={styles.slotCard}>
                    <div style={styles.slotHighlight}></div>
                    <div style={styles.slotInfo}>
                      <div style={styles.slotTime}>{formatTimeRange(slot.start, slot.end)}</div>
                      <div style={styles.slotMembers}>
                        <span style={styles.slotMemberCount}>
                          ✓ {slot.members.length} 人全部可用
                        </span>
                        <div style={styles.slotMemberAvatars}>
                          {slot.members.map((m) => (
                            <div key={m.id} style={styles.avatarSmall} title={m.name}>
                              {m.name.charAt(0)}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleCreateFromSlot(slot)}
                      style={styles.createButton}
                    >
                      安排会议
                    </button>
                  </div>
                ))}
              </div>
            )
          ) : suggestions.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>💡</div>
              <p style={styles.emptyText}>暂无建议时间</p>
              <p style={styles.emptyHint}>请先添加团队成员</p>
            </div>
          ) : (
            <div style={styles.slotList}>
              {suggestions.map((s, idx) => (
                <div key={idx} style={styles.slotCard}>
                  <div
                    style={{
                      ...styles.slotHighlight,
                      backgroundColor:
                        s.attendeeCount === members.length ? '#66bb6a' : '#ffa726',
                    }}
                  ></div>
                  <div style={styles.slotInfo}>
                    <div style={styles.slotTime}>{formatTimeRange(s.startTime, s.endTime)}</div>
                    <div style={styles.slotMembers}>
                      <span
                        style={{
                          ...styles.slotMemberCount,
                          color:
                            s.attendeeCount === members.length ? '#66bb6a' : '#ffa726',
                        }}
                      >
                        {s.attendeeCount} / {members.length} 人可用
                      </span>
                      <div style={styles.slotAttendees}>
                        {s.attendees.map((name, i) => (
                          <span key={i} style={styles.attendeeTag}>
                            {name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleCreateFromSuggestion(s)}
                    style={styles.createButton}
                  >
                    安排会议
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {meetings.length > 0 && (
          <div style={styles.scheduledSection}>
            <div style={styles.scheduledHeader}>
              <h3 style={styles.scheduledTitle}>已排会议 ({meetings.length})</h3>
            </div>
            <div style={styles.scheduledList}>
              {meetings.map((m) => (
                <div key={m.id} style={styles.meetingItem}>
                  <div style={styles.meetingColorBar}></div>
                  <div style={styles.meetingInfo}>
                    <div style={styles.meetingTitle}>{m.title}</div>
                    <div style={styles.meetingTime}>
                      {formatTimeRange(m.startTime, m.endTime)}
                    </div>
                    {m.description && (
                      <div style={styles.meetingDesc}>{m.description}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
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
  },
  modal: {
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 24,
    width: '90%',
    maxWidth: 640,
    maxHeight: '85vh',
    display: 'flex',
    flexDirection: 'column',
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
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
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
  exportButton: {
    padding: '8px 16px',
    borderRadius: 6,
    backgroundColor: '#1976d2',
    color: '#fff',
    fontSize: 13,
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.3s ease-in-out',
  },
  tabs: {
    display: 'flex',
    gap: 8,
    marginBottom: 16,
    borderBottom: '1px solid #333',
    paddingBottom: 0,
  },
  tabButton: {
    padding: '10px 20px',
    backgroundColor: 'transparent',
    color: '#888',
    border: 'none',
    borderBottom: '2px solid transparent',
    fontSize: 14,
    cursor: 'pointer',
    marginBottom: -1,
    transition: 'all 0.3s ease-in-out',
  },
  tabButtonActive: {
    color: '#1976d2',
    borderBottomColor: '#1976d2',
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    minHeight: 200,
  },
  loading: {
    textAlign: 'center',
    padding: 40,
    color: '#888',
  },
  emptyState: {
    textAlign: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#ccc',
    margin: '0 0 8px 0',
  },
  emptyHint: {
    fontSize: 13,
    color: '#666',
    margin: 0,
  },
  slotList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  slotCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    padding: 14,
    backgroundColor: '#2a2a2a',
    borderRadius: 10,
    border: '1px solid #333',
    transition: 'all 0.3s ease-in-out',
  },
  slotHighlight: {
    width: 4,
    alignSelf: 'stretch',
    backgroundColor: '#66bb6a',
    borderRadius: 2,
    marginLeft: -6,
    marginTop: -4,
    marginBottom: -4,
  },
  slotInfo: {
    flex: 1,
  },
  slotTime: {
    fontSize: 15,
    fontWeight: 600,
    marginBottom: 6,
  },
  slotMembers: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  slotMemberCount: {
    fontSize: 12,
    color: '#66bb6a',
    fontWeight: 500,
  },
  slotMemberAvatars: {
    display: 'flex',
    gap: -4,
  },
  avatarSmall: {
    width: 22,
    height: 22,
    borderRadius: '50%',
    backgroundColor: '#1976d2',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 10,
    color: '#fff',
    border: '2px solid #2a2a2a',
    marginLeft: -6,
  },
  slotAttendees: {
    display: 'flex',
    gap: 4,
    flexWrap: 'wrap',
  },
  attendeeTag: {
    fontSize: 11,
    padding: '2px 8px',
    backgroundColor: '#3a3a3a',
    borderRadius: 10,
    color: '#ccc',
  },
  createButton: {
    padding: '8px 16px',
    borderRadius: 6,
    backgroundColor: '#1976d2',
    color: '#fff',
    fontSize: 13,
    border: 'none',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.3s ease-in-out',
  },
  scheduledSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTop: '1px solid #333',
  },
  scheduledHeader: {
    marginBottom: 12,
  },
  scheduledTitle: {
    fontSize: 15,
    fontWeight: 600,
    margin: 0,
    color: '#ccc',
  },
  scheduledList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    maxHeight: 160,
    overflowY: 'auto',
  },
  meetingItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    backgroundColor: '#252525',
    borderRadius: 8,
  },
  meetingColorBar: {
    width: 3,
    alignSelf: 'stretch',
    backgroundColor: '#1976d2',
    borderRadius: 2,
  },
  meetingInfo: {
    flex: 1,
  },
  meetingTitle: {
    fontSize: 14,
    fontWeight: 500,
    marginBottom: 2,
  },
  meetingTime: {
    fontSize: 12,
    color: '#888',
  },
  meetingDesc: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
};

export default MeetingResult;
