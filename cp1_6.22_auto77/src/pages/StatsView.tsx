import { useMemo, useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Legend,
} from 'recharts'
import type { Project, TimeLog, Tag } from '@/types'

interface StatsViewProps {
  project: Project
  projects: Project[]
  logs: TimeLog[]
  tags: Tag[]
}

type Period = 'week' | 'month'

export default function StatsView({ project, projects, logs, tags }: StatsViewProps) {
  const [period, setPeriod] = useState<Period>('week')
  const [filterTagId, setFilterTagId] = useState<string | null>(null)

  const days = period === 'week' ? 7 : 30

  const dateRange = useMemo(() => {
    const result: string[] = []
    const d = new Date()
    for (let i = days - 1; i >= 0; i--) {
      const dd = new Date(d)
      dd.setDate(dd.getDate() - i)
      result.push(dd.toISOString().slice(0, 10))
    }
    return result
  }, [days])

  const filteredLogs = useMemo(() => {
    if (!filterTagId) return logs
    return logs.filter((l) => l.tagIds.includes(filterTagId))
  }, [logs, filterTagId])

  const barData = useMemo(() => {
    return dateRange.map((date) => {
      const dayLogs = filteredLogs.filter(
        (l) => l.projectId === project.id && l.date === date
      )
      const total = dayLogs.reduce((sum, l) => sum + l.duration, 0)
      return {
        date: date.slice(5),
        minutes: total,
      }
    })
  }, [dateRange, filteredLogs, project.id])

  const areaData = useMemo(() => {
    return dateRange.map((date) => {
      const entry: Record<string, string | number> = { date: date.slice(5) }
      projects.forEach((p) => {
        const dayLogs = filteredLogs.filter(
          (l) => l.projectId === p.id && l.date === date
        )
        entry[p.id] = dayLogs.reduce((sum, l) => sum + l.duration, 0)
      })
      return entry
    })
  }, [dateRange, filteredLogs, projects])

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ dataKey: string; value: number }>; label?: string }) => {
    if (!active || !payload) return null
    return (
      <div className="bg-white rounded-lg shadow-lg border border-gray-100 p-3 text-xs">
        <p className="font-medium text-[#2d3748] mb-1">{label}</p>
        {payload.map((entry) => {
          const p = projects.find((proj) => proj.id === entry.dataKey)
          if (!p) return null
          return (
            <div key={entry.dataKey} className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: p.color }}
              />
              <span className="text-[#718096]">{p.name}:</span>
              <span className="text-[#2d3748] font-medium">{entry.value}min</span>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPeriod('week')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
              period === 'week'
                ? 'text-white'
                : 'text-[#718096] bg-gray-100 hover:bg-gray-200'
            }`}
            style={period === 'week' ? { backgroundColor: project.color } : undefined}
          >
            周
          </button>
          <button
            onClick={() => setPeriod('month')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
              period === 'month'
                ? 'text-white'
                : 'text-[#718096] bg-gray-100 hover:bg-gray-200'
            }`}
            style={period === 'month' ? { backgroundColor: project.color } : undefined}
          >
            月
          </button>
        </div>

        {tags.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#718096]">标签过滤:</span>
            <button
              onClick={() => setFilterTagId(null)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-300 ${
                !filterTagId
                  ? 'bg-[#4299e1] text-white'
                  : 'bg-gray-100 text-[#718096] hover:bg-gray-200'
              }`}
            >
              全部
            </button>
            {tags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => setFilterTagId(filterTagId === tag.id ? null : tag.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-300 ${
                  filterTagId === tag.id
                    ? 'bg-[#4299e1] text-white'
                    : 'bg-gray-100 text-[#718096] hover:bg-gray-200'
                }`}
              >
                {tag.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm mb-6">
        <h3 className="text-sm font-medium text-[#2d3748] mb-4">每日耗时 — {project.name}</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={barData} barSize={20} barCategoryGap={8}>
            <CartesianGrid strokeDasharray="3 3" stroke="#edf2f7" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: '#718096', angle: 30 }}
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#718096' }}
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null
                return (
                  <div className="bg-white rounded-lg shadow-lg border border-gray-100 p-2 text-xs">
                    <p className="text-[#2d3748] font-medium">{label}</p>
                    <p className="text-[#718096]">{payload[0].value} min</p>
                  </div>
                )
              }}
            />
            <Bar
              dataKey="minutes"
              fill={project.color}
              radius={[4, 4, 0, 0]}
              label={{ position: 'top', fontSize: 10, fill: '#718096' }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm">
        <h3 className="text-sm font-medium text-[#2d3748] mb-4">项目耗时趋势</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={areaData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#edf2f7" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: '#718096', angle: 30 }}
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#718096' }}
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              layout="vertical"
              align="right"
              verticalAlign="bottom"
              iconType="circle"
              iconSize={8}
              formatter={(value: string) => {
                const p = projects.find((proj) => proj.id === value)
                return p?.name ?? value
              }}
              onClick={(e) => {
                const el = e as unknown as { dataKey: string }
                setFilterTagId(el.dataKey === filterTagId ? null : el.dataKey)
              }}
            />
            {projects.map((p) => (
              <Area
                key={p.id}
                type="monotone"
                dataKey={p.id}
                stackId="1"
                stroke={p.color}
                fill={p.color}
                fillOpacity={0.6}
                animationDuration={300}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
