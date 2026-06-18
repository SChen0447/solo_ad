import { useMemo } from 'react';
import { useProjectState } from './hooks/useProjectState';
import ProjectBoard from './components/ProjectBoard';
import ProjectDetail from './components/ProjectDetail';

export default function App() {
  const {
    state,
    goToBoard,
    goToDetail,
    addProject,
    addTask,
    updateTask,
    deleteTask,
    reorderTasks,
  } = useProjectState();

  const currentProject = useMemo(() => {
    if (state.page.type !== 'detail') return null;
    return state.projects.find(p => p.id === state.page.projectId) || null;
  }, [state.page, state.projects]);

  return (
    <div className="app-container">
      {state.page.type === 'board' ? (
        <ProjectBoard
          projects={state.projects}
          onProjectClick={goToDetail}
          onAddProject={addProject}
        />
      ) : currentProject ? (
        <ProjectDetail
          project={currentProject}
          onBack={goToBoard}
          onAddTask={() => addTask(currentProject.id)}
          onUpdateTask={(taskId, patch) => updateTask(currentProject.id, taskId, patch)}
          onDeleteTask={(taskId) => deleteTask(currentProject.id, taskId)}
          onReorderTasks={(from, to) => reorderTasks(currentProject.id, from, to)}
        />
      ) : (
        <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>
          项目不存在
          <div style={{ marginTop: 20 }}>
            <button className="back-btn" onClick={goToBoard}>返回看板</button>
          </div>
        </div>
      )}
    </div>
  );
}
