import { useState, useEffect } from 'react';
import { Search, Check } from 'lucide-react';
import { useStore } from '@/store';
import { PLATFORM_LABELS, Platform } from '@/types';

interface MoveVideoModalProps {
  open: boolean;
  onClose: () => void;
  videoIds: string[];
  currentProjectId: string;
}

export default function MoveVideoModal({ open, onClose, videoIds, currentProjectId }: MoveVideoModalProps) {
  const projects = useStore((s) => s.projects);
  const moveVideoToProject = useStore((s) => s.moveVideoToProject);

  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);

  const otherProjects = projects.filter((p) => p.id !== currentProjectId);
  const filtered = otherProjects.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  useEffect(() => {
    if (open) {
      setSearch('');
      setSelectedId(null);
      setShowToast(false);
    }
  }, [open]);

  const handleConfirm = () => {
    if (!selectedId) return;
    moveVideoToProject(videoIds, selectedId);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
      onClose();
    }, 2000);
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 glassmorphism" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-50 slide-in-bottom">
        <div className="mx-auto max-w-lg rounded-t-2xl bg-white p-6 shadow-xl">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">移动到项目</h2>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="搜索项目..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
            />
          </div>

          <div className="max-h-64 space-y-2 overflow-y-auto">
            {filtered.map((project) => (
              <button
                key={project.id}
                onClick={() => setSelectedId(project.id)}
                className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-all ${
                  selectedId === project.id
                    ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500'
                    : 'border-gray-100 bg-white hover:bg-gray-50'
                }`}
              >
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: project.colorTag }}
                />
                <span className="flex-1 text-sm font-medium text-gray-800">{project.name}</span>
                <div className="flex gap-1">
                  {project.platforms.map((p: Platform) => (
                    <span
                      key={p}
                      className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500"
                    >
                      {PLATFORM_LABELS[p]}
                    </span>
                  ))}
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="py-8 text-center text-sm text-gray-400">暂无可移动的项目</p>
            )}
          </div>

          <div className="mt-5 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              取消
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selectedId}
              className="rounded-[20px] bg-[#6366f1] px-5 py-2 text-sm font-medium text-white transition hover:bg-indigo-600 disabled:opacity-40 disabled:hover:bg-[#6366f1]"
            >
              确认移动
            </button>
          </div>
        </div>
      </div>

      {showToast && (
        <div className="toast-success fixed left-1/2 top-8 z-[60] -translate-x-1/2">
          <div className="flex items-center gap-2 rounded-lg bg-white px-4 py-3 shadow-lg">
            <Check className="h-5 w-5 text-[#22c55e]" />
            <span className="text-sm font-medium text-gray-800">移动成功</span>
          </div>
        </div>
      )}
    </>
  );
}
