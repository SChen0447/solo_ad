import { AlertTriangle, X, CheckCircle, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import type { InventoryItem } from '../utils/helpers'
import {
  getDaysRemaining, getExpiryStatus, getStatusColor, formatDaysText
} from '../utils/helpers'

interface Props {
  items: InventoryItem[]
  onHandle: (id: string) => void
}

export default function ExpiryAlert({ items, onHandle }: Props) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  const urgentItems = items
    .filter((item) => !item.handled)
    .map((item) => ({
      item,
      days: getDaysRemaining(item.expiryDate),
    }))
    .filter(({ days }) => days <= 3)
    .sort((a, b) => a.days - b.days)

  if (urgentItems.length === 0) return null

  const getUrgencyColor = (days: number): string => {
    if (days < 0) return '#E74C3C'
    if (days <= 1) return '#FF6B6B'
    if (days <= 2) return '#F39C12'
    return '#F1C40F'
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 slide-up">
      <div
        className="glass-effect border-t border-gray-200/50 shadow-2xl"
        style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.85) 0%, rgba(255,245,240,0.9) 100%)',
        }}
      >
        <div className="max-w-6xl mx-auto">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="w-full flex items-center justify-between px-5 py-3 border-b border-gray-200/30 hover:bg-white/20 transition-colors"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle size={20} className="text-amber-500" />
              <span className="font-semibold text-gray-800">
                过期提醒（{urgentItems.length}）
              </span>
            </div>
            <ChevronDown
              size={20}
              className={`text-gray-500 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`}
            />
          </button>

          {!isCollapsed && (
            <div className="max-h-64 overflow-y-auto p-4 space-y-2 fade-in">
              {urgentItems.map(({ item, days }) => {
                const status = getExpiryStatus(days)
                const urgencyColor = getUrgencyColor(days)
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/70 backdrop-blur-sm transition-all duration-300 hover:bg-white"
                  >
                    <div
                      className="pulse-icon flex-shrink-0"
                      style={{ color: urgencyColor }}
                    >
                      <AlertTriangle size={24} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-800 truncate">
                        {item.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {item.quantity} {item.unit} · 购于{item.purchaseDate}
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <div
                        className="text-sm font-bold"
                        style={{ color: getStatusColor(status) }}
                      >
                        {formatDaysText(days)}
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onHandle(item.id)
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium text-white transition-all duration-300 hover:opacity-90 active:scale-95"
                      style={{ backgroundColor: urgencyColor }}
                    >
                      <CheckCircle size={14} />
                      标记已处理
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
