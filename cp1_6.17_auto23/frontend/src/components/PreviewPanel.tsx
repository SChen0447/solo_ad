import { useState, useMemo } from 'react';
import type { ResumeData, Theme, ModuleItem, ViewMode, Project } from '../types';

interface PreviewPanelProps {
  resumeData: ResumeData;
  theme: Theme;
  moduleOrder: ModuleItem[];
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  hasData: boolean;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

function rgba(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

function getInitial(name: string): string {
  if (!name) return '?';
  const trim = name.trim();
  if (/^[\u4e00-\u9fa5]/.test(trim)) {
    return trim.charAt(0);
  }
  const parts = trim.split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  }
  return trim.charAt(0).toUpperCase();
}

function PreviewPanel({
  resumeData,
  theme,
  moduleOrder,
  viewMode,
  onViewModeChange,
  hasData,
}: PreviewPanelProps) {
  const [expandedProjects, setExpandedProjects] = useState<Set<number>>(new Set());

  const toggleProject = (index: number) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const previewStyle = useMemo(
    () => ({
      backgroundColor: theme.background,
    }),
    [theme.background]
  );

  const sidebarStyle = useMemo(
    () => ({
      backgroundColor: theme.id === 'dark' ? rgba(theme.primary, 0.15) : rgba(theme.primary, 0.08),
      color: theme.text,
    }),
    [theme]
  );

  const avatarStyle = useMemo(
    () => ({
      background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.secondary} 100%)`,
      color: '#fff',
    }),
    [theme.primary, theme.secondary]
  );

  const sectionTitleStyle = useMemo(
    () => ({
      color: theme.primary,
      borderColor: rgba(theme.primary, 0.3),
    }),
    [theme.primary]
  );

  const cardStyle = useMemo(
    () => ({
      backgroundColor: theme.cardBg,
      border: `1px solid ${theme.border}`,
      boxShadow: theme.shadow,
      borderRadius: theme.borderRadius,
    }),
    [theme]
  );

  const skillTagStyle = useMemo(
    () => ({
      backgroundColor: rgba(theme.primary, 0.1),
      color: theme.primary,
      border: `1px solid ${rgba(theme.primary, 0.2)}`,
    }),
    [theme.primary]
  );

  const techTagStyle = useMemo(
    () => ({
      backgroundColor: rgba(theme.secondary, 0.15),
      color: theme.secondary,
    }),
    [theme.secondary]
  );

  const highlightStyle = useMemo(
    () => ({
      backgroundColor: rgba(theme.accent, 0.1),
      borderLeft: `3px solid ${theme.accent}`,
      color: theme.text,
    }),
    [theme.accent, theme.text]
  );

  const timelineStyle = useMemo(
    () => ({
      lineColor: rgba(theme.primary, 0.2),
      dotColor: theme.primary,
    }),
    [theme.primary]
  );

  const enabledModules = moduleOrder.filter((m) => m.enabled);

  if (!hasData) {
    return (
      <div className="preview-panel" style={previewStyle}>
        <div className="preview-toolbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                fontSize: '13px',
                color: '#6b7280',
                fontWeight: 500,
              }}
            >
              预览模式
            </span>
            <div className="view-mode-toggle">
              <button
                className={`view-mode-btn ${viewMode === 'desktop' ? 'active' : ''}`}
                onClick={() => onViewModeChange('desktop')}
              >
                🖥️ 桌面
              </button>
              <button
                className={`view-mode-btn ${viewMode === 'mobile' ? 'active' : ''}`}
                onClick={() => onViewModeChange('mobile')}
              >
                📱 移动
              </button>
            </div>
          </div>
        </div>
        <div className="preview-container">
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3>等待简历解析</h3>
            <p>
              请在左侧控制面板粘贴您的简历文本，点击「解析简历」按钮。解析完成后，精美的交互式简历将在这里实时展示。
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="preview-panel" style={previewStyle}>
      <div className="preview-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span
            style={{
              fontSize: '13px',
              color: '#6b7280',
              fontWeight: 500,
            }}
          >
            预览模式
          </span>
          <div className="view-mode-toggle">
            <button
              className={`view-mode-btn ${viewMode === 'desktop' ? 'active' : ''}`}
              onClick={() => onViewModeChange('desktop')}
            >
              🖥️ 桌面
            </button>
            <button
              className={`view-mode-btn ${viewMode === 'mobile' ? 'active' : ''}`}
              onClick={() => onViewModeChange('mobile')}
            >
              📱 移动
            </button>
          </div>
        </div>
        <div style={{ fontSize: '12px', color: '#9ca3af' }}>
          当前主题: <span style={{ color: theme.primary, fontWeight: 600 }}>{theme.name}</span>
        </div>
      </div>
      <div className="preview-container">
        <div
          className={`resume-wrapper ${viewMode} ${viewMode === 'mobile' ? 'mobile-layout' : ''}`}
        >
          <div
            className="resume-page"
            style={{
              backgroundColor: theme.id === 'dark' ? theme.background : '#fff',
              borderRadius: viewMode === 'mobile' ? '0' : theme.borderRadius,
            }}
          >
            <div className="resume-sidebar" style={sidebarStyle}>
              <div>
                <div className="avatar-placeholder" style={avatarStyle}>
                  {getInitial(resumeData.personalInfo.name)}
                </div>
                <div className="sidebar-name" style={{ color: theme.text }}>
                  {resumeData.personalInfo.name || '求职者'}
                </div>
                <div
                  className="sidebar-title"
                  style={{ color: rgba(theme.text, 0.7) }}
                >
                  {resumeData.personalInfo.title || '待补充'}
                </div>
              </div>

              <div className="contact-list">
                {resumeData.personalInfo.phone && (
                  <div className="contact-item" style={{ color: theme.text }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                      />
                    </svg>
                    {resumeData.personalInfo.phone}
                  </div>
                )}
                {resumeData.personalInfo.email && (
                  <div className="contact-item" style={{ color: theme.text }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                    {resumeData.personalInfo.email}
                  </div>
                )}
                {resumeData.personalInfo.address && (
                  <div className="contact-item" style={{ color: theme.text }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    {resumeData.personalInfo.address}
                  </div>
                )}
                {resumeData.personalInfo.age && (
                  <div className="contact-item" style={{ color: theme.text }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    {resumeData.personalInfo.age} 岁
                  </div>
                )}
              </div>

              {enabledModules.some((m) => m.key === 'skills') && resumeData.skills.length > 0 && (
                <div>
                  <div className="section-title" style={sectionTitleStyle}>
                    技能标签
                  </div>
                  <div className="skills-cloud">
                    {resumeData.skills.map((skill, idx) => (
                      <span key={idx} className="skill-tag" style={skillTagStyle}>
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="resume-main" style={{ color: theme.text }}>
              {enabledModules.map((module) => {
                if (module.key === 'workExperience' && resumeData.workExperience.length > 0) {
                  return (
                    <section key={module.id}>
                      <div className="section-title" style={sectionTitleStyle}>
                        工作经历
                      </div>
                      <div className="timeline-section">
                        {resumeData.workExperience.map((work, idx) => (
                          <div
                            key={idx}
                            className="timeline-item"
                            style={
                              {
                                '--timeline-line-color': timelineStyle.lineColor,
                                '--timeline-dot-color': timelineStyle.dotColor,
                              } as React.CSSProperties
                            }
                          >
                            <div
                              style={{
                                position: 'absolute',
                                left: 0,
                                top: '6px',
                                bottom: '-10px',
                                width: '2px',
                                backgroundColor: timelineStyle.lineColor,
                                ...(idx === resumeData.workExperience.length - 1
                                  ? { bottom: 'auto', height: '12px' }
                                  : {}),
                              }}
                            />
                            <div
                              style={{
                                position: 'absolute',
                                left: '-4px',
                                top: '4px',
                                width: '10px',
                                height: '10px',
                                borderRadius: '50%',
                                backgroundColor: timelineStyle.dotColor,
                              }}
                            />
                            <div className="card" style={cardStyle}>
                              <div className="card-header">
                                <div>
                                  <div className="card-title" style={{ color: theme.text }}>
                                    {work.company || '公司名称'}
                                  </div>
                                  <div
                                    className="card-subtitle"
                                    style={{ color: theme.secondary }}
                                  >
                                    {work.position || '职位'}
                                  </div>
                                </div>
                                <div
                                  className="card-date"
                                  style={{ color: theme.textSecondary }}
                                >
                                  {work.startDate || ''}
                                  {(work.startDate || work.endDate) && ' - '}
                                  {work.endDate || ''}
                                </div>
                              </div>
                              {work.description && work.description.length > 0 && (
                                <div className="card-description">
                                  <ul>
                                    {work.description.map((desc, i) => (
                                      <li key={i} style={{ color: theme.text }}>
                                        {desc}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {work.highlights && work.highlights.length > 0 && (
                                <div
                                  className="highlights-section"
                                  style={{ borderColor: rgba(theme.accent, 0.3) }}
                                >
                                  <div
                                    className="highlights-title"
                                    style={{ color: theme.accent }}
                                  >
                                    ✨ 成果亮点
                                  </div>
                                  <div className="highlights-list">
                                    {work.highlights.map((hl, i) => (
                                      <div
                                        key={i}
                                        className="highlight-item"
                                        style={highlightStyle}
                                      >
                                        {hl}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  );
                }

                if (module.key === 'education' && resumeData.education.length > 0) {
                  return (
                    <section key={module.id}>
                      <div className="section-title" style={sectionTitleStyle}>
                        教育背景
                      </div>
                      <div className="timeline-section">
                        {resumeData.education.map((edu, idx) => (
                          <div key={idx} className="timeline-item">
                            <div
                              style={{
                                position: 'absolute',
                                left: 0,
                                top: '6px',
                                bottom: '-10px',
                                width: '2px',
                                backgroundColor: timelineStyle.lineColor,
                                ...(idx === resumeData.education.length - 1
                                  ? { bottom: 'auto', height: '12px' }
                                  : {}),
                              }}
                            />
                            <div
                              style={{
                                position: 'absolute',
                                left: '-4px',
                                top: '4px',
                                width: '10px',
                                height: '10px',
                                borderRadius: '50%',
                                backgroundColor: timelineStyle.dotColor,
                              }}
                            />
                            <div className="education-card" style={cardStyle}>
                              <div className="education-header">
                                <div>
                                  <div className="school-name" style={{ color: theme.text }}>
                                    {edu.school || '学校名称'}
                                  </div>
                                  <div
                                    className="degree-info"
                                    style={{ color: theme.secondary }}
                                  >
                                    {[edu.degree, edu.major].filter(Boolean).join(' · ')}
                                  </div>
                                </div>
                                <div
                                  className="card-date"
                                  style={{ color: theme.textSecondary }}
                                >
                                  {edu.startDate || ''}
                                  {(edu.startDate || edu.endDate) && ' - '}
                                  {edu.endDate || ''}
                                </div>
                              </div>
                              {edu.description && (
                                <div
                                  style={{
                                    fontSize: '13px',
                                    color: rgba(theme.text, 0.8),
                                    lineHeight: 1.6,
                                  }}
                                >
                                  {edu.description}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  );
                }

                if (module.key === 'projects' && resumeData.projects.length > 0) {
                  return (
                    <section key={module.id}>
                      <div className="section-title" style={sectionTitleStyle}>
                        项目经历
                      </div>
                      <div className="projects-grid">
                        {resumeData.projects.map((project: Project, idx: number) => {
                          const isExpanded = expandedProjects.has(idx);
                          return (
                            <div
                              key={idx}
                              className={`project-card ${isExpanded ? 'expanded' : ''}`}
                              style={cardStyle}
                              onClick={() => toggleProject(idx)}
                            >
                              <div className="project-header">
                                <div>
                                  <div className="project-name" style={{ color: theme.text }}>
                                    {project.name || '项目名称'}
                                  </div>
                                  <div
                                    className="project-role"
                                    style={{ color: theme.secondary }}
                                  >
                                    {project.role || ''}
                                  </div>
                                  <div
                                    className="card-date"
                                    style={{
                                      color: theme.textSecondary,
                                      marginTop: '4px',
                                    }}
                                  >
                                    {project.startDate || ''}
                                    {(project.startDate || project.endDate) && ' - '}
                                    {project.endDate || ''}
                                  </div>
                                </div>
                                <svg
                                  className={`expand-icon ${isExpanded ? 'expanded' : ''}`}
                                  width="20"
                                  height="20"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke={theme.secondary}
                                  strokeWidth="2"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M19 9l-7 7-7-7"
                                  />
                                </svg>
                              </div>

                              {project.techStack && project.techStack.length > 0 && (
                                <div className="project-tech">
                                  {project.techStack.map((tech, i) => (
                                    <span key={i} className="tech-tag" style={techTagStyle}>
                                      {tech}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {isExpanded && project.description && (
                                <div
                                  className="project-details"
                                  style={{
                                    borderColor: theme.border,
                                  }}
                                >
                                  <div
                                    style={{
                                      fontSize: '13px',
                                      fontWeight: 600,
                                      color: theme.primary,
                                      marginBottom: '10px',
                                    }}
                                  >
                                    项目详情
                                  </div>
                                  <ul
                                    style={{
                                      listStyle: 'none',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '8px',
                                    }}
                                  >
                                    {project.description.map((desc, i) => (
                                      <li
                                        key={i}
                                        style={{
                                          fontSize: '13px',
                                          lineHeight: 1.6,
                                          paddingLeft: '14px',
                                          position: 'relative',
                                          color: rgba(theme.text, 0.85),
                                        }}
                                      >
                                        <span
                                          style={{
                                            position: 'absolute',
                                            left: 0,
                                            color: theme.primary,
                                            fontWeight: 700,
                                          }}
                                        >
                                          •
                                        </span>
                                        {desc}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {!isExpanded &&
                                project.description &&
                                project.description.length > 0 && (
                                  <div
                                    style={{
                                      fontSize: '12px',
                                      color: rgba(theme.text, 0.5),
                                      marginTop: '8px',
                                      fontStyle: 'italic',
                                    }}
                                  >
                                    点击展开详情 →
                                  </div>
                                )}
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  );
                }

                return null;
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PreviewPanel;
