import { useNavigate } from 'react-router-dom';
import { useStore } from '@/store';
import { Project, PLATFORM_LABELS, Platform } from '@/types';
import { cn } from '@/lib/utils';

const PLATFORM_COLORS: Record<Platform, string> = {
  douyin: 'bg-black text-white',
  bilibili: 'bg-blue-500 text-white',
  xiaohongshu: 'bg-red-500 text-white',
  weixin: 'bg-green-500 text-white',
};

interface ProjectCardProps {
  project: Project;
}

export default function ProjectCard({ project }: ProjectCardProps) {
  const navigate = useNavigate();
  const { setSelectedProjectId, videos } = useStore();

  const projectVideos = videos.filter((v) => v.projectId === project.id);
  const total = projectVideos.length;
  const published = projectVideos.filter((v) => v.status === 'published').length;
  const progress = total > 0 ? (published / total) * 100 : 0;
  const isWarning = total > 0 && progress < 50;

  const handleClick = () => {
    setSelectedProjectId(project.id);
    navigate(`/project/${project.id}`);
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        'relative overflow-hidden rounded-lg bg-white cursor-pointer',
        'transition-all duration-300 ease-out',
        'hover:-translate-y-1 hover:shadow-lg',
        'shadow'
      )}
    >
      <div
        className="absolute top-0 left-0 w-1 h-full"
        style={{ backgroundColor: project.colorTag }}
      />

      <div className="p-4 pl-5">
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-base font-semibold text-gray-900 truncate flex-1 mr-2">
            {project.name}
          </h3>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs text-gray-500">
              {published}/{total}
            </span>
            <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${progress}%`,
                  backgroundColor: project.colorTag,
                }}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {project.platforms.map((p) => (
            <span
              key={p}
              className={cn(
                'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                PLATFORM_COLORS[p]
              )}
            >
              {PLATFORM_LABELS[p]}
            </span>
          ))}
        </div>

        <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
          <span>{project.startDate}</span>
          <span>~</span>
          <span>{project.endDate}</span>
        </div>
      </div>

      {isWarning && (
        <div
          className="h-1 w-full"
          style={{
            background: 'linear-gradient(90deg, rgba(239,68,68,0.3), rgba(239,68,68,0.08))',
          }}
        />
      )}
    </div>
  );
}
