import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { GraphNode as GraphNodeType } from '../types';

interface EditPanelProps {
  node: GraphNodeType | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateNode: (id: string, updates: Partial<GraphNodeType>) => void;
  allNodes: GraphNodeType[];
  onStartLinking: () => void;
  isLinkingMode: boolean;
  linkingSourceId: string | null;
  onRemoveEdge: (edgeId: string) => void;
  edges: { id: string; source: string; target: string; type: string }[];
}

const tagColors = [
  '#ef4444',
  '#f59e0b',
  '#10b981',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#84cc16',
];

function getTagColor(tag: string): string {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  return tagColors[Math.abs(hash) % tagColors.length];
}

const EditPanel: React.FC<EditPanelProps> = ({
  node,
  isOpen,
  onClose,
  onUpdateNode,
  allNodes,
  onStartLinking,
  isLinkingMode,
  linkingSourceId,
  onRemoveEdge,
  edges,
}) => {
  const [editMode, setEditMode] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [newTag, setNewTag] = useState('');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (node) {
      setEditedContent(node.markdown || node.label);
      setEditMode(false);
    }
  }, [node]);

  if (!node) return null;

  const handleSave = () => {
    onUpdateNode(node.id, {
      markdown: editedContent,
      label: editedContent.split('\n')[0]?.replace(/^#{1,6}\s+/, '') || node.label,
    });
    setEditMode(false);
  };

  const handleAddTag = () => {
    if (newTag.trim() && !node.tags.includes(newTag.trim())) {
      onUpdateNode(node.id, {
        tags: [...node.tags, newTag.trim()],
      });
      setNewTag('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    onUpdateNode(node.id, {
      tags: node.tags.filter((t) => t !== tag),
    });
  };

  const nodeEdges = edges.filter(
    (e) =>
      (e.source === node.id || e.target === node.id) && e.type === 'manual'
  );

  const getConnectedNode = (edge: { source: string; target: string }) => {
    const otherId = edge.source === node.id ? edge.target : edge.source;
    return allNodes.find((n) => n.id === otherId);
  };

  const panelStyle: React.CSSProperties = isMobile
    ? {
        position: 'fixed',
        bottom: isOpen ? 0 : '-100%',
        left: 0,
        right: 0,
        height: '70vh',
        transition: 'bottom 0.3s ease-out',
      }
    : {
        position: 'fixed',
        top: 0,
        right: isOpen ? 0 : '-320px',
        width: 300,
        height: '100vh',
        transition: 'right 0.3s ease-out',
      };

  return (
    <div
      style={{
        ...panelStyle,
        backgroundColor: 'rgba(30, 30, 46, 0.95)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderLeft: isMobile ? 'none' : '1px solid rgba(255,255,255,0.1)',
        borderTop: isMobile ? '1px solid rgba(255,255,255,0.1)' : 'none',
        boxShadow: isMobile
          ? '0 -4px 20px rgba(0,0,0,0.4)'
          : '-4px 0 20px rgba(0,0,0,0.4)',
        borderRadius: isMobile ? '16px 16px 0 0' : '16px 0 0 16px',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <h3 style={{ fontSize: 16, fontWeight: 600, color: '#fff' }}>
          节点详情
        </h3>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: 'rgba(255,255,255,0.6)',
            cursor: 'pointer',
            fontSize: 20,
            padding: 4,
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 20px',
        }}
      >
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              fontSize: 11,
              color: 'rgba(255,255,255,0.5)',
              marginBottom: 6,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            类型
          </div>
          <div
            style={{
              display: 'inline-block',
              padding: '4px 10px',
              borderRadius: 12,
              backgroundColor:
                node.type === 'code-block'
                  ? 'rgba(236, 72, 153, 0.2)'
                  : node.type === 'heading'
                  ? 'rgba(59, 130, 246, 0.2)'
                  : 'rgba(16, 185, 129, 0.2)',
              color:
                node.type === 'code-block'
                  ? '#ec4899'
                  : node.type === 'heading'
                  ? '#3b82f6'
                  : '#10b981',
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            {node.type === 'code-block'
              ? '代码块'
              : node.type === 'heading'
              ? '标题'
              : '列表项'}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              fontSize: 11,
              color: 'rgba(255,255,255,0.5)',
              marginBottom: 6,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            内容
          </div>
          {editMode ? (
            <div>
              <textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                style={{
                  width: '100%',
                  minHeight: 100,
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8,
                  padding: 10,
                  color: '#fff',
                  fontSize: 13,
                  fontFamily: 'monospace',
                  resize: 'vertical',
                  outline: 'none',
                }}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button
                  onClick={handleSave}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    backgroundColor: '#3b82f6',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 500,
                  }}
                >
                  保存
                </button>
                <button
                  onClick={() => setEditMode(false)}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 500,
                  }}
                >
                  取消
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => setEditMode(true)}
              style={{
                backgroundColor: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 8,
                padding: 12,
                cursor: 'pointer',
                fontSize: 13,
                color: 'rgba(255,255,255,0.9)',
                lineHeight: 1.6,
                wordBreak: 'break-word',
              }}
            >
              {node.markdown ? (
                <ReactMarkdown>{node.markdown}</ReactMarkdown>
              ) : (
                <span style={{ color: 'rgba(255,255,255,0.5)' }}>
                  点击编辑
                </span>
              )}
            </div>
          )}
        </div>

        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              fontSize: 11,
              color: 'rgba(255,255,255,0.5)',
              marginBottom: 8,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            标签
          </div>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 6,
              marginBottom: 8,
            }}
          >
            {node.tags.length === 0 && (
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
                暂无标签
              </span>
            )}
            {node.tags.map((tag) => (
              <div
                key={tag}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px 8px',
                  borderRadius: 12,
                  backgroundColor: `${getTagColor(tag)}20`,
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: getTagColor(tag),
                  }}
                />
                <span style={{ fontSize: 11, color: '#fff' }}>{tag}</span>
                <button
                  onClick={() => handleRemoveTag(tag)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255,255,255,0.5)',
                    cursor: 'pointer',
                    fontSize: 12,
                    padding: 0,
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
              placeholder="添加标签..."
              style={{
                flex: 1,
                padding: '6px 10px',
                backgroundColor: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 6,
                color: '#fff',
                fontSize: 12,
                outline: 'none',
              }}
            />
            <button
              onClick={handleAddTag}
              style={{
                padding: '6px 12px',
                backgroundColor: 'rgba(59, 130, 246, 0.8)',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 12,
              }}
            >
              添加
            </button>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              fontSize: 11,
              color: 'rgba(255,255,255,0.5)',
              marginBottom: 8,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            手动关联
          </div>
          <button
            onClick={onStartLinking}
            style={{
              width: '100%',
              padding: '10px 12px',
              backgroundColor: isLinkingMode
                ? 'rgba(245, 158, 11, 0.2)'
                : 'rgba(255,255,255,0.05)',
              color: isLinkingMode ? '#f59e0b' : '#fff',
              border: `1px solid ${isLinkingMode ? '#f59e0b' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            {isLinkingMode
              ? linkingSourceId
                ? '点击目标节点建立关联'
                : '正在选择源节点...'
              : '拖拽到其他节点建立关联'}
          </button>
          {nodeEdges.length > 0 && (
            <div style={{ marginTop: 10 }}>
              {nodeEdges.map((edge) => {
                const connected = getConnectedNode(edge);
                return (
                  <div
                    key={edge.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 10px',
                      backgroundColor: 'rgba(255,255,255,0.03)',
                      borderRadius: 6,
                      marginBottom: 4,
                    }}
                  >
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>
                      {connected?.label || '未知节点'}
                    </span>
                    <button
                      onClick={() => onRemoveEdge(edge.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'rgba(255,255,255,0.4)',
                        cursor: 'pointer',
                        fontSize: 14,
                        padding: 2,
                      }}
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              fontSize: 11,
              color: 'rgba(255,255,255,0.5)',
              marginBottom: 6,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            统计
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 8,
            }}
          >
            <div
              style={{
                backgroundColor: 'rgba(255,255,255,0.03)',
                borderRadius: 8,
                padding: 10,
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 18, fontWeight: 600, color: '#3b82f6' }}>
                {node.childIds.length}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
                子节点
              </div>
            </div>
            <div
              style={{
                backgroundColor: 'rgba(255,255,255,0.03)',
                borderRadius: 8,
                padding: 10,
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 18, fontWeight: 600, color: '#10b981' }}>
                第{node.depth}层
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
                深度
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditPanel;
