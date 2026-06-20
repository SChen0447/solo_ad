import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, Plus, User, Home, Package } from 'lucide-react';
import CreditBadge from './CreditBadge';
import useAppStore from '@/store/useAppStore';

const Navbar: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { currentUser, pendingExchanges } = useAppStore();
  const navigate = useNavigate();

  const navItems = [
    { path: '/', label: '首页', icon: <Home size={20} /> },
    { path: '/publish', label: '发布物品', icon: <Plus size={20} /> },
    { path: currentUser ? `/user/${currentUser.id}` : '/user/user1', label: '个人中心', icon: <User size={20} /> },
  ];

  return (
    <nav
      className="sticky top-0 z-40 shadow-md"
      style={{ backgroundColor: '#2c3e50' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <Package size={28} className="text-white" />
            <span className="text-xl font-bold text-white">邻里易物</span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-white/10"
              >
                {item.icon}
                <span>{item.label}</span>
                {item.label === '个人中心' && pendingExchanges.length > 0 && (
                  <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                    {pendingExchanges.length}
                  </span>
                )}
              </Link>
            ))}
            {currentUser && (
              <div className="flex items-center gap-2">
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-8 h-8 rounded-full border-2 border-white/30"
                />
                <CreditBadge score={currentUser.creditScore} size="sm" />
              </div>
            )}
          </div>

          <button
            className="md:hidden text-white p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="md:hidden overflow-hidden"
            style={{ backgroundColor: '#34495e' }}
          >
            <div className="px-4 py-3 space-y-2">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className="flex items-center gap-3 text-gray-300 hover:text-white px-3 py-3 rounded-lg hover:bg-white/10"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
