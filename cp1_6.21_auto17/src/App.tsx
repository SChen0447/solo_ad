import React, { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Task, Dependency, TeamMember } from '@/types';
import { KanbanBoard } from '@/components/KanbanBoard';
import { TaskDetailPanel } from '@/components/TaskDetailPanel';
import { sampleTasks, sampleDependencies, sampleTeamMembers } from '@/data/sampleData';

const App: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>(sampleTasks);
  const [dependencies, setDependencies] = useState<Dependency[]>(sampleDependencies);
  const [teamMembers] = useState<TeamMember[]>(sampleTeamMembers);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const handleTasksChange = useCallback((newTasks: Task[]) => {
    setTasks(newTasks);
  }, []);

  const handleDependenciesChange = useCallback(
    (newDeps: Dependency[]) => {
      const taskIds = new Set(tasks.map((t) => t.id));
      const filtered = newDeps.filter(
        (d) => taskIds.has(d.fromTaskId) && taskIds.has(d.toTaskId)
      );
      setDependencies(filtered);
    },
    [tasks]
  );

  const handleTaskClick = useCallback((task: Task) => {
    setSelectedTask(task);
  }, []);

  const handleTaskSave = useCallback(
    (updatedTask: Task) => {
      setTasks((prev) =>
        prev.map((t) => (t.id === updatedTask.id ? { ...updatedTask } : t))
      );
    },
    []
  );

  const handleTaskDelete = useCallback(
    (taskId: string) => {
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      setDependencies((prev) =>
        prev.filter((d) => d.fromTaskId !== taskId && d.toTaskId !== taskId)
      );
    },
    []
  );

  const handleAddTask = useCallback(() => {
    const member = teamMembers[Math.floor(Math.random() * teamMembers.length)];
    const newTask: Task = {
      id: uuidv4(),
      name: '新任务',
      description: '',
      assignee: member.name,
      estimatedHours: 8,
      actualHours: 0,
      status: 'todo',
      startDay: 0,
    };
    setTasks((prev) => [...prev, newTask]);
    setTimeout(() => setSelectedTask(newTask), 100);
  }, [teamMembers]);

  const handleResetDemo = useCallback(() => {
    setTasks(sampleTasks);
    setDependencies(sampleDependencies);
    setSelectedTask(null);
  }, []);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #0f141c 0%, #121825 100%)',
      }}
    >
      <header
        style={{
          padding: '20px 32px',
          background: 'linear-gradient(135deg, rgba(56, 178, 172, 0.08) 0%, transparent 100%)',
          borderBottom: '1px solid #2d3748',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #38b2ac 0%, #2c7a7b 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              boxShadow: '0 4px 16px rgba(56, 178, 172, 0.3)',
            }}
          >
            📋
          </div>
          <div>
            <h1
              style={{
                fontSize: 20,
                fontWeight: 800,
                color: '#e2e8f0',
                margin: 0,
                letterSpacing: -0.3,
              }}
            >
              项目里程碑管理器
            </h1>
            <p style={{ fontSize: 12, color: '#718096', margin: '4px 0 0 0' }}>
              可视化任务依赖 · 智能关键路径分析 · 实时浮时计算
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={handleResetDemo}
            style={secondaryBtnStyle}
            onMouseOver={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = '#2d3748';
            }}
            onMouseOut={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                'rgba(74, 85, 104, 0.5)';
            }}
          >
            🔄 重置示例
          </button>
          <button
            onClick={handleAddTask}
            style={primaryBtnStyle}
            onMouseOver={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform =
                'translateY(-1px)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow =
                '0 6px 20px rgba(56, 178, 172, 0.4)';
            }}
            onMouseOut={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow =
                '0 4px 12px rgba(56, 178, 172, 0.3)';
            }}
          >
            ➕ 新建任务
          </button>
        </div>
      </header>

      <div
        style={{
          display: 'flex',
          gap: 20,
          padding: '20px 32px',
          flexWrap: 'wrap',
        }}
      >
        <StatCard
          label="任务总数"
          value={tasks.length}
          icon="📊"
          color="#38b2ac"
        />
        <StatCard
          label="已完成"
          value={tasks.filter((t) => t.status === 'done').length}
          icon="✅"
          color="#48bb78"
        />
        <StatCard
          label="进行中"
          value={tasks.filter((t) => t.status === 'in-progress').length}
          icon="⚡"
          color="#4299e1"
        />
        <StatCard
          label="阻塞"
          value={tasks.filter((t) => t.status === 'blocked').length}
          icon="🚧"
          color="#f56565"
        />
        <StatCard
          label="依赖关系"
          value={dependencies.length}
          icon="🔗"
          color="#9f7aea"
        />
        <StatCard
          label="预估总工时"
          value={`${tasks.reduce((s, t) => s + t.estimatedHours, 0)}h`}
          icon="⏰"
          color="#ed8936"
        />
      </div>

      <main style={{ padding: '0 32px 32px 32px' }}>
        <KanbanBoard
          tasks={tasks}
          dependencies={dependencies}
          teamMembers={teamMembers}
          onTasksChange={handleTasksChange}
          onDependenciesChange={handleDependenciesChange}
          onTaskClick={handleTaskClick}
        />
      </main>

      <TaskDetailPanel
        task={selectedTask}
        teamMembers={teamMembers}
        onClose={() => setSelectedTask(null)}
        onSave={handleTaskSave}
        onDelete={handleTaskDelete}
      />
    </div>
  );
};

const StatCard: React.FC<{
  label: string;
  value: string | number;
  icon: string;
  color: string;
}> = ({ label, value, icon, color }) => (
  <div
    style={{
      flex: '1 1 160px',
      minWidth: 140,
      padding: '16px 20px',
      borderRadius: 12,
      background: `linear-gradient(145deg, ${color}15 0%, #1a202c 100%)`,
      border: `1px solid ${color}33`,
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      transition: 'all 0.3s ease',
    }}
    onMouseOver={(e) => {
      (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
      (e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 24px ${color}22`;
    }}
    onMouseOut={(e) => {
      (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
    }}
  >
    <div
      style={{
        width: 44,
        height: 44,
        borderRadius: 10,
        background: `${color}25`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 22,
      }}
    >
      {icon}
    </div>
    <div>
      <div style={{ fontSize: 11, color: '#718096', marginBottom: 2 }}>{label}</div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 800,
          color: color,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
    </div>
  </div>
);

const primaryBtnStyle: React.CSSProperties = {
  padding: '10px 20px',
  borderRadius: 8,
  border: 'none',
  background: 'linear-gradient(135deg, #38b2ac 0%, #319795 100%)',
  color: '#fff',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  boxShadow: '0 4px 12px rgba(56, 178, 172, 0.3)',
  transition: 'all 0.2s ease',
  display: 'flex',
  alignItems: 'center',
  gap: 6,
};

const secondaryBtnStyle: React.CSSProperties = {
  padding: '10px 18px',
  borderRadius: 8,
  border: '1px solid #4a5568',
  background: 'rgba(74, 85, 104, 0.5)',
  color: '#a0aec0',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  display: 'flex',
  alignItems: 'center',
  gap: 6,
};

export default App;
