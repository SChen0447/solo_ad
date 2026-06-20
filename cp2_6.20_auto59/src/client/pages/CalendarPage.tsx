import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, X, MapPin, Clock, Users, FileText, Plus } from 'lucide-react';

const TAG_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'];
const WEEK_DAYS = ['日', '一', '二', '三', '四', '五', '六'];

interface TourEvent {
  id: string;
  date: string;
  city: string;
  venue: string;
  startTime: string;
  expectedAudience: number;
  notes: string;
  colorIndex: number;
}

export default function CalendarPage() {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [events, setEvents] = useState<TourEvent[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [animatingId, setAnimatingId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [monthAnimating, setMonthAnimating] = useState<'left' | 'right' | null>(null);

  const cityColorMapRef = useRef<Map<string, string>>(new Map());
  const cityColorIndexRef = useRef(0);

  const [formData, setFormData] = useState({
    city: '',
    venue: '',
    startTime: '20:00',
    expectedAudience: 200,
    notes: '',
  });

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const res = await fetch('/api/events');
      const data: TourEvent[] = await res.json();
      setEvents(data);
    } catch (err) {
      console.error('获取日程失败', err);
    }
  };

  const getCityColor = useCallback((city: string): string => {
    const map = cityColorMapRef.current;
    if (!map.has(city)) {
      const color = TAG_COLORS[cityColorIndexRef.current % TAG_COLORS.length];
      cityColorIndexRef.current++;
      map.set(city, color);
      return color;
    }
    return map.get(city)!;
  }, []);

  useEffect(() => {
    events.forEach((e) => {
      if (!cityColorMapRef.current.has(e.city)) {
        const color = TAG_COLORS[cityColorIndexRef.current % TAG_COLORS.length];
        cityColorIndexRef.current++;
        cityColorMapRef.current.set(e.city, color);
      }
    });
  }, [events]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const startDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const days: (number | null)[] = [];
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(d);
    }
    while (days.length % 7 !== 0) {
      days.push(null);
    }
    return days;
  }, [currentYear, currentMonth]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, TourEvent[]>();
    events.forEach((e) => {
      const list = map.get(e.date) || [];
      list.push(e);
      map.set(e.date, list);
    });
    return map;
  }, [events]);

  const formatDate = (day: number) => {
    return `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const handlePrevMonth = () => {
    setMonthAnimating('right');
    setTimeout(() => {
      setCurrentMonth((m) => {
        if (m === 0) {
          setCurrentYear((y) => y - 1);
          return 11;
        }
        return m - 1;
      });
      setMonthAnimating(null);
    }, 150);
  };

  const handleNextMonth = () => {
    setMonthAnimating('left');
    setTimeout(() => {
      setCurrentMonth((m) => {
        if (m === 11) {
          setCurrentYear((y) => y + 1);
          return 0;
        }
        return m + 1;
      });
      setMonthAnimating(null);
    }, 150);
  };

  const handleDateClick = (day: number | null) => {
    if (day === null) return;
    const dateStr = formatDate(day);
    setSelectedDate(dateStr);
    setFormData({ city: '', venue: '', startTime: '20:00', expectedAudience: 200, notes: '' });
    setIsModalOpen(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsModalVisible(true);
      });
    });
  };

  const closeModal = () => {
    setIsModalVisible(false);
    setTimeout(() => {
      setIsModalOpen(false);
    }, 200);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.city.trim() || !formData.venue.trim()) return;

    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          city: formData.city.trim(),
          venue: formData.venue.trim(),
          startTime: formData.startTime,
          expectedAudience: Number(formData.expectedAudience),
          notes: formData.notes.trim(),
        }),
      });
      const newEvent = await res.json();
      setAnimatingId(newEvent.id);
      setEvents((prev) => [...prev, newEvent]);
      setTimeout(() => setAnimatingId(null), 400);
      closeModal();
    } catch (err) {
      console.error('创建日程失败', err);
    }
  };

  const monthLabel = `${currentYear}年${currentMonth + 1}月`;
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  if (isMobile) {
    const currentMonthEvents = events
      .filter((e) => {
        const [y, m] = e.date.split('-').map(Number);
        return y === currentYear && m === currentMonth + 1;
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    return (
      <div style={{ padding: '0 4px' }}>
        <div style={styles.header}>
          <button onClick={handlePrevMonth} style={styles.navBtn}><ChevronLeft size={22} /></button>
          <h2 style={styles.monthTitle}>{monthLabel}</h2>
          <button onClick={handleNextMonth} style={styles.navBtn}><ChevronRight size={22} /></button>
        </div>

        <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {currentMonthEvents.length === 0 ? (
            <div style={styles.emptyHint}>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>本月暂无演出安排</p>
            </div>
          ) : (
            currentMonthEvents.map((e) => {
              const color = getCityColor(e.city);
              return (
                <div
                  key={e.id}
                  style={{
                    ...styles.eventListItem,
                    borderLeft: `4px solid ${color}`,
                  }}
                >
                  <div style={{ fontSize: '18px', fontWeight: 700, color }}>
                    {Number(e.date.split('-')[2])}
                  </div>
                <div style={{ flex: 1, marginLeft: '12px' }}>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: '#fff' }}>
                    {e.city} · {e.venue}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    <Clock size={12} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '4px' }} />
                    {e.startTime}
                    <span style={{ margin: '0 8px' }}>·</span>
                    <Users size={12} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '4px' }} />
                    {e.expectedAudience}人
                  </div>
                </div>
              </div>
              );
            })
          )}
        </div>

        <button
          onClick={() => handleDateClick(today.getDate())}
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'var(--accent-3)',
            boxShadow: '0 6px 20px rgba(69,183,209,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 90,
          }}
        >
          <Plus size={26} color="#fff" />
        </button>

        {isModalOpen && renderModal()}
      </div>
    );
  }

  function renderModal() {
    return (
      <>
        <div
          onClick={closeModal}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            zIndex: 200,
            opacity: isModalVisible ? 1 : 0,
            transition: 'opacity 0.2s ease',
          }}
        />
        <div
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: isModalVisible
              ? 'translate(-50%, -50%) scale(1)'
              : 'translate(-50%, -50%) scale(0.85)',
            width: '440px',
            maxWidth: '92vw',
            background: '#fff',
            borderRadius: '12px',
            padding: '28px 28px 24px',
            zIndex: 201,
            color: '#1a1a2e',
            boxShadow: '0 24px 60px rgba(0, 0, 0, 0.4)',
            opacity: isModalVisible ? 1 : 0,
            transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
            pointerEvents: isModalVisible ? 'auto' : 'none',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#16213e' }}>
              创建演出日程
            </h3>
            <button
              onClick={closeModal}
              style={{ padding: '4px', borderRadius: '6px' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#f0f0f0')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <X size={20} color="#666" />
            </button>
          </div>

          <div style={{ marginBottom: '16px', padding: '10px 14px', background: '#f5f6fa', borderRadius: '8px' }}>
            <span style={{ fontSize: '13px', color: '#666' }}>演出日期：</span>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#16213e' }}>{selectedDate}</span>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>
                    <MapPin size={14} style={{ marginRight: '4px' }} />
                    城市 *
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="如：北京"
                    style={styles.input}
                    required
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>场馆 *</label>
                  <input
                    type="text"
                    value={formData.venue}
                    onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                    placeholder="如：MAO Livehouse"
                    style={styles.input}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>
                    <Clock size={14} style={{ marginRight: '4px' }} />
                    开始时间
                  </label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    style={styles.input}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>
                    <Users size={14} style={{ marginRight: '4px' }} />
                    预计人数
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.expectedAudience}
                    onChange={(e) => setFormData({ ...formData, expectedAudience: Number(e.target.value) })}
                    style={styles.input}
                  />
                </div>
              </div>

              <div>
                <label style={styles.label}>
                  <FileText size={14} style={{ marginRight: '4px' }} />
                  备注
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="特殊说明、设备需求、联系方式等"
                  rows={3}
                  style={{ ...styles.input, resize: 'vertical', minHeight: '72px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={closeModal}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '6px',
                    background: '#f0f0f0',
                    color: '#555',
                    fontSize: '14px',
                    fontWeight: 500,
                    transition: 'filter 0.15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.filter = 'brightness(0.92)')}
                  onMouseLeave={(e) => (e.currentTarget.style.filter = 'brightness(1)')}
                >
                  取消
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '10px 24px',
                    borderRadius: '6px',
                    background: '#45B7D1',
                    color: '#fff',
                    fontSize: '14px',
                    fontWeight: 600,
                    transition: 'filter 0.15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.filter = 'brightness(1.2)')}
                  onMouseLeave={(e) => (e.currentTarget.style.filter = 'brightness(1)')}
                >
                  创建日程
                </button>
              </div>
            </div>
          </form>
        </div>
      </>
    );
  }

  return (
    <div>
      <div style={styles.header}>
        <button onClick={handlePrevMonth} style={styles.navBtn}>
          <ChevronLeft size={24} />
        </button>
        <div style={{ textAlign: 'center' }}>
          <h2 style={styles.monthTitle}>{monthLabel}</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            本月共 {eventsByDate.size} 场演出 · 点击空白日期添加
          </p>
        </div>
        <button onClick={handleNextMonth} style={styles.navBtn}>
          <ChevronRight size={24} />
        </button>
      </div>

      <div
        style={{
          marginTop: '24px',
          transform: monthAnimating === 'left' ? 'translateX(-20px)' : monthAnimating === 'right' ? 'translateX(20px)' : 'translateX(0)',
          opacity: monthAnimating ? 0.3 : 1,
          transition: 'all 0.15s ease',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '4px',
            marginBottom: '8px',
          }}
        >
          {WEEK_DAYS.map((d, i) => (
            <div
              key={d}
              style={{
                textAlign: 'center',
                padding: '10px 4px',
                fontSize: '13px',
                fontWeight: 600,
                color: i === 0 || i === 6 ? 'var(--accent-1)' : 'var(--text-secondary)',
              }}
            >
              周{d}
            </div>
          ))}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '6px',
          }}
        >
          {calendarDays.map((day, idx) => {
            const isToday = day !== null && formatDate(day) === todayStr;
            const dateStr = day !== null ? formatDate(day) : '';
            const dayEvents = dateStr ? eventsByDate.get(dateStr) || [] : [];
            const isWeekend = day !== null && (idx % 7 === 0 || idx % 7 === 6);

            return (
              <div
                key={idx}
                onClick={() => handleDateClick(day)}
                style={{
                  minHeight: '108px',
                  background: day === null ? 'transparent' : 'var(--bg-card)',
                  borderRadius: '10px',
                  padding: '8px',
                  position: 'relative',
                  cursor: day === null ? 'default' : 'pointer',
                  transition: 'all 0.15s ease',
                  border: isToday ? '2px solid var(--accent-3)' : '1px solid transparent',
                }}
                onMouseEnter={(e) => {
                  if (day !== null) {
                    e.currentTarget.style.background = 'rgba(22, 33, 62, 0.85)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (day !== null) {
                    e.currentTarget.style.background = 'var(--bg-card)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }
                }}
              >
                {day !== null && (
                  <>
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: isToday ? 700 : 500,
                        color: isToday ? 'var(--accent-3)' : isWeekend ? 'rgba(224,224,224,0.7)' : 'var(--text-primary)',
                        marginBottom: '6px',
                        position: 'relative',
                        zIndex: 1,
                      }}
                    >
                      {day}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {dayEvents.map((ev) => {
                        const color = getCityColor(ev.city);
                        const isAnimating = animatingId === ev.id;
                        return (
                          <div
                            key={ev.id}
                            title={`${ev.city} · ${ev.venue}\n时间：${ev.startTime}\n预计人数：${ev.expectedAudience}人${ev.notes ? `\n备注：${ev.notes}` : ''}`}
                            style={{
                              background: color,
                              color: '#1a1a2e',
                              borderRadius: '6px',
                              padding: '4px 7px',
                              fontSize: '11px',
                              fontWeight: 600,
                              lineHeight: 1.3,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              opacity: 0.95,
                              animation: isAnimating ? 'elasticPop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' : undefined,
                              transform: isAnimating ? undefined : 'scale(1)',
                              boxShadow: `0 2px 8px ${color}66`,
                            }}
                          >
                            <div style={{ fontSize: '11px', fontWeight: 700 }}>{ev.city}</div>
                            <div style={{ fontSize: '10px', opacity: 0.8, fontWeight: 500 }}>{ev.venue}</div>
                          </div>
                        );
                      })}
                    </div>

                    {dayEvents.length === 0 && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          color: 'rgba(255,255,255,0.08)',
                          fontSize: '24px',
                          fontWeight: 300,
                          pointerEvents: 'none',
                        }}
                      >
                        +
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {isModalOpen && renderModal()}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
    marginBottom: '4px',
  },
  monthTitle: {
    fontSize: '22px',
    fontWeight: 700,
    color: '#fff',
    letterSpacing: '0.5px',
  },
  navBtn: {
    padding: '10px',
    borderRadius: '10px',
    color: 'var(--text-primary)',
    background: 'var(--bg-card)',
    transition: 'all 0.15s ease',
  },
  label: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '13px',
    fontWeight: 500,
    color: '#555',
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1.5px solid #e5e7eb',
    fontSize: '14px',
    color: '#1a1a2e',
    background: '#fff',
    transition: 'border-color 0.15s, box-shadow 0.15s',
    boxSizing: 'border-box',
  },
  emptyHint: {
    padding: '40px 20px',
    textAlign: 'center',
    background: 'var(--bg-card)',
    borderRadius: '12px',
  },
  eventListItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '14px 16px',
    background: 'var(--bg-card)',
    borderRadius: '10px',
  },
};
