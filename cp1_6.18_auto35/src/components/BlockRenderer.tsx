import React from 'react';
import { Block, PersonalInfoData, ExperienceItem, EducationItem, SkillItem, ProjectItem, BlockData } from '../types';

interface BlockRendererProps {
  block: Block;
}

const renderPersonalBlock = (data: PersonalInfoData) => (
  <div className="personal-block">
    <h1 className="personal-name">{data.name || '你的姓名'}</h1>
    <div className="personal-title">{data.title || '职位头衔'}</div>
    <div className="personal-contact">
      {data.email && (
        <span className="personal-contact-item">📧 {data.email}</span>
      )}
      {data.phone && (
        <span className="personal-contact-item">📱 {data.phone}</span>
      )}
      {data.location && (
        <span className="personal-contact-item">📍 {data.location}</span>
      )}
    </div>
    {data.summary && <p className="personal-summary">{data.summary}</p>}
  </div>
);

const renderExperienceItems = (items: ExperienceItem[]) => (
  <div className="item-list">
    {items.map((item) => (
      <div key={item.id} className="item-block">
        <div className="item-header">
          <div>
            <div className="item-title">{item.company}</div>
            <div className="item-subtitle">{item.position}</div>
          </div>
          <div className="item-date">{item.startDate} - {item.endDate}</div>
        </div>
        <div className="item-description">{item.description}</div>
      </div>
    ))}
  </div>
);

const renderEducationItems = (items: EducationItem[]) => (
  <div className="item-list">
    {items.map((item) => (
      <div key={item.id} className="item-block">
        <div className="item-header">
          <div>
            <div className="item-title">{item.school}</div>
            <div className="item-subtitle">
              {item.degree} · {item.major}
            </div>
          </div>
          <div className="item-date">{item.startDate} - {item.endDate}</div>
        </div>
        {item.description && (
          <div className="item-description">{item.description}</div>
        )}
      </div>
    ))}
  </div>
);

const renderSkillItems = (items: SkillItem[]) => (
  <div className="skills-container">
    {items.map((skill) => (
      <div key={skill.id} className="skill-tag">
        <span className="skill-name">{skill.name}</span>
        {typeof skill.level === 'number' && (
          <div className="skill-level-bar">
            <div
              className="skill-level-fill"
              style={{ width: `${Math.min(100, Math.max(0, skill.level))}%` }}
            />
          </div>
        )}
      </div>
    ))}
  </div>
);

const renderProjectItems = (items: ProjectItem[]) => (
  <div className="item-list">
    {items.map((item) => (
      <div key={item.id} className="item-block">
        <div className="item-header">
          <div>
            <div className="item-title">
              {item.link ? (
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: 'inherit',
                    textDecoration: 'none',
                    borderBottom: '1px dashed currentColor',
                  }}
                >
                  {item.name} ↗
                </a>
              ) : (
                  item.name
                )}
            </div>
            <div className="item-subtitle">{item.role}</div>
          </div>
          <div className="item-date">{item.startDate} - {item.endDate}</div>
        </div>
        <div className="item-description">{item.description}</div>
      </div>
    ))}
  </div>
);

export const BlockRenderer: React.FC<BlockRendererProps> = ({ block }) => {
  const data = block.data as BlockData & {
    items?: ExperienceItem[] | EducationItem[] | SkillItem[] | ProjectItem[];
  };

  switch (block.type) {
    case 'personal':
      return renderPersonalBlock(data as PersonalInfoData);
    case 'experience':
      return renderExperienceItems(data.items as ExperienceItem[]);
    case 'education':
      return renderEducationItems(data.items as EducationItem[]);
    case 'skills':
      return renderSkillItems(data.items as SkillItem[]);
    case 'projects':
      return renderProjectItems(data.items as ProjectItem[]);
    default:
      return null;
  }
};

export const getBlockIcon = (type: string): string => {
  const icons: Record<string, string> = {
    personal: '👤',
    experience: '💼',
    education: '🎓',
    skills: '⚡',
    projects: '🚀',
  };
  return icons[type] || '📋';
};
