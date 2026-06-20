import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X, Palette, User } from 'lucide-react'

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50"
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(210, 105, 30, 0.1)',
      }}
    >
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 no-underline">
            <Palette className="w-6 h-6 text-clay-500" />
            <span className="font-serif text-xl font-semibold text-clay-700">
              手工艺工坊
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <Link
              to="/"
              className={`text-sm font-medium no-underline pb-1 transition-colors duration-200 ${
                isActive('/')
                  ? 'nav-link-active text-clay-500'
                  : 'text-clay-700 hover:text-clay-500'
              }`}
            >
              课程列表
            </Link>
            <Link
              to="/profile"
              className={`flex items-center gap-1.5 text-sm font-medium no-underline pb-1 transition-colors duration-200 ${
                isActive('/profile')
                  ? 'nav-link-active text-clay-500'
                  : 'text-clay-700 hover:text-clay-500'
              }`}
            >
              <User className="w-4 h-4" />
              个人中心
            </Link>
          </div>

          <button
            className="md:hidden p-2 rounded-lg hover:bg-clay-50 transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? (
              <X className="w-5 h-5 text-clay-700" />
            ) : (
              <Menu className="w-5 h-5 text-clay-700" />
            )}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-clay-100 bg-white/95 backdrop-blur-lg">
          <div className="px-4 py-3 space-y-1">
            <Link
              to="/"
              className={`block px-3 py-2 rounded-lg text-sm font-medium no-underline transition-colors ${
                isActive('/')
                  ? 'bg-clay-50 text-clay-500'
                  : 'text-clay-700 hover:bg-clay-50'
              }`}
            >
              课程列表
            </Link>
            <Link
              to="/profile"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium no-underline transition-colors ${
                isActive('/profile')
                  ? 'bg-clay-50 text-clay-500'
                  : 'text-clay-700 hover:bg-clay-50'
              }`}
            >
              <User className="w-4 h-4" />
              个人中心
            </Link>
          </div>
        </div>
      )}
    </nav>
  )
}
