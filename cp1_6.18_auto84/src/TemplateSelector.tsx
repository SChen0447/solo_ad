import React from 'react';
import { TemplateType } from './types';
import { useStore } from './store';

const TEMPLATES: { type: TemplateType; label: string; icon: string }[] = [
  { type: TemplateType.LANDING, label: '着陆页', icon: '📄' },
  { type: TemplateType.REGISTER, label: '注册页', icon: '📝' },
  { type: TemplateType.MODAL, label: '弹窗促销页', icon: '💬' },
];

export const TemplateSelector: React.FC = React.memo(() => {
  const currentTemplate = useStore((state) => state.template);
  const setTemplate = useStore((state) => state.setTemplate);

  return (
    <div className="template-selector">
      <span className="template-label">选择模板：</span>
      <div className="template-buttons">
        {TEMPLATES.map(({ type, label, icon }) => (
          <button
            key={type}
            className={`template-btn ${currentTemplate === type ? 'active' : ''}`}
            onClick={() => setTemplate(type)}
          >
            <span className="template-icon">{icon}</span>
            <span>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
});

TemplateSelector.displayName = 'TemplateSelector';
