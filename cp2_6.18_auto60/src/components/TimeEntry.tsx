import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  fetchProjects,
  fetchMembers,
  fetchTimeRecords,
  submitTimeRecord,
  Project,
  Member,
  TimeRecord
} from '../api';

const pageContainerStyle: React.CSSProperties = {
  display: 'flex',
  gap: 24,
  padding: 24,
  height: 'calc(100vh - 64px)',
  boxSizing: 'border-box'
};

const leftPanelStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 320,
  backgroundColor: '#fff',
  borderRadius: 12,
  padding: 20,
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
  overflowY: 'auto'
};

const rightPanelStyle: React.CSSProperties = {
  width: 360,
  flexShrink: 0,
  backgroundColor: '#fff',
  borderRadius: 12,
  padding: 24,
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
  height: 'fit-content'
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 600,
  color: '#1f2937',
  margin: '0 0 16px 0'
};

const projectGroupStyle: React.CSSProperties = {
  marginBottom: 8,
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  overflow: 'hidden'
};

const projectHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '12px 16px',
  backgroundColor: '#f9fafb',
  cursor: 'pointer',
  userSelect: 'none'
};

const projectNameStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 500,
  color: '#1f2937'
};

const expandIconStyle = (expanded: boolean): React.CSSProperties => ({
  fontSize: 12,
  color: '#6b7280',
  transition: 'transform 0.2s ease',
  transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)'
});

const memberListStyle: React.CSSProperties = {
  padding: '8px 0'
};

const memberItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  padding: '8px 16px',
  gap: 10,
  cursor: 'pointer'
};

const memberItemHoverStyle: React.CSSProperties = {
  ...memberItemStyle,
  backgroundColor: '#f9fafb'
};

const avatarStyle = (color: string): React.CSSProperties => ({
  width: 32,
  height: 32,
  borderRadius: '50%',
  backgroundColor: color,
  color: '#fff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 13,
  fontWeight: 600,
  flexShrink: 0
});

const memberNameStyle: React.CSSProperties = {
  flex: 1,
  fontSize: 14,
  color: '#1f2937'
};

const hoursBadgeStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#6b7280',
  backgroundColor: '#f3f4f6',
  padding: '2px 8px',
  borderRadius: 10
};

const formGroupStyle: React.CSSProperties = {
  marginBottom: 16
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 500,
  color: '#374151',
  marginBottom: 6
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #d1d5db',
  borderRadius: 8,
  fontSize: 14,
  color: '#1f2937',
  boxSizing: 'border-box',
  outline: 'none',
  transition: 'border-color 0.2s ease'
};

const submitButtonStyle = (disabled: boolean): React.CSSProperties => ({
  width: '100%',
  padding: '12px 16px',
  backgroundColor: disabled ? '#9ca3af' : '#3b82f6',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  fontSize: 15,
  fontWeight: 500,
  cursor: disabled ? 'not-allowed' : 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  transition: 'background-color 0.2s ease'
});

const spinnerStyle: React.CSSProperties = {
  width: 16,
  height: 16,
  border: '2px solid #fff',
  borderTopColor: 'transparent',
  borderRadius: '50%',
  animation: 'spin 0.8s linear infinite'
};

const successIconStyle: React.CSSProperties = {
  width: 20,
  height: 20,
  color: '#22c55e'
};

interface ProjectWithMembers extends Project {
  members: Member[];
}

export default function TimeEntry() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [projectMembers, setProjectMembers] = useState<Map<string, Member[]>>(new Map());
  const [todayRecords, setTodayRecords] = useState<TimeRecord[]>([]);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedMember, setSelectedMember] = useState('');
  const [selectedDate, setSelectedDate] = useState(getTodayStr());
  const [hours, setHours] = useState<number>(8);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [projectMemberRecords, setProjectMemberRecords] = useState<Map<string, Map<string, number>>>(new Map());

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (projects.length > 0 && allMembers.length > 0) {
      loadProjectMembers();
    }
  }, [projects, allMembers]);

  useEffect(() => {
    if (selectedDate) {
      loadTodayRecords();
    }
  }, [selectedDate]);

  useEffect(() => {
    if (projects.length > 0 && todayRecords.length > 0) {
      calcProjectMemberRecords();
    }
  }, [todayRecords, projects]);

  useEffect(() => {
    if (selectedProject) {
      setSelectedMember('');
    }
  }, [selectedProject]);

  function getTodayStr(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  async function loadInitialData() {
    try {
      const [projectsData, membersData] = await Promise.all([
        fetchProjects(),
        fetchMembers()
      ]);
      setProjects(projectsData);
      setAllMembers(membersData);
      if (projectsData.length > 0) {
        setExpandedProjects(new Set([projectsData[0].id]));
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  }

  async function loadProjectMembers() {
    const memberMap = new Map<string, Member[]>();
    for (const project of projects) {
      try {
        const members = await fetchMembers(project.id);
        memberMap.set(project.id, members);
      } catch (error) {
        console.error(`Failed to load members for project ${project.id}:`, error);
        memberMap.set(project.id, []);
      }
    }
    setProjectMembers(memberMap);
  }

  async function loadTodayRecords() {
    try {
      const records = await fetchTimeRecords({
        startDate: selectedDate,
        endDate: selectedDate
      });
      setTodayRecords(records);
    } catch (error) {
      console.error('Failed to load today records:', error);
    }
  }

  function calcProjectMemberRecords() {
    const result = new Map<string, Map<string, number>>();
    projects.forEach(p => {
      result.set(p.id, new Map());
    });
    todayRecords.forEach(record => {
      const projectMap = result.get(record.projectId);
      if (projectMap) {
        const current = projectMap.get(record.memberId) || 0;
        projectMap.set(record.memberId, current + record.hours);
      }
    });
    setProjectMemberRecords(result);
  }

  function toggleProject(projectId: string) {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
    }
    setExpandedProjects(newExpanded);
  }

  function getMembersForProject(projectId: string): Member[] {
    return projectMembers.get(projectId) || [];
  }

  function getMemberHoursForProject(projectId: string, memberId: string): number {
    const projectMap = projectMemberRecords.get(projectId);
    if (!projectMap) return 0;
    return projectMap.get(memberId) || 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProject || !selectedMember || !selectedDate || hours < 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      await submitTimeRecord({
        projectId: selectedProject,
        memberId: selectedMember,
        date: selectedDate,
        hours: hours
      });

      setTimeout(async () => {
        await loadTodayRecords();
        setIsSubmitting(false);
        setShowSuccess(true);

        setTimeout(() => {
          setShowSuccess(false);
        }, 1500);
      }, 800);
    } catch (error) {
      console.error('Failed to submit time record:', error);
      setIsSubmitting(false);
    }
  }

  function handleMemberClick(member: Member) {
    setSelectedMember(member.id);
  }

  const formMembers = selectedProject
    ? getMembersForProject(selectedProject)
    : allMembers;

  return (
    <div style={pageContainerStyle}>
      <div style={leftPanelStyle}>
        <h2 style={sectionTitleStyle}>项目成员列表</h2>
        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
          日期：{selectedDate}，点击项目展开查看成员及当日工时
        </p>

        {projects.map(project => {
          const isExpanded = expandedProjects.has(project.id);
          const members = getMembersForProject(project.id);

          return (
            <div key={project.id} style={projectGroupStyle}>
              <div
                style={projectHeaderStyle}
                onClick={() => toggleProject(project.id)}
              >
                <span style={projectNameStyle}>{project.name}</span>
                <span style={expandIconStyle(isExpanded)}>▶</span>
              </div>

              {isExpanded && (
                <div style={memberListStyle}>
                  {members.map(member => {
                    const memberHours = getMemberHoursForProject(project.id, member.id);
                    return (
                      <div
                        key={member.id}
                        style={selectedMember === member.id ? memberItemHoverStyle : memberItemStyle}
                        onClick={() => handleMemberClick(member)}
                      >
                        <Link
                          to={`/members/${member.id}`}
                          onClick={e => e.stopPropagation()}
                          style={{ textDecoration: 'none' }}
                        >
                          <div style={avatarStyle(member.avatarColor)}>
                            {member.name.charAt(0)}
                          </div>
                        </Link>
                        <span style={memberNameStyle}>{member.name}</span>
                        <span style={hoursBadgeStyle}>
                          {memberHours > 0 ? `${memberHours}h` : '未填报'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={rightPanelStyle}>
        <h2 style={sectionTitleStyle}>快速录入</h2>

        <form onSubmit={handleSubmit}>
          <div style={formGroupStyle}>
            <label style={labelStyle}>项目名称</label>
            <select
              style={inputStyle}
              value={selectedProject}
              onChange={e => setSelectedProject(e.target.value)}
              required
            >
              <option value="">请选择项目</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>成员姓名</label>
            <select
              style={inputStyle}
              value={selectedMember}
              onChange={e => setSelectedMember(e.target.value)}
              required
            >
              <option value="">请选择成员</option>
              {formMembers.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>日期</label>
            <input
              type="date"
              style={inputStyle}
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              required
            />
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>工时（小时）</label>
            <input
              type="number"
              style={inputStyle}
              value={hours}
              onChange={e => setHours(Number(e.target.value))}
              min={0}
              max={24}
              step={0.5}
              required
            />
          </div>

          <button
            type="submit"
            style={submitButtonStyle(isSubmitting)}
            disabled={isSubmitting || showSuccess}
            onMouseEnter={e => {
              if (!isSubmitting && !showSuccess) {
                e.currentTarget.style.backgroundColor = '#2563eb';
              }
            }}
            onMouseLeave={e => {
              if (!isSubmitting && !showSuccess) {
                e.currentTarget.style.backgroundColor = '#3b82f6';
              }
            }}
          >
            {isSubmitting && (
              <>
                <div style={spinnerStyle} />
                提交中...
              </>
            )}
            {showSuccess && (
              <>
                <svg style={successIconStyle} viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                提交成功
              </>
            )}
            {!isSubmitting && !showSuccess && '提交'}
          </button>
        </form>
      </div>

      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}
