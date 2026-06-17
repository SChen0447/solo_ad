import React, { useState, useEffect, useRef } from 'react';
import type { Project, CanvasElement } from '../types';

interface ProjectPanelProps {
  projects: Project[];
  currentProjectId: string | null;
  onSelectProject: (id: string) => void;
  onCreateProject: (name: string) => void;
  onDeleteProject: (id: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  elements: CanvasElement[];
}

const ProjectPanel: React.FC<ProjectPanelProps> = ({
  projects,
  currentProjectId,
  onSelectProject,
  onCreateProject,
  onDeleteProject,
  isCollapsed,
  onToggleCollapse,
  elements,
}) => {
  const [newProjectName, setNewProjectName] = useState('');
  const [showCreateInput, setShowCreateInput] = useState(false);
  const thumbnailCanvases = useRef<Map<string, HTMLCanvasElement>>(new Map());

  const updateThumbnail = (projectId: string) => {
    const canvas = thumbnailCanvases.current.get(projectId);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#2d2d44';
    ctx.fillRect(0, 0, 200, 120);

    const padding = 10;
    const scale = Math.min(
      (200 - padding * 2) / 800,
      (120 - padding * 2) / 600
    );

    ctx.save();
    ctx.translate(padding, padding);
    ctx.scale(scale, scale);

    for (const el of elements) {
      if (el.deleted) continue;
      if (el.type === 'sticky') {
        ctx.fillStyle = el.bgColor;
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 1;
        
        const radius = 4;
        ctx.beginPath();
        ctx.moveTo(el.x + radius, el.y);
        ctx.lineTo(el.x + el.width - radius, el.y);
        ctx.quadraticCurveTo(el.x + el.width, el.y, el.x + el.width, el.y + radius);
        ctx.lineTo(el.x + el.width, el.y + el.height - radius);
        ctx.quadraticCurveTo(el.x + el.width, el.y + el.height, el.x + el.width - radius, el.y + el.height);
        ctx.lineTo(el.x + radius, el.y + el.height);
        ctx.quadraticCurveTo(el.x, el.y + el.height, el.x, el.y + el.height - radius);
        ctx.lineTo(el.x, el.y + radius);
        ctx.quadraticCurveTo(el.x, el.y, el.x + radius, el.y);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#333';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(el.text.substring(0, 20), el.x + el.width / 2, el.y + el.height / 2);
      } else if (el.type === 'stroke') {
        if (el.points.length < 2) continue;
        ctx.strokeStyle = el.color;
        ctx.lineWidth = el.thickness * 0.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(el.points[0].x, el.points[0].y);
        for (let i = 1; i < el.points.length; i++) {
          ctx.lineTo(el.points[i].x, el.points[i].y);
        }
        ctx.stroke();
      }
    }

    ctx.restore();
  };

  useEffect(() => {
    if (currentProjectId) {
      const interval = setInterval(() => {
        updateThumbnail(currentProjectId);
      }, 5000);
      
      updateThumbnail(currentProjectId);
      
      return () => clearInterval(interval);
    }
  }, [currentProjectId, elements]);

  const handleCreate = () => {
    if (newProjectName.trim()) {
      onCreateProject(newProjectName.trim());
      setNewProjectName('');
      setShowCreateInput(false);
    }
  };

  const setCanvasRef = (projectId: string, canvas: HTMLCanvasElement | null) => {
    if (canvas) {
      thumbnailCanvases.current.set(projectId, canvas);
      updateThumbnail(projectId);
    }
  };

  if (isCollapsed) {
    return (
      <div style={{
        width: 50,
        backgroundColor: '#1e1e2f',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: 10,
        transition: 'width 0.3s ease',
      }}>
        <button
          onClick={onToggleCollapse}
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            border: 'none',
            backgroundColor: 'transparent',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <i className="fas fa-bars"></i>
        </button>
      </div>
    );
  }

  return (
    <div style={{
      width: 280,
      backgroundColor: '#1e1e2f',
      display: 'flex',
      flexDirection: 'column',
      transition: 'width 0.3s ease',
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '15px 12px',
        borderBottom: '1px solid #333',
        gap: 10,
      }}>
        <button
          onClick={onToggleCollapse}
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            border: 'none',
            backgroundColor: 'transparent',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <i className="fas fa-bars"></i>
        </button>
        <span style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>项目列表</span>
      </div>

      <div style={{
        padding: '12px',
        borderBottom: '1px solid #333',
      }}>
        {showCreateInput ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="输入项目名称"
              autoFocus
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid #444',
                backgroundColor: '#2d2d44',
                color: '#fff',
                fontSize: 13,
                outline: 'none',
              }}
            />
            <button
              onClick={handleCreate}
              style={{
                padding: '8px 12px',
                borderRadius: 6,
                border: 'none',
                background: 'linear-gradient(135deg, #0f3460, #e94560)',
                color: '#fff',
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              <i className="fas fa-check"></i>
            </button>
            <button
              onClick={() => {
                setShowCreateInput(false);
                setNewProjectName('');
              }}
              style={{
                padding: '8px 12px',
                borderRadius: 6,
                border: 'none',
                backgroundColor: 'rgba(255,255,255,0.1)',
                color: '#fff',
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowCreateInput(true)}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: 8,
              border: '1px dashed #555',
              backgroundColor: 'transparent',
              color: '#aaa',
              cursor: 'pointer',
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#e94560';
              e.currentTarget.style.color = '#e94560';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#555';
              e.currentTarget.style.color = '#aaa';
            }}
          >
            <i className="fas fa-plus"></i>
            新建项目
          </button>
        )}
      </div>

      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '8px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}>
        {projects.map(project => (
          <div
            key={project.id}
            onClick={() => onSelectProject(project.id)}
            style={{
              padding: '10px',
              borderRadius: 8,
              backgroundColor: currentProjectId === project.id 
                ? 'rgba(233, 69, 96, 0.15)' 
                : 'rgba(255,255,255,0.03)',
              border: `1px solid ${currentProjectId === project.id ? '#e94560' : 'transparent'}`,
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              opacity: currentProjectId === project.id ? 1 : 0.85,
            }}
            onMouseEnter={(e) => {
              if (currentProjectId !== project.id) {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)';
                e.currentTarget.style.opacity = '1';
              }
            }}
            onMouseLeave={(e) => {
              if (currentProjectId !== project.id) {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)';
                e.currentTarget.style.opacity = '0.85';
              }
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 8,
            }}>
              <span style={{
                fontSize: 13,
                fontWeight: 500,
                color: '#fff',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: 1,
              }}>
                {project.name}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (projects.length > 1) {
                    onDeleteProject(project.id);
                  }
                }}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 4,
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: '#666',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  opacity: 0,
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '1';
                  e.currentTarget.style.backgroundColor = 'rgba(233, 69, 96, 0.2)';
                  e.currentTarget.style.color = '#e94560';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '0';
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#666';
                }}
              >
                <i className="fas fa-trash"></i>
              </button>
            </div>
            <canvas
              ref={(canvas) => setCanvasRef(project.id, canvas)}
              width={200}
              height={120}
              style={{
                width: '100%',
                height: 100,
                borderRadius: 4,
                backgroundColor: '#2d2d44',
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProjectPanel;
