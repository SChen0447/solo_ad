import React, { useEffect, useState } from 'react';
import type { Collaborator, ActivityLog, UserCursor } from './types';

interface CollaborationPanelProps {
  collaborators: Collaborator[];
  activityLogs: ActivityLog[];
  remoteCursors: Record<string, UserCursor>;
  currentUserId: string;
}

const formatTime = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

const CollaborationPanel: React.FC<CollaborationPanelProps> = ({
  collaborators,
  activityLogs,
  remoteCursors,
  currentUserId,
}) => {
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 5000);
    return () => clearInterval(interval);
  }, []);

  const onlineUsers = collaborators.filter((c) => c.isOnline);
  const offlineUsers = collaborators.filter((c) => !c.isOnline);

  return (
    <div style={{
      position: 'fixed',
      top: 16,
      right: 16,
      width: 300,
      maxHeight: 'calc(100vh - 32px)',
      zIndex: 200,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
    }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.65)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        borderRadius: 16,
        border: '1px solid rgba(255, 255, 255, 0.3)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
        padding: 16,
        overflow: 'hidden',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 14,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>👥</span>
            <span style={{
              fontSize: 14,
              fontWeight: 700,
              color: '#1f2937',
            }}>
              在线协作者
            </span>
          </div>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 22,
            height: 22,
            padding: '0 7px',
            borderRadius: 11,
            background: '#22c55e',
            color: '#fff',
            fontSize: 11,
            fontWeight: 700,
          }}>
            {onlineUsers.length}
          </span>
        </div>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          maxHeight: 220,
          overflowY: 'auto',
          overflowX: 'hidden',
          paddingRight: 4,
        }}>
          {onlineUsers.length === 0 && (
            <div style={{
              padding: '16px 8px',
              textAlign: 'center',
              color: '#9ca3af',
              fontSize: 12,
            }}>
              暂无在线协作者
            </div>
          )}
          {onlineUsers.map((user) => {
            const isDragging = remoteCursors[user.userId]?.draggingCardId != null;
            const isCurrentUser = user.userId === currentUserId;
            return (
              <div
                key={user.userId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 10px',
                  borderRadius: 10,
                  background: isCurrentUser ? 'rgba(59, 130, 246, 0.08)' : 'rgba(0, 0, 0, 0.02)',
                  border: `1px solid ${isCurrentUser ? 'rgba(59, 130, 246, 0.15)' : 'transparent'}`,
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: `linear-gradient(135deg, ${user.color}, ${user.color}cc)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: 13,
                    fontWeight: 700,
                    boxShadow: `0 2px 8px ${user.color}40`,
                  }}>
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.userName}
                        style={{
                          width: '100%',
                          height: '100%',
                          borderRadius: '50%',
                          objectFit: 'cover',
                        }}
                      />
                    ) : (
                      user.userName.slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <div style={{
                    position: 'absolute',
                    right: -2,
                    bottom: -2,
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    background: '#22c55e',
                    border: '2px solid #ffffff',
                  }} />
                  <div style={{
                    position: 'absolute',
                    left: -4,
                    top: -4,
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: user.color,
                    boxShadow: `0 0 0 2px #fff, 0 0 6px ${user.color}80`,
                  }} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}>
                    <span style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#1f2937',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {user.userName}
                    </span>
                    {isCurrentUser && (
                      <span style={{
                        fontSize: 9,
                        fontWeight: 700,
                        padding: '1px 5px',
                        borderRadius: 4,
                        background: '#3b82f6',
                        color: '#fff',
                      }}>
                        我
                      </span>
                    )}
                  </div>
                  <div style={{
                    fontSize: 11,
                    color: '#6b7280',
                    marginTop: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}>
                    {isDragging ? (
                      <>
                        <span style={{
                          display: 'inline-block',
                          animation: 'spin 1s linear infinite',
                        }}>🔄</span>
                        正在拖拽卡片...
                      </>
                    ) : (
                      <>🟢 在线</>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {offlineUsers.length > 0 && (
            <>
              <div style={{
                fontSize: 10,
                fontWeight: 600,
                color: '#9ca3af',
                padding: '8px 4px 4px',
                borderTop: '1px dashed #e5e7eb',
                marginTop: 4,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}>
                离线 ({offlineUsers.length})
              </div>
              {offlineUsers.map((user) => (
                <div
                  key={user.userId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '6px 10px',
                    borderRadius: 8,
                    opacity: 0.5,
                  }}
                >
                  <div style={{ position: 'relative' }}>
                    <div style={{
                      width: 30,
                      height: 30,
                      borderRadius: '50%',
                      background: '#9ca3af',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontSize: 11,
                      fontWeight: 700,
                      filter: 'grayscale(100%)',
                    }}>
                      {user.userName.slice(0, 2).toUpperCase()}
                    </div>
                    <div style={{
                      position: 'absolute',
                      right: -2,
                      bottom: -2,
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: '#9ca3af',
                      border: '2px solid #ffffff',
                    }} />
                  </div>
                  <span style={{
                    fontSize: 12,
                    color: '#6b7280',
                    fontWeight: 500,
                  }}>
                    {user.userName}
                  </span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      <div style={{
        background: 'rgba(255, 255, 255, 0.65)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        borderRadius: 16,
        border: '1px solid rgba(255, 255, 255, 0.3)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
        padding: 16,
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 14,
        }}>
          <span style={{ fontSize: 18 }}>📝</span>
          <span style={{
            fontSize: 14,
            fontWeight: 700,
            color: '#1f2937',
          }}>
            操作日志
          </span>
        </div>

        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column-reverse',
          gap: 8,
          overflowY: 'auto',
          overflowX: 'hidden',
          paddingRight: 4,
        }}>
          {activityLogs.length === 0 && (
            <div style={{
              padding: '24px 8px',
              textAlign: 'center',
              color: '#9ca3af',
              fontSize: 12,
            }}>
              暂无操作记录
              <div style={{ fontSize: 10, marginTop: 4, opacity: 0.7 }}>
                最新5条操作将显示在这里
              </div>
            </div>
          )}
          {[...activityLogs].reverse().map((log, index) => (
            <div
              key={log.id}
              style={{
                display: 'flex',
                gap: 10,
                padding: '10px 10px',
                borderRadius: 10,
                background: `rgba(0, 0, 0, 0.02)`,
                borderLeft: `3px solid ${log.color}`,
                animation: `slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) ${index * 0.03}s both`,
              }}
            >
              <div style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: `${log.color}15`,
                border: `1px solid ${log.color}40`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                fontSize: 10,
                fontWeight: 700,
                color: log.color,
              }}>
                {log.userName.slice(0, 1).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 12,
                  color: '#374151',
                  lineHeight: 1.4,
                }}>
                  <span style={{ fontWeight: 600, color: log.color }}>
                    {log.userName}
                  </span>
                  {' '}
                  <span style={{ color: '#6b7280' }}>{log.action}</span>
                  {log.target && (
                    <>
                      {' '}
                      <span style={{
                        fontWeight: 500,
                        color: '#1f2937',
                        background: 'rgba(0, 0, 0, 0.04)',
                        padding: '1px 6px',
                        borderRadius: 4,
                        fontSize: 11,
                      }}>
                        {log.target.length > 18 ? log.target.slice(0, 18) + '...' : log.target}
                      </span>
                    </>
                  )}
                </div>
                <div style={{
                  fontSize: 10,
                  color: '#9ca3af',
                  marginTop: 4,
                }}>
                  {formatTime(log.timestamp)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(12px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
};

export default CollaborationPanel;
