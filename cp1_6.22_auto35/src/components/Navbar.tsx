import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Monitor, LogOut, Menu, X } from 'lucide-react'
import { useStore } from '@/store'

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { user, logout } = useStore()
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const navLinks = [
    { to: '/devices', label: '设备列表' },
    { to: '/stats', label: '个人统计' },
  ]

  const isActive = (path: string) => location.pathname === path

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 h-[60px] border-b border-white/10 bg-dark-bg/80 backdrop-blur-lg">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2 text-lg font-bold text-white">
              <Monitor className="h-5 w-5 text-dark-primary" />
              <span>设备预约</span>
            </Link>

            <div className="hidden items-center gap-1 md:flex">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`relative px-3 py-2 text-sm font-medium transition-colors duration-200 ${
                    isActive(link.to)
                      ? 'text-dark-primary'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  {link.label}
                  {isActive(link.to) && (
                    <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-dark-primary transition-all duration-200" />
                  )}
                </Link>
              ))}
            </div>
          </div>

          <div className="hidden items-center gap-4 md:flex">
            {user ? (
              <>
                <span className="text-sm text-white/80">{user.username}</span>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-white/70 transition-colors duration-200 hover:bg-white/5 hover:text-white"
                >
                  <LogOut className="h-4 w-4" />
                  <span>退出</span>
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="rounded-lg bg-dark-primary px-4 py-1.5 text-sm font-medium text-white transition-colors duration-200 hover:bg-dark-primary/80"
              >
                登录
              </Link>
            )}
          </div>

          <button
            className="flex items-center justify-center text-white md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </nav>

      {mobileOpen && (
        <div className="fixed top-[60px] left-0 right-0 z-40 border-b border-white/10 bg-dark-bg/95 backdrop-blur-lg md:hidden">
          <div className="flex flex-col gap-1 px-4 py-3">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className={`rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-200 ${
                  isActive(link.to)
                    ? 'bg-white/5 text-dark-primary'
                    : 'text-white/70 hover:bg-white/5 hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="my-1 border-t border-white/10" />
            {user ? (
              <button
                onClick={() => {
                  handleLogout()
                  setMobileOpen(false)
                }}
                className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-white/70 transition-colors duration-200 hover:bg-white/5 hover:text-white"
              >
                <LogOut className="h-4 w-4" />
                <span>退出登录</span>
              </button>
            ) : (
              <Link
                to="/login"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-dark-primary transition-colors duration-200 hover:bg-white/5"
              >
                登录
              </Link>
            )}
          </div>
        </div>
      )}
    </>
  )
}
