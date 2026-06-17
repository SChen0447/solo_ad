import React, { useState, useEffect, useMemo, useRef } from 'react'
import { Calendar, dateFnsLocalizer, type Event, type SlotInfo } from 'react-big-calendar'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import {
  format,
  parse,
  startOfWeek,
  getDay,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  addDays,
  isToday,
} from 'date-fns'
import zhCN from 'date-fns/locale/zh-CN'
import { useAppContext, type Schedule, type PlatformType, type ScheduleStatus } from '../context/AppContext'
import { updateSchedule, createSchedule, PLATFORM_NAMES, PLATFORM_LIMITS } from '../api'

const locales = { 'zh-CN': zhCN }
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
})

const PLATFORM_COLORS: Record<PlatformType, string> = {
  weibo: '#E6162D',
  xiaohongshu: '#FF2442',
  wechat: '#07C160',
}

const STATUS_LABELS: Record<ScheduleStatus, string> = {
  draft: '草稿',
  pending: '待发布',
  published: '已发布',
}

const PlatformIcon: React.FC<{ platform: PlatformType; size?: number }> = ({ platform, size = 16 }) => {
  const color = PLATFORM_COLORS[platform]
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      {platform === 'weibo' && (
        <circle cx="12" cy="12" r="10" />
      )}
      {platform === 'xiaohongshu' && (
        <rect x="3" y="3" width="18" height="18" rx="4" />
      )}
      {platform === 'wechat' && (
        <>
          <circle cx="8" cy="10" r="3" />
          <circle cx="16" cy="10" r="3" />
          <path d="M4 18 C6 16, 18 16, 20 18 L20 20 L4 20 Z" />
        </>
      )}
    </svg>
  )
}

interface TimelineEvent {
  id: string
  schedule: Schedule
  start: Date
  end: Date
  title: string
  resource?: { platform: PlatformType }
}

const CalendarView: React.FC = () => {
  const { schedules, materials, selectSchedule, selectedScheduleId, updateSchedule: updateCtxSchedule, addSchedule } = useAppContext()
  const [expandedDate, setExpandedDate] = useState<Date | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null)
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 1024)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const events: TimelineEvent[] = useMemo(() => {
    return schedules.map(s => ({
      id: s.id,
      schedule: s,
      start: new Date(s.publishTime),
      end: addDays(new Date(s.publishTime), 0),
      title: s.material?.title || materials.find(m => m.id === s.materialId)?.title || '未命名素材',
      resource: { platform: s.platform },
    }))
  }, [schedules, materials])

  const getSchedulesForDate = (date: Date) => {
    return schedules
      .filter(s => isSameDay(new Date(s.publishTime), date))
      .sort((a, b) => {
        if (a.orderIndex !== b.orderIndex) return a.orderIndex - b.orderIndex
        return new Date(a.publishTime).getTime() - new Date(b.publishTime).getTime()
      })
  }

  const dayCountMap = useMemo(() => {
    const map = new Map<string, number>()
    schedules.forEach(s => {
      const key = format(new Date(s.publishTime), 'yyyy-MM-dd')
      map.set(key, (map.get(key) || 0) + 1)
    })
    return map
  }, [schedules])

  const handleSelectSlot = (slot: SlotInfo) => {
    const clickedDate = slot.start
    const hasSchedules = getSchedulesForDate(clickedDate).length > 0
    if (expandedDate && isSameDay(expandedDate, clickedDate)) {
      setExpandedDate(null)
    } else if (hasSchedules) {
      setExpandedDate(clickedDate)
    } else {
      const newSchedule: Schedule = {
        id: `s_${Date.now()}`,
        materialId: materials[0]?.id || '',
        platform: 'weibo',
        publishTime: slot.start.toISOString(),
        status: 'draft',
        orderIndex: 0,
      }
      setEditingSchedule(newSchedule)
      setShowModal(true)
    }
  }

  const handleSelectEvent = (event: TimelineEvent) => {
    selectSchedule(event.id)
    setEditingSchedule(event.schedule)
    setShowModal(true)
    const eventDate = new Date(event.schedule.publishTime)
    setExpandedDate(eventDate)
  }

  const handleEventDrop = async ({ event, start }: { event: TimelineEvent; start: Date }) => {
    const updated = { ...event.schedule, publishTime: start.toISOString() }
    try {
      const result = await updateSchedule(event.schedule.id, { publishTime: start.toISOString() })
      updateCtxSchedule(result)
    } catch {
      updateCtxSchedule(updated)
    }
  }

  const handleSaveSchedule = async () => {
    if (!editingSchedule) return
    try {
      if (schedules.some(s => s.id === editingSchedule.id)) {
        const result = await updateSchedule(editingSchedule.id, editingSchedule)
        updateCtxSchedule(result)
      } else {
        const result = await createSchedule(editingSchedule)
        addSchedule(result)
      }
      setShowModal(false)
      setEditingSchedule(null)
    } catch {
    }
  }

  const handleTimelineDragStart = (id: string) => setDraggedItemId(id)

  const handleTimelineDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    if (!draggedItemId || draggedItemId === targetId || !expandedDate) return
  }

  const handleTimelineDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    if (!draggedItemId || draggedItemId === targetId || !expandedDate) return
    const daySchedules = getSchedulesForDate(expandedDate)
    const draggedIdx = daySchedules.findIndex(s => s.id === draggedItemId)
    const targetIdx = daySchedules.findIndex(s => s.id === targetId)
    if (draggedIdx < 0 || targetIdx < 0) { setDraggedItemId(null); return }
    const reordered = [...daySchedules]
    const [removed] = reordered.splice(draggedIdx, 1)
    reordered.splice(targetIdx, 0, removed)
    for (let i = 0; i < reordered.length; i++) {
      const s = reordered[i]
      const updated = { ...s, orderIndex: i }
      updateCtxSchedule(updated)
      try { await updateSchedule(s.id, { orderIndex: i }) } catch {}
    }
    setDraggedItemId(null)
  }

  const dayPropGetter = (date: Date) => {
    const key = format(date, 'yyyy-MM-dd')
    const count = dayCountMap.get(key) || 0
    return {
      style: { position: 'relative' as const },
      'data-count': count,
      className: isToday(date) ? 'rbc-today' : '',
    }
  }

  const eventPropGetter = (event: TimelineEvent) => {
    return {
      style: {
        backgroundColor: PLATFORM_COLORS[event.schedule.platform],
        borderRadius: 4,
        border: 'none',
      },
    }
  }

  const components = {
    day: {
      dateHeader: ({ date }: { date: Date }) => {
        const key = format(date, 'yyyy-MM-dd')
        const count = dayCountMap.get(key) || 0
        return (
          <div style={{ padding: 6, position: 'relative' }}>
            <span style={{ fontWeight: isToday(date) ? 600 : 400, color: isToday(date) ? 'var(--accent-blue)' : 'inherit' }}>
              {format(date, 'd')}
            </span>
            {count > 0 && (
              <span className="day-badge" style={{ position: 'absolute', top: 4, right: 6 }}>
                {count}
              </span>
            )}
          </div>
        )
      },
    },
  }

  const daySchedules = expandedDate ? getSchedulesForDate(expandedDate) : []

  return (
    <div ref={containerRef} style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 12 }}>
      <div className="card shadow-md" style={{ padding: 16, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600 }}>排期日历</h3>
          <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#7F8C8D' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <PlatformIcon platform="weibo" size={14} /> 微博
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <PlatformIcon platform="xiaohongshu" size={14} /> 小红书
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <PlatformIcon platform="wechat" size={14} /> 公众号
            </span>
          </div>
        </div>
        <div style={{ flex: 1, overflow: 'auto' }}>
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            defaultView={isMobile ? 'week' : 'month'}
            views={isMobile ? ['week', 'day'] : ['month', 'week']}
            selectable
            resizable
            onSelectSlot={handleSelectSlot}
            onSelectEvent={handleSelectEvent}
            onEventDrop={handleEventDrop}
            dayPropGetter={dayPropGetter}
            eventPropGetter={eventPropGetter}
            components={components}
            popup
            tooltipAccessor={(e: TimelineEvent) => `${e.title} - ${PLATFORM_NAMES[e.schedule.platform]}`}
            culture="zh-CN"
            messages={{
              next: '下一页',
              previous: '上一页',
              today: '今天',
              month: '月',
              week: '周',
              day: '日',
              agenda: '列表',
              date: '日期',
              time: '时间',
              event: '排期',
              noEventsInRange: '该日期暂无排期',
              showMore: (total: number) => `+${total} 更多`,
            }}
            style={{ height: '100%', border: 'none', background: 'transparent' }}
          />
        </div>
      </div>

      {daySchedules.length > 0 && expandedDate && (
        <div className={`timeline-list ${expandedDate ? 'expanded' : ''}`} style={{ flexShrink: 0 }}>
          <div className="card shadow-md" style={{ padding: 16 }}>
            <div style={{ fontWeight: 600, marginBottom: 12 }}>
              {format(expandedDate, 'yyyy年M月d日')} 发布时间线
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {daySchedules.map(s => {
                const mat = materials.find(m => m.id === s.materialId)
                const charCount = mat?.content.length || 0
                const limit = PLATFORM_LIMITS[s.platform]
                const isOverflow = charCount > limit
                return (
                  <div
                    key={s.id}
                    draggable
                    onDragStart={() => handleTimelineDragStart(s.id)}
                    onDragOver={e => handleTimelineDragOver(e, s.id)}
                    onDrop={e => handleTimelineDrop(e, s.id)}
                    className={`card ${selectedScheduleId === s.id ? 'shadow-lg' : 'shadow-md'}`}
                    style={{
                      padding: 12,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      cursor: 'grab',
                      border: isOverflow ? '1px solid var(--danger)' : '1px solid transparent',
                      opacity: draggedItemId === s.id ? 0.5 : 1,
                    }}
                    onClick={() => { selectSchedule(s.id); setEditingSchedule(s); setShowModal(true) }}
                  >
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 8,
                        background: `linear-gradient(135deg, ${PLATFORM_COLORS[s.platform]}40, ${PLATFORM_COLORS[s.platform]}10)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <PlatformIcon platform={s.platform} size={24} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontWeight: 500, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {mat?.title || '未命名素材'}
                        </span>
                        <span className={`status-badge status-${s.status}`}>
                          {STATUS_LABELS[s.status]}
                        </span>
                        {isOverflow && (
                          <span style={{ color: 'var(--danger)', fontSize: 11, fontWeight: 500 }}>
                            超出 {charCount - limit} 字
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: '#7F8C8D' }}>
                        {format(new Date(s.publishTime), 'HH:mm')} · {PLATFORM_NAMES[s.platform]}
                      </div>
                    </div>
                    <div style={{ cursor: 'grab', color: '#CBD2D9', fontSize: 18, userSelect: 'none' }}>⋮⋮</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {showModal && editingSchedule && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => { setShowModal(false); setEditingSchedule(null) }}
        >
          <div
            className="card shadow-lg"
            style={{ padding: 24, width: 420, maxWidth: '90vw' }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>编辑排期</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>关联素材</label>
                <select
                  value={editingSchedule.materialId}
                  onChange={e => setEditingSchedule({ ...editingSchedule, materialId: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid var(--border-color)',
                    borderRadius: 8,
                    fontSize: 14,
                    background: '#FFFFFF',
                  }}
                >
                  {materials.map(m => (
                    <option key={m.id} value={m.id}>{m.title || '未命名素材'}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>发布平台</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['weibo', 'xiaohongshu', 'wechat'] as PlatformType[]).map(p => (
                    <button
                      key={p}
                      className="btn"
                      style={{
                        flex: 1,
                        background: editingSchedule.platform === p ? PLATFORM_COLORS[p] : 'var(--bg-primary)',
                        color: editingSchedule.platform === p ? '#FFFFFF' : 'var(--text-primary)',
                        border: editingSchedule.platform === p ? `1px solid ${PLATFORM_COLORS[p]}` : '1px solid var(--border-color)',
                      }}
                      onClick={() => setEditingSchedule({ ...editingSchedule, platform: p })}
                    >
                      {PLATFORM_NAMES[p]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>发布时间</label>
                <input
                  type="datetime-local"
                  value={format(new Date(editingSchedule.publishTime), "yyyy-MM-dd'T'HH:mm")}
                  onChange={e => setEditingSchedule({ ...editingSchedule, publishTime: new Date(e.target.value).toISOString() })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid var(--border-color)',
                    borderRadius: 8,
                    fontSize: 14,
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>状态</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['draft', 'pending', 'published'] as ScheduleStatus[]).map(st => (
                    <button
                      key={st}
                      className={`btn status-badge status-${st}`}
                      style={{
                        flex: 1,
                        opacity: editingSchedule.status === st ? 1 : 0.5,
                        border: editingSchedule.status === st ? '2px solid var(--accent-blue)' : '2px solid transparent',
                      }}
                      onClick={() => setEditingSchedule({ ...editingSchedule, status: st })}
                    >
                      {STATUS_LABELS[st]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
              <button
                className="btn btn-secondary"
                onClick={() => { setShowModal(false); setEditingSchedule(null) }}
              >
                取消
              </button>
              <button className="btn btn-primary" onClick={handleSaveSchedule}>保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CalendarView
