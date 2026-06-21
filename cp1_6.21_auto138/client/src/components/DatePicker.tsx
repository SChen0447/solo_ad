import { useEffect, useState, useRef } from 'react';

interface DatePickerProps {
  value?: string;
  onChange: (date: string) => void;
  placeholder?: string;
}

export default function DatePicker({ value, onChange, placeholder = '选择日期' }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(value ? new Date(value) : new Date());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const toISO = (d: Date) => d.toISOString().split('T')[0];

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startWeekday = firstDay.getDay();
  const totalDays = lastDay.getDate();

  const days: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i++) days.push(null);
  for (let i = 1; i <= totalDays; i++) days.push(i);
  while (days.length % 7 !== 0) days.push(null);

  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];

  return (
    <div className="datepicker-wrapper" ref={ref}>
      <input
        type="text"
        readOnly
        value={value || ''}
        placeholder={placeholder}
        className="form-input datepicker-input"
        onClick={() => setOpen(!open)}
      />
      {open && (
        <div className="datepicker-popup">
          <div className="datepicker-header">
            <button
              type="button"
              onClick={() => setViewDate(new Date(year, month - 1, 1))}
              className="datepicker-nav"
            >‹</button>
            <span className="datepicker-title">{year}年{month + 1}月</span>
            <button
              type="button"
              onClick={() => setViewDate(new Date(year, month + 1, 1))}
              className="datepicker-nav"
            >›</button>
          </div>
          <div className="datepicker-grid">
            {weekdays.map((w) => (
              <div key={w} className="datepicker-weekday">{w}</div>
            ))}
            {days.map((d, i) => (
              <div
                key={i}
                className={`datepicker-day ${
                  d === null ? 'empty' : ''
                } ${d && value === toISO(new Date(year, month, d)) ? 'selected' : ''}`}
                onClick={() => {
                  if (d) {
                    onChange(toISO(new Date(year, month, d)));
                    setOpen(false);
                  }
                }}
              >
                {d}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
