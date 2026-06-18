import React from 'react';

interface DateBadgeProps {
  date: string;
  isActiveYear: boolean;
}

const DateBadge: React.FC<DateBadgeProps> = ({ date, isActiveYear }) => {
  const d = new Date(date);
  const day = d.getDate();
  const month = d.getMonth() + 1;

  return (
    <div className={`date-badge ${isActiveYear ? 'active-year' : ''}`}>
      <span>{day}</span>
      <span className="date-badge-month">{month}月</span>
    </div>
  );
};

export default DateBadge;
