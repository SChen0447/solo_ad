import { useState } from 'react'
import { Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { Menu, X, List, BarChart3 } from 'lucide-react'
import ActivitiesPage from '@/pages/ActivitiesPage'
import ActivityDetailPage from '@/pages/ActivityDetailPage'

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  const navItems = [
    { to: '/', label: '活动列表', icon: List },
    { to: '#', label: '统计报表', icon: BarChart3, disabled: true },
  ]

  return (
    <div className="flex min-h-screen bg-gray-50">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`sidebar fixed md:static z-30 h-screen flex-shrink-0 flex flex-col transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-6 border-b border-gray-700">
          <h1 className="text-xl font-bold tracking-wide">经费分摊</h1>
          <button
            className="md:hidden text-white hover:text-gray-300"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 py-4">
          {navItems.map((item) => (
            <NavLink
              key={item.label}
              to={item.disabled ? '#' : item.to}
              onClick={(e) => {
                if (item.disabled) {
                  e.preventDefault()
                  return
                }
                setSidebarOpen(false)
              }}
              className={({ isActive }) =>
                `sidebar-nav-item ${
                  isActive && !item.disabled ? 'active' : ''
                } ${item.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`
              }
            >
              <item.icon size={18} className="mr-3 flex-shrink-0" />
              <span className="text-sm">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="px-5 py-4 border-t border-gray-700 text-xs text-gray-400">
          v1.0.0
        </div>
      </aside>

      <main className="flex-1 min-h-screen">
        <header className="md:hidden flex items-center px-4 py-3 bg-white shadow-sm sticky top-0 z-10">
          <button
            className="p-1 hover:bg-gray-100 rounded"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={22} className="text-gray-700" />
          </button>
          <span className="ml-3 font-semibold text-gray-800">经费分摊</span>
        </header>

        <div className="max-w-[1200px] mx-auto bg-white min-h-screen">
          <Routes>
            <Route path="/" element={<ActivitiesPage />} />
            <Route path="/activity/:id" element={<ActivityDetailPage />} />
          </Routes>
        </div>
      </main>
    </div>
  )
}
