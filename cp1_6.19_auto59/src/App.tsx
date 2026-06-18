import React, { useState, useEffect, useCallback } from 'react';
import { addMinutes, format } from 'date-fns';
import CalendarGrid from './CalendarGrid';
import AddMemberModal from './AddMemberModal';
import MeetingResult from './MeetingResult';
import {
  useScheduleStore,
  TimeSlot,
} from './useScheduleStore';

interface NewMeetingData {
  date: Date;
  hour: number;
  minute: number;
  prefillStart?: string;
  prefillEnd?: string;
  prefillDuration?: number;
}

const AVATAR_COLORS = [
  '#1976d2',
  '#388e3c',
  '#f57c00',
  '#7b1fa2',
  '#c62828',
  '#00838f',
  '#ef6c00',
  '#455a64',
];

const DURATION_OPTIONS = [15, 30, 45, 60];

const App: React.FC = () => {
  const {
    members,
    meetings,
    fetchData,
    fetchSuggestions,
    addMember,
    deleteMember,
    reorderMembers,
    addMeeting,
    isSlotAllAvailable,
  } = useScheduleStore();

  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isMeetingResultOpen, setIsMeetingResultOpen] = useState(false);
  const [isNewMeetingOpen, setIsNewMeetingOpen] = useState(false);
  const [isMemberPanelOpen, setIsMemberPanelOpen] = useState(false);
  const [quickAddSlot, setQuickAddSlot] = useState<TimeSlot | null>(null);
  const [newMeetingData, setNewMeetingData] = useState<NewMeetingData | null>(null);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [draggedMember, setDraggedMember] = useState<string | null>(null);
  const [dragOverMember, setDragOverMember] = useState<string | null>(null);

  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingDuration, setMeetingDuration] = useState(30);
  const [meetingDescription, setMeetingDescription] = useState('');

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSuggestTime = useCallback(async () => {
    await fetchSuggestions(7);
    setIsMeetingResultOpen(true);
  }, [fetchSuggestions]);

  const handleAddMember = useCallback(
    async (data: { name: string; timezone: string; availability: TimeSlot[] }) => {
      await addMember(data);
    },
    [addMember]
  );

  const handleSlotClick = useCallback(
    (date: Date, hour: number, minute: number) => {
      if (isSlotAllAvailable(date, hour, minute)) {
        setNewMeetingData({ date, hour, minute });
        setMeetingTitle('');
        setMeetingDuration(30);
        setMeetingDescription('');
        setIsNewMeetingOpen(true);
      }
    },
    [isSlotAllAvailable]
  );

  const handleQuickAddSlot = useCallback(
    (dayOfWeek: number, startTime: string, endTime: string) => {
      setQuickAddSlot({ dayOfWeek, startTime, endTime });
      if (!isAddMemberOpen) {
        setIsAddMemberOpen(true);
      }
    },
    [isAddMemberOpen]
  );

  const handleCreateMeetingFromResult = useCallback(
    (startTime: string, endTime: string, duration: number) => {
      const startDate = new Date(startTime);
      setNewMeetingData({
        date: startDate,
        hour: startDate.getHours(),
        minute: startDate.getMinutes(),
        prefillStart: startTime,
        prefillEnd: endTime,
        prefillDuration: duration,
      });
      setMeetingTitle('');
      setMeetingDuration(duration);
      setMeetingDescription('');
      setIsMeetingResultOpen(false);
      setIsNewMeetingOpen(true);
    },
    []
  );

  const handleSaveMeeting = useCallback(async () => {
    if (!newMeetingData || !meetingTitle.trim()) return;

    const startTime = newMeetingData.prefillStart
      ? new Date(newMeetingData.prefillStart)
      : (() => {
          const d = new Date(newMeetingData.date);
          d.setHours(newMeetingData.hour, newMeetingData.minute, 0, 0);
          return d;
        })();
    const endTime = newMeetingData.prefillEnd
      ? new Date(newMeetingData.prefillEnd)
      : addMinutes(startTime, meetingDuration);

    await addMeeting({
      title: meetingTitle.trim(),
      description: meetingDescription.trim(),
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      duration: newMeetingData.prefillDuration || meetingDuration,
      attendees: members.map((m) => m.id),
    });

    setIsNewMeetingOpen(false);
    setNewMeetingData(null);
  }, [newMeetingData, meetingTitle, meetingDuration, meetingDescription, addMeeting, members]);

  const handleDragStart = useCallback((e: React.DragEvent, memberId: string) => {
    setDraggedMember(memberId);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, memberId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverMember !== memberId) {
      setDragOverMember(memberId);
    }
  }, [dragOverMember]);

  const handleDragLeave = useCallback(() => {
    setDragOverMember(null);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent, targetId: string) => {
      e.preventDefault();
      if (!draggedMember || draggedMember === targetId) {
        setDraggedMember(null);
        setDragOverMember(null);
        return;
      }

      const newOrder = members.map((m) => m.id);
      const draggedIdx = newOrder.indexOf(draggedMember);
      const targetIdx = newOrder.indexOf(targetId);
      newOrder.splice(draggedIdx, 1);
      newOrder.splice(targetIdx, 0, draggedMember);

      await reorderMembers(newOrder);
      setDraggedMember(null);
      setDragOverMember(null);
    },
    [draggedMember, members, reorderMembers]
  );

  const handleDragEnd = useCallback(() => {
    setDraggedMember(null);
    setDragOverMember(null);
  }, []);

  const formatMeetingTime = () => {
    if (!newMeetingData) return '';
    const start = newMeetingData.prefillStart
      ? new Date(newMeetingData.prefillStart)
      : (() => {
          const d = new Date(newMeetingData.date);
          d.setHours(newMeetingData.hour, newMeetingData.minute, 0, 0);
          return d;
        })();
    const end = newMeetingData.prefillEnd
      ? new Date(newMeetingData.prefillEnd)
      : addMinutes(start, meetingDuration);
    return `${format(start, 'MM月dd日 HH:mm')} - ${format(end, 'HH:mm')}`;
  };

  const getAvatarColor = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
  };

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          {isMobile && (
            <button
              onClick={() => setIsMemberPanelOpen(!isMemberPanelOpen)}
              style={styles.menuButton}
            >
              ☰
            </button>
          )}
          <h1 style={styles.appTitle}>📅 会议碰撞排程</h1>
        </div>
        <div style={styles.headerRight}>
          <button onClick={handleSuggestTime} style={styles.suggestButton}>
            💡 建议时间
          </button>
        </div>
      </header>

      <div style={styles.main}>
        <div style={styles.calendarSection}>
          <div style={styles.calendarHeader}>
            <div>
              <h2 style={styles.calendarTitle}>团队日历视图</h2>
              <p style={styles.calendarSubtitle}>
                热力图显示各时段空闲人数，点击全员空闲的格子可创建会议
              </p>
            </div>
            <div style={styles.legend}>
              <div style={styles.legendItem}>
                <span style={{ ...styles.legendDot, backgroundColor: '#e8f5e9' }}></span>
                <span>0人</span>
              </div>
              <div style={styles.legendItem}>
                <span style={{ ...styles.legendDot, backgroundColor: '#a5d6a7' }}></span>
                <span>1-2人</span>
              </div>
              <div style={styles.legendItem}>
                <span style={{ ...styles.legendDot, backgroundColor: '#66bb6a' }}></span>
                <span>3-4人</span>
              </div>
              <div style={styles.legendItem}>
                <span style={{ ...styles.legendDot, backgroundColor: '#d32f2f' }}></span>
                <span>5人+</span>
              </div>
              <div style={styles.legendItem}>
                <span style={{ ...styles.legendDot, backgroundColor: '#1976d2' }}></span>
                <span>已排会议</span>
              </div>
            </div>
          </div>
          <CalendarGrid
            onSlotClick={handleSlotClick}
            onQuickAddSlot={handleQuickAddSlot}
            quickAddMode={isAddMemberOpen}
          />
        </div>

        <aside
          style={{
            ...styles.memberPanel,
            ...(isMobile
              ? isMemberPanelOpen
                ? styles.memberPanelMobileOpen
                : styles.memberPanelMobileClosed
              : {}),
          }}
        >
          <div style={styles.memberPanelHeader}>
            <h3 style={styles.memberPanelTitle}>团队成员 ({members.length})</h3>
            <button
              onClick={() => setIsAddMemberOpen(true)}
              style={styles.addMemberButton}
            >
              + 添加成员
            </button>
          </div>

          {isMobile && isMemberPanelOpen && (
            <button
              onClick={() => setIsMemberPanelOpen(false)}
              style={styles.closePanelButton}
            >
              关闭面板 ×
            </button>
          )}

          <div style={styles.memberList}>
            {members.length === 0 ? (
              <div style={styles.emptyMembers}>
                <p>暂无成员</p>
                <p style={styles.emptyMembersHint}>
                  点击上方"添加成员"按钮开始
                </p>
              </div>
            ) : (
              members.map((member) => (
                <div
                  key={member.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, member.id)}
                  onDragOver={(e) => handleDragOver(e, member.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, member.id)}
                  onDragEnd={handleDragEnd}
                  style={{
                    ...styles.memberCard,
                    ...(draggedMember === member.id ? styles.memberCardDragging : {}),
                    ...(dragOverMember === member.id && draggedMember !== member.id
                      ? styles.memberCardDragOver
                      : {}),
                    transition: 'all 0.3s ease-in-out',
                  }}
                >
                  <div style={styles.dragHandle}>⋮⋮</div>
                  <div
                    style={{
                      ...styles.avatar,
                      backgroundColor: getAvatarColor(member.name),
                    }}
                  >
                    {member.name.charAt(0)}
                  </div>
                  <div style={styles.memberInfo}>
                    <div style={styles.memberName}>{member.name}</div>
                    <div style={styles.memberMeta}>
                      <span style={styles.timezoneTag}>{member.timezone}</span>
                      <span style={styles.slotCountTag}>
                        {member.availability.length} 个可用时段
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteMember(member.id)}
                    style={styles.deleteMemberButton}
                    title="删除成员"
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>

          {meetings.length > 0 && (
            <div style={styles.upcomingMeetings}>
              <h4 style={styles.upcomingTitle}>即将到来的会议</h4>
              {meetings.slice(0, 5).map((m) => (
                <div key={m.id} style={styles.upcomingItem}>
                  <div style={styles.upcomingColorBar}></div>
                  <div>
                    <div style={styles.upcomingMeetingTitle}>{m.title}</div>
                    <div style={styles.upcomingMeetingTime}>
                      {format(new Date(m.startTime), 'MM/dd HH:mm')} -{' '}
                      {format(new Date(m.endTime), 'HH:mm')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </aside>

        {isMobile && isMemberPanelOpen && (
          <div
            style={styles.mobileOverlay}
            onClick={() => setIsMemberPanelOpen(false)}
          />
        )}
      </div>

      <AddMemberModal
        isOpen={isAddMemberOpen}
        onClose={() => {
          setIsAddMemberOpen(false);
          setQuickAddSlot(null);
        }}
        onSubmit={handleAddMember}
        quickAddSlot={quickAddSlot}
      />

      <MeetingResult
        isOpen={isMeetingResultOpen}
        onClose={() => setIsMeetingResultOpen(false)}
        onCreateMeeting={handleCreateMeetingFromResult}
      />

      {isNewMeetingOpen && newMeetingData && (
        <div style={styles.overlay} onClick={() => setIsNewMeetingOpen(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>创建新会议</h2>
              <button
                style={styles.closeButton}
                onClick={() => setIsNewMeetingOpen(false)}
              >
                ×
              </button>
            </div>
            <div style={styles.modalBody}>
              <div style={styles.field}>
                <label style={styles.label}>会议时间</label>
                <div style={styles.timeDisplay}>{formatMeetingTime()}</div>
              </div>
              <div style={styles.field}>
                <label style={styles.label}>会议标题 *</label>
                <input
                  type="text"
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                  placeholder="请输入会议标题"
                  style={styles.input}
                  autoFocus
                />
              </div>
              {!newMeetingData.prefillDuration && (
                <div style={styles.field}>
                  <label style={styles.label}>会议时长</label>
                  <div style={styles.durationOptions}>
                    {DURATION_OPTIONS.map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setMeetingDuration(d)}
                        style={{
                          ...styles.durationButton,
                          ...(meetingDuration === d
                            ? styles.durationButtonActive
                            : {}),
                        }}
                      >
                        {d}分钟
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div style={styles.field}>
                <label style={styles.label}>会议描述</label>
                <textarea
                  value={meetingDescription}
                  onChange={(e) => setMeetingDescription(e.target.value)}
                  placeholder="可选，输入会议描述"
                  style={styles.textarea}
                  rows={3}
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>参与人员 ({members.length}人)</label>
                <div style={styles.attendeesList}>
                  {members.map((m) => (
                    <div key={m.id} style={styles.attendeeItem}>
                      <div
                        style={{
                          ...styles.avatarMini,
                          backgroundColor: getAvatarColor(m.name),
                        }}
                      >
                        {m.name.charAt(0)}
                      </div>
                      <span>{m.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div style={styles.modalActions}>
              <button
                onClick={() => setIsNewMeetingOpen(false)}
                style={styles.cancelButton}
              >
                取消
              </button>
              <button
                onClick={handleSaveMeeting}
                style={styles.confirmButton}
                disabled={!meetingTitle.trim()}
              >
                保存会议
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  app: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#fafafa',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 24px',
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e8e8e8',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  headerRight: {
    display: 'flex',
    gap: 10,
  },
  menuButton: {
    fontSize: 22,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: 6,
  },
  appTitle: {
    fontSize: 20,
    fontWeight: 700,
    margin: 0,
    color: '#1976d2',
  },
  suggestButton: {
    padding: '8px 18px',
    borderRadius: 8,
    backgroundColor: '#1976d2',
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 500,
    transition: 'all 0.3s ease-in-out',
    boxShadow: '0 2px 6px rgba(25,118,210,0.3)',
  },
  main: {
    flex: 1,
    display: 'flex',
    padding: 16,
    gap: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  calendarSection: {
    flex: 1,
    minWidth: 0,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  calendarHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 12,
  },
  calendarTitle: {
    fontSize: 17,
    fontWeight: 600,
    margin: 0,
    color: '#333',
  },
  calendarSubtitle: {
    fontSize: 12,
    color: '#888',
    margin: '4px 0 0 0',
  },
  legend: {
    display: 'flex',
    gap: 14,
    flexWrap: 'wrap',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 11,
    color: '#666',
  },
  legendDot: {
    width: 14,
    height: 14,
    borderRadius: 3,
    border: '1px solid #ddd',
  },
  memberPanel: {
    width: 300,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    marginLeft: 0,
    display: 'flex',
    flexDirection: 'column',
    transition: 'all 0.3s ease-in-out',
  },
  memberPanelMobileClosed: {
    display: 'none',
  },
  memberPanelMobileOpen: {
    position: 'fixed',
    right: 0,
    top: 0,
    bottom: 0,
    width: '85%',
    maxWidth: 340,
    zIndex: 200,
    borderRadius: 0,
    boxShadow: '-4px 0 20px rgba(0,0,0,0.2)',
    overflowY: 'auto',
  },
  memberPanelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  memberPanelTitle: {
    fontSize: 15,
    fontWeight: 600,
    margin: 0,
    color: '#333',
  },
  addMemberButton: {
    padding: '6px 12px',
    borderRadius: 6,
    backgroundColor: '#1976d2',
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 500,
    transition: 'all 0.3s ease-in-out',
  },
  closePanelButton: {
    padding: '8px 12px',
    borderRadius: 6,
    backgroundColor: '#e0e0e0',
    color: '#333',
    fontSize: 12,
    marginBottom: 12,
    textAlign: 'center',
    width: '100%',
  },
  memberList: {
    flex: 1,
    overflowY: 'auto',
  },
  emptyMembers: {
    textAlign: 'center',
    padding: '40px 16px',
    color: '#888',
    fontSize: 14,
  },
  emptyMembersHint: {
    fontSize: 12,
    color: '#aaa',
    marginTop: 6,
  },
  memberCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    marginBottom: 8,
    boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
    position: 'relative',
    cursor: 'grab',
  },
  memberCardDragging: {
    opacity: 0.5,
    cursor: 'grabbing',
  },
  memberCardDragOver: {
    border: '2px dashed #1976d2',
    backgroundColor: '#e3f2fd',
  },
  dragHandle: {
    fontSize: 14,
    color: '#bbb',
    cursor: 'grab',
    userSelect: 'none',
    padding: '0 2px',
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontWeight: 600,
    fontSize: 14,
    flexShrink: 0,
  },
  avatarMini: {
    width: 22,
    height: 22,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontWeight: 500,
    fontSize: 10,
  },
  memberInfo: {
    flex: 1,
    minWidth: 0,
  },
  memberName: {
    fontSize: 14,
    fontWeight: 600,
    color: '#333',
    marginBottom: 4,
  },
  memberMeta: {
    display: 'flex',
    gap: 6,
    flexWrap: 'wrap',
  },
  timezoneTag: {
    fontSize: 10,
    padding: '2px 6px',
    backgroundColor: '#e8e8e8',
    borderRadius: 4,
    color: '#666',
  },
  slotCountTag: {
    fontSize: 10,
    padding: '2px 6px',
    backgroundColor: '#e3f2fd',
    borderRadius: 4,
    color: '#1976d2',
  },
  deleteMemberButton: {
    background: 'none',
    border: 'none',
    color: '#bbb',
    fontSize: 18,
    cursor: 'pointer',
    padding: '0 4px',
    transition: 'color 0.3s ease-in-out',
  },
  upcomingMeetings: {
    marginTop: 16,
    paddingTop: 14,
    borderTop: '1px solid #e0e0e0',
  },
  upcomingTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: '#555',
    margin: '0 0 10px 0',
  },
  upcomingItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: 8,
    backgroundColor: '#ffffff',
    borderRadius: 6,
    marginBottom: 6,
  },
  upcomingColorBar: {
    width: 3,
    alignSelf: 'stretch',
    backgroundColor: '#1976d2',
    borderRadius: 2,
  },
  upcomingMeetingTitle: {
    fontSize: 12,
    fontWeight: 500,
    color: '#333',
  },
  upcomingMeetingTime: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
  mobileOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 150,
  },
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
    maxWidth: 480,
    maxHeight: '85vh',
    overflowY: 'auto',
    color: '#fff',
    boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: 600,
    margin: 0,
  },
  closeButton: {
    background: 'none',
    border: 'none',
    color: '#999',
    fontSize: 26,
    cursor: 'pointer',
    padding: 0,
    lineHeight: 1,
  },
  modalBody: {
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
    fontSize: 13,
    color: '#ccc',
    fontWeight: 500,
  },
  timeDisplay: {
    padding: '10px 12px',
    borderRadius: 8,
    backgroundColor: '#2a2a2a',
    fontSize: 14,
    color: '#66bb6a',
    fontWeight: 500,
  },
  input: {
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid #444',
    backgroundColor: '#2a2a2a',
    color: '#fff',
    fontSize: 14,
  },
  textarea: {
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid #444',
    backgroundColor: '#2a2a2a',
    color: '#fff',
    fontSize: 14,
    resize: 'vertical',
    fontFamily: 'inherit',
  },
  durationOptions: {
    display: 'flex',
    gap: 8,
  },
  durationButton: {
    flex: 1,
    padding: '10px 0',
    borderRadius: 8,
    border: '1px solid #444',
    backgroundColor: '#2a2a2a',
    color: '#ccc',
    fontSize: 13,
    cursor: 'pointer',
    transition: 'all 0.3s ease-in-out',
  },
  durationButtonActive: {
    backgroundColor: '#1976d2',
    borderColor: '#1976d2',
    color: '#fff',
  },
  attendeesList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
  },
  attendeeItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 10px 4px 4px',
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    fontSize: 12,
  },
  modalActions: {
    display: 'flex',
    gap: 12,
    justifyContent: 'flex-end',
    marginTop: 24,
  },
  cancelButton: {
    padding: '10px 22px',
    borderRadius: 8,
    backgroundColor: 'transparent',
    color: '#ccc',
    border: '1px solid #555',
    fontSize: 14,
    cursor: 'pointer',
    transition: 'all 0.3s ease-in-out',
  },
  confirmButton: {
    padding: '10px 22px',
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

export default App;
