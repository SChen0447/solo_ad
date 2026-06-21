import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { Book, ReadingChallenge, DailyReading, ChallengeProgress } from './types';

interface ChallengePanelProps {
  challenges: ReadingChallenge[];
  books: Book[];
  onAddChallenge: (challenge: Omit<ReadingChallenge, 'id'>) => Promise<ReadingChallenge>;
  onUpdateChallenge: (id: string, updates: Partial<ReadingChallenge>) => Promise<ReadingChallenge>;
  onDeleteChallenge: (id: string) => Promise<void>;
  onRefreshBooks: () => Promise<void>;
}

function CalendarDotChart({
  dailyReadings,
  onDateClick,
}: {
  dailyReadings: DailyReading[];
  onDateClick: (date: string, minutes: number) => void;
}) {
  const today = useMemo(() => new Date(), []);
  const weeks = useMemo(() => {
    const result: { date: string; hasReading: boolean; minutes: number }[][] = [];
    let currentWeek: { date: string; hasReading: boolean; minutes: number }[] = [];

    for (let d = 364; d >= 0; d--) {
      const date = new Date(today);
      date.setDate(date.getDate() - d);
      const dateStr = date.toISOString().split('T')[0];
      const reading = dailyReadings.find((r) => r.date === dateStr);
      currentWeek.push({
        date: dateStr,
        hasReading: !!reading,
        minutes: reading?.minutes || 0,
      });
      if (currentWeek.length === 7 || d === 0) {
        while (currentWeek.length < 7) {
          currentWeek.push({ date: '', hasReading: false, minutes: 0 });
        }
        result.push(currentWeek);
        currentWeek = [];
      }
    }
    return result;
  }, [dailyReadings, today]);

  const dayLabels = ['一', '二', '三', '四', '五', '六', '日'];

  return (
    <div className="calendar-dot-chart">
      <div className="calendar-grid">
        <div className="calendar-day-labels">
          {dayLabels.map((label) => (
            <div key={label} className="calendar-day-label">{label}</div>
          ))}
        </div>
        <div className="calendar-weeks">
          {weeks.map((week, wi) => (
            <div key={wi} className="calendar-week">
              {week.map((day, di) => (
                <div
                  key={`${wi}-${di}`}
                  className={`calendar-dot ${day.date ? 'calendar-dot-active' : ''} ${day.hasReading ? 'calendar-dot-reading' : ''}`}
                  title={day.date ? `${day.date} ${day.minutes}分钟` : ''}
                  onClick={() => day.date && onDateClick(day.date, day.minutes)}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="calendar-legend">
        <span className="calendar-legend-item">
          <span className="calendar-dot calendar-dot-reading legend-dot" /> 已阅读
        </span>
        <span className="calendar-legend-item">
          <span className="calendar-dot calendar-dot-active legend-dot" /> 未阅读
        </span>
      </div>
    </div>
  );
}

function DailyLogModal({
  date,
  initialMinutes,
  challengeId,
  onSave,
  onClose,
}: {
  date: string;
  initialMinutes: number;
  challengeId: string;
  onSave: (challengeId: string, date: string, minutes: number) => void;
  onClose: () => void;
}) {
  const [minutes, setMinutes] = useState(initialMinutes);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(challengeId, date, minutes);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <form className="daily-log-modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <button type="button" className="modal-close" onClick={onClose}>✕</button>
        <h2>记录阅读时长</h2>
        <p className="daily-log-date">{date}</p>
        <div className="form-group">
          <label>阅读时长（分钟）</label>
          <input
            type="number"
            min={0}
            max={1440}
            value={minutes}
            onChange={(e) => setMinutes(Math.max(0, parseInt(e.target.value) || 0))}
          />
        </div>
        <button type="submit" className="btn-primary">保存</button>
      </form>
    </div>
  );
}

function ProgressBar({ percent, label }: { percent: number; label: string }) {
  return (
    <div className="progress-bar-wrapper">
      <div className="progress-bar-header">
        <span className="progress-label">{label}</span>
        <span className="progress-percent">{Math.round(percent)}%</span>
      </div>
      <div className="progress-bar-track">
        <div
          className="progress-bar-fill"
          style={{ width: `${Math.min(100, percent)}%` }}
        />
      </div>
    </div>
  );
}

export default function ChallengePanel({
  challenges,
  books,
  onAddChallenge,
  onUpdateChallenge,
  onDeleteChallenge,
  onRefreshBooks,
}: ChallengePanelProps) {
  const [progressMap, setProgressMap] = useState<Record<string, ChallengeProgress>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [logModal, setLogModal] = useState<{ date: string; minutes: number; challengeId: string } | null>(null);
  const [selectedChallenge, setSelectedChallenge] = useState<string | null>(
    challenges.length > 0 ? challenges[0].id : null
  );

  const [newName, setNewName] = useState('');
  const [newMonthlyGoal, setNewMonthlyGoal] = useState(4);
  const [newMinutesGoal, setNewMinutesGoal] = useState(12000);

  const loadProgress = useCallback(async (challengeId: string) => {
    try {
      const res = await fetch(`/api/challenges/${challengeId}/progress`);
      if (!res.ok) return;
      const data: ChallengeProgress = await res.json();
      setProgressMap((prev) => ({ ...prev, [challengeId]: data }));
    } catch (e) {
      console.error('Failed to load challenge progress', e);
    }
  }, []);

  useEffect(() => {
    challenges.forEach((c) => loadProgress(c.id));
  }, [challenges, loadProgress]);

  useEffect(() => {
    if (challenges.length > 0 && !selectedChallenge) {
      setSelectedChallenge(challenges[0].id);
    }
  }, [challenges, selectedChallenge]);

  const handleAddChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const challenge = await onAddChallenge({
      name: newName.trim(),
      monthlyGoal: newMonthlyGoal,
      totalMinutesGoal: newMinutesGoal,
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
    });
    setSelectedChallenge(challenge.id);
    setNewName('');
    setNewMonthlyGoal(4);
    setNewMinutesGoal(12000);
    setShowAdd(false);
  };

  const handleLogDaily = async (challengeId: string, date: string, minutes: number) => {
    try {
      await fetch(`/api/challenges/${challengeId}/daily`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, minutes }),
      });
      loadProgress(challengeId);
    } catch (e) {
      console.error('Failed to log daily reading', e);
    }
  };

  const activeProgress = selectedChallenge ? progressMap[selectedChallenge] : null;
  const activeChallenge = challenges.find((c) => c.id === selectedChallenge);

  return (
    <div className="challenge-page">
      <div className="page-header">
        <h1 className="page-title">阅读挑战</h1>
        <button className="btn-primary" onClick={() => setShowAdd(true)}>+ 新建挑战</button>
      </div>

      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <form className="add-challenge-form" onClick={(e) => e.stopPropagation()} onSubmit={handleAddChallenge}>
            <button type="button" className="modal-close" onClick={() => setShowAdd(false)}>✕</button>
            <h2>创建阅读挑战</h2>
            <div className="form-group">
              <label>挑战名称</label>
              <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="例：2025年度挑战" required />
            </div>
            <div className="form-group">
              <label>每月阅读目标（本）</label>
              <input type="number" min={1} value={newMonthlyGoal} onChange={(e) => setNewMonthlyGoal(parseInt(e.target.value) || 1)} />
            </div>
            <div className="form-group">
              <label>总阅读时长目标（分钟）</label>
              <input type="number" min={0} value={newMinutesGoal} onChange={(e) => setNewMinutesGoal(parseInt(e.target.value) || 0)} />
            </div>
            <button type="submit" className="btn-primary">创建挑战</button>
          </form>
        </div>
      )}

      {challenges.length > 0 && (
        <div className="challenge-tabs">
          {challenges.map((c) => (
            <button
              key={c.id}
              className={`challenge-tab ${selectedChallenge === c.id ? 'challenge-tab-active' : ''}`}
              onClick={() => setSelectedChallenge(c.id)}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {activeProgress && activeChallenge && (
        <div className="challenge-content">
          <div className="challenge-overview">
            <div className="challenge-stat-card">
              <span className="stat-number">{activeProgress.booksCompleted}</span>
              <span className="stat-label">已完成书籍</span>
            </div>
            <div className="challenge-stat-card">
              <span className="stat-number">{Math.round(activeProgress.totalMinutesRead / 60)}</span>
              <span className="stat-label">阅读时长（小时）</span>
            </div>
            <div className="challenge-stat-card">
              <span className="stat-number">{activeChallenge.monthlyGoal}</span>
              <span className="stat-label">每月目标（本）</span>
            </div>
            <button
              className="btn-danger btn-sm"
              onClick={async () => {
                await onDeleteChallenge(activeChallenge.id);
                setSelectedChallenge(challenges.length > 1 ? challenges.find((c) => c.id !== activeChallenge.id)?.id || null : null);
              }}
            >
              删除挑战
            </button>
          </div>

          <div className="challenge-progress-section">
            <ProgressBar percent={activeProgress.monthlyProgress} label="月度阅读进度" />
            <ProgressBar percent={activeProgress.totalMinutesProgress} label="总时长进度" />
          </div>

          <div className="calendar-section">
            <h3>阅读日历</h3>
            <CalendarDotChart
              dailyReadings={activeProgress.dailyReadings}
              onDateClick={(date, minutes) =>
                setLogModal({ date, minutes, challengeId: activeChallenge.id })
              }
            />
          </div>
        </div>
      )}

      {challenges.length === 0 && (
        <div className="empty-state">
          <p>还没有阅读挑战，快创建一个吧！</p>
        </div>
      )}

      {logModal && (
        <DailyLogModal
          date={logModal.date}
          initialMinutes={logModal.minutes}
          challengeId={logModal.challengeId}
          onSave={handleLogDaily}
          onClose={() => setLogModal(null)}
        />
      )}
    </div>
  );
}
