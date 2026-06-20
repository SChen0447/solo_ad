import React from 'react';
import { CardTemplate } from '../types';
import { templates } from '../data/templates';

interface TemplateSelectorProps {
  onSelect: (template: CardTemplate) => void;
}

const TemplateSelector: React.FC<TemplateSelectorProps> = ({ onSelect }) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      padding: '40px 20px',
      position: 'relative',
      zIndex: 1,
    }}>
      <h1
        className="animate-fade-in-up"
        style={{
          fontSize: '42px',
          fontWeight: 700,
          background: 'linear-gradient(135deg, #fff 0%, #f0e6ff 50%, #e0f0ff 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '8px',
          fontFamily: "'Ma Shan Zheng', cursive",
          letterSpacing: '4px',
        }}
      >
        贺卡工坊
      </h1>
      <p
        className="animate-fade-in-up"
        style={{
          fontSize: '16px',
          color: 'rgba(255,255,255,0.8)',
          marginBottom: '48px',
          animationDelay: '0.1s',
        }}
      >
        选择一个模板，开始创作你的专属贺卡
      </p>

      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '32px',
        justifyContent: 'center',
        maxWidth: '900px',
      }}>
        {templates.map((tpl, idx) => (
          <div
            key={tpl.id}
            className="animate-fade-in-up"
            style={{ animationDelay: `${0.1 + idx * 0.08}s`, opacity: 0 }}
          >
            <div
              className="template-card"
              style={{ background: tpl.previewGradient }}
              onClick={() => onSelect(tpl)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') onSelect(tpl); }}
              aria-label={`选择${tpl.name}模板`}
            >
              <span className="template-icon">{tpl.icon}</span>
              <span className="template-name">{tpl.name}</span>
            </div>
          </div>
        ))}
      </div>

      <p
        className="animate-fade-in-up"
        style={{
          fontSize: '13px',
          color: 'rgba(255,255,255,0.5)',
          marginTop: '48px',
          animationDelay: '0.6s',
        }}
      >
        点击模板即可开始编辑
      </p>
    </div>
  );
};

export default TemplateSelector;
