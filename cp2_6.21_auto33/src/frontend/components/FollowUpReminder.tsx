import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';

export default function FollowUpReminder() {
  const { adoptionRecords } = useApp();
  const [visible, setVisible] = useState(false);
  const [currentReminder, setCurrentReminder] = useState<typeof adoptionRecords[0] | null>(null);

  useEffect(() => {
    const now = new Date();
    const due = adoptionRecords.filter(record => {
      if (record.archived) return false;
      const nextDate = new Date(record.nextFollowUpDate);
      return nextDate <= now;
    });

    if (due.length > 0 && !visible) {
      setCurrentReminder(due[0]);
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [adoptionRecords, visible]);

  if (!visible || !currentReminder) return null;

  return (
    <div className="followup-reminder">
      <div className="reminder-header">
        <span className="reminder-icon">⏰</span>
        <strong>回访提醒</strong>
      </div>
      <div className="reminder-body">
        <p>
          <strong>{currentReminder.petName}</strong> 的回访时间已到
        </p>
        <p className="reminder-subtext">
          领养人：{currentReminder.applicantName}
        </p>
        <p className="reminder-date">
          应回访日期：{new Date(currentReminder.nextFollowUpDate).toLocaleDateString()}
        </p>
      </div>
      <button className="reminder-close" onClick={() => setVisible(false)}>×</button>
    </div>
  );
}
