import { useEnergyStore } from '@/store/useEnergyStore'
import { CHART_COLORS, getLast7DaysLabels } from '@/data/devices'
import {
  PieChart, Pie, Cell, Tooltip,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  ResponsiveContainer, Legend,
} from 'recharts'
import { TrendingUp } from 'lucide-react'

const CustomPieTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const d = payload[0]
  return (
    <div style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(15,52,96,0.6)', borderRadius: 10, padding: '8px 12px' }}>
      <p style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{d.name}</p>
      <p style={{ color: 'var(--text-secondary)' }}>{d.value} kWh ({((d.value / d.payload.total) * 100).toFixed(1)}%)</p>
    </div>
  )
}

const CustomLineTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(15,52,96,0.6)', borderRadius: 10, padding: '8px 12px' }}>
      <p style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{label}</p>
      <p style={{ color: '#e94560' }}>{payload[0].value.toFixed(2)} kWh</p>
    </div>
  )
}

export default function EnergyChart() {
  const { devices, selectedDeviceId, setSelectedDeviceId } = useEnergyStore()

  const totalMonthlyKWh = devices.reduce((s, d) => s + d.monthlyKWh, 0)
  const maxKWh = Math.max(...devices.map(d => d.monthlyKWh))
  const maxIndex = devices.findIndex(d => d.monthlyKWh === maxKWh)

  const pieData = devices.map(d => ({ name: d.name, value: d.monthlyKWh, total: totalMonthlyKWh }))

  const labels = getLast7DaysLabels()
  const lineData = labels.map((day, i) => {
    if (selectedDeviceId) {
      const device = devices.find(d => d.id === selectedDeviceId)
      return { day, energy: device?.history[i] ?? 0 }
    }
    const total = devices.reduce((s, d) => s + (d.history[i] ?? 0), 0)
    return { day, energy: Math.round(total * 100) / 100 }
  })

  const selectedDevice = devices.find(d => d.id === selectedDeviceId)

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="card flex-1 p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="text-[#e94560]" size={20} />
          <h3 className="text-lg font-bold">能耗占比</h3>
        </div>
        <div className="relative">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={80}
                outerRadius={120}
                onClick={(_, index) => setSelectedDeviceId(devices[index].id)}
                cursor="pointer"
                stroke="none"
              >
                {pieData.map((_, index) => (
                  <Cell
                    key={index}
                    fill={CHART_COLORS[index % CHART_COLORS.length]}
                    outerRadius={index === maxIndex ? 130 : 120}
                    stroke={index === maxIndex ? CHART_COLORS[index % CHART_COLORS.length] : 'none'}
                    strokeWidth={index === maxIndex ? 3 : 0}
                    style={index === maxIndex ? { filter: 'drop-shadow(0 0 8px ' + CHART_COLORS[index % CHART_COLORS.length] + ')' } : undefined}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomPieTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <p className="text-2xl font-bold">{totalMonthlyKWh}</p>
              <p className="text-sm text-[var(--text-secondary)]">kWh/月</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card flex-1 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="text-[#e94560]" size={20} />
            <h3 className="text-lg font-bold">7天能耗趋势</h3>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedDeviceId(null)}
              className="px-3 py-1 rounded-full text-xs font-medium transition-colors"
              style={{
                background: !selectedDeviceId ? '#e94560' : 'rgba(15,52,96,0.4)',
                color: !selectedDeviceId ? '#fff' : 'var(--text-secondary)',
              }}
            >
              全部
            </button>
            {devices.map(d => (
              <button
                key={d.id}
                onClick={() => setSelectedDeviceId(d.id)}
                className="px-3 py-1 rounded-full text-xs font-medium transition-colors"
                style={{
                  background: selectedDeviceId === d.id ? '#e94560' : 'rgba(15,52,96,0.4)',
                  color: selectedDeviceId === d.id ? '#fff' : 'var(--text-secondary)',
                }}
              >
                {d.name}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={lineData}>
            <defs>
              <linearGradient id="energyGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(233,69,96,0.3)" />
                <stop offset="100%" stopColor="rgba(233,69,96,0)" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,52,96,0.3)" />
            <XAxis dataKey="day" stroke="var(--text-secondary)" fontSize={12} />
            <YAxis stroke="var(--text-secondary)" fontSize={12} />
            <Tooltip content={<CustomLineTooltip />} />
            <Legend />
            <Line
              type="monotone"
              dataKey="energy"
              name={selectedDevice ? selectedDevice.name : '总能耗'}
              stroke="#e94560"
              strokeWidth={2}
              dot={{ fill: '#e94560', r: 4 }}
              activeDot={{ r: 6, fill: '#e94560' }}
              fill="url(#energyGradient)"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
