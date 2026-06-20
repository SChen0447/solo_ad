import { useState } from 'react';
import { Template, MAX_TEMPLATES } from '../utils/gridUtils';

interface TemplatePanelProps {
  templates: Template[];
  onLoad: (template: Template) => void;
  onDelete: (templateId: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
}

export default function TemplatePanel({ templates, onLoad, onDelete, onReorder }: TemplatePanelProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      onReorder(draggedIndex, index);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div style={{
      backgroundColor: '#282840',
      borderRadius: '8px',
      overflow: 'hidden',
      transition: 'all 0.3s ease'
    }}>
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          borderBottom: isExpanded ? '1px solid #3a3a5a' : 'none',
          transition: 'background-color 0.15s ease'
        }}
        onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#303048')}
        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '18px' }}>📋</span>
          <h2 style={{
            fontSize: '15px',
            fontWeight: 600,
            color: '#e0e0e0'
          }}>
            已保存模板
          </h2>
          <span style={{
            backgroundColor: '#3a3a5a',
            padding: '2px 10px',
            borderRadius: '10px',
            fontSize: '12px',
            color: templates.length >= MAX_TEMPLATES ? '#ff7043' : '#4fc3f7',
            fontWeight: 600
          }}>
            {templates.length}/{MAX_TEMPLATES}
          </span>
        </div>
        <span style={{
          color: '#8a8aaa',
          fontSize: '14px',
          transition: 'transform 0.3s ease',
          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
          display: 'inline-block'
        }}>
          ▼
        </span>
      </div>

      {isExpanded && (
        <div style={{
          padding: '16px 20px 20px',
          animation: 'slideDown 0.3s ease-out'
        }}>
          <style>{`
            @keyframes slideDown {
              from { opacity: 0; max-height: 0; padding-top: 0; padding-bottom: 0; }
              to { opacity: 1; max-height: 500px; }
            }
          `}</style>

          {templates.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: '#6a6a8a',
              fontSize: '14px'
            }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>📦</div>
              暂无保存的模板，调整好布局后点击"保存为模板"
            </div>
          ) : (
            <div style={{
              display: 'flex',
              gap: '14px',
              overflowX: 'auto',
              paddingBottom: '8px'
            }}>
              {templates.map((template, index) => {
                const isDragging = draggedIndex === index;
                const isDragOver = dragOverIndex === index;

                return (
                  <div
                    key={template.id}
                    draggable
                    onDragStart={e => handleDragStart(e, index)}
                    onDragOver={e => handleDragOver(e, index)}
                    onDragLeave={handleDragLeave}
                    onDrop={e => handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                    style={{
                      flex: '0 0 auto',
                      width: '180px',
                      backgroundColor: '#1e1e2e',
                      borderRadius: '8px',
                      border: `2px solid ${isDragOver ? '#4fc3f7' : '#3a3a5a'}`,
                      overflow: 'hidden',
                      cursor: 'grab',
                      opacity: isDragging ? 0.5 : 1,
                      transition: 'border-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease',
                      transform: isDragging ? 'scale(0.98)' : 'scale(1)',
                      boxShadow: isDragOver ? '0 0 16px rgba(79, 195, 247, 0.3)' : 'none'
                    }}
                  >
                    <div
                      onClick={() => onLoad(template)}
                      style={{
                        padding: '10px',
                        cursor: 'pointer',
                        transition: 'background-color 0.15s ease'
                      }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#2a2a44')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <div style={{
                        width: '100%',
                        height: '90px',
                        borderRadius: '4px',
                        overflow: 'hidden',
                        backgroundColor: '#282840',
                        marginBottom: '10px',
                        border: '1px solid #3a3a5a'
                      }}>
                        {template.thumbnail ? (
                          <img
                            src={template.thumbnail}
                            alt={template.name}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover'
                            }}
                            draggable={false}
                          />
                        ) : (
                          <div style={{
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#5a5a7a',
                            fontSize: '24px'
                          }}>
                            🔲
                          </div>
                        )}
                      </div>

                      <div style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: '#e0e0e0',
                        marginBottom: '4px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {template.name}
                      </div>

                      <div style={{
                        fontSize: '11px',
                        color: '#6a6a8a',
                        fontFamily: 'monospace',
                        marginBottom: '2px'
                      }}>
                        {template.config.columns}×{template.config.rows} · {template.config.rowHeight}px
                      </div>

                      <div style={{
                        fontSize: '10px',
                        color: '#5a5a7a'
                      }}>
                        {formatDate(template.createdAt)}
                      </div>
                    </div>

                    <div style={{
                      display: 'flex',
                      borderTop: '1px solid #3a3a5a'
                    }}>
                      <button
                        onClick={() => onLoad(template)}
                        style={{
                          flex: 1,
                          padding: '8px',
                          border: 'none',
                          borderRight: '1px solid #3a3a5a',
                          backgroundColor: 'transparent',
                          color: '#4fc3f7',
                          fontSize: '12px',
                          cursor: 'pointer',
                          transition: 'background-color 0.15s ease',
                          fontWeight: 500
                        }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#2a2a44')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        加载
                      </button>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          if (confirm(`确定要删除模板"${template.name}"吗？`)) {
                            onDelete(template.id);
                          }
                        }}
                        style={{
                          flex: 1,
                          padding: '8px',
                          border: 'none',
                          backgroundColor: 'transparent',
                          color: '#ff7043',
                          fontSize: '12px',
                          cursor: 'pointer',
                          transition: 'background-color 0.15s ease',
                          fontWeight: 500
                        }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#3a2a2a')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        删除
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
