import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useStore } from '@/store';
import ProjectCard from '@/components/ProjectCard';
import ProjectForm from '@/components/ProjectForm';

export default function ProjectList() {
  const projects = useStore((s) => s.projects);
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">我的项目</h1>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white"
            style={{ backgroundColor: '#6366f1' }}
          >
            <Plus className="h-4 w-4" />
            创建项目
          </button>
        </div>

        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-gray-400">
            <div className="mb-4 text-6xl">📋</div>
            <p className="text-lg font-medium">暂无项目</p>
            <p className="mt-1 text-sm">点击上方按钮创建你的第一个项目</p>
          </div>
        ) : (
          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns:
                'repeat(auto-fill, minmax(300px, 1fr))',
            }}
          >
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>

      {showForm && <ProjectForm onClose={() => setShowForm(false)} />}
    </div>
  );
}
