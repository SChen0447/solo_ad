/* ============================================
 * 主应用组件
 * 调用关系：被 main.tsx 挂载，调用各页面组件
 * 数据流向：loadInitialData → activities/equipment state → 通过props传递给页面组件
 *          NavLink → 路由切换 → 对应页面渲染
 * ============================================ */

import React, { useState, useEffect } from 'react'
import { Routes, Route, NavLink, useLocation, Navigate } from 'react-router-dom'
import ActivityListPage from './pages/ActivityListPage'
import EquipmentPage from './pages/EquipmentPage'
import ActivityDetailPage from './pages/ActivityDetailPage'
import ProfilePage from './pages/ProfilePage'
import { loadInitialData } from './api'
import type { Activity, Equipment } from './types'

const App: React.FC = () => {
  const [activities, setActivities] = useState<Activity[]>([])
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const init = async () => {
      const data = await loadInitialData()
      setActivities(data.activities.data)
      setEquipment(data.equipment.data)
      setLoading(false)
    }
    init()
  }, [])

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  if (loading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner" />
        <div className="loading-text">🏔️ 山野行者俱乐部加载中...</div>
      </div>
    )
  }

  const navItems = [
    { to: '/', label: '活动列表', icon: '🏔️' },
    { to: '/equipment', label: '装备集市', icon: '🎒' },
    { to: '/profile', label: '个人中心', icon: '👤' }
  ]

  return (
    <div className="app-root">
      {/* 半透明磨砂玻璃导航栏 */}
      <nav className="navbar">
        <div className="nav-inner">
          <div className="nav-brand">
            <span className="brand-icon">🏔️</span>
            <span className="brand-name">山野行者</span>
          </div>

          {/* 导航链接 - 当前页有下划线从中间向两边展开动画 */}
          <div className={`nav-links ${menuOpen ? 'nav-mobile-open' : ''}`}>
            {navItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `nav-link ${isActive ? 'nav-link-active' : ''}`
                }
              >
                <span className="nav-link-icon">{item.icon}</span>
                <span className="nav-link-text">{item.label}</span>
                {/* 下划线动画元素 */}
                <span className="nav-link-underline" />
              </NavLink>
            ))}
          </div>

          {/* 汉堡菜单 - 移动端 */}
          <button
            className={`hamburger ${menuOpen ? 'hamburger-open' : ''}`}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="菜单"
          >
            <span className="ham-line" />
            <span className="ham-line" />
            <span className="ham-line" />
          </button>
        </div>
      </nav>

      <main className="main-content">
        <Routes location={location} key={location.pathname}>
          <Route
            path="/"
            element={
              <ActivityListPage
                activities={activities}
                onActivitiesChange={setActivities}
              />
            }
          />
          <Route
            path="/equipment"
            element={
              <EquipmentPage
                equipment={equipment}
                onEquipmentChange={setEquipment}
              />
            }
          />
          <Route path="/activity/:id" element={<ActivityDetailPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <footer className="app-footer">
        <div className="footer-content">
          <p>🏔️ 山野行者户外运动俱乐部 · 探索自然，挑战自我</p>
          <p className="footer-sub">© 2026 Outdoor Club. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

export default App
