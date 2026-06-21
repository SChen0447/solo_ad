import { Folder, Video, CheckCircle, AlertTriangle } from 'lucide-react';
import { useStore } from '@/store';
import { PLATFORM_LABELS, Platform } from '@/types';

const PLATFORM_COLORS: Record<Platform, string> = {
  douyin: '#fe2c55',
  bilibili: '#00a1d6',
  xiaohongshu: '#ff2442',
  weixin: '#07c160',
};

export default function StatsDashboard() {
  const projects = useStore((s) => s.projects);
  const videos = useStore((s) => s.videos);

  const totalProjects = projects.length;
  const totalVideos = videos.length;
  const publishedCount = videos.filter((v) => v.status === 'published').length;
  const delayedCount = videos.filter((v) => v.status === 'delayed').length;

  const platformCounts: Record<string, number> = {};
  const platformOrder: Platform[] = ['douyin', 'bilibili', 'xiaohongshu', 'weixin'];
  platformOrder.forEach((p) => (platformCounts[p] = 0));
  projects.forEach((proj) => {
    proj.platforms.forEach((p) => {
      platformCounts[p] = (platformCounts[p] || 0) + videos.filter((v) => v.projectId === proj.id).length;
    });
  });
  const maxPlatformCount = Math.max(...Object.values(platformCounts), 1);

  const projectProgress = projects.map((proj) => {
    const projVideos = videos.filter((v) => v.projectId === proj.id);
    const published = projVideos.filter((v) => v.status === 'published').length;
    const total = projVideos.length;
    return {
      id: proj.id,
      name: proj.name,
      colorTag: proj.colorTag,
      total,
      published,
      percentage: total > 0 ? Math.round((published / total) * 100) : 0,
    };
  });

  const stats = [
    { icon: Folder, value: totalProjects, label: '项目总数', accent: '#6366f1' },
    { icon: Video, value: totalVideos, label: '视频总数', accent: '#6366f1' },
    { icon: CheckCircle, value: publishedCount, label: '已发布', accent: '#22c55e' },
    { icon: AlertTriangle, value: delayedCount, label: '已延期', accent: '#ef4444' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="card-hover rounded-xl bg-white p-5 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${s.accent}15` }}
              >
                <s.icon className="h-5 w-5" style={{ color: s.accent }} />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{s.value}</div>
                <div className="text-xs text-gray-500">{s.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-gray-700">平台分布</h3>
        <div className="space-y-3">
          {platformOrder.map((p) => (
            <div key={p} className="flex items-center gap-3">
              <span className="w-14 text-xs text-gray-600">{PLATFORM_LABELS[p]}</span>
              <div className="flex-1 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-5 rounded-full transition-all duration-500"
                  style={{
                    width: `${(platformCounts[p] / maxPlatformCount) * 100}%`,
                    backgroundColor: PLATFORM_COLORS[p],
                    minWidth: platformCounts[p] > 0 ? '24px' : '0px',
                  }}
                />
              </div>
              <span className="w-8 text-right text-xs font-medium text-gray-700">
                {platformCounts[p]}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-gray-700">项目进度</h3>
        <div className="space-y-4">
          {projectProgress.map((proj) => (
            <div key={proj.id}>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm text-gray-700">{proj.name}</span>
                <span className="text-xs text-gray-500">
                  {proj.published}/{proj.total} · {proj.percentage}%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="progress-bar h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${proj.percentage}%`,
                    backgroundColor: proj.colorTag,
                  }}
                />
              </div>
            </div>
          ))}
          {projectProgress.length === 0 && (
            <p className="py-6 text-center text-sm text-gray-400">暂无项目数据</p>
          )}
        </div>
      </div>
    </div>
  );
}
