import { useNavigate } from 'react-router-dom'
import {
  Carrot, Apple, Beef, Milk, Droplets, Coffee, Package,
  GripVertical
} from 'lucide-react'
import type { InventoryItem, Category } from '../utils/helpers'
import {
  getDaysRemaining, getExpiryStatus, getStatusColor,
  getCategoryColor, formatDaysText
} from '../utils/helpers'

const iconMap: Record<Category, React.ComponentType<{ size?: number; className?: string }>> = {
  '蔬菜': Carrot,
  '水果': Apple,
  '肉类': Beef,
  '乳制品': Milk,
  '调味品': Droplets,
  '饮料': Coffee,
  '其他': Package,
}

interface Props {
  items: InventoryItem[]
  onOrderChange?: (items: InventoryItem[]) => void
}

export default function InventoryGrid({ items, onOrderChange }: Props) {
  const navigate = useNavigate()

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <Package size={64} className="mb-4 opacity-50" />
        <p className="text-lg">冰箱空空如也~</p>
        <p className="text-sm mt-2">点击上方「添加食材」开始管理你的冰箱</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
      {items.map((item, index) => {
        const Icon = iconMap[item.category]
        const days = getDaysRemaining(item.expiryDate)
        const status = getExpiryStatus(days)
        const statusColor = getStatusColor(status)
        const categoryBg = getCategoryColor(item.category)

        return (
          <div
            key={item.id}
            onClick={() => navigate(`/item/${item.id}`)}
            draggable={!!onOrderChange}
            onDragStart={(e) => e.dataTransfer.setData('text/plain', String(index))}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              if (!onOrderChange) return
              e.preventDefault()
              const fromIdx = parseInt(e.dataTransfer.getData('text/plain'))
              const toIdx = index
              if (fromIdx === toIdx) return
              const newItems = [...items]
              const [moved] = newItems.splice(fromIdx, 1)
              newItems.splice(toIdx, 0, moved)
              onOrderChange(newItems)
            }}
            className={`relative rounded-2xl p-4 cursor-pointer transition-all duration-300 ease-in-out
              hover:scale-[1.03] hover:shadow-xl group
              ${item.handled ? 'handled-card' : ''}
            `}
            style={{
              backgroundColor: categoryBg,
              boxShadow: 'var(--shadow-soft)',
            }}
          >
            <div
              className="absolute top-2 left-2 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-40 transition-opacity"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <GripVertical size={16} />
            </div>

            <div className="flex flex-col h-full">
              <div className="flex items-start justify-between mb-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(255,255,255,0.5)' }}
                >
                  <Icon size={22} className="text-gray-700" />
                </div>
              </div>

              <div className="item-name text-base font-semibold mb-1 truncate">
                {item.name}
              </div>
              <div className="text-xs text-gray-600 mb-3">
                {item.quantity} {item.unit}
              </div>

              <div className="mt-auto flex items-end justify-between">
                <span className="text-xs text-gray-500 bg-white/40 px-2 py-0.5 rounded-full">
                  {item.category}
                </span>
                <span
                  className="text-sm font-bold"
                  style={{ color: statusColor }}
                >
                  {formatDaysText(days)}
                </span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
