import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Project, User, ProjectStatus } from '../../version/types';
import '../styles/ProjectCard.css';

interface ProjectCardProps {
  project: Project;
  onClick: () => void;
}

interface AddProjectCardProps {
  onClick: () => void;
}

const statusLabels: Record<ProjectStatus, string> = {
  latest: '最新',
  modified: '已修改',
  conflict: '有冲突',
};

function getInitials(name: string): string {
  if (name === '我') return '我';
  return name.charAt(0).toUpperCase();
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project, onClick }) => {
  const displayAvatars = project.collaborators.slice(0, 3);
  const extraCount = project.collaborators.length - 3;

  return (
    <div
      className={`project-card status-${project.status}`}
      onClick={onClick}
    >
      <div className="status-bar" />
      <div className="project-card-header">
        <h3 className="project-card-title" title={project.name}>
          {project.name}
        </h3>
        <div className="project-card-avatars">
          <div className="avatar-stack">
            {displayAvatars.map((user: User) => (
              <div
                key={user.id}
                className="avatar-item"
                style={{ backgroundColor: user.color }}
                title={user.name}
              >
                {getInitials(user.name)}
              </div>
            ))}
            {extraCount > 0 && (
              <div className="avatar-item avatar-more" title={`还有${extraCount}人`}>
                +{extraCount}
              </div>
            )}
          </div>
        </div>
      </div>
      <p className="project-card-description">{project.description}</p>
      <div className="project-card-footer">
        <div className="project-card-status">
          <span className={`status-dot ${project.status}`} />
          <span>{statusLabels[project.status]}</span>
        </div>
        <div className="project-card-meta">
          <span className="meta-item">
            {formatDistanceToNow(new Date(project.updatedAt), { 
              addSuffix: true,
              locale: zhCN 
            })}
          </span>
        </div>
      </div>
    </div>
  );
};

export const AddProjectCard: React.FC<AddProjectCardProps> = ({ onClick }) => {
  return (
    <div className="project-card add-card" onClick={onClick}>
      <span className="add-icon">+</span>
      <span className="add-text">新建项目</span>
    </div>
  );
};

export default ProjectCard;
