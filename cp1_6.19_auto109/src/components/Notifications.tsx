import { useEffect, useState } from 'react'
import { useEnergyStore } from '@/store/useEnergyStore'
import { Device } from '@/data/devices'
import { AlertTriangle, X } from 'lucide-react'

interface Notification {
  id: string
  deviceName: string
  percentage: number
  phase: 'visible' | 'fading'
}

export default function Notifications() {
  const devices = useEnergyStore((s) => s.devices)
  const [notifications, setNotifications] = useState<Notification[]>([])

  useEffect(() => {
    const totalMonthlyKWh = devices.reduce((sum, d) => sum + d.monthlyKWh, 0)
    if (totalMonthlyKWh === 0) return

    devices.forEach((device) => {
      const ratio = device.monthlyKWh / totalMonthlyKWh
      if (ratio <= 0.3) return

      const percentage = Math.round(ratio * 100)
      const notifId = `${device.id}-${percentage}`

      setNotifications((prev) => {
        if (prev.some((n) => n.id === notifId)) return prev
        return [...prev, { id: notifId, deviceName: device.name, percentage, phase: 'visible' }]
      })
    })
  }, [devices])

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = []

    notifications.forEach((notif) => {
      if (notif.phase !== 'visible') return

      const fadeTimer = setTimeout(() => {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, phase: 'fading' } : n))
        )
      }, 2000)
      timers.push(fadeTimer)

      const removeTimer = setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== notif.id))
      }, 2500)
      timers.push(removeTimer)
    })

    return () => timers.forEach(clearTimeout)
  }, [notifications])

  const dismiss = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, phase: 'fading' } : n))
    )
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id))
    }, 500)
  }

  if (notifications.length === 0) return null

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-3">
      {notifications.map((notif) => (
        <div
          key={notif.id}
          className={`${notif.phase === 'visible' ? 'animate-fade-in' : 'animate-fade-out'} flex items-start gap-3 max-w-[480px] w-full rounded-xl p-4`}
          style={{
            background: 'var(--bg-secondary)',
            borderLeft: '4px solid #e94560',
            boxShadow: '0 0 20px rgba(15, 52, 96, 0.5)',
          }}
        >
          <AlertTriangle className="shrink-0 mt-0.5" size={20} color="#e94560" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
              {notif.deviceName}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              月耗电量占比 {notif.percentage}%，超过总用电的30%
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
              建议调整使用习惯或更换节能设备
            </p>
          </div>
          <button
            onClick={() => dismiss(notif.id)}
            className="shrink-0 p-0.5 rounded hover:opacity-80 transition-opacity"
            style={{ color: 'var(--text-secondary)' }}
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  )
}
