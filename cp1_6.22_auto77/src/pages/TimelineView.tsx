import { useMemo, useState } from 'react'
import type { Project, TimeLog, Tag } from '@/types'
import { getDayTotalForProject } from '@/utils/storage'

function hexToHSL(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  return { h: h * 360, s: s * 100, l: l * 100 }
}

function getSaturationColor(hex: string, ratio: number): string {
  const { h, l } = hexToHSL(hex)
  const s = 10 + ratio * 90
  return `hsl(${h}, ${s}%, ${Math.min(l, 85)}%)`
}

interface TimelineViewProps {
  project: Project
  logs: TimeLog[]
  tags: Tag[]
  currentDate: string
  onDateChange: (date: string) => void
  onAddLog: (subtaskName: string, duration: number, tagIds: string[]) => void
  onDeleteLog: (id: string) => void
}

export default function TimelineView({
  project,
  logs,
  tags,
  currentDate,
  onDateChange,
  onAddLog,
  onDeleteLog,
}: TimelineViewProps) {
  const projectLogs = useMemo(
    () => logs.filter((l) => l.projectId === project.id),
    [logs, project.id]
  )

  const dayLogs = useMemo(
    () => projectLogs.filter((l) => l.date === currentDate),
    [projectLogs, currentDate]
  )

  const dayTotal = useMemo(
    () => dayLogs.reduce((sum, l) => sum + l.duration, 0),
    [dayLogs]
  )

  const ratio = Math.min(dayTotal / project.dailyLimit, 1)
  const circumference = 2 * Math.PI * 22
  const hours = (dayTotal / 60).toFixed(1)
  const limitHours = (project.dailyLimit / 60).toFixed(1)

  const dates = useMemo(() => {
    const result: string[] = []
    const d = new Date()
    for (let i = 29; i >= 0; i--) {
      const dd = new Date(d)
      dd.setDate(dd.getDate() - i)
      result.push(dd.toISOString().slice(0, 10))
    }
    return result
  }, [])

  const cellColor = (date: string) => {
    const total = getDayTotalForProject(project.id, date, projectLogs)
    if (total === 0) return '#edf2f7'
    const r = Math.min(total / project.dailyLimit, 1)
    return getSaturationColor(project.color, r)
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <input
          type="date"
          value={currentDate}
          onChange={(e) => onDateChange(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4299e1] text-[#2d3748]"
        />
        <span className="text-sm text-[#718096]">
          {new Date(currentDate + 'T00:00:00').toLocaleDateString('zh-CN', {
            weekday: 'long',
          })}
        </span>
      </div>

      <div className="flex gap-1 mb-6 overflow-x-auto pb-2">
        {dates.map((d) => {
          const isSelected = d === currentDate
          const short = d.slice(8)
          const isToday = d === new Date().toISOString().slice(0, 10)
          return (
            <button
              key={d}
              onClick={() => onDateChange(d)}
              className={`flex-shrink-0 w-9 h-9 rounded-lg text-xs font-medium transition-all duration-150 ${
                isSelected
                  ? 'ring-2 ring-offset-1 text-white'
                  : isToday
                  ? 'text-[#2d3748] font-bold'
                  : 'text-[#718096] hover:bg-gray-100'
              }`}
              style={{
                backgroundColor: isSelected ? project.color : cellColor(d),
                ringColor: isSelected ? project.color : undefined,
              }}
            >
              {short}
            </button>
          )
        })}
      </div>

      <div className="flex items-start gap-8 mb-8">
        <div className="flex flex-col items-center">
          <svg width="56" height="56" viewBox="0 0 56 56">
            <circle cx="28" cy="28" r="22" fill="none" stroke="#e2e8f0" strokeWidth="6" />
            <circle
              cx="28"
              cy="28"
              r="22"
              fill="none"
              stroke={project.color}
              strokeWidth="6"
              strokeDasharray={`${ratio * circumference} ${circumference}`}
              strokeLinecap="round"
              transform="rotate(-90 28 28)"
              style={{ transition: 'stroke-dasharray 0.6s ease-out' }}
            />
          </svg>
          <span className="mt-1 text-sm font-medium text-[#2d3748]">
            {hours}h/{limitHours}h
          </span>
        </div>

        <div className="flex-1">
          <AddSubtaskForm tags={tags} onAdd={onAddLog} />
        </div>
      </div>

      <div className="space-y-2">
        {dayLogs.length === 0 ? (
          <p className="text-sm text-[#718096] text-center py-4">暂无记录</p>
        ) : (
          dayLogs.map((log) => (
            <div
              key={log.id}
              className="flex items-center justify-between px-4 py-3 bg-white rounded-lg border border-gray-100 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: project.color }}
                />
                <span className="text-sm text-[#2d3748] font-medium">{log.subtaskName}</span>
                {log.tagIds.length > 0 && (
                  <div className="flex gap-1">
                    {log.tagIds.map((tid) => {
                      const tag = tags.find((t) => t.id === tid)
                      return tag ? (
                        <span
                          key={tid}
                          className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-[#718096]"
                        >
                          {tag.name}
                        </span>
                      ) : null
                    })}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-[#718096]">
                  {(log.duration / 60).toFixed(1)}h ({log.duration}min)
                </span>
                <button
                  onClick={() => onDeleteLog(log.id)}
                  className="text-[#718096] hover:text-red-400 transition-colors text-xs"
                >
                  ✕
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function AddSubtaskForm({
  tags,
  onAdd,
}: {
  tags: Tag[]
  onAdd: (subtaskName: string, duration: number, tagIds: string[]) => void
}) {
  const [name, setName] = useState('')
  const [duration, setDuration] = useState(60)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [showForm, setShowForm] = useState(false)

  const toggleTag = (id: string) => {
    setSelectedTags((prev) => {
      if (prev.includes(id)) return prev.filter((t) => t !== id)
      if (prev.length >= 2) return prev
      return [...prev, id]
    })
  }

  const handleSubmit = () => {
    if (!name.trim() || duration < 1 || duration > 480) return
    onAdd(name.trim(), duration, selectedTags)
    setName('')
    setDuration(60)
    setSelectedTags([])
    setShowForm(false)
  }

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="px-4 py-2 rounded-lg text-sm font-medium text-[#4299e1] border border-[#4299e1]/30 hover:bg-[#4299e1]/5 transition-colors duration-200 active:scale-95"
      >
        + 添加子任务
      </button>
    )
  }

  return (
    <div className="space-y-3">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="子任务名称"
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4299e1] text-[#2d3748]"
      />
      <div className="flex gap-3">
        <input
          type="number"
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
          min={1}
          max={480}
          placeholder="耗时(分钟)"
          className="w-32 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4299e1] text-[#2d3748]"
        />
        <span className="self-center text-xs text-[#718096]">1-480分钟</span>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <button
              key={tag.id}
              onClick={() => toggleTag(tag.id)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
                selectedTags.includes(tag.id)
                  ? 'bg-[#4299e1] text-white'
                  : 'bg-gray-100 text-[#718096] hover:bg-gray-200'
              }`}
            >
              {tag.name}
            </button>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={!name.trim() || duration < 1 || duration > 480}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-[#4299e1] hover:bg-[#3182ce] transition-colors duration-200 active:scale-95 disabled:opacity-50"
        >
          保存
        </button>
        <button
          onClick={() => setShowForm(false)}
          className="px-4 py-2 rounded-lg text-sm font-medium text-[#718096] bg-gray-100 hover:bg-gray-200 transition-colors duration-200"
        >
          取消
        </button>
      </div>
    </div>
  )
}


