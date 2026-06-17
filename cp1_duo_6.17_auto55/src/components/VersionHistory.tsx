import React, { useState } from 'react';
import { marked } from 'marked';
import { Version } from '../types';

interface VersionHistoryProps {
  versions: Version[];
  currentContent: string;
  onRestore: (version: Version) => void;
}

const VersionHistory: React.FC<VersionHistoryProps> = ({ versions, currentContent, onRestore }) => {
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState<boolean>(false);
  const [versionToRestore, setVersionToRestore] = useState<Version | null>(null);

  const sortedVersions = [...versions].sort((a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString('zh-CN') + ' ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  const formatFullTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('zh-CN') + ' ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const handleVersionClick = (version: Version) => {
    setSelectedVersion(version);
  };

  const handleRestoreClick = (version: Version, e: React.MouseEvent) => {
    e.stopPropagation();
    setVersionToRestore(version);
    setShowConfirmDialog(true);
  };

  const confirmRestore = () => {
    if (versionToRestore) {
      onRestore(versionToRestore);
      setShowConfirmDialog(false);
      setVersionToRestore(null);
      setSelectedVersion(null);
    }
  };

  const cancelRestore = () => {
    setShowConfirmDialog(false);
    setVersionToRestore(null);
  };

  const previewHtml = selectedVersion
    ? marked.parse(selectedVersion.content) as string
    : marked.parse(currentContent) as string;

  return (
    <>
      <div style={{
        width: '280px',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'rgba(37, 37, 38, 0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        borderRight: '1px solid rgba(60, 60, 60, 0.8)',
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '16px',
          borderBottom: '1px solid rgba(60, 60, 60, 0.8)',
          backgroundColor: 'rgba(30, 30, 30, 0.7)'
        }}>
          <h3 style={{ color: '#d4d4d4', margin: 0, fontSize: '16px', fontWeight: 600 }}>
            版本历史
          </h3>
          <p style={{ color: '#858585', margin: '4px 0 0 0', fontSize: '12px' }}>
            共 {sortedVersions.length} 个版本 · 每10秒自动保存
          </p>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          {sortedVersions.length === 0 ? (
            <div style={{
              color: '#858585',
              textAlign: 'center',
              padding: '40px 0',
              fontSize: '13px',
              lineHeight: '1.6'
            }}>
              <div style={{ fontSize: '40px', marginBottom: '12px', opacity: 0.5 }}>⏱️</div>
              暂无历史版本
              <div style={{ fontSize: '11px', marginTop: '8px', opacity: 0.7 }}>
                开始编辑后每10秒自动保存一次
              </div>
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              <div style={{
                position: 'absolute',
                left: '8px',
                top: '8px',
                bottom: '8px',
                width: '2px',
                backgroundColor: '#3c3c3c'
              }} />

              {sortedVersions.map((version, index) => (
                <div
                  key={version.id}
                  onClick={() => handleVersionClick(version)}
                  style={{
                    position: 'relative',
                    padding: '12px 12px 12px 32px',
                    marginBottom: '8px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    backgroundColor: selectedVersion?.id === version.id
                      ? 'rgba(0, 122, 204, 0.25)'
                      : 'transparent',
                    border: selectedVersion?.id === version.id
                      ? '1px solid rgba(0, 122, 204, 0.4)'
                      : '1px solid transparent'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedVersion?.id !== version.id) {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedVersion?.id !== version.id) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <div style={{
                    position: 'absolute',
                    left: '0px',
                    top: '16px',
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    backgroundColor: selectedVersion?.id === version.id
                      ? '#007acc'
                      : (index === 0 ? '#4ecdc4' : '#6c6c6c'),
                    border: `3px solid #252526`,
                    transition: 'all 0.3s ease',
                    zIndex: 2,
                    boxShadow: selectedVersion?.id === version.id
                      ? '0 0 0 3px rgba(0, 122, 204, 0.3)'
                      : 'none'
                  }} />

                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '4px'
                  }}>
                    <span style={{
                      color: '#d4d4d4',
                      fontSize: '13px',
                      fontWeight: 500
                    }}>
                      版本 v{version.versionNumber}
                    </span>
                    {index === 0 && (
                      <span style={{
                        fontSize: '10px',
                        backgroundColor: 'rgba(78, 205, 196, 0.2)',
                        color: '#4ecdc4',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontWeight: 600
                      }}>
                        最新
                      </span>
                    )}
                  </div>

                  <div style={{
                    color: '#858585',
                    fontSize: '12px',
                    marginBottom: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <span>🕐</span>
                    <span>{formatTime(version.timestamp)}</span>
                  </div>

                  <div style={{
                    color: '#5a5a5a',
                    fontSize: '10px',
                    marginBottom: '8px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {version.content.substring(0, 50)}{version.content.length > 50 ? '...' : ''}
                  </div>

                  <div style={{
                    display: 'flex',
                    justifyContent: 'flex-end'
                  }}>
                    <button
                      onClick={(e) => handleRestoreClick(version, e)}
                      style={{
                        padding: '5px 14px',
                        fontSize: '12px',
                        backgroundColor: 'transparent',
                        color: '#007acc',
                        border: '1px solid rgba(0, 122, 204, 0.6)',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        fontWeight: 500
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#007acc';
                        e.currentTarget.style.color = '#fff';
                        e.currentTarget.style.borderColor = '#007acc';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = '#007acc';
                        e.currentTarget.style.borderColor = 'rgba(0, 122, 204, 0.6)';
                      }}
                    >
                      ↺ 恢复此版本
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedVersion && (
          <div style={{
            borderTop: '1px solid rgba(60, 60, 60, 0.8)',
            padding: '16px',
            maxHeight: '220px',
            overflowY: 'auto',
            backgroundColor: 'rgba(30, 30, 30, 0.85)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '10px'
            }}>
              <div style={{
                color: '#858585',
                fontSize: '12px',
                fontWeight: 500
              }}>
                📄 预览版本 v{selectedVersion.versionNumber}
              </div>
              <div style={{
                color: '#5a5a5a',
                fontSize: '11px'
              }}>
                {formatFullTime(selectedVersion.timestamp)}
              </div>
            </div>
            <div
              style={{
                color: '#b0b0b0',
                fontSize: '12px',
                lineHeight: '1.6',
                wordBreak: 'break-word',
                padding: '10px',
                backgroundColor: 'rgba(30, 30, 30, 0.5)',
                borderRadius: '4px',
                border: '1px solid rgba(60, 60, 60, 0.5)'
              }}
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </div>
        )}
      </div>

      {showConfirmDialog && versionToRestore && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            animation: 'fadeIn 0.25s ease'
          }}
          onClick={cancelRestore}
        >
          <div
            style={{
              backgroundColor: '#252526',
              borderRadius: '12px',
              padding: '28px',
              maxWidth: '450px',
              width: '90%',
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.6)',
              border: '1px solid rgba(60, 60, 60, 0.8)',
              animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '14px',
              marginBottom: '20px'
            }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                backgroundColor: 'rgba(255, 193, 7, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
                flexShrink: 0
              }}>
                ⚠️
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{
                  color: '#d4d4d4',
                  margin: '0 0 8px 0',
                  fontSize: '18px',
                  fontWeight: 600
                }}>
                  确认恢复版本？
                </h3>
                <p style={{
                  color: '#858585',
                  margin: 0,
                  fontSize: '14px',
                  lineHeight: '1.6'
                }}>
                  您即将将文档恢复到{' '}
                  <span style={{ color: '#4ecdc4', fontWeight: 600 }}>
                    v{versionToRestore.versionNumber}
                  </span>
                  （{formatTime(versionToRestore.timestamp)}）。
                </p>
              </div>
            </div>

            <div style={{
              backgroundColor: 'rgba(30, 30, 30, 0.8)',
              borderRadius: '8px',
              padding: '14px',
              marginBottom: '24px',
              border: '1px solid rgba(60, 60, 60, 0.5)'
            }}>
              <div style={{
                color: '#5a5a5a',
                fontSize: '11px',
                marginBottom: '6px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                恢复操作将：
              </div>
              <ul style={{
                color: '#a0a0a0',
                fontSize: '13px',
                margin: 0,
                paddingLeft: '18px',
                lineHeight: '1.8'
              }}>
                <li>用历史版本内容<span style={{ color: '#ff6b6b' }}>覆盖</span>当前文档</li>
                <li>当前所有未保存的修改将<span style={{ color: '#ff6b6b' }}>丢失</span></li>
                <li>所有协作者将看到此版本内容</li>
              </ul>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px'
            }}>
              <button
                onClick={cancelRestore}
                style={{
                  padding: '10px 20px',
                  fontSize: '14px',
                  backgroundColor: 'transparent',
                  color: '#d4d4d4',
                  border: '1px solid #3c3c3c',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  fontWeight: 500
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.borderColor = '#4c4c4c';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.borderColor = '#3c3c3c';
                }}
              >
                取消
              </button>
              <button
                onClick={confirmRestore}
                style={{
                  padding: '10px 24px',
                  fontSize: '14px',
                  backgroundColor: '#007acc',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  fontWeight: 600,
                  boxShadow: '0 2px 8px rgba(0, 122, 204, 0.3)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.filter = 'brightness(1.15)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 122, 204, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.filter = 'brightness(1)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 122, 204, 0.3)';
                }}
              >
                ✓ 确认恢复
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </>
  );
};

export default VersionHistory;
