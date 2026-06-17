import { useState, useEffect, useCallback } from 'react';
import ProjectForm from './components/ProjectForm';
import ComparisonMatrix from './components/ComparisonMatrix';
import VotePage from './components/VotePage';
import { api, onLoadingChange } from './utils/api';
import type { Project, TechOption, Dimension, VoteRecord } from './types';

type PageType = 'home' | 'form' | 'matrix' | 'vote' | 'share';

export default function App() {
  const [page, setPage] = useState<PageType>('home');
  const [projectId, setProjectId] = useState<string | null>(null);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [project, setProject] = useState<Project | null>(null);
  const [dimensions, setDimensions] = useState<Dimension[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [projectList, setProjectList] = useState<any[]>([]);

  useEffect(() => {
    const unsub = onLoadingChange(setLoading);
    return unsub;
  }, []);

  useEffect(() => {
    api.getDimensions().then(setDimensions).catch(() => {});
    api.getProjectList().then(setProjectList).catch(() => {});
  }, []);

  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/share/')) {
      const code = path.split('/share/')[1];
      if (code) {
        loadProject(code, true);
      }
    }
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }, []);

  const loadProject = useCallback(async (id: string, readOnly = false) => {
    try {
      const data = await api.getProject(id);
      setProject(data);
      setProjectId(data.id);
      setIsReadOnly(readOnly);
      setPage('matrix');
    } catch (e: any) {
      showToast(e.message || '加载项目失败');
    }
  }, [showToast]);

  const handleCreateProject = useCallback(async (data: {
    name: string;
    description: string;
    options: Omit<TechOption, 'id'>[];
  }) => {
    try {
      const created = await api.createProject(data);
      setProject(created);
      setProjectId(created.id);
      setPage('matrix');
      showToast('项目创建成功');
      const list = await api.getProjectList();
      setProjectList(list);
    } catch (e: any) {
      showToast(e.message || '创建失败');
    }
  }, [showToast]);

  const handleUpdateOptions = useCallback(async (options: TechOption[]) => {
    if (!projectId || !project) return;
    try {
      const updated = await api.updateProject(projectId, { options });
      setProject(updated);
      showToast('方案已更新');
    } catch (e: any) {
      showToast(e.message || '更新失败');
    }
  }, [projectId, project, showToast]);

  const handleVote = useCallback(async (optionId: string, vote: 'support' | 'oppose' | 'abstain') => {
    if (!projectId) return;
    try {
      const result = await api.submitVote(projectId, optionId, vote);
      setProject((prev) => prev ? { ...prev, votes: result.votes } : prev);
    } catch (e: any) {
      showToast(e.message || '投票失败');
    }
  }, [projectId, showToast]);

  const handleGoToVote = useCallback(() => {
    setPage('vote');
  }, []);

  const handleShare = useCallback(async () => {
    if (!projectId) return;
    try {
      const res = await api.getShareLink(projectId);
      const fullUrl = `${window.location.origin}/share/${res.shortCode}`;
      await navigator.clipboard.writeText(fullUrl);
      showToast('分享链接已复制到剪贴板');
    } catch (e: any) {
      showToast('复制失败，请手动复制');
    }
  }, [projectId, showToast]);

  return (
    <div className="app-container">
      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner" />
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}

      <header className="app-header">
        <div className="header-inner">
          <h1 className="app-title" onClick={() => setPage('home')}>
            <span className="logo-icon">⚡</span>
            TechCompare
          </h1>
          <nav className="app-nav">
            {page !== 'home' && (
              <button className="nav-btn ripple" onClick={() => setPage('home')}>
                返回首页
              </button>
            )}
            {page === 'matrix' && !isReadOnly && (
              <button className="nav-btn ripple" onClick={handleGoToVote}>
                查看投票结果
              </button>
            )}
            {page === 'matrix' && (
              <button className="nav-btn primary ripple" onClick={handleShare}>
                生成分享链接
              </button>
            )}
            {page === 'vote' && (
              <button className="nav-btn ripple" onClick={() => setPage('matrix')}>
                返回对比矩阵
              </button>
            )}
          </nav>
        </div>
      </header>

      <main className="app-main">
        {page === 'home' && (
          <HomePage
            projectList={projectList}
            onSelectProject={(id) => loadProject(id)}
            onCreate={() => setPage('form')}
          />
        )}

        {page === 'form' && (
          <div className="page-wrapper">
            <ProjectForm
              onSubmit={handleCreateProject}
              onCancel={() => setPage('home')}
            />
          </div>
        )}

        {page === 'matrix' && project && (
          <ComparisonMatrix
            project={project}
            dimensions={dimensions}
            readOnly={isReadOnly}
            onUpdateOptions={handleUpdateOptions}
            onVote={handleVote}
          />
        )}

        {page === 'vote' && project && (
          <VotePage project={project} />
        )}

        {page === 'matrix' && project && isReadOnly && (
          <footer className="share-footer">
            由 <strong>{project.createdBy}</strong> 创建 · {new Date(project.createdAt).toLocaleString('zh-CN')}
          </footer>
        )}
      </main>
    </div>
  );
}

function HomePage({
  projectList,
  onSelectProject,
  onCreate,
}: {
  projectList: any[];
  onSelectProject: (id: string) => void;
  onCreate: () => void;
}) {
  return (
    <div className="home-page">
      <section className="hero-section">
        <div className="hero-content">
          <h2>技术选型，一目了然</h2>
          <p>
            帮助独立开发者和小型团队快速对比技术方案，统一视图投票决策
          </p>
          <button className="hero-btn ripple" onClick={onCreate}>
            + 创建对比项目
          </button>
        </div>
      </section>

      <section className="projects-section">
        <h3 className="section-title">最近项目</h3>
        {projectList.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <p>还没有项目，创建你的第一个技术对比项目吧！</p>
          </div>
        ) : (
          <div className="project-grid">
            {projectList.map((p) => (
              <div
                key={p.id}
                className="project-card ripple"
                onClick={() => onSelectProject(p.id)}
              >
                <div className="project-card-header">
                  <h4>{p.name}</h4>
                  <span className="project-date">
                    {new Date(p.createdAt).toLocaleDateString('zh-CN')}
                  </span>
                </div>
                <p className="project-desc">{p.description}</p>
                <div className="project-stats">
                  <span>方案 {p.optionCount || 0}</span>
                  <span>投票 {p.voteCount || 0}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
