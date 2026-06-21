import React, { memo } from 'react';
import type { TemplateListProps, Template } from '@/types';
import WavePattern from '@/generator/WavePattern';
import { generateWaveData } from '@/utils/waveGenerator';

interface ThumbProps {
  template: Template;
}

const TemplateThumb: React.FC<ThumbProps> = memo(function TemplateThumb({ template }) {
  const previewData = generateWaveData(`preview_${template.id}`, 'thumb', 'data', 32);
  return (
    <svg viewBox="0 0 120 120" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id={`bg-${template.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={template.bgGradient[0]} />
          <stop offset="100%" stopColor={template.bgGradient[1]} />
        </linearGradient>
      </defs>
      <rect width="120" height="120" fill={`url(#bg-${template.id})`} rx="6" />
      <WavePattern
        data={previewData}
        primary={template.primary}
        secondary={template.secondary}
        width={120}
        height={120}
        gradientId={`thumb-${template.id}`}
        opacity={template.waveOpacity}
      />
      <text
        x="60"
        y="50"
        textAnchor="middle"
        fill={template.textColor}
        fontFamily={template.fontFamily}
        fontSize="11"
        fontWeight="700"
        opacity="0.95"
      >
        节目名
      </text>
      <text
        x="60"
        y="68"
        textAnchor="middle"
        fill={template.textColor}
        fontFamily={template.fontFamily}
        fontSize="8"
        fontStyle="italic"
        opacity="0.85"
      >
        单集标题
      </text>
      <text
        x="60"
        y="84"
        textAnchor="middle"
        fill={template.textColor}
        fontFamily={template.fontFamily}
        fontSize="7"
        opacity="0.75"
      >
        with Guest
      </text>
    </svg>
  );
});

const TemplateList: React.FC<TemplateListProps> = ({ templates, selectedId, onSelect }) => {
  return (
    <div className="template-list" role="listbox" aria-label="选择封面模板">
      {templates.map((template) => {
        const isSelected = template.id === selectedId;
        return (
          <button
            key={template.id}
            role="option"
            aria-selected={isSelected}
            onClick={() => onSelect(template.id)}
            className={`template-card ${isSelected ? 'selected' : ''}`}
            style={{
              borderColor: isSelected ? template.primary : undefined,
            }}
          >
            <div className="template-thumb">
              <TemplateThumb template={template} />
              <div className="template-overlay">
                <span className="template-name">{template.name}</span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default TemplateList;
