import { useEffect, useMemo, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import html2canvas from 'html2canvas';
import { Timeline } from '@/components/Timeline';
import type { POICategory } from '@/types';
import {
  useTripStore,
  selectDays,
  selectTrip,
  selectSelectedDayIndex,
  selectAvailableCities,
} from '@/stores/useTripStore';

const categoryLabels: Record<POICategory, { label: string; icon: string; color: string }> = {
  nature: { label: '自然风光', icon: '🏔️', color: '#4ade80' },
  culture: { label: '历史人文', icon: '🏛️', color: '#60a5fa' },
  food: { label: '美食购物', icon: '🍜', color: '#fbbf24' },
};

function formatDateDisplay(dateStr: string) {
  const d = new Date(dateStr);
  const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return {
    full: `${d.getMonth() + 1}月${d.getDate()}日`,
    week: weekDays[d.getDay()],
    month: d.getMonth() + 1,
    day: d.getDate(),
  };
}

function getTodayStr() {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

function addDays(dateStr: string, days: number) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

interface CalendarProps {
  startDate: string;
  endDate: string;
  selectedDate?: string;
  onDateRangeChange: (start: string, end: string) => void;
  onSelectDate: (date: string) => void;
}

function Calendar({ startDate, endDate, selectedDate, onDateRangeChange, onSelectDate }: CalendarProps) {
  const [viewDate, setViewDate] = useState(() => new Date(startDate));
  const [selecting, setSelecting] = useState<'start' | 'end' | null>(null);

  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();

  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const lastDay = new Date(viewYear, viewMonth + 1, 0);
    const startWeekday = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const days: { date: Date; str: string; inMonth: boolean }[] = [];

    for (let i = startWeekday - 1; i >= 0; i--) {
      const d = new Date(viewYear, viewMonth, -i);
      days.push({ date: d, str: d.toISOString().split('T')[0], inMonth: false });
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(viewYear, viewMonth, i);
      days.push({ date: d, str: d.toISOString().split('T')[0], inMonth: true });
    }

    while (days.length % 7 !== 0) {
      const last = days[days.length - 1].date;
      const d = new Date(last);
      d.setDate(d.getDate() + 1);
      days.push({ date: d, str: d.toISOString().split('T')[0], inMonth: false });
    }

    return days;
  }, [viewYear, viewMonth]);

  const isInRange = (str: string) => str >= startDate && str <= endDate;
  const isStart = (str: string) => str === startDate;
  const isEnd = (str: string) => str === endDate;
  const isSelected = (str: string) => str === selectedDate;

  const handleClickDay = (str: string) => {
    if (selecting === 'start') {
      if (str > endDate) {
        onDateRangeChange(str, str);
      } else {
        onDateRangeChange(str, endDate);
      }
      setSelecting(null);
    } else if (selecting === 'end') {
      if (str < startDate) {
        onDateRangeChange(str, str);
      } else {
        onDateRangeChange(startDate, str);
      }
      setSelecting(null);
    } else {
      if (str >= startDate && str <= endDate) {
        onSelectDate(str);
      }
    }
  };

  const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

  return (
    <div style={{
      background: '#0f3460',
      borderRadius: '12px',
      padding: '12px',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '12px',
      }}>
        <button
          onClick={() => setViewDate(new Date(viewYear, viewMonth - 1, 1))}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#eaeaea',
            cursor: 'pointer',
            fontSize: '16px',
            padding: '4px 10px',
            borderRadius: '6px',
          }}
        >
          ‹
        </button>
        <div style={{ fontSize: '14px', fontWeight: 600, color: '#eaeaea' }}>
          {viewYear}年 {monthNames[viewMonth]}
        </div>
        <button
          onClick={() => setViewDate(new Date(viewYear, viewMonth + 1, 1))}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#eaeaea',
            cursor: 'pointer',
            fontSize: '16px',
            padding: '4px 10px',
            borderRadius: '6px',
          }}
        >
          ›
        </button>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: '2px',
        marginBottom: '4px',
      }}>
        {['日', '一', '二', '三', '四', '五', '六'].map(d => (
          <div key={d} style={{
            textAlign: 'center',
            fontSize: '11px',
            color: 'rgba(234,234,234,0.5)',
            padding: '6px 0',
          }}>
            {d}
          </div>
        ))}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: '2px',
      }}>
        {calendarDays.map(({ str, inMonth, date }) => {
          const start = isStart(str);
          const end = isEnd(str);
          const inRange = isInRange(str);
          const selected = isSelected(str);

          let bg = 'transparent';
          let color = inMonth ? 'rgba(234,234,234,0.8)' : 'rgba(234,234,234,0.2)';
          let border = 'none';
          let fontWeight = 400;
          let borderRadius = '6px';

          if (start || end) {
            bg = '#e94560';
            color = '#fff';
            fontWeight = 600;
            borderRadius = '50%';
          } else if (inRange) {
            bg = 'rgba(233, 69, 96, 0.25)';
            color = '#eaeaea';
          }
          if (selected && !start && !end) {
            border = '2px solid #e94560';
            borderRadius = '50%';
          }

          return (
            <button
              key={str}
              onClick={() => handleClickDay(str)}
              style={{
                aspectRatio: '1',
                background: bg,
                border,
                borderRadius,
                color,
                fontWeight,
                cursor: 'pointer',
                fontSize: '12px',
                padding: 0,
                transition: 'all 0.15s ease',
              }}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>

      <div style={{
        display: 'flex',
        gap: '8px',
        marginTop: '12px',
        paddingTop: '12px',
        borderTop: '1px solid rgba(234,234,234,0.1)',
      }}>
        <button
          onClick={() => setSelecting('start')}
          style={{
            flex: 1,
            padding: '6px 10px',
            fontSize: '11px',
            background: selecting === 'start' ? 'rgba(233, 69, 96, 0.3)' : 'rgba(234,234,234,0.08)',
            border: `1px solid ${selecting === 'start' ? '#e94560' : 'rgba(234,234,234,0.15)'}`,
            borderRadius: '6px',
            color: '#eaeaea',
            cursor: 'pointer',
          }}
        >
          起始日: {formatDateDisplay(startDate).full}
        </button>
        <button
          onClick={() => setSelecting('end')}
          style={{
            flex: 1,
            padding: '6px 10px',
            fontSize: '11px',
            background: selecting === 'end' ? 'rgba(233, 69, 96, 0.3)' : 'rgba(234,234,234,0.08)',
            border: `1px solid ${selecting === 'end' ? '#e94560' : 'rgba(234,234,234,0.15)'}`,
            borderRadius: '6px',
            color: '#eaeaea',
            cursor: 'pointer',
          }}
        >
          结束日: {formatDateDisplay(endDate).full}
        </button>
      </div>
    </div>
  );
}

export function App() {
  const trip = useTripStore(selectTrip);
  const days = useTripStore(selectDays);
  const dayIndex = useTripStore(selectSelectedDayIndex);
  const cities = useTripStore(selectAvailableCities);
  const actions = useTripStore((s) => ({
    generateItinerary: s.generateItinerary,
    setSelectedDay: s.setSelectedDay,
    loadCities: s.loadCities,
    addActivity: s.addActivity,
  }));

  const timelineRef = useRef<HTMLDivElement>(null);

  const [city, setCity] = useState('北京');
  const [startDate, setStartDate] = useState(getTodayStr());
  const [endDate, setEndDate] = useState(addDays(getTodayStr(), 2));
  const [categories, setCategories] = useState<POICategory[]>(['nature', 'culture', 'food']);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [isVertical, setIsVertical] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    actions.loadCities();
  }, [actions]);

  useEffect(() => {
    const check = () => setIsVertical(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const handleGenerate = async () => {
    setIsGenerating(true);
    await actions.generateItinerary({ startDate, endDate, city, categories });
    setIsGenerating(false);
  };

  const handleSelectDay = (idx: number) => {
    actions.setSelectedDay(idx);
  };

  const toggleCategory = (cat: POICategory) => {
    setCategories(prev =>
      prev.includes(cat)
        ? prev.filter(c => c !== cat)
        : [...prev, cat]
    );
  };

  const handleExport = async () => {
    if (!timelineRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(timelineRef.current, {
        backgroundColor: '#1a1a2e',
        scale: 2,
        useCORS: true,
      });
      const link = document.createElement('a');
      link.download = `行程_${trip?.name || '规划'}_${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (e) {
      console.error('Export failed:', e);
    } finally {
      setIsExporting(false);
    }
  };

  const handleQuickAdd = (type: 'food' | 'transport') => {
    if (days.length === 0) return;
    const lastActivity = days[dayIndex]?.activities[days[dayIndex].activities.length - 1];
    let startMin = 480;
    if (lastActivity) {
      const [h, m] = lastActivity.endTime.split(':').map(Number);
      startMin = h * 60 + m + 30;
    }
    const duration = type === 'food' ? 60 : 30;
    const endMin = Math.min(startMin + duration, 1439);
    const fmt = (min: number) => `${Math.floor(min / 60).toString().padStart(2, '0')}:${(min % 60).toString().padStart(2, '0')}`;

    actions.addActivity(dayIndex, {
      id: uuidv4(),
      name: type === 'food' ? '加餐' : '交通',
      type,
      startTime: fmt(startMin),
      endTime: fmt(endMin),
      duration: endMin - startMin,
      notes: type === 'food' ? '餐饮时间' : '交通中转',
    });
    setShowQuickAdd(false);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: isVertical ? 'column' : 'row',
      height: '100vh',
      width: '100%',
      overflow: 'hidden',
    }}>
      <aside style={{
        width: isVertical ? '100%' : '360px',
        flexShrink: 0,
        background: '#16213e',
        borderRight: isVertical ? 'none' : '1px solid rgba(233, 69, 96, 0.15)',
        borderBottom: isVertical ? '1px solid rgba(233, 69, 96, 0.15)' : 'none',
        display: 'flex',
        flexDirection: 'column',
        overflowY: isVertical ? 'visible' : 'auto',
        maxHeight: isVertical ? '60vh' : '100%',
      }}>
        <div style={{
          padding: '20px',
          borderBottom: '1px solid rgba(233, 69, 96, 0.1)',
        }}>
          <h1 style={{
            fontSize: '20px',
            fontWeight: 700,
            color: '#eaeaea',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}>
            <span style={{ fontSize: '28px' }}>🧳</span>
            <span>
              智能行程
              <span style={{ color: '#e94560' }}>规划助手</span>
            </span>
          </h1>
          <p style={{
            fontSize: '12px',
            color: 'rgba(234,234,234,0.5)',
            margin: '6px 0 0 0',
          }}>
            轻松规划每一次旅行，告别时间冲突
          </p>
        </div>

        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: 600,
              color: 'rgba(234,234,234,0.7)',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              🏙️ 选择城市
            </label>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 14px',
                background: '#0f3460',
                border: '1px solid rgba(233, 69, 96, 0.3)',
                borderRadius: '10px',
                color: '#eaeaea',
                fontSize: '14px',
                outline: 'none',
                cursor: 'pointer',
                appearance: 'none',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12' fill='%23e94560'%3E%3Cpath d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 14px center',
                paddingRight: '38px',
              }}
            >
              {cities.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: 600,
              color: 'rgba(234,234,234,0.7)',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              🗓️ 旅行日期
            </label>
            <Calendar
              startDate={startDate}
              endDate={endDate}
              selectedDate={days[dayIndex]?.date}
              onDateRangeChange={(s, e) => { setStartDate(s); setEndDate(e); }}
              onSelectDate={(d) => {
                const idx = days.findIndex(day => day.date === d);
                if (idx !== -1) handleSelectDay(idx);
              }}
            />
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: 600,
              color: 'rgba(234,234,234,0.7)',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              🎯 兴趣偏好
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {(Object.keys(categoryLabels) as POICategory[]).map(cat => {
                const info = categoryLabels[cat];
                const checked = categories.includes(cat);
                return (
                  <button
                    key={cat}
                    onClick={() => toggleCategory(cat)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 14px',
                      background: checked ? `${info.color}20` : 'rgba(234,234,234,0.04)',
                      border: `1px solid ${checked ? info.color : 'rgba(234,234,234,0.1)'}`,
                      borderRadius: '10px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <span style={{ fontSize: '18px' }}>{info.icon}</span>
                    <span style={{
                      fontSize: '13px',
                      color: checked ? info.color : 'rgba(234,234,234,0.7)',
                      fontWeight: checked ? 600 : 400,
                      flex: 1,
                    }}>
                      {info.label}
                    </span>
                    <div style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '5px',
                      border: `2px solid ${checked ? info.color : 'rgba(234,234,234,0.2)'}`,
                      background: checked ? info.color : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      color: '#1a1a2e',
                      fontWeight: 700,
                    }}>
                      {checked ? '✓' : ''}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating || categories.length === 0}
            style={{
              padding: '14px',
              background: 'linear-gradient(135deg, #e94560, #c33764)',
              border: 'none',
              borderRadius: '12px',
              color: '#fff',
              fontSize: '15px',
              fontWeight: 700,
              cursor: isGenerating ? 'not-allowed' : 'pointer',
              opacity: isGenerating || categories.length === 0 ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 20px rgba(233, 69, 96, 0.35)',
              transition: 'transform 0.15s ease',
            }}
            onMouseEnter={(e) => { if (!isGenerating && categories.length > 0) e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={(e) => e.currentTarget.style.transform = ''}
          >
            {isGenerating ? (
              <>
                <span style={{ animation: 'spin 1s linear infinite' }}>⏳</span>
                正在生成智能行程...
              </>
            ) : (
              <>
                ✨ 生成智能行程
              </>
            )}
          </button>
        </div>

        {days.length > 0 && (
          <div style={{
            padding: '16px 20px',
            borderTop: '1px solid rgba(233, 69, 96, 0.1)',
            marginTop: 'auto',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '10px',
            }}>
              <span style={{
                fontSize: '12px',
                fontWeight: 600,
                color: 'rgba(234,234,234,0.7)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}>
                📋 行程概览
              </span>
              <span style={{
                fontSize: '11px',
                color: '#e94560',
                background: 'rgba(233, 69, 96, 0.15)',
                padding: '2px 8px',
                borderRadius: '20px',
              }}>
                共 {days.length} 天
              </span>
            </div>
            <div style={{
              display: 'flex',
              flexDirection: isVertical ? 'row' : 'column',
              gap: '6px',
              flexWrap: 'wrap',
              overflowX: isVertical ? 'auto' : 'visible',
            }}>
              {days.map((day, idx) => {
                const d = formatDateDisplay(day.date);
                const active = idx === dayIndex;
                const actCount = day.activities.length;
                return (
                  <button
                    key={day.date}
                    onClick={() => handleSelectDay(idx)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: isVertical ? '10px 14px' : '10px 12px',
                      background: active ? 'rgba(233, 69, 96, 0.2)' : 'rgba(234,234,234,0.04)',
                      border: `1px solid ${active ? '#e94560' : 'rgba(234,234,234,0.1)'}`,
                      borderRadius: '10px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      flex: isVertical ? 'none' : 1,
                      minWidth: isVertical ? '140px' : 'auto',
                    }}
                  >
                    <div style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '8px',
                      background: active ? '#e94560' : '#0f3460',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <span style={{
                        fontSize: '9px',
                        color: active ? '#fff' : 'rgba(234,234,234,0.5)',
                        lineHeight: 1,
                      }}>
                        第{idx + 1}天
                      </span>
                      <span style={{
                        fontSize: '14px',
                        fontWeight: 700,
                        color: '#fff',
                        lineHeight: 1,
                        marginTop: '2px',
                      }}>
                        {d.day}
                      </span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                      <div style={{
                        fontSize: '13px',
                        fontWeight: active ? 600 : 400,
                        color: active ? '#e94560' : '#eaeaea',
                      }}>
                        {d.week}
                      </div>
                      <div style={{
                        fontSize: '11px',
                        color: 'rgba(234,234,234,0.5)',
                      }}>
                        {actCount} 个活动
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </aside>

      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        minHeight: 0,
      }}>
        <header style={{
          padding: isVertical ? '14px 16px' : '18px 28px',
          borderBottom: '1px solid rgba(233, 69, 96, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap',
        }}>
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: '12px',
              flexWrap: 'wrap',
            }}>
              <h2 style={{
                fontSize: isVertical ? '18px' : '24px',
                fontWeight: 700,
                color: '#eaeaea',
                margin: 0,
              }}>
                {trip ? trip.name : '我的行程'}
              </h2>
              {trip && days[dayIndex] && (
                <span style={{
                  fontSize: isVertical ? '13px' : '15px',
                  color: '#e94560',
                  background: 'rgba(233, 69, 96, 0.12)',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontWeight: 600,
                }}>
                  📅 {formatDateDisplay(days[dayIndex].date).full} · {formatDateDisplay(days[dayIndex].date).week} · 第{dayIndex + 1}天
                </span>
              )}
            </div>
            {trip && (
              <div style={{
                fontSize: '12px',
                color: 'rgba(234,234,234,0.5)',
                marginTop: '4px',
              }}>
                🏙️ {trip.city} · {trip.startDate} 至 {trip.endDate} · 共 {days.length} 天
              </div>
            )}
          </div>

          <div style={{
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
          }}>
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowQuickAdd(!showQuickAdd)}
                disabled={!trip}
                style={{
                  padding: isVertical ? '10px 14px' : '12px 18px',
                  background: 'rgba(96, 165, 250, 0.15)',
                  border: '1px solid rgba(96, 165, 250, 0.3)',
                  borderRadius: '10px',
                  color: '#60a5fa',
                  fontSize: isVertical ? '13px' : '14px',
                  fontWeight: 600,
                  cursor: trip ? 'pointer' : 'not-allowed',
                  opacity: trip ? 1 : 0.4,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                ➕ 添加活动
              </button>
              {showQuickAdd && trip && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  right: 0,
                  background: '#16213e',
                  border: '1px solid rgba(233, 69, 96, 0.2)',
                  borderRadius: '10px',
                  padding: '6px',
                  zIndex: 50,
                  boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                  minWidth: '160px',
                }}>
                  <button
                    onClick={() => handleQuickAdd('food')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 14px',
                      background: 'transparent',
                      border: 'none',
                      borderRadius: '6px',
                      color: '#eaeaea',
                      fontSize: '13px',
                      cursor: 'pointer',
                      width: '100%',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(234,234,234,0.06)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    🍽️ 添加餐饮
                  </button>
                  <button
                    onClick={() => handleQuickAdd('transport')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 14px',
                      background: 'transparent',
                      border: 'none',
                      borderRadius: '6px',
                      color: '#eaeaea',
                      fontSize: '13px',
                      cursor: 'pointer',
                      width: '100%',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(234,234,234,0.06)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    🚗 添加交通
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={handleExport}
              disabled={!trip || isExporting}
              style={{
                padding: isVertical ? '10px 14px' : '12px 18px',
                background: !trip || isExporting ? 'rgba(234,234,234,0.06)' : 'linear-gradient(135deg, #10b981, #059669)',
                border: 'none',
                borderRadius: '10px',
                color: '#fff',
                fontSize: isVertical ? '13px' : '14px',
                fontWeight: 600,
                cursor: (!trip || isExporting) ? 'not-allowed' : 'pointer',
                opacity: (!trip || isExporting) ? 0.5 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              {isExporting ? '⏳ 导出中...' : '📷 导出图片'}
            </button>
          </div>
        </header>

        <div
          ref={timelineRef}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            background: '#1a1a2e',
          }}
          onClick={() => showQuickAdd && setShowQuickAdd(false)}
        >
          {trip ? (
            <Timeline vertical={isVertical} />
          ) : (
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '80px', marginBottom: '20px' }}>🧭</div>
              <h3 style={{
                fontSize: isVertical ? '20px' : '26px',
                fontWeight: 700,
                color: '#eaeaea',
                margin: '0 0 10px 0',
              }}>
                开始规划你的完美旅程
              </h3>
              <p style={{
                fontSize: isVertical ? '13px' : '15px',
                color: 'rgba(234,234,234,0.5)',
                margin: 0,
                maxWidth: '480px',
                lineHeight: 1.6,
              }}>
                在左侧选择<strong style={{ color: '#e94560' }}>目的地城市</strong>、<strong style={{ color: '#e94560' }}>出行日期</strong>和<strong style={{ color: '#e94560' }}>兴趣类型</strong>，
                点击「生成智能行程」按钮，系统将自动为你推荐景点并安排每日时间表。
              </p>

              <div style={{
                display: 'grid',
                gridTemplateColumns: isVertical ? '1fr' : 'repeat(3, 1fr)',
                gap: '16px',
                marginTop: '36px',
                maxWidth: '640px',
                width: '100%',
              }}>
                {[
                  { icon: '🗺️', title: '智能推荐', desc: '按兴趣匹配最佳景点' },
                  { icon: '⚠️', title: '冲突检测', desc: '自动提醒时间重叠问题' },
                  { icon: '📷', title: '一键导出', desc: '保存精美行程图片' },
                ].map((item) => (
                  <div key={item.title} style={{
                    background: '#16213e',
                    border: '1px solid rgba(233, 69, 96, 0.1)',
                    borderRadius: '14px',
                    padding: '20px',
                  }}>
                    <div style={{ fontSize: '32px', marginBottom: '10px' }}>{item.icon}</div>
                    <div style={{
                      fontSize: '15px',
                      fontWeight: 600,
                      color: '#eaeaea',
                      marginBottom: '6px',
                    }}>
                      {item.title}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: 'rgba(234,234,234,0.5)',
                      lineHeight: 1.5,
                    }}>
                      {item.desc}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
