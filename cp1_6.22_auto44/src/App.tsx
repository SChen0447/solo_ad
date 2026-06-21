import React, { useState, useEffect, useCallback } from 'react';
import CalendarView from './CalendarView';
import EventManager from './EventManager';
import type { Member, TimeSlot, Event as CalendarEvent, ConflictResult } from './utils/conflictDetection';

interface Team {
  id: string;
  name: string;
  invite_code: string;
  created_at: string;
}

interface Notification {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning';
}

const App: React.FC = () => {
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [currentMember, setCurrentMember] = useState<Member | null>(null);
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [conflictResult, setConflictResult] = useState<ConflictResult | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [memberName, setMemberName] = useState('');
  const [teamName, setTeamName] = useState('');
  const [newMemberName, setNewMemberName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [slotMode, setSlotMode] = useState(false);

  const addNotification = useCallback((message: string, type: 'info' | 'success' | 'warning' = 'info') => {
    const id = Date.now().toString() + Math.random();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 3000);
  }, []);

  const fetchTeamData = useCallback(async (teamId: string) => {
    try {
      const [membersRes, slotsRes, eventsRes] = await Promise.all([
        fetch(`/api/member/team/${teamId}`),
        fetch(`/api/slot/team/${teamId}`),
        fetch(`/api/event/team/${teamId}`),
      ]);
      const membersData = await membersRes.json();
      const slotsData = await slotsRes.json();
      const eventsData = await eventsRes.json();
      setMembers(membersData);
      setSlots(slotsData);
      setEvents(eventsData);
    } catch (err) {
      console.error('获取团队数据失败', err);
    }
  }, []);

  useEffect(() => {
    const savedTeamId = localStorage.getItem('teamId');
    const savedMemberId = localStorage.getItem('memberId');
    if (savedTeamId) {
      fetch(`/api/team/${savedTeamId}`)
        .then(res => res.json())
        .then(data => {
          if (data && !data.error) {
            setTeam(data);
            fetchTeamData(data.id);
          }
        })
        .catch(console.error);
    }
    if (savedMemberId && savedTeamId) {
      setCurrentMember({ id: savedMemberId, team_id: savedTeamId, name: '', color: '', created_at: '' });
    }
  }, [fetchTeamData]);

  const handleCreateTeam = async () => {
    if (!teamName.trim()) {
      addNotification('请输入团队名称', 'warning');
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: teamName }),
      });
      const data = await res.json();
      if (data.error) {
        addNotification(data.error, 'warning');
      } else {
        setTeam(data);
        localStorage.setItem('teamId', data.id);
        addNotification('团队创建成功！', 'success');
        setTeamName('');
      }
    } catch (err) {
      addNotification('创建团队失败', 'warning');
    }
    setIsLoading(false);
  };

  const handleJoinTeam = async () => {
    if (!joinCode.trim() || !memberName.trim()) {
      addNotification('请输入邀请码和昵称', 'warning');
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`/api/team/invite/${joinCode.trim().toUpperCase()}`);
      const teamData = await res.json();
      if (teamData.error) {
        addNotification(teamData.error, 'warning');
        setIsLoading(false);
        return;
      }
      const memberRes = await fetch('/api/member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team_id: teamData.id, name: memberName.trim() }),
      });
      const memberData = await memberRes.json();
      if (memberData.error) {
        addNotification(memberData.error, 'warning');
      } else {
        setTeam(teamData);
        setCurrentMember(memberData);
        localStorage.setItem('teamId', teamData.id);
        localStorage.setItem('memberId', memberData.id);
        fetchTeamData(teamData.id);
        addNotification(`欢迎加入 ${teamData.name}！`, 'success');
        setShowJoinModal(false);
        setJoinCode('');
        setMemberName('');
      }
    } catch (err) {
      addNotification('加入团队失败', 'warning');
    }
    setIsLoading(false);
  };

  const handleAddMember = async () => {
    if (!newMemberName.trim() || !team) return;
    try {
      const res = await fetch('/api/member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team_id: team.id, name: newMemberName.trim() }),
      });
      const data = await res.json();
      if (data.error) {
        addNotification(data.error, 'warning');
      } else {
        setMembers(prev => [...prev, data]);
        addNotification(`成员 ${data.name} 已添加`, 'success');
        setNewMemberName('');
      }
    } catch (err) {
      addNotification('添加成员失败', 'warning');
    }
  };

  const handleAddSlot = async (startTime: string, endTime: string) => {
    if (!currentMember || !team) return;
    try {
      const res = await fetch('/api/slot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_id: currentMember.id,
          team_id: team.id,
          start_time: startTime,
          end_time: endTime,
        }),
      });
      const data = await res.json();
      if (data.error) {
        addNotification(data.error, 'warning');
      } else {
        setSlots(prev => [...prev, data]);
        addNotification('空闲时段已添加', 'success');
        if (conflictResult) {
          setConflictResult(null);
        }
      }
    } catch (err) {
      addNotification('添加时段失败', 'warning');
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    try {
      await fetch(`/api/slot/${slotId}`, { method: 'DELETE' });
      setSlots(prev => prev.filter(s => s.id !== slotId));
      addNotification('时段已删除', 'success');
    } catch (err) {
      addNotification('删除时段失败', 'warning');
    }
  };

  const handleCreateEvent = async (event: Omit<CalendarEvent, 'id' | 'created_at'>) => {
    if (!team) return;
    try {
      const res = await fetch('/api/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      });
      const data = await res.json();
      if (data.error) {
        addNotification(data.error, 'warning');
      } else {
        setEvents(prev => [...prev, data]);
        addNotification(`活动 "${data.title}" 已创建`, 'success');
      }
    } catch (err) {
      addNotification('创建活动失败', 'warning');
    }
  };

  const handleUpdateEvent = async (id: string, updates: Partial<CalendarEvent>) => {
    try {
      const event = events.find(e => e.id === id);
      if (!event) return;
      const res = await fetch(`/api/event/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: updates.title || event.title,
          start_time: updates.start_time || event.start_time,
          end_time: updates.end_time || event.end_time,
          category: updates.category || event.category,
        }),
      });
      const data = await res.json();
      if (data.error) {
        addNotification(data.error, 'warning');
      } else {
        setEvents(prev => prev.map(e => e.id === id ? data : e));
        addNotification('活动已更新', 'success');
      }
    } catch (err) {
      addNotification('更新活动失败', 'warning');
    }
  };

  const handleDeleteEvent = async (id: string) => {
    try {
      await fetch(`/api/event/${id}`, { method: 'DELETE' });
      setEvents(prev => prev.filter(e => e.id !== id));
      addNotification('活动已删除', 'success');
    } catch (err) {
      addNotification('删除活动失败', 'warning');
    }
  };

  const handleCheckConflicts = async (rangeStart: string, rangeEnd: string, durationMinutes: number) => {
    if (!team) return;
    try {
      const res = await fetch('/api/conflict-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          team_id: team.id,
          range_start: rangeStart,
          range_end: rangeEnd,
          duration_minutes: durationMinutes,
        }),
      });
      const data = await res.json();
      if (data.error) {
        addNotification(data.error, 'warning');
      } else {
        setConflictResult(data);
      }
    } catch (err) {
      addNotification('冲突检测失败', 'warning');
    }
  };

  const handleMemberColorChange = async (memberId: string, color: string) => {
    try {
      await fetch(`/api/member/${memberId}/color`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ color }),
      });
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, color } : m));
      if (currentMember?.id === memberId) {
        setCurrentMember(prev => prev ? { ...prev, color } : null);
      }
    } catch (err) {
      console.error('更新颜色失败', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('teamId');
    localStorage.removeItem('memberId');
    setTeam(null);
    setMembers([]);
    setSlots([]);
    setEvents([]);
    setCurrentMember(null);
    setConflictResult(null);
  };

  const copyInviteLink = () => {
    if (team) {
      navigator.clipboard.writeText(team.invite_code);
      addNotification('邀请码已复制', 'success');
    }
  };

  const styles: Record<string, React.CSSProperties> = {
    app: {
      display: 'flex',
      minHeight: '100vh',
      backgroundColor: '#f7fafc',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    },
    sidebar: {
      width: '260px',
      backgroundColor: '#2d3748',
      color: 'white',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
      flexShrink: 0,
    },
    sidebarTitle: {
      fontSize: '20px',
      fontWeight: 'bold',
      margin: 0,
      paddingBottom: '10px',
      borderBottom: '1px solid #4a5568',
    },
    teamInfo: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
    },
    teamName: {
      fontSize: '16px',
      fontWeight: '600',
      margin: 0,
    },
    inviteCode: {
      fontSize: '12px',
      color: '#a0aec0',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    copyBtn: {
      fontSize: '11px',
      padding: '2px 8px',
      backgroundColor: '#4a5568',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
    },
    memberList: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      flex: 1,
      overflowY: 'auto',
    },
    memberListTitle: {
      fontSize: '14px',
      color: '#a0aec0',
      margin: 0,
    },
    memberItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '8px',
      borderRadius: '6px',
      backgroundColor: 'rgba(255,255,255,0.05)',
    },
    memberColor: {
      width: '16px',
      height: '16px',
      borderRadius: '50%',
      cursor: 'pointer',
      flexShrink: 0,
    },
    memberName: {
      fontSize: '13px',
      flex: 1,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    },
    youBadge: {
      fontSize: '10px',
      padding: '2px 6px',
      backgroundColor: '#38a169',
      borderRadius: '10px',
    },
    addMember: {
      display: 'flex',
      gap: '8px',
    },
    input: {
      flex: 1,
      padding: '8px',
      fontSize: '13px',
      borderRadius: '6px',
      border: '1px solid #4a5568',
      backgroundColor: '#1a202c',
      color: 'white',
      outline: 'none',
    },
    inputFocus: {
      borderColor: '#3182ce',
      boxShadow: '0 0 0 3px rgba(49, 130, 206, 0.3)',
    },
    button: {
      padding: '8px 16px',
      fontSize: '13px',
      fontWeight: '500',
      borderRadius: '8px',
      border: 'none',
      cursor: 'pointer',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    },
    buttonPrimary: {
      backgroundColor: '#3182ce',
      color: 'white',
    },
    buttonSecondary: {
      backgroundColor: '#4a5568',
      color: 'white',
    },
    buttonHover: {
      transform: 'scale(1.05)',
    },
    mainContent: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    },
    header: {
      padding: '16px 24px',
      backgroundColor: 'white',
      borderBottom: '1px solid #e2e8f0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    viewSwitcher: {
      display: 'flex',
      gap: '4px',
      backgroundColor: '#edf2f7',
      padding: '4px',
      borderRadius: '8px',
    },
    viewButton: {
      padding: '8px 16px',
      fontSize: '13px',
      fontWeight: '500',
      borderRadius: '6px',
      border: 'none',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      backgroundColor: 'transparent',
      color: '#4a5568',
    },
    viewButtonActive: {
      backgroundColor: 'white',
      color: '#2d3748',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    },
    dateNav: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
    },
    dateLabel: {
      fontSize: '16px',
      fontWeight: '600',
      color: '#2d3748',
      minWidth: '180px',
      textAlign: 'center',
    },
    navBtn: {
      width: '32px',
      height: '32px',
      borderRadius: '6px',
      border: '1px solid #e2e8f0',
      backgroundColor: 'white',
      cursor: 'pointer',
      fontSize: '16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.2s ease',
    },
    calendarContainer: {
      flex: 1,
      overflow: 'auto',
      padding: '20px',
    },
    welcomeScreen: {
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: '24px',
    },
    welcomeCard: {
      backgroundColor: 'white',
      padding: '40px',
      borderRadius: '12px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      width: '100%',
      maxWidth: '400px',
    },
    welcomeTitle: {
      fontSize: '24px',
      fontWeight: 'bold',
      color: '#2d3748',
      margin: '0 0 8px 0',
      textAlign: 'center',
    },
    welcomeSubtitle: {
      fontSize: '14px',
      color: '#718096',
      margin: '0 0 24px 0',
      textAlign: 'center',
    },
    formGroup: {
      marginBottom: '16px',
    },
    formLabel: {
      display: 'block',
      fontSize: '13px',
      fontWeight: '500',
      color: '#4a5568',
      marginBottom: '6px',
    },
    formInput: {
      width: '100%',
      padding: '10px 12px',
      fontSize: '14px',
      borderRadius: '8px',
      border: '1px solid #e2e8f0',
      outline: 'none',
      transition: 'all 0.2s ease',
      boxSizing: 'border-box',
    },
    submitBtn: {
      width: '100%',
      padding: '12px',
      fontSize: '14px',
      fontWeight: '600',
      borderRadius: '8px',
      border: 'none',
      cursor: 'pointer',
      transition: 'transform 0.2s ease',
      backgroundColor: '#3182ce',
      color: 'white',
    },
    divider: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      margin: '20px 0',
    },
    dividerLine: {
      flex: 1,
      height: '1px',
      backgroundColor: '#e2e8f0',
    },
    dividerText: {
      fontSize: '12px',
      color: '#a0aec0',
    },
    slotToggle: {
      padding: '10px',
      backgroundColor: slotMode ? '#38a169' : '#4a5568',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '13px',
      fontWeight: '500',
      transition: 'all 0.2s ease',
    },
    notifications: {
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      zIndex: 1000,
    },
    notification: {
      padding: '12px 20px',
      borderRadius: '8px',
      backgroundColor: 'white',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      fontSize: '14px',
      animation: 'fadeInUp 0.3s ease',
      borderLeft: '4px solid #3182ce',
    },
    notificationSuccess: {
      borderLeftColor: '#38a169',
    },
    notificationWarning: {
      borderLeftColor: '#dd6b20',
    },
    logoutBtn: {
      padding: '8px',
      fontSize: '12px',
      backgroundColor: 'transparent',
      color: '#a0aec0',
      border: '1px solid #4a5568',
      borderRadius: '6px',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    },
  };

  if (!team) {
    return (
      <div style={styles.app}>
        <div style={styles.welcomeScreen}>
          <div style={styles.welcomeCard}>
            <h1 style={styles.welcomeTitle}>📅 团队协作日历</h1>
            <p style={styles.welcomeSubtitle}>轻松协调团队时间，智能检测排期冲突</p>
            
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>创建新团队</label>
              <input
                type="text"
                placeholder="输入团队名称"
                value={teamName}
                onChange={e => setTeamName(e.target.value)}
                style={styles.formInput}
                onKeyDown={e => e.key === 'Enter' && handleCreateTeam()}
              />
            </div>
            <button
              style={styles.submitBtn}
              onClick={handleCreateTeam}
              disabled={isLoading}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              创建团队
            </button>

            <div style={styles.divider}>
              <div style={styles.dividerLine}></div>
              <span style={styles.dividerText}>或</span>
              <div style={styles.dividerLine}></div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.formLabel}>加入团队</label>
              <input
                type="text"
                placeholder="邀请码"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value)}
                style={{ ...styles.formInput, marginBottom: '10px' }}
              />
              <input
                type="text"
                placeholder="你的昵称"
                value={memberName}
                onChange={e => setMemberName(e.target.value)}
                style={styles.formInput}
                onKeyDown={e => e.key === 'Enter' && handleJoinTeam()}
              />
            </div>
            <button
              style={{ ...styles.submitBtn, backgroundColor: '#38a169' }}
              onClick={handleJoinTeam}
              disabled={isLoading}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              加入团队
            </button>
          </div>
        </div>

        <div style={styles.notifications}>
          {notifications.map(n => (
            <div
              key={n.id}
              style={{
                ...styles.notification,
                ...(n.type === 'success' ? styles.notificationSuccess : {}),
                ...(n.type === 'warning' ? styles.notificationWarning : {}),
              }}
            >
              {n.message}
            </div>
          ))}
        </div>

        <style>{`
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
      </div>
    );
  }

  const formatDateLabel = () => {
    if (viewMode === 'day') {
      return currentDate.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
    } else if (viewMode === 'week') {
      const start = new Date(currentDate);
      start.setDate(start.getDate() - start.getDay() + 1);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return `${start.getMonth() + 1}月${start.getDate()}日 - ${end.getMonth() + 1}月${end.getDate()}日`;
    } else {
      return currentDate.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' });
    }
  };

  const navigatePrev = () => {
    const d = new Date(currentDate);
    if (viewMode === 'day') d.setDate(d.getDate() - 1);
    else if (viewMode === 'week') d.setDate(d.getDate() - 7);
    else d.setMonth(d.getMonth() - 1);
    setCurrentDate(d);
  };

  const navigateNext = () => {
    const d = new Date(currentDate);
    if (viewMode === 'day') d.setDate(d.getDate() + 1);
    else if (viewMode === 'week') d.setDate(d.getDate() + 7);
    else d.setMonth(d.getMonth() + 1);
    setCurrentDate(d);
  };

  const navigateToday = () => {
    setCurrentDate(new Date());
  };

  return (
    <div style={styles.app}>
      <div style={styles.sidebar}>
        <h2 style={styles.sidebarTitle}>📅 协作日历</h2>
        
        <div style={styles.teamInfo}>
          <p style={styles.teamName}>{team.name}</p>
          <div style={styles.inviteCode}>
            邀请码: {team.invite_code}
            <button style={styles.copyBtn} onClick={copyInviteLink}>复制</button>
          </div>
        </div>

        <button
          style={styles.slotToggle}
          onClick={() => setSlotMode(!slotMode)}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          {slotMode ? '🟢 标记空闲中...' : '✏️ 标记我的空闲'}
        </button>

        <div style={styles.memberList}>
          <p style={styles.memberListTitle}>团队成员 ({members.length})</p>
          {members.map(member => (
            <div key={member.id} style={styles.memberItem}>
              <input
                type="color"
                value={member.color}
                onChange={e => handleMemberColorChange(member.id, e.target.value)}
                style={{ ...styles.memberColor, border: 'none', padding: 0, cursor: 'pointer' }}
                title="点击修改颜色"
              />
              <span style={styles.memberName}>{member.name}</span>
              {currentMember?.id === member.id && (
                <span style={styles.youBadge}>你</span>
              )}
            </div>
          ))}
        </div>

        <div style={styles.addMember}>
          <input
            type="text"
            placeholder="添加成员昵称"
            value={newMemberName}
            onChange={e => setNewMemberName(e.target.value)}
            style={styles.input}
            onKeyDown={e => e.key === 'Enter' && handleAddMember()}
          />
          <button
            style={{ ...styles.button, ...styles.buttonPrimary }}
            onClick={handleAddMember}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            +
          </button>
        </div>

        <button
          style={styles.logoutBtn}
          onClick={handleLogout}
          onMouseEnter={e => {
            e.currentTarget.style.color = 'white';
            e.currentTarget.style.borderColor = '#e53e3e';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = '#a0aec0';
            e.currentTarget.style.borderColor = '#4a5568';
          }}
        >
          退出团队
        </button>
      </div>

      <div style={styles.mainContent}>
        <div style={styles.header}>
          <div style={styles.dateNav}>
            <button
              style={styles.navBtn}
              onClick={navigatePrev}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = '#edf2f7';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = 'white';
              }}
            >
              ‹
            </button>
            <span style={styles.dateLabel}>{formatDateLabel()}</span>
            <button
              style={styles.navBtn}
              onClick={navigateNext}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = '#edf2f7';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = 'white';
              }}
            >
              ›
            </button>
            <button
              style={{ ...styles.navBtn, fontSize: '12px' }}
              onClick={navigateToday}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = '#edf2f7';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = 'white';
              }}
            >
              今天
            </button>
          </div>

          <div style={styles.viewSwitcher}>
            {(['day', 'week', 'month'] as const).map(mode => (
              <button
                key={mode}
                style={{
                  ...styles.viewButton,
                  ...(viewMode === mode ? styles.viewButtonActive : {}),
                }}
                onClick={() => setViewMode(mode)}
              >
                {mode === 'day' ? '日' : mode === 'week' ? '周' : '月'}
              </button>
            ))}
          </div>
        </div>

        <div style={styles.calendarContainer}>
          <CalendarView
            viewMode={viewMode}
            currentDate={currentDate}
            members={members}
            slots={slots}
            events={events}
            currentMember={currentMember}
            slotMode={slotMode}
            conflictResult={conflictResult}
            onAddSlot={handleAddSlot}
            onDeleteSlot={handleDeleteSlot}
            onUpdateEvent={handleUpdateEvent}
            onDeleteEvent={handleDeleteEvent}
          />
        </div>

        <EventManager
          teamId={team.id}
          members={members}
          slots={slots}
          currentDate={currentDate}
          conflictResult={conflictResult}
          onCreateEvent={handleCreateEvent}
          onCheckConflicts={handleCheckConflicts}
          onClearConflict={() => setConflictResult(null)}
        />
      </div>

      <div style={styles.notifications}>
        {notifications.map(n => (
          <div
            key={n.id}
            style={{
              ...styles.notification,
              ...(n.type === 'success' ? styles.notificationSuccess : {}),
              ...(n.type === 'warning' ? styles.notificationWarning : {}),
            }}
          >
            {n.message}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        input:focus {
          border-color: #3182ce !important;
          box-shadow: 0 0 0 3px rgba(49, 130, 206, 0.3);
        }
      `}</style>
    </div>
  );
};

export default App;
