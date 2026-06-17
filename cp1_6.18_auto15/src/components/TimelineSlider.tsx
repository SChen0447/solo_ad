import { useMemo } from 'react';
import { Clock } from 'lucide-react';
import { useMindStore } from '@/store/useMindStore';

function formatMMDD(timestamp: number): string {
  const d = new Date(timestamp);
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

export default function TimelineSlider() {
  const timelineStart = useMindStore((s) => s.timelineStart);
  const timelineEnd = useMindStore((s) => s.timelineEnd);
  const setTimelineRange = useMindStore((s) => s.setTimelineRange);

  const rangeValue = useMemo(() => {
    const total = Date.now() - timelineStart;
    if (total <= 0) return 100;
    return ((timelineEnd - timelineStart) / total) * 100;
  }, [timelineStart, timelineEnd]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    const newEnd = timelineStart + (v / 100) * (Date.now() - timelineStart);
    setTimelineRange(timelineStart, newEnd);
  };

  return (
    <div className="fixed right-4 top-1/2 -translate-y-1/2 h-[60vh] w-12 flex flex-col items-center backdrop-blur-[12px] bg-white/[0.06] border border-white/[0.1] rounded-[16px] p-2">
      <Clock size={16} className="text-white/40" />

      <span className="text-[10px] font-display text-white/40 mt-1">
        {formatMMDD(timelineEnd)}
      </span>

      <div className="relative flex-1 w-full flex items-center justify-center">
        <div className="absolute h-full flex flex-col justify-between items-center py-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="w-2 h-px bg-white/20" />
          ))}
        </div>

        <input
          type="range"
          min={0}
          max={100}
          value={rangeValue}
          onChange={handleChange}
          className="timeline-slider cursor-pointer"
          style={{ writingMode: 'vertical-lr' as React.CSSProperties['writingMode'], direction: 'rtl' }}
        />
      </div>

      <span className="text-[10px] font-display text-white/40 mb-1">
        {formatMMDD(timelineStart)}
      </span>

      <style>{`
        .timeline-slider {
          -webkit-appearance: none;
          appearance: none;
          background: transparent;
          height: 100%;
          width: 4px;
          transition: all 0.2s ease;
        }
        .timeline-slider::-webkit-slider-runnable-track {
          background: rgba(255, 255, 255, 0.1);
          width: 4px;
          border-radius: 2px;
        }
        .timeline-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: linear-gradient(to right, #667eea, #764ba2);
          cursor: pointer;
        }
        .timeline-slider::-moz-range-track {
          background: rgba(255, 255, 255, 0.1);
          width: 4px;
          border-radius: 2px;
        }
        .timeline-slider::-moz-range-thumb {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: linear-gradient(to right, #667eea, #764ba2);
          cursor: pointer;
          border: none;
        }
      `}</style>
    </div>
  );
}
