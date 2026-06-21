import { useState, useEffect } from 'react';
import type { Rehearsal, Song } from '../types';
import './RehearsalTimeline.css';

interface RehearsalTimelineProps {
  onStartRehearsal: (rehearsal: Rehearsal) => void;
  onViewReport: (rehearsalId: string) => void;
}

export function RehearsalTimeline({ onStartRehearsal, onViewReport }: RehearsalTimelineProps) {
  const [rehearsals, setRehearsals] = useState<Rehearsal[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRehearsal, setNewRehearsal] = useState({
    title: '',
    date: '',
    time: '',
    duration: 120,
    selectedSongs: [] as string[],
    goals: '',
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [rehearsalsRes, songsRes] = await Promise.all([
        fetch('/api/rehearsals'),
        fetch('/api/songs'),
      ]);
      const rehearsalsData = await rehearsalsRes.json();
      const songsData = await songsRes.json();
      setRehearsals(rehearsalsData);
      setSongs(songsData);
    } catch (error) {
      console.error('获取数据失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateRehearsal = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const dateTime = new Date(`${newRehearsal.date}T${newRehearsal.time}`).getTime();
    
    try {
      const res = await fetch('/api/rehearsals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newRehearsal.title,
          date: dateTime,
          duration: newRehearsal.duration,
          songs: newRehearsal.selectedSongs.map((songId) => ({
            songId,
            targetProgress: 80,
          })),
          goals: newRehearsal.goals.split('\n').filter(Boolean),
        }),
      });
      
      if (res.ok) {
        const created = await res.json();
        setRehearsals((prev) => [...prev, created].sort((a, b) => a.date - b.date));
        setShowCreateModal(false);
        setNewRehearsal({
          title: '',
          date: '',
          time: '',
          duration: 120,
          selectedSongs: [],
          goals: '',
        });
      }
    } catch (error) {
      console.error('创建排练失败:', error);
    }
  };

  const toggleSongSelection = (songId: string) => {
    setNewRehearsal((prev) => ({
      ...prev,
      selectedSongs: prev.selectedSongs.includes(songId)
        ? prev.selectedSongs.filter((id) => id !== songId)
        : [...prev.selectedSongs, songId],
    }));
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      weekday: 'short',
    });
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'scheduled';
      case 'in_progress': return 'in-progress';
      case 'completed': return 'completed';
      default: return 'scheduled';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'scheduled': return '已安排';
      case 'in_progress': return '进行中';
      case 'completed': return '已完成';
      default: return status;
    }
  };

  const getSongTitle = (songId: string) => {
    return songs.find((s) => s._id === songId)?.title || '未知曲目';
  };

  const isPast = (timestamp: number) => {
    return timestamp < Date.now();
  };

  const groupedRehearsals = rehearsals.reduce((groups, rehearsal) => {
    const month = new Date(rehearsal.date).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' });
    if (!groups[month]) {
      groups[month] = [];
    }
    groups[month].push(rehearsal);
    return groups;
  }, {} as Record<string, Rehearsal[]>);

  if (isLoading) {
    return <div className="timeline-loading">加载中...</div>;
  }

  return (
    <div className="rehearsal-timeline">
      <div className="timeline-header">
        <h2 className="section-title">排练规划</h2>
        <button className="create-btn" onClick={() => setShowCreateModal(true)}>
          <span className="plus-icon">+</span>
          新建排练
        </button>
      </div>

      <div className="timeline-container">
        {Object.entries(groupedRehearsals).map(([month, monthRehearsals]) => (
          <div key={month} className="timeline-month">
            <h3 className="month-label">{month}</h3>
            <div className="timeline-events">
              {monthRehearsals.map((rehearsal) => (
                <div
                  key={rehearsal._id}
                  className={`timeline-event ${getStatusColor(rehearsal.status)} ${isPast(rehearsal.date) ? 'past' : ''}`}
                >
                  <div className="event-dot"></div>
                  <div className="event-date">
                    <div className="date-day">{new Date(rehearsal.date).getDate()}</div>
                    <div className="date-weekday">{formatDate(rehearsal.date).split(' ')[1]}</div>
                  </div>
                  <div className="event-content glass-effect">
                    <div className="event-header">
                      <h4 className="event-title">{rehearsal.title}</h4>
                      <span className={`status-badge ${getStatusColor(rehearsal.status)}`}>
                        {getStatusText(rehearsal.status)}
                      </span>
                    </div>
                    <div className="event-meta">
                      <span className="event-time">⏰ {formatTime(rehearsal.date)}</span>
                      <span className="event-duration">⏱ {rehearsal.duration} 分钟</span>
                    </div>
                    <div className="event-songs">
                      {rehearsal.songs.slice(0, 3).map((rs) => (
                        <span key={rs.songId} className="song-tag">
                          {getSongTitle(rs.songId)}
                        </span>
                      ))}
                      {rehearsal.songs.length > 3 && (
                        <span className="song-tag more">+{rehearsal.songs.length - 3}</span>
                      )}
                    </div>
                    {rehearsal.goals.length > 0 && (
                      <div className="event-goals">
                        <span className="goals-label">目标:</span>
                        <span className="goals-text">{rehearsal.goals[0]}</span>
                      </div>
                    )}
                    <div className="event-actions">
                      {rehearsal.status === 'scheduled' && (
                        <button
                          className="action-btn primary"
                          onClick={() => onStartRehearsal(rehearsal)}
                        >
                          开始排练
                        </button>
                      )}
                      {rehearsal.status === 'completed' && (
                        <button
                          className="action-btn secondary"
                          onClick={() => onViewReport(rehearsal._id)}
                        >
                          查看报告
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {rehearsals.length === 0 && (
        <div className="empty-timeline">
          <div className="empty-icon">📅</div>
          <p>还没有排练安排，创建你的第一次排练吧！</p>
        </div>
      )}

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">新建排练</h3>
            <form onSubmit={handleCreateRehearsal}>
              <div className="form-group">
                <label>排练名称</label>
                <input
                  type="text"
                  value={newRehearsal.title}
                  onChange={(e) => setNewRehearsal((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="如：周末排练 - 新歌准备"
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>日期</label>
                  <input
                    type="date"
                    value={newRehearsal.date}
                    onChange={(e) => setNewRehearsal((prev) => ({ ...prev, date: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>时间</label>
                  <input
                    type="time"
                    value={newRehearsal.time}
                    onChange={(e) => setNewRehearsal((prev) => ({ ...prev, time: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label>时长（分钟）</label>
                <input
                  type="number"
                  min="15"
                  max="480"
                  value={newRehearsal.duration}
                  onChange={(e) => setNewRehearsal((prev) => ({ ...prev, duration: parseInt(e.target.value) || 120 }))}
                />
              </div>
              <div className="form-group">
                <label>选择曲目</label>
                <div className="song-selector">
                  {songs.map((song) => (
                    <label
                      key={song._id}
                      className={`song-option ${newRehearsal.selectedSongs.includes(song._id) ? 'selected' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={newRehearsal.selectedSongs.includes(song._id)}
                        onChange={() => toggleSongSelection(song._id)}
                      />
                      <span className="song-name">{song.title}</span>
                      <span className="song-key">{song.key}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label>排练目标（每行一个）</label>
                <textarea
                  value={newRearsal.goals}
                  onChange={(e) => setNewRehearsal((prev) => ({ ...prev, goals: e.target.value }))}
                  placeholder="完成某段落编曲&#10;统一某段节奏"
                  rows={3}
                />
              </div>
              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={() => setShowCreateModal(false)}>
                  取消
                </button>
                <button type="submit" className="submit-btn">
                  创建排练
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
