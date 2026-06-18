import React from 'react';
import { Palette, LayoutGrid, Bookmark } from 'lucide-react';
import { useColorStore } from '../store/colorStore';
import type { PageMode } from '../types';

const BottomNav: React.FC = () => {
  const pageMode = useColorStore(state => state.pageMode);
  const setPageMode = useColorStore(state => state.setPageMode);

  const tabs: { id: PageMode; label: string; icon: React.ReactNode }[] = [
    { id: 'wheel', label: '色盘', icon: <Palette size={20} /> },
    { id: 'scheme', label: '方案', icon: <LayoutGrid size={20} /> },
    { id: 'preset', label: '预设', icon: <Bookmark size={20} /> },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-xl border-t border-gray-200/50 z-40">
      <div className="max-w-lg mx-auto h-full flex items-center justify-around">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setPageMode(tab.id)}
            className="relative flex flex-col items-center gap-1 px-6 py-2 transition-all duration-300"
            style={{
              color: pageMode === tab.id ? '#1A1A1A' : '#9CA3AF',
            }}
          >
            {tab.icon}
            <span className="text-xs font-medium">{tab.label}</span>
            {pageMode === tab.id && (
              <span
                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                style={{
                  backgroundColor: '#1A1A1A',
                  animation: 'slideInUnderline 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              />
            )}
          </button>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
