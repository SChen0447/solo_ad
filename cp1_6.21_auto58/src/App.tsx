import { useState, useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { useStore } from '@/store';
import { cn } from '@/lib/utils';
import Sidebar from '@/components/Sidebar';
import ProjectList from '@/pages/ProjectList';
import ProjectDetail from '@/pages/ProjectDetail';
import CalendarView from '@/components/CalendarView';
import StatsDashboard from '@/components/StatsDashboard';
import { Calendar, BarChart3, FolderKanban } from 'lucide-react';
import type { ViewMode } from '@/types';

const TAB_CONFIG: { mode: ViewMode; label: string }[] = [
  { mode: 'projects', label: '所有项目' },
  { mode: 'calendar', label: '日历视图' },
  { mode: 'stats', label: '统计看板' },
];

const MOBILE_TAB_CONFIG: { mode: ViewMode; label: string; icon: typeof FolderKanban }[] = [
  { mode: 'projects', label: '项目', icon: FolderKanban },
  { mode: 'calendar', label: '日历', icon: Calendar },
  { mode: 'stats', label: '统计', icon: BarChart3 },
];

export default function App() {
  const viewMode = useStore((s) => s.viewMode);
  const selectedProjectId = useStore((s) => s.selectedProjectId);
  const setViewMode = useStore((s) => s.setViewMode);
  const [isMobile, setIsMobile] = useState(false);
  const [slideDir, setSlideDir] = useState(0);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const handler = (e: MediaQueryListEvent | MediaQueryList) => setIsMobile(e.matches);
    handler(mq);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const handleTabChange = (mode: ViewMode) => {
    const order = TAB_CONFIG.map((t) => t.mode);
    const diff = order.indexOf(mode) - order.indexOf(viewMode);
    if (diff !== 0) setSlideDir(diff > 0 ? 1 : -1);
    setViewMode(mode);
  };

  const renderContent = () => {
    switch (viewMode) {
      case 'projects':
        return selectedProjectId ? <ProjectDetail /> : <ProjectList />;
      case 'calendar':
        return <CalendarView />;
      case 'stats':
        return <StatsDashboard />;
    }
  };

  const activeIdx = TAB_CONFIG.findIndex((t) => t.mode === viewMode);

  return (
    <BrowserRouter>
      <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-white">
        {!isMobile && <Sidebar />}

        <div className="flex flex-1 flex-col overflow-hidden">
          <div
            className={cn(
              'sticky top-0 z-10 flex items-center border-b border-white/5',
              'bg-[rgba(15,23,42,0.6)] backdrop-blur-lg'
            )}
          >
            <div className="relative flex">
              {TAB_CONFIG.map((tab) => (
                <button
                  key={tab.mode}
                  onClick={() => handleTabChange(tab.mode)}
                  className={cn(
                    'relative px-5 py-3 text-sm font-medium transition-colors',
                    viewMode === tab.mode ? 'text-white' : 'text-slate-500 hover:text-slate-300'
                  )}
                >
                  {tab.label}
                  {viewMode === tab.mode && (
                    <span className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full bg-sky-400" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <main className="flex-1 overflow-y-auto">
            <div
              key={viewMode}
              className="h-full animate-in fade-in"
              style={{
                animation: `slideIn 0.25s ease-out`,
              }}
            >
              {renderContent()}
            </div>
          </main>
        </div>

        {isMobile && (
          <nav
            className={cn(
              'flex h-[60px] w-full items-center justify-around border-t border-white/5',
              'bg-[rgba(15,23,42,0.9)] backdrop-blur-xl'
            )}
          >
            {MOBILE_TAB_CONFIG.map((tab) => {
              const Icon = tab.icon;
              const isActive = viewMode === tab.mode;
              return (
                <button
                  key={tab.mode}
                  onClick={() => handleTabChange(tab.mode)}
                  className={cn(
                    'flex flex-col items-center gap-0.5 text-[10px] transition-colors',
                    isActive ? 'text-sky-400' : 'text-slate-500'
                  )}
                >
                  <Icon size={20} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        )}
      </div>

      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(${slideDir >= 0 ? 24 : -24}px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </BrowserRouter>
  );
}
