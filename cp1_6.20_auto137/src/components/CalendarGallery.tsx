import { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useDiaryStore } from '../store';
import { EMOTION_CONFIG } from '../types';
import type { EmotionType, Diary } from '../types';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import * as d3 from 'd3';

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

const EMOTION_VALUE: Record<EmotionType, number> = {
  happy: 8, excited: 7, grateful: 6, calm: 5, tired: 3, anxious: 2, sad: 1, angry: 0,
};

export default function CalendarGallery() {
  const navigate = useNavigate();
  const { diaries, currentMonth, setCurrentMonth, loadDiaries } = useDiaryStore();
  const chartRef = useRef<HTMLDivElement>(null);
  const [selectedDiary, setSelectedDiary] = useState<Diary | null>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const { year, month } = useMemo(() => {
    const [y, m] = currentMonth.split('-').map(Number);
    return { year: y, month: m - 1 };
  }, [currentMonth]);

  const daysInMonth = useMemo(() => getDaysInMonth(year, month), [year, month]);
  const firstDay = useMemo(() => getFirstDayOfWeek(year, month), [year, month]);

  const diaryMap = useMemo(() => {
    const map: Record<string, Diary> = {};
    diaries.forEach((d) => {
      const dateKey = d.createdAt.slice(0, 10);
      map[dateKey] = d;
    });
    return map;
  }, [diaries]);

  useEffect(() => {
    loadDiaries(currentMonth);
  }, [currentMonth, loadDiaries]);

  useEffect(() => {
    if (!chartRef.current || diaries.length === 0) return;

    const svgEl = chartRef.current;
    d3.select(svgEl).selectAll('*').remove();

    const width = svgEl.clientWidth || 300;
    const height = 160;
    const margin = { top: 20, right: 20, bottom: 30, left: 30 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const svg = d3.select(svgEl)
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const data = diaries
      .map((d) => ({
        date: new Date(d.createdAt),
        emotion: d.emotion,
        value: EMOTION_VALUE[d.emotion],
        color: EMOTION_CONFIG[d.emotion].color,
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    const xScale = d3.scaleTime()
      .domain(d3.extent(data, (d) => d.date) as [Date, Date])
      .range([0, innerW]);

    const yScale = d3.scaleLinear()
      .domain([0, 8])
      .range([innerH, 0]);

    const line = d3.line<{ date: Date; value: number }>()
      .x((d) => xScale(d.date))
      .y((d) => yScale(d.value))
      .curve(d3.curveCatmullRom.alpha(0.5));

    g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#81B29A')
      .attr('stroke-width', 2.5)
      .attr('d', line as unknown as string)
      .attr('stroke-linecap', 'round');

    const tooltip = d3.select(svgEl)
      .append('div')
      .style('position', 'absolute')
      .style('background', 'white')
      .style('border-radius', '8px')
      .style('padding', '6px 10px')
      .style('font-size', '12px')
      .style('box-shadow', '0 2px 8px rgba(0,0,0,0.1)')
      .style('pointer-events', 'none')
      .style('opacity', 0)
      .style('z-index', '10');

    g.selectAll('circle')
      .data(data)
      .enter()
      .append('circle')
      .attr('cx', (d) => xScale(d.date))
      .attr('cy', (d) => yScale(d.value))
      .attr('r', 5)
      .attr('fill', (d) => d.color)
      .attr('stroke', 'white')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('mouseenter', (event: MouseEvent, d: typeof data[0]) => {
        const dateStr = d.date.toLocaleDateString('zh-CN');
        tooltip
          .html(`<strong>${dateStr}</strong><br/>${EMOTION_CONFIG[d.emotion].emoji} ${EMOTION_CONFIG[d.emotion].label}`)
          .style('opacity', 1)
          .style('left', `${event.offsetX + 10}px`)
          .style('top', `${event.offsetY - 30}px`);
      })
      .on('mouseleave', () => {
        tooltip.style('opacity', 0);
      });

    const xAxis = d3.axisBottom(xScale)
      .ticks(Math.min(data.length, 6))
      .tickFormat(d3.timeFormat('%m/%d') as unknown as (d: Date | d3.NumberValue) => string);

    g.append('g')
      .attr('transform', `translate(0,${innerH})`)
      .call(xAxis)
      .selectAll('text')
      .style('font-size', '10px')
      .style('fill', '#999');

    g.append('g')
      .call(d3.axisLeft(yScale).ticks(4).tickFormat(() => ''))
      .selectAll('line, path')
      .style('stroke', '#eee');
  }, [diaries]);

  const handlePrevMonth = () => {
    const d = new Date(year, month - 1, 1);
    setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    const d = new Date(year, month + 1, 1);
    setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const diff = e.changedTouches[0].clientX - touchStart;
    if (Math.abs(diff) > 60) {
      if (diff > 0) handlePrevMonth();
      else handleNextMonth();
    }
    setTouchStart(null);
  };

  const calendarCells = useMemo(() => {
    const cells: { day: number; dateStr: string; diary?: Diary }[] = [];
    for (let i = 0; i < firstDay; i++) {
      cells.push({ day: 0, dateStr: '' });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ day: d, dateStr, diary: diaryMap[dateStr] });
    }
    return cells;
  }, [year, month, firstDay, daysInMonth, diaryMap]);

  const monthLabel = `${year}年${month + 1}月`;

  return (
    <div className="min-h-screen bg-cream">
      <header className="sticky top-0 z-30 bg-cream/80 backdrop-blur-md border-b border-black/5">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="font-display text-2xl text-gray-800">灵感画布</h1>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/diary/new')}
            className="btn-bounce flex items-center gap-1 px-4 py-2 rounded-xl text-white text-sm font-medium shadow-card"
            style={{ background: 'linear-gradient(135deg, #81B29A, #52796F)' }}
          >
            <Plus size={16} />
            新建日记
          </motion.button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg text-gray-700">情绪日历</h2>
            <div className="flex items-center gap-3">
              <button onClick={handlePrevMonth} className="btn-bounce p-1.5 rounded-lg hover:bg-white/60">
                <ChevronLeft size={18} className="text-gray-500" />
              </button>
              <span className="font-medium text-gray-600 text-sm min-w-[80px] text-center">{monthLabel}</span>
              <button onClick={handleNextMonth} className="btn-bounce p-1.5 rounded-lg hover:bg-white/60">
                <ChevronRight size={18} className="text-gray-500" />
              </button>
            </div>
          </div>

          <div
            className="bg-white/60 rounded-2xl p-4 shadow-card"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <div className="grid grid-cols-7 gap-1 mb-2">
              {WEEKDAYS.map((d) => (
                <div key={d} className="text-center text-xs text-gray-400 font-medium py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1 md:grid-cols-7">
              <AnimatePresence mode="popLayout">
                {calendarCells.map((cell, i) => (
                  <motion.div
                    key={cell.day ? `${currentMonth}-${cell.day}` : `empty-${i}`}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.2, delay: i * 0.01 }}
                    className="flex items-center justify-center"
                  >
                    {cell.day > 0 && (
                      <button
                        onClick={() => {
                          if (cell.diary) {
                            setSelectedDiary(cell.diary);
                          }
                        }}
                        className="relative w-[48px] h-[48px] rounded-lg flex flex-col items-center justify-center transition-all hover:scale-110"
                        style={{
                          background: cell.diary
                            ? EMOTION_CONFIG[cell.diary.emotion].gradient
                            : 'rgba(255,255,255,0.3)',
                          boxShadow: cell.diary ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                        }}
                      >
                        <span className={`text-xs ${cell.diary ? 'text-white font-medium' : 'text-gray-400'}`}>
                          {cell.day}
                        </span>
                        {cell.diary && (
                          <span className="text-[10px] leading-none mt-0.5">
                            {EMOTION_CONFIG[cell.diary.emotion].emoji}
                          </span>
                        )}
                      </button>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </section>

        <section>
          <h2 className="font-display text-lg text-gray-700 mb-4">情绪趋势</h2>
          <div className="bg-white/60 rounded-2xl p-4 shadow-card relative" ref={chartRef}>
            {diaries.length === 0 && (
              <div className="h-[160px] flex items-center justify-center text-gray-300 text-sm">
                还没有日记数据，快去记录你的第一篇吧～
              </div>
            )}
          </div>
        </section>

        <AnimatePresence>
          {selectedDiary && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
              onClick={() => setSelectedDiary(null)}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-card-hover max-w-md w-full overflow-hidden"
              >
                <div
                  className="p-4"
                  style={{ background: EMOTION_CONFIG[selectedDiary.emotion].gradient }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{EMOTION_CONFIG[selectedDiary.emotion].emoji}</span>
                    <span className="text-white font-display text-lg">
                      {EMOTION_CONFIG[selectedDiary.emotion].label}
                    </span>
                    <span className="text-white/70 text-sm ml-auto">
                      {new Date(selectedDiary.createdAt).toLocaleDateString('zh-CN')}
                    </span>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  <p className="text-gray-700 text-sm leading-relaxed">{selectedDiary.text}</p>
                  {selectedDiary.emojis.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {selectedDiary.emojis.map((e, i) => (
                        <span key={i} className="text-2xl">{e.emoji}</span>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => {
                        setSelectedDiary(null);
                        navigate(`/diary/${selectedDiary.id}`);
                      }}
                      className="btn-bounce flex-1 py-2 rounded-xl text-white text-sm font-medium"
                      style={{ background: EMOTION_CONFIG[selectedDiary.emotion].gradient }}
                    >
                      查看拼贴画
                    </button>
                    <button
                      onClick={() => setSelectedDiary(null)}
                      className="btn-bounce px-4 py-2 rounded-xl text-gray-500 text-sm bg-gray-100 hover:bg-gray-200"
                    >
                      关闭
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
