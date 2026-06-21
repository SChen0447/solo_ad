import { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import type { AdoptionRecord } from '../types';

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
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const delayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  const clearAllTimers = useCallback(() => {
    timersRef.current.forEach(timer => clearTimeout(timer));
    timersRef.current.clear();
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (delayTimerRef.current) {
      clearTimeout(delayTimerRef.current);
      delayTimerRef.current = null;
    }
  }, []);

  const handleDismiss = useCallback((recordId: string) => {
    if (!isMountedRef.current) return;
    setDismissedIds(prev => {
      const next = new Set(prev);
      next.add(recordId);
      return next;
    });
    setVisibleReminders(prev => prev.filter(r => r.record.id !== recordId));

    const autoHideTimer = timersRef.current.get(`autohide_${recordId}`);
    if (autoHideTimer) {
      clearTimeout(autoHideTimer);
      timersRef.current.delete(`autohide_${recordId}`);
    }
  }, []);

  const checkAndShowReminders = useCallback(() => {
    if (!isMountedRef.current) return;

    const due = getDueReminders(adoptionRecords);
    const newReminders = due.filter(info => !dismissedIds.has(info.record.id));

    if (newReminders.length > 0) {
      setVisibleReminders(prev => {
        const existingIds = new Set(prev.map(r => r.record.id));
        const toAdd = newReminders.filter(r => !existingIds.has(r.record.id));

        for (const reminder of toAdd) {
          const timerId = `autohide_${reminder.record.id}`;
          if (!timersRef.current.has(timerId)) {
            const timer = setTimeout(() => {
              handleDismiss(reminder.record.id);
            }, 5000);
            timersRef.current.set(timerId, timer);
          }
        }

        return [...prev, ...toAdd];
      });
    }
  }, [adoptionRecords, dismissedIds, handleDismiss]);

  useEffect(() => {
    isMountedRef.current = true;
    loadAdoptionRecords();

    return () => {
      isMountedRef.current = false;
      clearAllTimers();
    };
  }, [loadAdoptionRecords, clearAllTimers]);

  useEffect(() => {
    if (!isMountedRef.current) return;

    checkAndShowReminders();

    if (delayTimerRef.current) {
      clearTimeout(delayTimerRef.current);
      delayTimerRef.current = null;
    }

    const delay = getNextReminderDelay(adoptionRecords);
    if (delay !== null && delay > 0) {
      delayTimerRef.current = setTimeout(() => {
        checkAndShowReminders();
      }, delay);
    }

    if (!intervalRef.current) {
      intervalRef.current = setInterval(checkAndShowReminders, 60000);
    }

    return () => {
      if (delayTimerRef.current) {
        clearTimeout(delayTimerRef.current);
        delayTimerRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [adoptionRecords, checkAndShowReminders]);

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
