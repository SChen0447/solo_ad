import { useState, useMemo } from 'react';
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import { useStore } from '@/store';
import { Project } from '@/types';
import VideoTimeline from '@/components/VideoTimeline';
import VideoForm from '@/components/VideoForm';
import ProjectForm from '@/components/ProjectForm';
import MoveVideoModal from '@/components/MoveVideoModal';

export default function ProjectDetail() {
  const projects = useStore((s) => s.projects);
  const videos = useStore((s) => s.videos);
  const selectedProjectId = useStore((s) => s.selectedProjectId);
  const deleteProject = useStore((s) => s.deleteProject);
  const setSelectedProjectId = useStore((s) => s.setSelectedProjectId);
  const setViewMode = useStore((s) => s.setViewMode);

  const [showVideoForm, setShowVideoForm] = useState(false);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [multiSelect, setMultiSelect] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const project: Project | undefined = useMemo(
    () => projects.find((p) => p.id === selectedProjectId),
    [projects, selectedProjectId],
  );

  const projectVideos = useMemo(
    () =>
      videos
        .filter((v) => v.projectId === selectedProjectId)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [videos, selectedProjectId],
  );

  if (!project) {
    return (
      <div className="flex h-screen items-center justify-center text-gray-400">
        项目不存在
      </div>
    );
  }

  const handleBack = () => {
    setSelectedProjectId(null);
    setViewMode('projects');
  };

  const handleDelete = () => {
    deleteProject(project.id);
    setSelectedProjectId(null);
    setViewMode('projects');
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const exitMultiSelect = () => {
    setMultiSelect(false);
    setSelectedIds([]);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-6 py-4">
          <button
            onClick={handleBack}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <h1 className="flex-1 truncate text-xl font-bold text-gray-900">
            {project.name}
          </h1>

          <button
            onClick={() => setShowProjectForm(true)}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          >
            <Pencil className="h-4 w-4" />
          </button>

          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="rounded-lg p-2 text-red-500 hover:bg-red-50 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {multiSelect ? (
              <>
                <span className="text-sm text-gray-500">
                  已选择 {selectedIds.length} 项
                </span>
                <button
                  onClick={exitMultiSelect}
                  className="rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
                >
                  取消
                </button>
                {selectedIds.length > 0 && (
                  <button
                    onClick={() => setShowMoveModal(true)}
                    className="rounded-lg px-3 py-1.5 text-sm text-white"
                    style={{ backgroundColor: '#6366f1' }}
                  >
                    移动到其他项目
                  </button>
                )}
              </>
            ) : (
              <>
                <button
                  onClick={() => setMultiSelect(true)}
                  className="rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
                >
                  多选
                </button>
                <button
                  onClick={() => setShowVideoForm(true)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-white"
                  style={{ backgroundColor: '#6366f1' }}
                >
                  添加视频
                </button>
              </>
            )}
          </div>
        </div>

        <VideoTimeline
          videos={projectVideos}
          multiSelect={multiSelect}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
        />
      </div>

      {showVideoForm && (
        <VideoForm
          projectId={project.id}
          onClose={() => setShowVideoForm(false)}
        />
      )}

      {showProjectForm && (
        <ProjectForm
          project={project}
          onClose={() => setShowProjectForm(false)}
        />
      )}

      {showMoveModal && (
        <MoveVideoModal
          videoIds={selectedIds}
          currentProjectId={project.id}
          onClose={() => {
            setShowMoveModal(false);
            exitMultiSelect();
          }}
        />
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="mx-4 w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">
              确认删除项目
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              删除项目「{project.name}」后，其下所有视频也将被删除，此操作不可撤销。
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
