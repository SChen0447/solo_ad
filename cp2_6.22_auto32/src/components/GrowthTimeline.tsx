import { useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { GrowthRecord, PlantingPlan } from '@/types'
import { formatDateCN, formatDateShort } from '@/utils/format'

interface Props {
  records: GrowthRecord[]
  plan: PlantingPlan
}

type Trend = 'normal' | 'slow' | 'mature'

function getTrend(records: GrowthRecord[], maturityDays: number): Trend {
  const heightRecords = records
    .filter((r) => r.height != null)
    .sort((a, b) => a.date.localeCompare(b.date))
  if (heightRecords.length < 2) return 'normal'

  const first = heightRecords[0]
  const last = heightRecords[heightRecords.length - 1]
  const days =
    (new Date(last.date).getTime() - new Date(first.date).getTime()) / (1000 * 60 * 60 * 24)
  if (days === 0) return 'normal'

  const growthPerDay = ((last.height ?? 0) - (first.height ?? 0)) / days
  if (growthPerDay < 0.3) return 'slow'

  const progress =
    (new Date().getTime() - new Date(first.date).getTime()) /
    (maturityDays * 1000 * 60 * 60 * 24)
  if (progress >= 0.8) return 'mature'

  return 'normal'
}

const trendLabels: Record<Trend, string> = {
  normal: '🌱 生长正常',
  slow: '⚠️ 生长缓慢，请注意检查水分和光照',
  mature: '🌿 接近成熟，准备收获！',
}

export default function GrowthTimeline({ records, plan }: Props) {
  const sortedRecords = useMemo(
    () => [...records].sort((a, b) => b.date.localeCompare(a.date)),
    [records],
  )

  const chartData = useMemo(() => {
    const heightRecords = records
      .filter((r) => r.height != null)
      .sort((a, b) => a.date.localeCompare(b.date))
    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const recent = heightRecords.filter((r) => new Date(r.date) >= sevenDaysAgo)
    const data = recent.length >= 2 ? recent : heightRecords.slice(-7)
    return data.map((r) => ({
      date: formatDateShort(r.date),
      height: r.height,
    }))
  }, [records])

  const trend = useMemo(() => getTrend(records, plan.maturityDays), [records, plan.maturityDays])

  return (
    <div>
      {chartData.length >= 2 && (
        <div className="detail-card" style={{ marginBottom: 24 }}>
          <div className="section-title">生长曲线</div>
          <div style={{ width: '100%', height: 120 }}>
            <ResponsiveContainer>
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#6B7280' }} />
                <YAxis tick={{ fontSize: 12, fill: '#6B7280' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E5E7EB',
                    borderRadius: 8,
                    fontSize: 13,
                  }}
                  formatter={(value: number) => [`${value}cm`, '高度']}
                />
                <Line
                  type="monotone"
                  dataKey="height"
                  stroke="#10B981"
                  strokeWidth={2}
                  dot={{ fill: '#10B981', r: 4 }}
                  activeDot={{ r: 6, fill: '#10B981' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className={`trend-text ${trend}`}>{trendLabels[trend]}</div>
        </div>
      )}

      <div className="detail-card">
        <div className="section-title">生长记录时间线</div>
        {sortedRecords.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📊</div>
            <div className="empty-state-text">暂无生长记录，添加一条记录开始追踪吧</div>
          </div>
        ) : (
          <div className="timeline">
            {sortedRecords.map((record, idx) => (
              <div
                key={record.id}
                className="timeline-item"
                style={{ animationDelay: `${idx * 0.05}s` }}
              >
                <div className="timeline-card">
                  {record.photoUrl && (
                    <img
                      className="timeline-photo"
                      src={record.photoUrl}
                      alt=""
                      onError={(e) => {
                        ;(e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  )}
                  <div className="timeline-content">
                    <div className="timeline-date">{formatDateCN(record.date)}</div>
                    <div className="timeline-metrics">
                      {record.height != null && (
                        <span className="timeline-metric">
                          高度：<span className="timeline-metric-value">{record.height}cm</span>
                        </span>
                      )}
                      {record.leafCount != null && (
                        <span className="timeline-metric">
                          叶片：<span className="timeline-metric-value">{record.leafCount}片</span>
                        </span>
                      )}
                    </div>
                    {record.notes && <div className="timeline-notes">{record.notes}</div>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
