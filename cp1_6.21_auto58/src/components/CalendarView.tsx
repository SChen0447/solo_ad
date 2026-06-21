import { useMemo, useState, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useStore } from '@/store';

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

function getDensityBg(count: number): string {
  if (count === 0) return 'bg-white';
  if (count <= 2) return 'bg-gradient-to-b from-yellow-50 to-yellow-100';
  if (count <= 4) return 'bg-gradient-to-b from-orange-100 to-orange-200';
  return 'bg-gradient-to-b from-red-200 to-red-400';
}

export default function CalendarView() {
  const videos = useStore((s) => s.videos);
  const projects = useStore((s) => s.projects);
  const calendarDate = useStore((s) => s.calendarDate);
  const setCalendarDate = useStore((s) => s.setCalendarDate);
  const setCalendarMode = useStore((s) => s.setCalendarMode);
  const updateVideo = useStore((s) => s.updateVideo);

  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date(calendarDate);
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const dragRafRef = useRef<number>(0);

  const projectMap = useMemo(() => {
    const map = new Map<string, { name: string; colorTag: string }>();
    projects.forEach((p) => map.set(p.id, { name: p.name, colorTag: p.colorTag }));
    return map;
  }, [projects]);

  const videosByDate = useMemo(() => {
    const map = new Map<string, typeof videos>();
    videos.forEach((v) => {
      const dateKey = v.plannedTime.slice(0, 10);
      const list = map.get(dateKey) || [];
      list.push(v);
      map.set(dateKey, list);
    });
    return map;
  }, [videos]);

  const calendarDays = useMemo(() => {
    const { year, month } = currentMonth;
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfWeek(year, month);
    const days: { date: string; day: number; isCurrentMonth: boolean }[] = [];

    const prevMonthDays = getDaysInMonth(year, month === 0 ? 11 : month - 1);
    for (let i = firstDay - 1; i >= 0; i--) {
      const day = prevMonthDays - i;
      const m = month === 0 ? 11 : month - 1;
      const y = month === 0 ? year - 1 : year;
      const date = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      days.push({ date, day, isCurrentMonth: false });
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({ date, day: i, isCurrentMonth: true });
    }

    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const m = month === 11 ? 0 : month + 1;
      const y = month === 11 ? year + 1 : year;
      const date = `${y}-${String(m + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({ date, day: i, isCurrentMonth: false });
    }

    return days;
  }, [currentMonth]);

  const monthLabel = `${currentMonth.year}年${currentMonth.month + 1}月`;

  const goPrev = () =>
    setCurrentMonth((prev) => {
      const month = prev.month === 0 ? 11 : prev.month - 1;
      const year = prev.month === 0 ? prev.year - 1 : prev.year;
      return { year, month };
    });

  const goNext = () =>
    setCurrentMonth((prev) => {
      const month = prev.month === 11 ? 0 : prev.month + 1;
      const year = prev.month === 11 ? prev.year + 1 : prev.year;
      return { year, month };
    });

  const goToday = () => {
    const now = new Date();
    setCurrentMonth({ year: now.getFullYear(), month: now.getMonth() });
  };

  const handleDateClick = (date: string) => {
    setCalendarDate(date);
    setCalendarMode('day');
  };

  const handleDragStart = useCallback((e: React.DragEvent, videoId: string) => {
    e.dataTransfer.setData('videoId', videoId);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent, date: string) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (dragOverDate !== date) {
        cancelAnimationFrame(dragRafRef.current);
        dragRafRef.current = requestAnimationFrame(() => {
          setDragOverDate(date);
        });
      }
    },
    [dragOverDate],
  );

  const handleDragLeave = useCallback(() => {
    cancelAnimationFrame(dragRafRef.current);
    dragRafRef.current = requestAnimationFrame(() => {
      setDragOverDate(null);
    });
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, date: string) => {
      e.preventDefault();
      cancelAnimationFrame(dragRafRef.current);
      setDragOverDate(null);
      const videoId = e.dataTransfer.getData('videoId');
      if (videoId) {
        const video = videos.find((v) => v.id === videoId);
        if (video) {
          const oldDate = video.plannedTime.slice(0, 10);
          if (oldDate !== date) {
            const newPlannedTime = `${date}${video.plannedTime.slice(10)}`;
            updateVideo(videoId, { plannedTime: newPlannedTime });
          }
        }
      }
    },
    [videos, updateVideo],
  );

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  return (
    <div className="flex flex-col h-full select-none">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <button
            onClick={goPrev}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-base font-semibold min-w-[120px] text-center">
            {monthLabel}
          </span>
          <button
            onClick={goNext}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>
        <button
          onClick={goToday}
          className="px-3 py-1 text-sm rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
        >
          今天
        </button>
      </div>

      <div className="grid grid-cols-7 border-b border-gray-200">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="py-2 text-center text-xs font-medium text-gray-500"
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 flex-1 auto-rows-fr overflow-hidden">
        {calendarDays.map((dayInfo) => {
          const dayVideos = videosByDate.get(dayInfo.date) || [];
          const count = dayVideos.length;
          const isDragOver = dragOverDate === dayInfo.date;
          const isToday = dayInfo.date === todayStr;

          return (
            <div
              key={dayInfo.date}
              className={`
                border border-gray-100 p-1.5 cursor-pointer transition-all duration-150 overflow-hidden
                ${dayInfo.isCurrentMonth ? '' : 'opacity-40'}
                ${getDensityBg(count)}
                ${isDragOver ? 'ring-2 ring-blue-400 ring-inset scale-[1.02] z-10' : ''}
                ${isToday ? 'ring-2 ring-blue-500 ring-inset' : ''}
              `}
              onClick={() => handleDateClick(dayInfo.date)}
              onDragOver={(e) => handleDragOver(e, dayInfo.date)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, dayInfo.date)}
            >
              <div className="flex items-center justify-between mb-0.5">
                <span
                  className={`text-xs leading-none ${
                    isToday
                      ? 'bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center'
                      : 'text-gray-700'
                  }`}
                >
                  {dayInfo.day}
                </span>
                {count > 0 && (
                  <span className="text-[10px] bg-blue-500 text-white rounded-full px-1.5 py-0.5 leading-none">
                    {count}
                  </span>
                )}
              </div>
              <div className="space-y-0.5">
                {dayVideos.slice(0, 3).map((v) => {
                  const project = projectMap.get(v.projectId);
                  return (
                    <div
                      key={v.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, v.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1 text-[10px] truncate rounded px-1 py-0.5 hover:bg-white/60 cursor-grab active:cursor-grabbing"
                      style={{
                        borderLeft: `2px solid ${project?.colorTag || '#94a3b8'}`,
                      }}
                    >
                      <span className="truncate">{v.title}</span>
                    </div>
                  );
                })}
                {count > 3 && (
                  <div className="text-[10px] text-gray-500 pl-1">+更多...</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
