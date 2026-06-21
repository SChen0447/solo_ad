import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Menu, X, PawPrint, LogOut, User } from 'lucide-react';
import { useAppStore } from '@/store';

const navLinks = [
  { to: '/home', label: '首页' },
  { to: '/tasks', label: '任务大厅' },
  { to: '/profile', label: '我的档案' },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const { currentUser, setCurrentUser, loginModalOpen, setLoginModalOpen } = useAppStore();

  const handleLogout = () => {
    setCurrentUser(null);
    navigate('/home');
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/70 backdrop-blur-md border-b border-gray-200/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/home" className="flex items-center gap-2 btn-press">
            <PawPrint className="w-7 h-7 text-emerald-600" />
            <span className="text-xl font-bold text-gray-800" style={{ fontFamily: "'Playfair Display', serif" }}>
              宠护通
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-gray-600 hover:text-emerald-600 transition duration-200 btn-press"
              >
                {link.label}
              </Link>
            ))}

            {currentUser ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-sm text-gray-700">
                  <User className="w-4 h-4" />
                  <span>{currentUser.name}</span>
                  <span className="text-xs text-gray-400">({currentUser.role})</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-500 transition duration-200 btn-press"
                >
                  <LogOut className="w-4 h-4" />
                  退出
                </button>
              </div>
            ) : (
              <button
                onClick={() => setLoginModalOpen(true)}
                className="px-4 py-1.5 bg-emerald-600 text-white rounded-full text-sm hover:bg-emerald-700 transition duration-200 btn-press"
              >
                登录
              </button>
            )}
          </div>

          <button
            className="md:hidden p-2 text-gray-600 hover:text-emerald-600 transition duration-200 btn-press"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-white/90 backdrop-blur-md border-t border-gray-200/50">
          <div className="px-4 py-3 space-y-3">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className="block text-gray-600 hover:text-emerald-600 transition duration-200 btn-press py-1"
              >
                {link.label}
              </Link>
            ))}

            {currentUser ? (
              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <div className="flex items-center gap-1.5 text-sm text-gray-700">
                  <User className="w-4 h-4" />
                  <span>{currentUser.name}</span>
                  <span className="text-xs text-gray-400">({currentUser.role})</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-500 transition duration-200 btn-press"
                >
                  <LogOut className="w-4 h-4" />
                  退出
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setMobileOpen(false);
                  setLoginModalOpen(true);
                }}
                className="w-full px-4 py-2 bg-emerald-600 text-white rounded-full text-sm hover:bg-emerald-700 transition duration-200 btn-press"
              >
                登录
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
