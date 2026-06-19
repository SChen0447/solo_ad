import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import type { Performance } from '../types';
import PerformanceModal from '../components/PerformanceModal';
import '../styles/calendar.css';

const Calendar: React.FC = () => {
  const { state } = useApp();
  const [currentDate, setCurrentDate] = useState(new Date(2025, 5, 16));
  const [showModal, setShowModal] = useState(false);
  const [editingPerf, setEditingPerf] = useState<Performance | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [showConflictDetail, setShowConflictDetail] = useState<string | null>(null);

  const weekDays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

  const getWeekDates = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    
    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      dates.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
    return dates;
  };

  const weekDates = useMemo(() => getWeekDates(currentDate), [currentDate]);

  const formatDate = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const getPerformancesForDate = (dateStr: string) => {
    return state.performances.filter(p => p.date === dateStr);
  };

  const getArtistName = (artistId: string) => {
    const artist = state.artists.find(a => a.id === artistId);
    return artist?.name || '未知艺术家';
  };

  const checkConflicts = (dateStr: string) => {
    const perfs = getPerformancesForDate(dateStr);
    const artistMap = new Map<string, Performance[]>();
    
    perfs.forEach(p => {
      if (!artistMap.has(p.artistId)) {
        artistMap.set(p.artistId, []);
      }
      artistMap.get(p.artistId)!.push(p);
    });

    const conflicts: { artistId: string; artistName: string; performances: Performance[] }[] = [];
    artistMap.forEach((perfs, artistId) => {
      if (perfs.length >= 2) {
        conflicts.push({
          artistId,
          artistName: getArtistName(artistId),
          performances: perfs.sort((a, b) => a.time.localeCompare(b.time)),
        });
      }
    });

    return conflicts;
  };

  const hasConflict = (perf: Performance) => {
    const perfs = getPerformancesForDate(perf.date);
    const sameArtist = perfs.filter(p => p.artistId === perf.artistId);
    return sameArtist.length >= 2;
  };

  const handlePrevWeek = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 7);
    setCurrentDate(d);
  };

  const handleNextWeek = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 7);
    setCurrentDate(d);
  };

  const handleAddPerformance = (dateStr: string) => {
    setSelectedDate(dateStr);
    setEditingPerf(null);
    setShowModal(true);
  };

  const handleEditPerformance = (perf: Performance) => {
    setEditingPerf(perf);
    setSelectedDate(perf.date);
    setShowModal(true);
  };

  const handleConflictClick = (dateStr: string) => {
    setShowConflictDetail(showConflictDetail === dateStr ? null : dateStr);
  };

  type ConflictInfo = { artistId: string; artistName: string; performances: Performance[] };

  const conflictsForWeek = useMemo(() => {
    const map = new Map<string, ConflictInfo[]>();
    weekDates.forEach(d => {
      const dateStr = formatDate(d);
      map.set(dateStr, checkConflicts(dateStr));
    });
    return map;
  }, [weekDates, state.performances]);

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isCompact = typeof window !== 'undefined' && window.innerWidth < 768;

  const allPerformancesSorted = useMemo(() => {
    return [...state.performances].sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.time.localeCompare(b.time);
    });
  }, [state.performances]);

  return (
    <div className="calendar-page">
      <div className="page-header">
        <h1 className="page-title">演出日历</h1>
        <div className="calendar-controls">
          <button className="btn-secondary" onClick={handlePrevWeek}>← 上周</button>
          <span className="current-week">
            {formatDate(weekDates[0])} ~ {formatDate(weekDates[6])}
          </span>
          <button className="btn-secondary" onClick={handleNextWeek}>下周 →</button>
        </div>
      </div>

      <div className="calendar-grid desktop-view">
        <div className="calendar-header">
          {weekDays.map((day, idx) => (
            <div key={day} className={`calendar-header-cell ${idx >= 5 ? 'weekend' : ''}`}>
              <span className="day-name">{day}</span>
              <span className={`day-number ${isToday(weekDates[idx]) ? 'today' : ''}`}>
                {weekDates[idx].getDate()}
              </span>
            </div>
          ))}
        </div>
        <div className="calendar-body">
          {weekDates.map((date, idx) => {
            const dateStr = formatDate(date);
            const perfs = getPerformancesForDate(dateStr);
            const conflicts = conflictsForWeek.get(dateStr) || [];
            const hasAnyConflict = conflicts.length > 0;

            return (
              <div
                key={dateStr}
                className={`calendar-day ${idx >= 5 ? 'weekend' : ''} ${isToday(date) ? 'today' : ''}`}
                onDoubleClick={() => handleAddPerformance(dateStr)}
              >
                {hasAnyConflict && (
                  <div
                    className="conflict-banner"
                    onClick={() => handleConflictClick(dateStr)}
                  >
                    ⚠️ 档期冲突 ({conflicts.length}位艺术家)
                  </div>
                )}
                {showConflictDetail === dateStr && hasAnyConflict && (
                  <div className="conflict-detail">
                    {conflicts.map(c => (
                      <div key={c.artistId} className="conflict-artist">
                        <div className="conflict-artist-name">{c.artistName}</div>
                        {c.performances.map(p => (
                          <div
                            key={p.id}
                            className="conflict-item"
                            onClick={() => handleEditPerformance(p)}
                          >
                            {p.time} - {p.venue}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
                <div className="day-performances">
                  {perfs.map(perf => (
                    <div
                      key={perf.id}
                      className={`performance-block ${hasConflict(perf) ? 'conflict' : ''}`}
                      onClick={() => handleEditPerformance(perf)}
                    >
                      <span className="perf-time">{perf.time}</span>
                      <span className="perf-artist">{getArtistName(perf.artistId)}</span>
                      <span className="perf-venue">{perf.venue}</span>
                    </div>
                  ))}
                </div>
                <button
                  className="add-perf-btn"
                  onClick={() => handleAddPerformance(dateStr)}
                >
                  +
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="calendar-list mobile-view">
        {allPerformancesSorted.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">📅</span>
            <p className="empty-text">暂无演出安排</p>
          </div>
        ) : (
          allPerformancesSorted.map(perf => (
            <div
              key={perf.id}
              className={`performance-list-item ${hasConflict(perf) ? 'conflict' : ''}`}
              onClick={() => handleEditPerformance(perf)}
            >
              <div className="perf-date">
                <span className="date-day">{new Date(perf.date).getDate()}</span>
                <span className="date-month">{perf.date.slice(5, 7)}月</span>
              </div>
              <div className="perf-info">
                <div className="perf-time-mobile">{perf.time}</div>
                <div className="perf-artist-mobile">{getArtistName(perf.artistId)}</div>
                <div className="perf-venue-mobile">{perf.venue}</div>
              </div>
              {hasConflict(perf) && <span className="conflict-badge">冲突</span>}
            </div>
          ))
        )}
      </div>

      <PerformanceModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        performance={editingPerf}
        defaultDate={selectedDate}
      />
    </div>
  );
};

export default Calendar;
