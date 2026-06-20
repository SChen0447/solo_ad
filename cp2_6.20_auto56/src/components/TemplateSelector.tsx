import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TEMPLATES, type CardTemplate } from '../types';

interface TemplateSelectorProps {
  onSelectTemplate?: (template: CardTemplate) => void;
}

const TemplateSelector: React.FC<TemplateSelectorProps> = ({ onSelectTemplate }) => {
  const navigate = useNavigate();

  const handleTemplateClick = (template: CardTemplate) => {
    if (onSelectTemplate) {
      onSelectTemplate(template);
    }
    navigate(`/editor/${template.id}`);
  };

  const getBackgroundStyle = (template: CardTemplate): React.CSSProperties => {
    if (template.background.type === 'gradient' && template.background.gradient) {
      const gradient = template.background.gradient;
      if (gradient.type === 'linear') {
        return {
          background: `linear-gradient(${gradient.angle || 135}deg, ${gradient.colors.join(', ')})`,
        };
      } else {
        return {
          background: `radial-gradient(circle, ${gradient.colors.join(', ')})`,
        };
      }
    } else if (template.background.type === 'solid') {
      return {
        background: template.background.color || '#F5F5DC',
      };
    }
    return { background: template.previewColor };
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="text-center mb-12" style={{ animation: 'fadeIn 0.6s ease' }}>
        <h1 className="text-4xl font-bold text-white mb-4" style={{ textShadow: '0 4px 8px rgba(0,0,0,0.2)' }}>
          🎨 电子贺卡设计器
        </h1>
        <p className="text-white text-lg opacity-90">
          选择一个模板，开始创建你的专属贺卡
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-8 max-w-5xl">
        {TEMPLATES.map((template, index) => (
          <div
            key={template.id}
            className="template-card"
            style={{
              ...getBackgroundStyle(template),
              animation: `floatIn 0.5s ease ${index * 0.1}s both`,
            }}
            onClick={() => handleTemplateClick(template)}
          >
            <span className="template-card-icon">{template.icon}</span>
            <span className="template-card-name">{template.name}</span>
          </div>
        ))}
      </div>

      <div className="mt-12 text-white opacity-70 text-sm">
        💡 提示：点击卡片进入编辑器，可自定义文字、装饰和背景
      </div>
    </div>
  );
};

export default TemplateSelector;
