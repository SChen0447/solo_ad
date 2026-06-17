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
    return date.toLocaleDateString('zh-CN');
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

  const previewHtml = selectedVersion
    ? marked.parse(selectedVersion.content) as string
    : marked.parse(currentContent) as string;

  return (
    <div style={{
      width: '280px',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: 'rgba(37, 37, 38, 0.95)',
      backdropFilter: 'blur(8px)',
      borderRight: '1px solid #3c3c3c',
      overflow: 'hidden'
    }}>
      <div style={{
        padding: '16px',
        borderBottom: '1px solid #3c3c3c',
        backgroundColor: 'rgba(30, 30, 30, 0.9)'
      }}>
        <h3 style={{ color: '#d4d4d4', margin: 0, fontSize: '16px', fontWeight: 600 }}>
          版本历史
        </h3>
        <p style={{ color: '#858585', margin: '4px 0 0 0', fontSize: '12px' }}>
          共 {sortedVersions.length} 个版本
        </p>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {sortedVersions.length === 0 ? (
          <div style={{ color: '#858585', textAlign: 'center', padding: '40px 0' }}>
            暂无历史版本
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
                  transition: 'background-color 0.3s ease',
                  backgroundColor: selectedVersion?.id === version.id
                    ? 'rgba(0, 122, 204, 0.2)'
                    : 'transparent'
                }}
                onMouseEnter={(e) => {
                  if (selectedVersion?.id !== version.id) {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
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
                  left: '2px',
                  top: '16px',
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  backgroundColor: selectedVersion?.id === version.id
                    ? '#007acc'
                    : '#6c6c6c',
                  border: `3px solid ${selectedVersion?.id === version.id ? '#007acc' : '#252526'}`,
                  transition: 'all 0.3s ease',
                  zIndex: 1
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
                      fontSize: '11px',
                      backgroundColor: 'rgba(0, 122, 204, 0.3)',
                      color: '#007acc',
                      padding: '2px 8px',
                      borderRadius: '4px'
                    }}>
                      最新
                    </span>
                  )}
                </div>

                <div style={{
                  color: '#858585',
                  fontSize: '12px',
                  marginBottom: '8px'
                }}>
                  {formatTime(version.timestamp)}
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'flex-end'
                }}>
                  <button
                    onClick={(e) => handleRestoreClick(version, e)}
                    style={{
                      padding: '4px 12px',
                      fontSize: '12px',
                      backgroundColor: 'transparent',
                      color: '#007acc',
                      border: '1px solid #007acc',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#007acc';
                      e.currentTarget.style.color = '#fff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = '#007acc';
                    }}
                  >
                    恢复
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedVersion && (
        <div style={{
          borderTop: '1px solid #3c3c3c',
          padding: '16px',
          maxHeight: '200px',
          overflowY: 'auto',
          backgroundColor: 'rgba(30, 30, 30, 0.9)'
        }}>
          <div style={{
            color: '#858585',
            fontSize: '12px',
            marginBottom: '8px'
          }}>
            预览 v{selectedVersion.versionNumber}
          </div>
          <div
            style={{
              color: '#d4d4d4',
              fontSize: '12px',
              lineHeight: '1.5'
            }}
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        </div>
      )}

      {showConfirmDialog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000
        }}>
          <div style={{
            backgroundColor: '#252526',
            borderRadius: '8px',
            padding: '24px',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)'
          }}>
            <h3 style={{
              color: '#d4d4d4',
              margin: '0 0 16px 0',
              fontSize: '18px'
            }}>
              确认恢复版本
            </h3>
            <p style={{
              color: '#858585',
              margin: '0 0 24px 0',
              fontSize: '14px',
              lineHeight: '1.6'
            }}>
              确定要将文档恢复到版本 v{versionToRestore?.versionNumber} 吗？
              此操作将覆盖当前内容。
            </p>
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px'
            }}>
              <button
                onClick={() => {
                  setShowConfirmDialog(false);
                  setVersionToRestore(null);
                }}
                style={{
                  padding: '8px 16px',
                  fontSize: '14px',
                  backgroundColor: 'transparent',
                  color: '#d4d4d4',
                  border: '1px solid #3c3c3c',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                取消
              </button>
              <button
                onClick={confirmRestore}
                style={{
                  padding: '8px 16px',
                  fontSize: '14px',
                  backgroundColor: '#007acc',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: 'filter 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.filter = 'brightness(1.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.filter = 'brightness(1)';
                }}
              >
                确认恢复
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VersionHistory;
