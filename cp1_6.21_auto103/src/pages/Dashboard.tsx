import React, { useState, useMemo, useEffect } from 'react';
import { Search, Plus, DollarSign, Clock, TrendingUp, X } from 'lucide-react';
import { startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { Project, TimeLog, computeAfterTax } from '../types';
import {
  createProject,
  updateProject,
  deleteProject,
  createTimeLog,
  deleteTimeLog,
} from '../api';
import ProjectCard from '../components/ProjectCard';
import TimeLogForm from '../components/TimeLogForm';
import IncomeChart from '../components/IncomeChart';

interface Props {
  projects: Project[];
  timeLogs: TimeLog[];
  refreshProjects: () => Promise<void>;
  refreshTimeLogs: () => Promise<void>;
}

export default function Dashboard({ projects, timeLogs, refreshProjects, refreshTimeLogs }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    hourlyRate: '',
    estimatedHours: '',
    clientName: '',
  });
  const [animatedCards, setAnimatedCards] = useState<number[]>([]);

  useEffect(() => {
    const timers = [0, 1, 2].map((i) =>
      setTimeout(() => setAnimatedCards((prev) => [...prev, i]), i * 100)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const currentMonthLogs = useMemo(
    () =>
      timeLogs.filter((t) =>
        isWithinInterval(new Date(t.date), { start: monthStart, end: monthEnd })
      ),
    [timeLogs, monthStart, monthEnd]
  );

  const monthlyIncome = useMemo(() => {
    let total = 0;
    currentMonthLogs.forEach((log) => {
      const project = projects.find((p) => p.id === log.projectId);
      if (project) total += log.hours * project.hourlyRate;
    });
    return total;
  }, [currentMonthLogs, projects]);

  const monthlyHours = useMemo(
    () => currentMonthLogs.reduce((sum, t) => sum + t.hours, 0),
    [currentMonthLogs]
  );

  const avgRate = useMemo(() => {
    if (monthlyHours === 0) return 0;
    return monthlyIncome / monthlyHours;
  }, [monthlyIncome, monthlyHours]);

  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projects;
    const q = searchQuery.toLowerCase();
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) || p.clientName.toLowerCase().includes(q)
    );
  }, [projects, searchQuery]);

  async function handleCreateProject(e: React.FormEvent) {
    e.preventDefault();
    if (!newProject.name || !newProject.hourlyRate) return;
    await createProject({
      name: newProject.name,
      hourlyRate: Number(newProject.hourlyRate),
      estimatedHours: Number(newProject.estimatedHours) || 0,
      clientName: newProject.clientName,
    });
    await refreshProjects();
    setNewProject({ name: '', hourlyRate: '', estimatedHours: '', clientName: '' });
    setShowNewProject(false);
  }

  async function handleUpdateProject(id: string, data: Partial<Project>) {
    await updateProject(id, data);
    await refreshProjects();
  }

  async function handleDeleteProject(id: string) {
    await deleteProject(id);
    await refreshProjects();
    await refreshTimeLogs();
  }

  async function handleCreateTimeLog(data: { projectId: string; date: string; hours: number; note: string }) {
    await createTimeLog(data);
    await refreshTimeLogs();
  }

  async function handleDeleteTimeLog(id: string) {
    await deleteTimeLog(id);
    await refreshTimeLogs();
  }

  const statCards = [
    {
      label: '当月总收入（税后）',
      value: `¥${computeAfterTax(monthlyIncome).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
      icon: <DollarSign size={28} />,
      bg: '#1E3A5F',
      color: '#93C5FD',
    },
    {
      label: '本月总工时',
      value: `${monthlyHours.toFixed(1)}h`,
      icon: <Clock size={28} />,
      bg: '#581C87',
      color: '#C084FC',
    },
    {
      label: '平均小时费率',
      value: `¥${avgRate.toFixed(0)}/h`,
      icon: <TrendingUp size={28} />,
      bg: '#92400E',
      color: '#FCD34D',
    },
  ];

  return (
    <div style={pageStyle}>
      <style>{`
        @keyframes fadeSlideDown {
          from { opacity: 0; transform: translate(-50%, -8px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <header className="dashboard-header" style={headerStyle}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#F9FAFB' }}>
            💼 自由职业者收入仪表盘
          </h1>
          <p style={{ fontSize: '0.85rem', color: '#9CA3AF', marginTop: '2px' }}>
            追踪项目费率、工时与收入
          </p>
        </div>
        <div className="dashboard-header-right" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="dashboard-search" style={searchContainerStyle}>
            <Search size={16} style={{ color: '#9CA3AF', flexShrink: 0 }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索项目或客户..."
              style={searchInputStyle}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} style={clearBtnStyle}>
                <X size={14} />
              </button>
            )}
          </div>
          <button onClick={() => setShowNewProject(true)} style={addBtnStyle}>
            <Plus size={18} /> 新建项目
          </button>
        </div>
      </header>

      <div className="dashboard-stats-row" style={statsRowStyle}>
        {statCards.map((card, idx) => (
          <div
            key={card.label}
            style={{
              ...statCardStyle,
              background: card.bg,
              opacity: animatedCards.includes(idx) ? 1 : 0,
              transform: animatedCards.includes(idx) ? 'translateY(0)' : 'translateY(20px)',
              animation: animatedCards.includes(idx) ? 'slideUp 0.4s ease forwards' : 'none',
            }}
          >
            <div>
              <div style={{ fontSize: '0.8rem', color: '#9CA3AF', marginBottom: '4px' }}>
                {card.label}
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: card.color }}>
                {card.value}
              </div>
            </div>
            <div style={{ color: card.color, opacity: 0.7 }}>{card.icon}</div>
          </div>
        ))}
      </div>

      {showNewProject && (
        <div style={overlayStyle} onClick={() => setShowNewProject(false)}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px', color: '#F9FAFB' }}>
              新建项目
            </h3>
            <form onSubmit={handleCreateProject} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input
                value={newProject.name}
                onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                placeholder="项目名称"
                style={modalInputStyle}
                required
                autoFocus
              />
              <input
                value={newProject.clientName}
                onChange={(e) => setNewProject({ ...newProject, clientName: e.target.value })}
                placeholder="客户名称"
                style={modalInputStyle}
              />
              <div style={{ display: 'flex', gap: '12px' }}>
                <input
                  type="number"
                  value={newProject.hourlyRate}
                  onChange={(e) => setNewProject({ ...newProject, hourlyRate: e.target.value })}
                  placeholder="小时费率（元/小时）"
                  style={modalInputStyle}
                  required
                />
                <input
                  type="number"
                  value={newProject.estimatedHours}
                  onChange={(e) => setNewProject({ ...newProject, estimatedHours: e.target.value })}
                  placeholder="预估工时"
                  style={modalInputStyle}
                />
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowNewProject(false)} style={modalCancelBtnStyle}>
                  取消
                </button>
                <button type="submit" style={modalSubmitBtnStyle}>
                  创建项目
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="dashboard-main-grid" style={mainGridStyle}>
        <div style={leftColumnStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#D1D5DB' }}>
              项目列表 ({filteredProjects.length})
            </h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredProjects.length === 0 ? (
              <div style={emptyStateStyle}>
                {projects.length === 0
                  ? '还没有项目，点击右上角「新建项目」开始'
                  : '没有匹配的搜索结果'}
              </div>
            ) : (
              filteredProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  timeLogs={timeLogs}
                  onDelete={handleDeleteProject}
                  onUpdate={handleUpdateProject}
                  onDeleteTimeLog={handleDeleteTimeLog}
                  searchQuery={searchQuery}
                />
              ))
            )}
          </div>
        </div>

        <div style={rightColumnStyle}>
          <div style={{ marginBottom: '20px' }}>
            <TimeLogForm
              projects={projects}
              onSubmit={handleCreateTimeLog}
              onSuccess={() => {}}
            />
          </div>
          <div style={{ background: '#F9FAFB', borderRadius: '12px', overflow: 'hidden' }}>
            <IncomeChart projects={projects} timeLogs={timeLogs} />
          </div>
        </div>
      </div>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  maxWidth: '1280px',
  margin: '0 auto',
  padding: '24px',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '24px',
  flexWrap: 'wrap',
  gap: '16px',
};

const searchContainerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  background: '#374151',
  borderRadius: '10px',
  border: '1px solid #4B5563',
  padding: '8px 12px',
  gap: '8px',
  minWidth: '220px',
  transition: 'box-shadow 0.2s, border-color 0.2s',
};

const searchInputStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: '#F3F4F6',
  outline: 'none',
  fontSize: '0.9rem',
  width: '100%',
};

const clearBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#9CA3AF',
  cursor: 'pointer',
  padding: '2px',
  display: 'flex',
  alignItems: 'center',
};

const addBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  padding: '8px 16px',
  borderRadius: '10px',
  border: 'none',
  background: '#4F46E5',
  color: '#fff',
  fontSize: '0.9rem',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'background 0.2s',
  whiteSpace: 'nowrap',
};

const statsRowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: '16px',
  marginBottom: '24px',
};

const statCardStyle: React.CSSProperties = {
  borderRadius: '12px',
  padding: '20px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
  transition: 'opacity 0.4s ease, transform 0.4s ease',
};

const mainGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 400px',
  gap: '24px',
  alignItems: 'start',
};

const leftColumnStyle: React.CSSProperties = {
  minWidth: 0,
};

const rightColumnStyle: React.CSSProperties = {
  minWidth: 0,
};

const emptyStateStyle: React.CSSProperties = {
  background: '#374151',
  borderRadius: '12px',
  padding: '40px 20px',
  textAlign: 'center',
  color: '#6B7280',
  fontSize: '0.9rem',
};

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.6)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
};

const modalStyle: React.CSSProperties = {
  background: '#1F2937',
  borderRadius: '12px',
  padding: '24px',
  width: '90%',
  maxWidth: '460px',
  boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
};

const modalInputStyle: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: '8px',
  border: '1px solid #4B5563',
  background: '#374151',
  color: '#F3F4F6',
  fontSize: '0.9rem',
  outline: 'none',
  width: '100%',
  transition: 'border-color 0.2s',
};

const modalCancelBtnStyle: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: '8px',
  border: '1px solid #4B5563',
  background: 'transparent',
  color: '#9CA3AF',
  cursor: 'pointer',
  fontSize: '0.9rem',
};

const modalSubmitBtnStyle: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: '8px',
  border: 'none',
  background: '#4F46E5',
  color: '#fff',
  cursor: 'pointer',
  fontSize: '0.9rem',
  fontWeight: 600,
};
