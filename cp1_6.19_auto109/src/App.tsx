import { useEffect, useState } from 'react'
import { useEnergyStore } from '@/store/useEnergyStore'
import DeviceManager from '@/components/DeviceManager'
import EnergyChart from '@/components/EnergyChart'
import Notifications from '@/components/Notifications'
import TipsPanel from '@/components/TipsPanel'
import { Zap, Lightbulb } from 'lucide-react'

export default function App() {
  const loadDevices = useEnergyStore((s) => s.loadDevices)
  const devices = useEnergyStore((s) => s.devices)
  const [tipsOpen, setTipsOpen] = useState(false)

  useEffect(() => {
    loadDevices()
  }, [loadDevices])

  const totalDailyKWh = devices.reduce((sum, d) => sum + d.dailyKWh, 0)
  const totalMonthlyKWh = devices.reduce((sum, d) => sum + d.monthlyKWh, 0)

  return (
    <div className="min-h-screen font-body" style={{ background: 'var(--bg-primary)' }}>
      <header className="border-b border-sm-accent/30 backdrop-blur-sm sticky top-0 z-30"
        style={{ background: 'rgba(26,26,46,0.85)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #e94560, #0f3460)' }}>
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-heading text-xl font-bold text-sm-text tracking-tight">
                智能家居能耗监测
              </h1>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                实时监控 · 智能节能
              </p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden sm:flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span style={{ color: 'var(--text-secondary)' }}>日总耗电</span>
                <span className="font-heading font-bold text-sm-action">
                  {totalDailyKWh.toFixed(1)} kWh
                </span>
              </div>
              <div className="w-px h-4" style={{ background: 'var(--bg-accent)' }} />
              <div className="flex items-center gap-2">
                <span style={{ color: 'var(--text-secondary)' }}>月总耗电</span>
                <span className="font-heading font-bold text-sm-action">
                  {totalMonthlyKWh.toFixed(1)} kWh
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <Notifications />

        <section className="animate-fade-in-up" style={{ animationDelay: '0ms' }}>
          <EnergyChart />
        </section>

        <section className="animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <DeviceManager />
        </section>
      </main>

      <button
        onClick={() => setTipsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center z-40 animate-pulse-glow cursor-pointer border-0"
        style={{ background: 'var(--color-action)' }}
        aria-label="节能小贴士"
      >
        <Lightbulb className="w-6 h-6 text-white" />
      </button>

      <TipsPanel isOpen={tipsOpen} onClose={() => setTipsOpen(false)} />

      <footer className="border-t border-sm-accent/20 mt-12 py-6 text-center text-xs"
        style={{ color: 'var(--text-secondary)' }}>
        <p>智能家居能耗监测系统 · 让每一度电都更有价值</p>
      </footer>
    </div>
  )
}
