import React, { useState, useEffect, useRef } from 'react';
import _ from 'lodash';
import { Project, User } from '../types';
import { apiService } from '../services/apiService';
import { Avatar } from './Avatar';

interface ProjectSidebarProps {
  projects: Project[];
  currentProjectId: string;
  collapsed: boolean;
  onProjectSelect: (projectId: string) => void;
  onToggleCollapse: () => void;
  currentUser?: User;
}

export const ProjectSidebar: React.FC<ProjectSidebarProps> = ({
  projects,
  currentProjectId,
  collapsed,
  onProjectSelect,
  onToggleCollapse,
  currentUser,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentProject = projects.find((p) => p.id === currentProjectId);

  const handleSearch = useCallback(
    _.debounce(async (query: string) => {
      if (!query.trim()) {
        setSearchResults([]);
        return;
      }
      try {
        const users = await apiService.fetchUsers(query);
        setSearchResults(users.filter((u) => u.id !== currentUser?.id));
      } catch (error) {
        console.error('Failed to search users:', error);
      }
    }, 300),
    [currentUser]
  );

  useEffect(() => {
    handleSearch(searchQuery);
  }, [searchQuery, handleSearch]);

  const handleAddMember = async (user: User) => {
    if (!currentProject) return;
    try {
      await apiService.addProjectMember(currentProject.id, user.id);
      setSearchQuery('');
      setSearchResults([]);
      setShowMemberModal(false);
    } catch (error) {
      console.error('Failed to add member:', error);
    }
  };

  return (
    <>
      <aside
        style={{
          width: collapsed ? '64px' : '280px',
          backgroundColor: '#16213e',
          borderRight: '1px solid rgba(255,255,255,0.05)',
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 0.3s ease',
          flexShrink: 0,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '60px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'space-between',
            padding: collapsed ? '0 16px' : '0 20px',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          {!collapsed && (
            <h1
              style={{
                margin: 0,
                fontSize: '16px',
                fontWeight: 700,
                color: '#e0e0e0',
                fontFamily: 'Inter, sans-serif',
                whiteSpace: 'nowrap',
              }}
            >
              团队协作
            </h1>
          )}
          <button
            onClick={onToggleCollapse}
            style={{
              width: '32px',
              height: '32px',
              border: 'none',
              borderRadius: '6px',
              backgroundColor: 'transparent',
              color: '#8892b0',
              cursor: 'pointer',
              fontSize: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(255,255,255,0.05)';
              (e.currentTarget as HTMLButtonElement).style.color = '#e0e0e0';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
              (e.currentTarget as HTMLButtonElement).style.color = '#8892b0';
            }}
          >
            {collapsed ? '→' : '←'}
          </button>
        </div>

        <div
          style={{
            padding: collapsed ? '16px 12px' : '16px 20px',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          {!collapsed && (
            <div
              style={{
                color: '#8892b0',
                fontSize: '11px',
                fontWeight: 600,
                fontFamily: 'Inter, sans-serif',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '12px',
              }}
            >
              项目列表
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {projects.map((project) => (
              <button
                key={project.id}
                onClick={() => onProjectSelect(project.id)}
                title={collapsed ? project.name : undefined}
                style={{
                  padding: collapsed ? '10px' : '10px 14px',
                  border: 'none',
                  borderRadius: '8px',
                  backgroundColor: currentProjectId === project.id ? '#0f3460' : 'transparent',
                  color: currentProjectId === project.id ? '#e0e0e0' : '#8892b0',
                  cursor: 'pointer',
                  textAlign: collapsed ? 'center' : 'left',
                  fontSize: collapsed ? '18px' : '13px',
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: currentProjectId === project.id ? 500 : 400,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
                onMouseEnter={(e) => {
                  if (currentProjectId !== project.id) {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(255,255,255,0.03)';
                    (e.currentTarget as HTMLButtonElement).style.color = '#e0e0e0';
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentProjectId !== project.id) {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                    (e.currentTarget as HTMLButtonElement).style.color = '#8892b0';
                  }
                }}
              >
                <span
                  style={{
                    marginRight: collapsed ? 0 : '10px',
                    fontSize: collapsed ? '18px' : '14px',
                  }}
                >
                  📁
                </span>
                {!collapsed && project.name}
              </button>
            ))}
          </div>
        </div>

        {!collapsed && currentProject && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px',
              }}
            >
              <div
                style={{
                  color: '#8892b0',
                  fontSize: '11px',
                  fontWeight: 600,
                  fontFamily: 'Inter, sans-serif',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                项目成员
              </div>
              <button
                onClick={() => setShowMemberModal(true)}
                style={{
                  padding: '2px 8px',
                  backgroundColor: '#0f3460',
                  color: '#e0e0e0',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontFamily: 'Inter, sans-serif',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#e94560';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#0f3460';
                }}
              >
                + 添加
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {currentProject.members.map((member) => (
                <div
                  key={member.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '6px 8px',
                    borderRadius: '6px',
                    transition: 'background-color 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.backgroundColor = 'rgba(255,255,255,0.03)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent';
                  }}
                >
                  <Avatar name={member.name} size="sm" />
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span
                      style={{
                        color: '#e0e0e0',
                        fontSize: '12px',
                        fontFamily: 'Inter, sans-serif',
                        fontWeight: 500,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {member.name}
                    </span>
                    <span
                      style={{
                        color: '#8892b0',
                        fontSize: '10px',
                        fontFamily: 'Inter, sans-serif',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {member.email}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!collapsed && currentUser && (
          <div
            style={{
              padding: '12px 20px',
              borderTop: '1px solid rgba(255,255,255,0.05)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <Avatar name={currentUser.name} size="md" />
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  color: '#e0e0e0',
                  fontSize: '13px',
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {currentUser.name}
              </div>
              <div
                style={{
                  color: '#8892b0',
                  fontSize: '11px',
                  fontFamily: 'Inter, sans-serif',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {currentUser.email}
              </div>
            </div>
          </div>
        )}
      </aside>

      {showMemberModal && currentProject && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => {
            setShowMemberModal(false);
            setSearchQuery('');
            setSearchResults([]);
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#16213e',
              borderRadius: '12px',
              width: '400px',
              maxHeight: '500px',
              padding: '24px',
              boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <h3
              style={{
                margin: 0,
                marginBottom: '20px',
                color: '#e0e0e0',
                fontSize: '16px',
                fontWeight: 600,
                fontFamily: 'Inter, sans-serif',
              }}
            >
              添加项目成员
            </h3>

            <input
              type="text"
              placeholder="搜索用户邮箱或姓名..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: '10px 14px',
                backgroundColor: '#0f3460',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                color: '#e0e0e0',
                fontSize: '13px',
                fontFamily: 'Inter, sans-serif',
                outline: 'none',
                marginBottom: '16px',
                transition: 'border-color 0.2s ease',
              }}
              onFocus={(e) => {
                (e.target as HTMLInputElement).style.borderColor = '#6c63ff';
              }}
              onBlur={(e) => {
                (e.target as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.1)';
              }}
            />

            <div style={{ flex: 1, overflowY: 'auto', margin: '0 -8px' }}>
              {searchResults.length === 0 ? (
                <div
                  style={{
                    padding: '40px 20px',
                    textAlign: 'center',
                    color: '#8892b0',
                    fontSize: '13px',
                    fontFamily: 'Inter, sans-serif',
                  }}
                >
                  {searchQuery ? '未找到匹配的用户' : '输入关键词搜索用户'}
                </div>
              ) : (
                searchResults.map((user) => {
                  const isMember = currentProject.members.some((m) => m.id === user.id);
                  return (
                    <div
                      key={user.id}
                      onClick={() => !isMember && handleAddMember(user)}
                      style={{
                        padding: '10px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        borderRadius: '8px',
                        cursor: isMember ? 'default' : 'pointer',
                        opacity: isMember ? 0.5 : 1,
                        transition: 'background-color 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (!isMember) {
                          (e.currentTarget as HTMLDivElement).style.backgroundColor = 'rgba(255,255,255,0.05)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent';
                      }}
                    >
                      <Avatar name={user.name} size="md" />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            color: '#e0e0e0',
                            fontSize: '13px',
                            fontFamily: 'Inter, sans-serif',
                            fontWeight: 500,
                          }}
                        >
                          {user.name}
                        </div>
                        <div
                          style={{
                            color: '#8892b0',
                            fontSize: '11px',
                            fontFamily: 'Inter, sans-serif',
                          }}
                        >
                          {user.email}
                        </div>
                      </div>
                      {isMember && (
                        <span
                          style={{
                            color: '#2ecc71',
                            fontSize: '11px',
                            fontFamily: 'Inter, sans-serif',
                          }}
                        >
                          已在项目中
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
