import { Clapperboard, Calendar, BarChart3, Settings, Plus } from 'lucide-react';
import { useStore } from '@/store';
import { cn } from '@/lib/utils';

export default function Sidebar() {
  const projects = useStore((s) => s.projects);
  const videos = useStore((s) => s.videos);
  const selectedProjectId = useStore((s) => s.selectedProjectId);
  const viewMode = useStore((s) => s.viewMode);
  const setSelectedProjectId = useStore((s) => s.setSelectedProjectId);
  const setViewMode = useStore((s) => s.setViewMode);
  const addProject = useStore((s) => s.addProject);

  const handleProjectClick = (id: string) => {
    setSelectedProjectId(id);
    setViewMode('projects');
  };

  const handleAddProject = () => {
    const colors = ['#f87171', '#fb923c', '#fbbf24', '#a3e635', '#34d399', '#22d3ee', '#60a5fa', '#818cf8', '#a78bfa', '#e879f9', '#f472b6', '#94a3b8'];
    addProject({
      name: `项目 ${projects.length + 1}`,
      platforms: [],
      colorTag: colors[projects.length % colors.length],
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    });
  };

  const getProjectProgress = (projectId: string) => {
    const projectVideos = videos.filter((v) => v.projectId === projectId);
    if (projectVideos.length === 0) return 0;
    const published = projectVideos.filter((v) => v.status === 'published').length;
    return Math.round((published / projectVideos.length) * 100);
  };

  return (
    <aside
      className={cn(
        'flex h-full w-[240px] flex-shrink-0 flex-col',
        'bg-[rgba(15,23,42,0.85)] backdrop-blur-xl',
        'text-slate-300 border-r border-white/5'
      )}
    >
      <div className="flex items-center gap-2.5 px-5 py-5">
        <Clapperboard size={22} className="text-sky-400" />
        <span className="text-lg font-bold tracking-wide text-white">VideoFlow</span>
      </div>

      <div className="flex items-center justify-between px-5 pb-2 pt-1">
        <span className="text-[11px] font-medium uppercase tracking-widest text-slate-500">项目</span>
        <button
          onClick={handleAddProject}
          className="flex h-5 w-5 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-white/10 hover:text-slate-300"
        >
          <Plus size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-1 scrollbar-thin">
        {projects.map((project) => {
          const isSelected = selectedProjectId === project.id && viewMode === 'projects';
          const progress = getProjectProgress(project.id);
          return (
            <button
              key={project.id}
              onClick={() => handleProjectClick(project.id)}
              className={cn(
                'group relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-all',
                isSelected
                  ? 'bg-white/10 text-white'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              )}
            >
              {isSelected && (
                <span
                  className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full"
                  style={{ backgroundColor: project.colorTag }}
                />
              )}
              <span
                className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                style={{ backgroundColor: project.colorTag }}
              />
              <span className="flex-1 truncate">{project.name}</span>
              <span
                className={cn(
                  'text-[10px] tabular-nums',
                  progress === 100 ? 'text-emerald-400' : 'text-slate-600'
                )}
              >
                {progress}%
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-auto border-t border-white/5 px-3 py-3 space-y-0.5">
        <button
          onClick={() => setViewMode('calendar')}
          className={cn(
            'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-all',
            viewMode === 'calendar'
              ? 'bg-white/10 text-white'
              : 'text-slate-500 hover:bg-white/5 hover:text-slate-300'
          )}
        >
          <Calendar size={16} />
          <span>日历</span>
        </button>
        <button
          onClick={() => setViewMode('stats')}
          className={cn(
            'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-all',
            viewMode === 'stats'
              ? 'bg-white/10 text-white'
              : 'text-slate-500 hover:bg-white/5 hover:text-slate-300'
          )}
        >
          <BarChart3 size={16} />
          <span>统计</span>
        </button>
        <button
          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-slate-500 transition-all hover:bg-white/5 hover:text-slate-300"
        >
          <Settings size={16} />
          <span>设置</span>
        </button>
      </div>
    </aside>
  );
}
