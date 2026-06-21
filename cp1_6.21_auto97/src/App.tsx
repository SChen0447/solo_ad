import { useState, useCallback, useMemo } from 'react';
import { ArrowLeft, Save, Users, Copy, AlertTriangle, GitCompare } from 'lucide-react';
import { useProject } from './modules/version/hooks/useProject';
import { ProjectCard, AddProjectCard } from './modules/ui/components/ProjectCard';
import { VersionTimeline } from './modules/ui/components/VersionTimeline';
import { DiffViewer } from './modules/ui/components/DiffViewer';
import { CodeEditor } from './modules/ui/components/CodeEditor';
import { ConflictNotificationBar } from './modules/ui/components/NotificationBar';
import { Version } from './modules/version/types';
import './App.css';

function App() {
  const {
    projects,
    currentProject,
    currentProjectId,
    currentCode,
    conflicts,
    showConflictNotification,
    versionHook,
    selectProject,
    createProject,
    updateCode,
    saveCurrentCode,
    simulateConflict,
    resolveConflict,
    closeConflictNotification,
    rollbackToVersion,
    generateInviteLink,
    addCollaborator,
  } = useProject();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [showDiffView, setShowDiffView] = useState(false);
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCreateProject = useCallback(() => {
    if (newProjectName.trim()) {
      const project = createProject(newProjectName.trim(), newProjectDesc.trim());
      setShowCreateModal(false);
      setNewProjectName('');
      setNewProjectDesc('');
      selectProject(project.id);
    }
  }, [createProject, newProjectName, newProjectDesc, selectProject]);

  const handleBack = useCallback(() => {
    selectProject(null);
    setShowDiffView(false);
    setIsCompareMode(false);
    versionHook.clearCompareSelection();
    versionHook.selectVersion(null);
  }, [selectProject, versionHook]);

  const handleSave = useCallback(() => {
    saveCurrentCode();
  }, [saveCurrentCode]);

  const handleCodeChange = useCallback((code: string) => {
    updateCode(code);
  }, [updateCode]);

  const handleSelectVersion = useCallback((versionId: string | null) => {
    versionHook.selectVersion(versionId);
  }, [versionHook]);

  const handleStartCompare = useCallback(() => {
    if (versionHook.compareVersionIds.length === 2) {
      setShowDiffView(true);
      setIsCompareMode(false);
    }
  }, [versionHook.compareVersionIds.length]);

  const handleToggleCompareMode = useCallback(() => {
    setIsCompareMode(!isCompareMode);
    versionHook.clearCompareSelection();
  }, [isCompareMode, versionHook]);

  const handleCloseDiffView = useCallback(() => {
    setShowDiffView(false);
    versionHook.clearCompareSelection();
  }, [versionHook]);

  const compareVersions = useMemo(() => {
    if (versionHook.compareVersionIds.length !== 2) return { left: null, right: null };
    const left = versionHook.getVersionById(versionHook.compareVersionIds[0]) || null;
    const right = versionHook.getVersionById(versionHook.compareVersionIds[1]) || null;
    return { left, right };
  }, [versionHook]);

  const displayCode = useMemo(() => {
    if (versionHook.isViewingOldVersion && versionHook.currentVersion) {
      return versionHook.currentVersion.code;
    }
    return currentCode;
  }, [currentCode, versionHook.isViewingOldVersion, versionHook.currentVersion]);

  const isReadOnly = useMemo(() => {
    return versionHook.isViewingOldVersion || showDiffView;
  }, [versionHook.isViewingOldVersion, showDiffView]);

  const handleCopyInviteLink = useCallback(() => {
    const link = generateInviteLink();
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [generateInviteLink]);

  const handleSimulateCollaborator = useCallback(() => {
    addCollaborator('李四');
    simulateConflict();
    setShowInviteModal(false);
  }, [addCollaborator, simulateConflict]);

  if (!currentProjectId) {
    return (
      <div className="app">
        <div className="home-page">
          <div className="home-header">
            <h1 className="home-title">CSSnippet</h1>
            <p className="home-subtitle">CSS 代码片段协作编辑与版本管理工具</p>
          </div>
          
          <div className="projects-grid">
            {projects.map(project => (
              <ProjectCard
                key={project.id}
                project={project}
                onClick={() => selectProject(project.id)}
              />
            ))}
            <AddProjectCard onClick={() => setShowCreateModal(true)} />
          </div>
        </div>

        {showCreateModal && (
          <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <h2 className="modal-title">新建项目</h2>
              <div className="modal-form">
                <div className="form-group">
                  <label className="form-label">项目名称</label>
                  <input
                    className="form-input"
                    type="text"
                    placeholder="输入项目名称"
                    value={newProjectName}
                    onChange={e => setNewProjectName(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">项目描述</label>
                  <textarea
                    className="form-textarea"
                    placeholder="描述这个项目的用途..."
                    value={newProjectDesc}
                    onChange={e => setNewProjectDesc(e.target.value)}
                  />
                </div>
                <div className="modal-actions">
                  <button 
                    className="modal-btn secondary"
                    onClick={() => setShowCreateModal(false)}
                  >
                    取消
                  </button>
                  <button 
                    className="modal-btn primary"
                    onClick={handleCreateProject}
                    disabled={!newProjectName.trim()}
                  >
                    创建
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="app">
      <div className="editor-page">
        <VersionTimeline
          versions={versionHook.versions}
          selectedVersionId={versionHook.selectedVersionId}
          compareVersionIds={versionHook.compareVersionIds}
          isCompareMode={isCompareMode}
          onSelectVersion={handleSelectVersion}
          onToggleCompare={versionHook.toggleCompareVersion}
          onStartCompare={handleStartCompare}
          onCancelCompare={handleToggleCompareMode}
        />
        
        <div className="editor-main">
          <div className="editor-header">
            <div className="editor-header-left">
              <button className="back-btn" onClick={handleBack}>
                <ArrowLeft size={20} />
              </button>
              <h1 className="editor-title">{currentProject?.name}</h1>
            </div>
            
            <div className="editor-header-right">
              <div className="header-avatars">
                {currentProject?.collaborators.slice(0, 3).map((user, idx) => (
                  <div
                    key={user.id}
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: user.color,
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: 600,
                      marginLeft: idx > 0 ? '-8px' : '0',
                      border: '2px solid var(--bg-primary)',
                      zIndex: 3 - idx,
                    }}
                    title={user.name}
                  >
                    {user.name === '我' ? '我' : user.name.charAt(0)}
                  </div>
                ))}
              </div>
              
              <button 
                className="invite-btn"
                onClick={() => setShowInviteModal(true)}
              >
                <Users size={14} />
                <span>邀请协作</span>
              </button>
              
              {!showDiffView && !versionHook.isViewingOldVersion && (
                <button 
                  className={`save-btn ${currentProject?.hasUnsavedChanges ? 'unsaved' : ''}`}
                  onClick={handleSave}
                  disabled={!currentProject?.hasUnsavedChanges}
                >
                  <Save size={14} />
                  保存
                </button>
              )}
            </div>
          </div>
          
          {versionHook.isViewingOldVersion && versionHook.currentVersion && (
            <div className="version-warning-bar">
              <AlertTriangle size={16} />
              当前查看版本 v{versionHook.currentVersion.versionNumber}（只读模式）
              <button onClick={() => {
                rollbackToVersion(versionHook.currentVersion!.id);
              }}>
                回滚到此版本
              </button>
              <button onClick={() => versionHook.selectVersion(null)}>
                返回编辑
              </button>
            </div>
          )}
          
          <div className="editor-content">
            {showDiffView ? (
              <div className="diff-view-container">
                <DiffViewer
                  leftVersion={compareVersions.left as Version | null}
                  rightVersion={compareVersions.right as Version | null}
                  onClose={handleCloseDiffView}
                />
              </div>
            ) : (
              <CodeEditor
                code={displayCode}
                onChange={handleCodeChange}
                readOnly={isReadOnly}
                language="css"
              />
            )}
          </div>
        </div>
      </div>

      <ConflictNotificationBar
        conflicts={conflicts}
        visible={showConflictNotification}
        onClose={closeConflictNotification}
        onResolveMine={() => resolveConflict('mine')}
        onResolveTheirs={() => resolveConflict('theirs')}
        onRollback={(v) => {
          if (versionHook.latestVersion) {
            rollbackToVersion(versionHook.latestVersion.id);
          }
        }}
      />

      {showInviteModal && (
        <div className="modal-overlay" onClick={() => setShowInviteModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">
              <Users size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
              邀请协作者
            </h2>
            <div className="modal-form">
              <div className="form-group">
                <label className="form-label">邀请链接</label>
                <div className="invite-link-box">
                  <div className="invite-link-input">{generateInviteLink()}</div>
                  <button className="copy-btn" onClick={handleCopyInviteLink}>
                    <Copy size={14} style={{ marginRight: '4px' }} />
                    {copied ? '已复制' : '复制'}
                  </button>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                  分享此链接给团队成员，他们即可加入项目协作。
                </p>
              </div>
              
              <button 
                className="simulate-btn"
                onClick={handleSimulateCollaborator}
              >
                模拟协作者编辑（演示冲突）
              </button>
              
              <div className="modal-actions">
                <button 
                  className="modal-btn secondary"
                  onClick={() => setShowInviteModal(false)}
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
