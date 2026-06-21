import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import { useStore } from '@/store';
import { VideoEntry, STATUS_LABELS } from '@/types';
import DetailModal from './DetailModal';

function formatHour(h: number): string {
  return `${String(h).padStart(2, '0')}:00`;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  published: 'bg-green-100 text-green-700',
  delayed: 'bg-red-100 text-red-700',
};

export default function CalendarDayView() {
  const videos = useStore((s) => s.videos);
  const projects = useStore((s) => s.projects);
  const calendarDate = useStore((s) => s.calendarDate);
  const setCalendarMode = useStore((s) => s.setCalendarMode);
  const setCalendarDate = useStore((s) => s.setCalendarDate);

  const [selectedVideo, setSelectedVideo] = useState<VideoEntry | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const currentDate = useMemo(() => new Date(calendarDate), [calendarDate]);

  const dateLabel = useMemo(() => {
    const y = currentDate.getFullYear();
    const m = currentDate.getMonth() + 1;
    const d = currentDate.getDate();
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    const w = weekdays[currentDate.getDay()];
    return `${y}年${m}月${d}日 周${w}`;
  }, [currentDate]);

  const projectMap = useMemo(() => {
    const map = new Map<string, { name: string; colorTag: string }>();
    projects.forEach((p) => map.set(p.id, { name: p.name, colorTag: p.colorTag }));
    return map;
  }, [projects]);

  const dayVideos = useMemo(() => {
    return videos.filter((v) => v.plannedTime.slice(0, 10) === calendarDate);
  }, [videos, calendarDate]);

  const videosByHour = useMemo(() => {
    const map = new Map<number, VideoEntry[]>();
    for (let h = 0; h < 24; h++) {
      map.set(h, []);
    }
    dayVideos.forEach((v) => {
      const hour = new Date(v.plannedTime).getHours();
      const list = map.get(hour) || [];
      list.push(v);
      map.set(hour, list);
    });
    return map;
  }, [dayVideos]);

  const goPrev = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 1);
    setCalendarDate(d.toISOString().slice(0, 10));
  };

  const goNext = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 1);
    setCalendarDate(d.toISOString().slice(0, 10));
  };

  const goBack = () => {
    setCalendarMode('month');
  };

  const openDetail = (video: VideoEntry) => {
    setSelectedVideo(video);
    setModalOpen(true);
  };

  const closeDetail = () => {
    setModalOpen(false);
    setSelectedVideo(null);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200">
        <button
          onClick={goBack}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-2 flex-1">
          <button
            onClick={goPrev}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-base font-semibold min-w-[180px] text-center">
            {dateLabel}
          </span>
          <button
            onClick={goNext}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>
        <span className="text-sm text-gray-500">
          共 {dayVideos.length} 条视频
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {Array.from({ length: 24 }, (_, h) => {
          const hourVideos = videosByHour.get(h) || [];
          return (
            <div key={h} className="flex border-b border-gray-100 min-h-[56px]">
              <div className="w-16 shrink-0 py-2 px-2 text-xs text-gray-400 text-right border-r border-gray-100">
                {formatHour(h)}
              </div>
              <div className="flex-1 py-1.5 px-2 flex flex-wrap gap-1.5">
                {hourVideos.map((v) => {
                  const project = projectMap.get(v.projectId);
                  return (
                    <div
                      key={v.id}
                      onClick={() => openDetail(v)}
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white hover:shadow-md transition-shadow cursor-pointer text-sm max-w-[280px]"
                    >
                      <div
                        className="w-1 h-8 rounded-full shrink-0"
                        style={{ backgroundColor: project?.colorTag || '#94a3b8' }}
                      />
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="truncate text-gray-800 font-medium text-xs">
                          {v.title}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {formatDuration(v.duration)}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full whitespace-nowrap ${STATUS_STYLES[v.status] || ''}`}
                      >
                        {STATUS_LABELS[v.status]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <DetailModal
        open={modalOpen}
        onClose={closeDetail}
        video={selectedVideo}
      />
    </div>
  );
}
