import { useState, useCallback, useEffect, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Project, ProjectStatus, User, Conflict, Version } from '../types';
import { detectConflicts, getRandomColor, generateVersionSummary } from '../utils/conflict';
import { loadProjects, saveProjects, saveProject, deleteProject as deleteProjectFromStorage } from '../utils/storage';
import { useVersion } from './useVersion';

const DEFAULT_CODE = `.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 20px;
}

.title {
  font-size: 24px;
  font-weight: bold;
  color: #333;
  margin-bottom: 16px;
}

.button {
  padding: 8px 16px;
  border-radius: 4px;
  background-color: #00D4FF;
  color: white;
  border: none;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.button:hover {
  background-color: #00A3CC;
}
`;

export function useProject() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [currentCode, setCurrentCode] = useState<string>('');
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [showConflictNotification, setShowConflictNotification] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const versionHook = useVersion([]);

  useEffect(() => {
    const saved = loadProjects();
    if (saved.length === 0) {
      const mockProjects = createMockProjects();
      setProjects(mockProjects);
      saveProjects(mockProjects);
    } else {
      setProjects(saved);
    }
    setIsLoading(false);
  }, []);

  const createMockProjects = (): Project[] => {
    const now = new Date();
    const projects: Project[] = [];

    const mockData = [
      {
        name: '按钮样式库',
        description: '团队统一的按钮组件样式集合，包含主按钮、次按钮、禁用状态等',
        status: 'latest' as ProjectStatus,
        daysAgo: 1,
        code: `.btn-primary {
  padding: 10px 20px;
  background: #00D4FF;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary:hover {
  background: #00A3CC;
  transform: translateY(-1px);
}

.btn-secondary {
  padding: 10px 20px;
  background: transparent;
  color: #00D4FF;
  border: 2px solid #00D4FF;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
`,
      },
      {
        name: '卡片组件',
        description: '可复用的卡片容器样式，支持阴影、悬停效果和多种尺寸',
        status: 'modified' as ProjectStatus,
        daysAgo: 3,
        code: `.card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  padding: 24px;
  transition: box-shadow 0.3s ease;
}

.card:hover {
  box-shadow: 0 4px 16px rgba(0,0,0,0.15);
}

.card-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 12px;
}

.card-content {
  font-size: 14px;
  color: #666;
  line-height: 1.6;
}
`,
      },
      {
        name: '表单输入框',
        description: '表单输入控件样式集合，含验证状态和焦点效果',
        status: 'conflict' as ProjectStatus,
        daysAgo: 7,
        code: `.input {
  width: 100%;
  padding: 10px 12px;
  border: 2px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.2s ease;
}

.input:focus {
  outline: none;
  border-color: #00D4FF;
  box-shadow: 0 0 0 3px rgba(0,212,255,0.2);
}

.input-error {
  border-color: #FF6B6B;
}

.input-success {
  border-color: #98C379;
}

.input-label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  color: #333;
}
`,
      },
    ];

    mockData.forEach((mock, index) => {
      const projectId = uuidv4();
      const createdAt = new Date(now.getTime() - mock.daysAgo * 24 * 60 * 60 * 1000);
      const versions = createMockVersions(mock.code, 3 + index, createdAt);
      
      projects.push({
        id: projectId,
        name: mock.name,
        description: mock.description,
        createdAt: createdAt.toISOString(),
        updatedAt: new Date(createdAt.getTime() + (mock.daysAgo * 12 * 60 * 60 * 1000)).toISOString(),
        status: mock.status,
        collaborators: [
          { id: 'me', name: '我', color: '#00D4FF' },
          { id: uuidv4(), name: '张三', color: getRandomColor() },
        ],
        currentCode: mock.code,
        hasUnsavedChanges: mock.status === 'modified',
        versions,
      });
    });

    return projects;
  };

  const createMockVersions = (code: string, count: number, startDate: Date): Version[] => {
    const versions: Version[] = [];
    let currentCode = code;

    for (let i = 0; i < count; i++) {
      const timestamp = new Date(startDate.getTime() + i * 6 * 60 * 60 * 1000);
      
      if (i > 0) {
        const lines = currentCode.split('\n');
        const randomLine = Math.floor(Math.random() * Math.max(1, lines.length - 1));
        lines[randomLine] = lines[randomLine] + ` /* v${i + 1} update */`;
        currentCode = lines.join('\n');
      }

      versions.push({
        id: uuidv4(),
        versionNumber: i + 1,
        code: currentCode,
        timestamp: timestamp.toISOString(),
        summary: generateVersionSummary(currentCode),
        status: i === count - 1 ? 'latest' : 'normal',
        createdBy: i === 0 ? 'me' : (Math.random() > 0.5 ? 'me' : 'other'),
      });
    }

    return versions;
  };

  const currentProject = useMemo(() => {
    if (!currentProjectId) return null;
    return projects.find(p => p.id === currentProjectId) || null;
  }, [projects, currentProjectId]);

  const selectProject = useCallback((projectId: string | null) => {
    setCurrentProjectId(projectId);
    if (projectId) {
      const project = projects.find(p => p.id === projectId);
      if (project) {
        setCurrentCode(project.currentCode);
        versionHook.setVersionsList(project.versions);
        setConflicts([]);
        setShowConflictNotification(false);
      }
    }
  }, [projects, versionHook]);

  const createProject = useCallback((name: string, description: string): Project => {
    const now = new Date().toISOString();
    const newProject: Project = {
      id: uuidv4(),
      name,
      description,
      createdAt: now,
      updatedAt: now,
      status: 'latest',
      collaborators: [{ id: 'me', name: '我', color: '#00D4FF' }],
      currentCode: DEFAULT_CODE,
      hasUnsavedChanges: false,
      versions: [],
    };

    setProjects(prev => {
      const updated = [...prev, newProject];
      saveProjects(updated);
      return updated;
    });

    return newProject;
  }, []);

  const updateCode = useCallback((code: string) => {
    setCurrentCode(code);
    
    if (currentProjectId) {
      setProjects(prev => prev.map(p => {
        if (p.id === currentProjectId) {
          const hasChanges = code !== (p.versions.length > 0 ? p.versions[p.versions.length - 1].code : '');
          return {
            ...p,
            currentCode: code,
            hasUnsavedChanges: hasChanges,
            status: hasChanges ? 'modified' : (conflicts.length > 0 ? 'conflict' : 'latest'),
            updatedAt: new Date().toISOString(),
          };
        }
        return p;
      }));
    }
  }, [currentProjectId, conflicts.length]);

  const saveCurrentCode = useCallback(() => {
    if (!currentProjectId) return null;

    const newVersion = versionHook.createVersion(currentCode, 'me');
    
    setProjects(prev => {
      const updated = prev.map(p => {
        if (p.id === currentProjectId) {
          const newVersions = [...p.versions.map(v => ({
            ...v,
            status: v.status === 'latest' ? 'normal' as const : v.status,
          })), newVersion];
          
          const updatedProject = {
            ...p,
            currentCode,
            hasUnsavedChanges: false,
            status: 'latest' as ProjectStatus,
            versions: newVersions,
            updatedAt: new Date().toISOString(),
          };
          
          saveProject(updatedProject);
          return updatedProject;
        }
        return p;
      });
      return updated;
    });

    return newVersion;
  }, [currentProjectId, currentCode, versionHook]);

  const addCollaborator = useCallback((name: string): User => {
    const newUser: User = {
      id: uuidv4(),
      name,
      color: getRandomColor(),
    };

    if (currentProjectId) {
      setProjects(prev => prev.map(p => {
        if (p.id === currentProjectId) {
          return {
            ...p,
            collaborators: [...p.collaborators, newUser],
          };
        }
        return p;
      }));
    }

    return newUser;
  }, [currentProjectId]);

  const simulateConflict = useCallback(() => {
    if (!currentProjectId) return;

    const project = projects.find(p => p.id === currentProjectId);
    if (!project) return;

    const otherUser = project.collaborators.find(c => c.id !== 'me');
    if (!otherUser) return;

    const lines = currentCode.split('\n');
    const remoteCode = lines.map((line, idx) => {
      if (idx === 2 || idx === 5) {
        return line + ' /* remote edit */';
      }
      return line;
    }).join('\n');

    const detectedConflicts = detectConflicts(
      project.versions.length > 0 ? project.versions[project.versions.length - 1].code : '',
      currentCode,
      remoteCode,
      otherUser
    );

    if (detectedConflicts.length > 0) {
      setConflicts(detectedConflicts);
      setShowConflictNotification(true);
      
      setProjects(prev => prev.map(p => {
        if (p.id === currentProjectId) {
          return {
            ...p,
            status: 'conflict',
          };
        }
        return p;
      }));
    }
  }, [currentProjectId, currentCode, projects]);

  const resolveConflict = useCallback((resolution: 'mine' | 'theirs' | 'merge') => {
    if (!currentProjectId) return;

    setConflicts([]);
    setShowConflictNotification(false);
    
    setProjects(prev => prev.map(p => {
      if (p.id === currentProjectId) {
        return {
          ...p,
          status: p.hasUnsavedChanges ? 'modified' : 'latest',
        };
      }
      return p;
    }));
  }, [currentProjectId]);

  const closeConflictNotification = useCallback(() => {
    setShowConflictNotification(false);
  }, []);

  const deleteProject = useCallback((projectId: string) => {
    setProjects(prev => {
      const updated = prev.filter(p => p.id !== projectId);
      deleteProjectFromStorage(projectId);
      return updated;
    });
    
    if (currentProjectId === projectId) {
      setCurrentProjectId(null);
      setCurrentCode('');
      setConflicts([]);
    }
  }, [currentProjectId]);

  const rollbackToVersion = useCallback((versionId: string) => {
    const version = versionHook.getVersionById(versionId);
    if (!version) return;
    
    setCurrentCode(version.code);
    versionHook.selectVersion(null);
    
    if (currentProjectId) {
      setProjects(prev => prev.map(p => {
        if (p.id === currentProjectId) {
          return {
            ...p,
            currentCode: version.code,
            hasUnsavedChanges: true,
            status: 'modified',
          };
        }
        return p;
      }));
    }
  }, [currentProjectId, versionHook]);

  const generateInviteLink = useCallback((): string => {
    if (!currentProjectId) return '';
    return `${window.location.origin}/invite/${currentProjectId}?token=${uuidv4()}`;
  }, [currentProjectId]);

  return {
    projects,
    currentProject,
    currentProjectId,
    currentCode,
    conflicts,
    showConflictNotification,
    isLoading,
    versionHook,
    selectProject,
    createProject,
    updateCode,
    saveCurrentCode,
    addCollaborator,
    simulateConflict,
    resolveConflict,
    closeConflictNotification,
    deleteProject,
    rollbackToVersion,
    generateInviteLink,
  };
}
