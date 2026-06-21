import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useStore } from '@/store';
import { Project, Platform, PLATFORM_LABELS, COLOR_PALETTE } from '@/types';
import { cn } from '@/lib/utils';

const ALL_PLATFORMS: Platform[] = ['douyin', 'bilibili', 'xiaohongshu', 'weixin'];

interface ProjectFormProps {
  open: boolean;
  onClose: () => void;
  editProject?: Project;
}

export default function ProjectForm({ open, onClose, editProject }: ProjectFormProps) {
  const { addProject, updateProject } = useStore();

  const [name, setName] = useState('');
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [colorTag, setColorTag] = useState(COLOR_PALETTE[0].value);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (open) {
      if (editProject) {
        setName(editProject.name);
        setPlatforms([...editProject.platforms]);
        setColorTag(editProject.colorTag);
        setStartDate(editProject.startDate);
        setEndDate(editProject.endDate);
      } else {
        setName('');
        setPlatforms([]);
        setColorTag(COLOR_PALETTE[0].value);
        setStartDate('');
        setEndDate('');
      }
    }
  }, [open, editProject]);

  const togglePlatform = (p: Platform) => {
    setPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || platforms.length === 0) return;

    const data = {
      name: name.trim(),
      platforms,
      colorTag,
      startDate,
      endDate,
    };

    if (editProject) {
      updateProject(editProject.id, data);
    } else {
      addProject(data);
    }
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={cn(
          'relative w-full max-w-lg bg-white rounded-t-2xl shadow-xl',
          'animate-slide-up'
        )}
        style={{
          animation: 'slideUp 0.3s ease-out',
        }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            {editProject ? '编辑项目' : '新建项目'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              项目名称
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="请输入项目名称"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              目标平台
            </label>
            <div className="flex flex-wrap gap-2">
              {ALL_PLATFORMS.map((p) => (
                <label
                  key={p}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border cursor-pointer transition-colors text-sm',
                    platforms.includes(p)
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={platforms.includes(p)}
                    onChange={() => togglePlatform(p)}
                    className="sr-only"
                  />
                  {PLATFORM_LABELS[p]}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              颜色标签
            </label>
            <div className="grid grid-cols-6 gap-2">
              {COLOR_PALETTE.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColorTag(c.value)}
                  className={cn(
                    'w-full aspect-square rounded-lg transition-all',
                    colorTag === c.value
                      ? 'ring-2 ring-offset-2 ring-gray-400 scale-110'
                      : 'hover:scale-105'
                  )}
                  style={{ backgroundColor: c.value }}
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                开始日期
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                结束日期
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-colors"
              style={{ backgroundColor: '#6366f1' }}
            >
              {editProject ? '保存' : '创建'}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
