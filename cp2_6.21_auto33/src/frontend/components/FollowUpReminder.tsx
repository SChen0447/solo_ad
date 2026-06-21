import { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import type { AdoptionRecord } from '../types';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

interface ReminderInfo {
  record: AdoptionRecord;
  dueDate: Date;
}

function getDueReminders(records: AdoptionRecord[]): ReminderInfo[] {
  const now = new Date();
  return records
    .filter(record => !record.archived)
    .map(record => {
      const nextDate = new Date(record.nextFollowUpDate);
      return { record, dueDate: nextDate };
    })
    .filter(info => info.dueDate <= now);
}

function getNextReminderDelay(records: AdoptionRecord[]): number | null {
  const now = Date.now();
  let minDelay: number | null = null;

  for (const record of records) {
    if (record.archived) continue;
    const nextTime = new Date(record.nextFollowUpDate).getTime();
    const delay = nextTime - now;
    if (delay <= 0) return 0;
    if (minDelay === null || delay < minDelay) {
      minDelay = delay;
    }
  }

  return minDelay;
}

export default function FollowUpReminder() {
  const { adoptionRecords, loadAdoptionRecords } = useApp();
  const [visibleReminders, setVisibleReminders] = useState<ReminderInfo[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearAllTimers = useCallback(() => {
    timersRef.current.forEach(t => clearTimeout(t));
    timersRef.current = [];
  }, []);

  const checkAndShowReminders = useCallback(() => {
    const due = getDueReminders(adoptionRecords);
    const newReminders = due.filter(info => !dismissedIds.has(info.record.id));

    if (newReminders.length > 0) {
      setVisibleReminders(prev => {
        const existingIds = new Set(prev.map(r => r.record.id));
        const toAdd = newReminders.filter(r => !existingIds.has(r.record.id));
        return [...prev, ...toAdd];
      });
    }
  }, [adoptionRecords, dismissedIds]);

  useEffect(() => {
    loadAdoptionRecords();
  }, [loadAdoptionRecords]);

  useEffect(() => {
    clearAllTimers();

    checkAndShowReminders();

    const delay = getNextReminderDelay(adoptionRecords);
    if (delay !== null && delay > 0) {
      const timer = setTimeout(() => {
        checkAndShowReminders();
      }, delay);
      timersRef.current.push(timer);
    }

    const pollTimer = setInterval(checkAndShowReminders, 60000);
    timersRef.current.push(pollTimer);

    return clearAllTimers;
  }, [adoptionRecords, checkAndShowReminders, clearAllTimers]);

  const handleDismiss = (recordId: string) => {
    setDismissedIds(prev => new Set(prev).add(recordId));
    setVisibleReminders(prev => prev.filter(r => r.record.id !== recordId));
  };

  useEffect(() => {
    const autoHideTimers: ReturnType<typeof setTimeout>[] = [];

    for (const reminder of visibleReminders) {
      const timer = setTimeout(() => {
        handleDismiss(reminder.record.id);
      }, 5000);
      autoHideTimers.push(timer);
    }

    return () => {
      autoHideTimers.forEach(t => clearTimeout(t));
    };
  }, [visibleReminders]);

  if (visibleReminders.length === 0) return null;

  return (
    <div className="followup-reminder-container">
      {visibleReminders.map(info => (
        <div key={info.record.id} className="followup-reminder">
          <div className="reminder-header">
            <span className="reminder-icon">⏰</span>
            <strong>回访提醒</strong>
          </div>
          <div className="reminder-body">
            <p>
              <strong>{info.record.petName}</strong> 的回访时间已到
            </p>
            <p className="reminder-subtext">
              领养人：{info.record.applicantName}
            </p>
            <p className="reminder-date">
              领养日期：{new Date(info.record.adoptedAt).toLocaleDateString()}
            </p>
            <p className="reminder-date">
              应回访日期：{info.dueDate.toLocaleDateString()}
            </p>
            <p className="reminder-followup-count">
              已完成回访：{info.record.followUps.length}/3
            </p>
          </div>
          <button className="reminder-close" onClick={() => handleDismiss(info.record.id)}>×</button>
        </div>
      ))}
    </div>
  );
}
