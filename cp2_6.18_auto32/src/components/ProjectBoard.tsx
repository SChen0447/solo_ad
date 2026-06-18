import { Project, calculateWorkHours } from '../utils/helpers';

interface ProjectBoardProps {
  projects: Project[];
  onProjectClick: (projectId: string) => void;
  onAddProject: (name: string) => void;
}

export default function ProjectBoard({ projects, onProjectClick, onAddProject }: ProjectBoardProps) {
  const handleAdd = () => {
    const name = window.prompt('请输入新项目名称：', '新项目');
    if (name !== null && name.trim()) {
      onAddProject(name.trim());
    }
  };

  return (
    <div>
      <div className="app-header">
        <h1>📊 项目工时估算与资源看板</h1>
        <p>快速规划项目工时，可视化团队资源分配</p>
      </div>

      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 13, color: '#6b7280' }}>共 {projects.length} 个项目</div>
        <button className="add-task-btn" onClick={handleAdd}>
          + 新建项目
        </button>
      </div>

      <div className="board-container">
        {projects.map(project => {
          const stats = calculateWorkHours(project.tasks);
          return (
            <div
              key={project.id}
              className="project-card"
              onClick={() => onProjectClick(project.id)}
            >
              <div className="project-card-title">{project.name}</div>
              <div className="project-card-footer">
                <span className="task-badge">
                  ✔ {stats.completedTasks}/{stats.totalTasks}
                </span>
                <span className="project-card-date">总工时 {stats.totalHours}h</span>
              </div>
            </div>
          );
        })}

        {projects.length === 0 && (
          <div style={{
            gridColumn: '1 / -1',
            textAlign: 'center',
            padding: 60,
            color: '#9ca3af',
            fontSize: 14,
          }}>
            暂无项目，点击右上角「新建项目」开始创建
          </div>
        )}
      </div>
    </div>
  );
}
