import { useDrag } from 'react-dnd';
import { ComponentTemplate, ComponentType } from '../types';

interface DraggableComponentProps {
  template: ComponentTemplate;
}

function DraggableComponent({ template }: DraggableComponentProps) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'LAYOUT_COMPONENT',
    item: { type: template.type },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }), [template.type]);

  return (
    <div
      ref={drag}
      style={{
        padding: '12px',
        background: '#4a5568',
        borderRadius: '8px',
        cursor: 'grab',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        color: '#ffffff',
        fontSize: '14px',
        opacity: isDragging ? 0.5 : 1,
        transition: 'all 0.2s ease',
        userSelect: 'none',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = '#5a6678';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = '#4a5568';
      }}
    >
      <span style={{ fontSize: '20px' }}>{template.icon}</span>
      <span>{template.name}</span>
    </div>
  );
}

interface ComponentPanelProps {
  templates: ComponentTemplate[];
}

function ComponentPanel({ templates }: ComponentPanelProps) {
  return (
    <div
      style={{
        width: '260px',
        background: '#2d3748',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        overflowY: 'auto',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          color: '#e2e8f0',
          fontSize: '14px',
          fontWeight: 600,
          marginBottom: '8px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}
      >
        布局组件
      </div>
      {templates.map((template) => (
        <DraggableComponent key={template.type} template={template} />
      ))}
      <div
        style={{
          marginTop: '16px',
          padding: '12px',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '8px',
          color: '#a0aec0',
          fontSize: '12px',
          lineHeight: '1.6',
        }}
      >
        <div style={{ fontWeight: 500, color: '#cbd5e0', marginBottom: '8px' }}>
          💡 使用提示
        </div>
        <div>• 拖拽组件到画布放置</div>
        <div>• 单击选中组件进行编辑</div>
        <div>• 右键打开操作菜单</div>
        <div>• 拖动边角调整高度</div>
      </div>
    </div>
  );
}

export default ComponentPanel;
