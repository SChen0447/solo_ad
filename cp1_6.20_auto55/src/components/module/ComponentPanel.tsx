import React, { useRef } from 'react';
import type { UIComponent, ComponentTemplate } from '../../types';
import { COMPONENT_TEMPLATES } from '../../types';

interface ComponentPanelProps {
  components: UIComponent[];
  selectedComponentId: string | null;
  onSelectComponent: (id: string | null) => void;
  onAddComponent: (template: ComponentTemplate) => void;
  onDragStartComponent: (id: string, e: React.DragEvent) => void;
  onDragStartTemplate: (template: ComponentTemplate, e: React.DragEvent) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const ComponentPanel: React.FC<ComponentPanelProps> = ({
  components,
  selectedComponentId,
  onSelectComponent,
  onAddComponent,
  onDragStartComponent,
  onDragStartTemplate,
  isCollapsed,
  onToggleCollapse,
}) => {
  const draggingIdRef = useRef<string | null>(null);

  const handleDragStart = (id: string, e: React.DragEvent) => {
    draggingIdRef.current = id;
    onDragStartComponent(id, e);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    draggingIdRef.current = null;
  };

  const handleTemplateDragStart = (template: ComponentTemplate, e: React.DragEvent) => {
    onDragStartTemplate(template, e);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const renderThumbnail = (comp: UIComponent) => {
    const style: React.CSSProperties = {
      width: '80%',
      height: '60%',
      backgroundColor: comp.styles.backgroundColor || '#45475a',
      color: comp.styles.color || '#cdd6f4',
      borderRadius: comp.styles.borderRadius || '6px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '10px',
      fontWeight: comp.styles.fontWeight || '500',
      padding: comp.type === 'Card' || comp.type === 'Modal' ? '8px' : '0',
      boxShadow: comp.styles.boxShadow || 'none',
      border: comp.styles.border || 'none',
      textAlign: 'center',
      overflow: 'hidden',
    };

    if (comp.type === 'Button') {
      return <div style={style}>{comp.props.text || '按钮'}</div>;
    }
    if (comp.type === 'Input') {
      return (
        <div style={{ ...style, justifyContent: 'flex-start', paddingLeft: '8px' }}>
          <span style={{ opacity: 0.5 }}>{comp.props.placeholder || '输入...'}</span>
        </div>
      );
    }
    if (comp.type === 'Card') {
      return (
        <div style={style}>
          <div style={{ fontSize: '10px', fontWeight: 600 }}>{comp.props.title || '卡片'}</div>
        </div>
      );
    }
    if (comp.type === 'Modal') {
      return (
        <div style={style}>
          <div style={{ fontSize: '10px', fontWeight: 600 }}>{comp.props.title || '模态框'}</div>
        </div>
      );
    }
    return <div style={style}>{comp.type}</div>;
  };

  if (isCollapsed) {
    return (
      <button className="panel-toggle-btn left" onClick={onToggleCollapse} title="组件面板">
        ⊞
      </button>
    );
  }

  return (
    <>
      <aside className="panel panel-left">
        <div className="panel-header">
          <span>组件库</span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'normal' }}>
            {components.length} 个组件
          </span>
        </div>
        <div className="panel-content">
          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--text-muted)',
                marginBottom: 10,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              快速添加
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {COMPONENT_TEMPLATES.map((template) => (
                <div
                  key={template.type}
                  draggable
                  onDragStart={(e) => handleTemplateDragStart(template, e)}
                  onClick={() => onAddComponent(template)}
                  style={{
                    background: 'var(--bg-tertiary)',
                    borderRadius: '8px',
                    padding: '10px',
                    cursor: 'grab',
                    textAlign: 'center',
                    transition: 'all 0.2s ease',
                    border: '1px solid transparent',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)';
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = 'var(--bg-tertiary)';
                    (e.currentTarget as HTMLElement).style.borderColor = 'transparent';
                  }}
                >
                  <div
                    style={{
                      width: '100%',
                      height: 36,
                      borderRadius: 4,
                      background: template.defaultStyles.backgroundColor,
                      marginBottom: 6,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 10,
                      color: template.defaultStyles.color,
                      fontWeight: 500,
                    }}
                  >
                    {template.name.charAt(0)}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-primary)' }}>{template.name}</div>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--text-muted)',
              marginBottom: 10,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            已定义组件
          </div>

          {components.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📦</div>
              <div>暂无组件，点击上方快速添加</div>
            </div>
          ) : (
            components.map((comp) => (
              <div
                key={comp.id}
                draggable
                onDragStart={(e) => handleDragStart(comp.id, e)}
                onDragEnd={handleDragEnd}
                onClick={() => onSelectComponent(comp.id)}
                className={`component-card ${selectedComponentId === comp.id ? 'selected' : ''} ${draggingIdRef.current === comp.id ? 'dragging' : ''}`}
              >
                <div className="component-card-thumbnail">{renderThumbnail(comp)}</div>
                <div className="component-card-info">
                  <span className="component-card-name">{comp.name}</span>
                  <span className="component-card-type">{comp.type}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </aside>
      <button className="panel-toggle-btn left" onClick={onToggleCollapse} title="组件面板" style={{ display: 'none' }}>
        ⊞
      </button>
    </>
  );
};

export default ComponentPanel;
