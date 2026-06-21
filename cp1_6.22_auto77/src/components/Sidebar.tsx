import { Clock, LayoutDashboard, Archive, BarChart3 } from 'lucide-react'

interface SidebarProps {
  currentRoute: string
  onNavigate: (route: string) => void
}

const navItems = [
  { label: '项目', route: '/', icon: LayoutDashboard },
  { label: '统计', route: '/stats', icon: BarChart3 },
  { label: '归档', route: '/archive', icon: Archive },
]

export default function Sidebar({ currentRoute, onNavigate }: SidebarProps) {
  return (
    <aside className="fixed left-0 top-0 h-screen w-[200px] bg-[#2d3748] text-white flex flex-col z-50">
      <div className="flex items-center gap-2 px-5 py-6 border-b border-white/10">
        <Clock size={22} className="text-[#4299e1]" />
        <span className="text-lg font-semibold tracking-wide">TimeTracker</span>
      </div>

      <nav className="flex-1 py-4">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive =
            item.route === '/'
              ? currentRoute === '/' || currentRoute.startsWith('/project')
              : currentRoute.startsWith(item.route)

          return (
            <button
              key={item.route}
              onClick={() => onNavigate(item.route)}
              className={`
                w-full flex items-center gap-3 px-5 py-3 text-sm font-medium
                transition-all duration-200 relative
                hover:bg-white/5
                active:scale-[0.97]
                ${isActive ? 'text-white' : 'text-white/60 hover:text-white/90'}
              `}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[4px] h-6 rounded-r bg-[#4299e1]" />
              )}
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>

      <div className="px-5 py-4 border-t border-white/10">
        <p className="text-xs text-white/40">工时管理 v1.0</p>
      </div>
    </aside>
  )
}
