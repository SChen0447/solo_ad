import { useState } from 'react';
import { MOVIE_TEMPLATES } from '@/types';
import { useAppStore } from '@/store';

const PREVIEW_TEXT = '字幕预览';

const TemplateSelector = () => {
  const activeTemplate = useAppStore((s) => s.activeTemplate);
  const setActiveTemplate = useAppStore((s) => s.setActiveTemplate);
  const [animKey, setAnimKey] = useState(0);

  const handleSelect = (name: string) => {
    setActiveTemplate(name);
    setAnimKey((k) => k + 1);
  };

  return (
    <div className="space-y-3">
      <h3 className="text-cinema-text text-sm font-medium">模板选择</h3>
      <div className="grid grid-cols-5 gap-2" key={animKey}>
        {MOVIE_TEMPLATES.map((tpl) => {
          const isActive = activeTemplate === tpl.name;
          return (
            <button
              key={tpl.name}
              onClick={() => handleSelect(tpl.name)}
              className={`
                group relative flex flex-col items-center gap-1.5 rounded-lg p-3
                border transition-all duration-300 animate-fade-in
                ${
                  isActive
                    ? 'border-cinema-primary bg-cinema-primary/10 shadow-glow'
                    : 'border-cinema-border bg-cinema-card hover:border-cinema-muted'
                }
              `}
            >
              <span
                className="text-base font-bold leading-tight truncate w-full text-center"
                style={{ color: tpl.style.fontColor, fontFamily: tpl.style.fontFamily }}
              >
                {PREVIEW_TEXT}
              </span>
              <span
                className={`text-xs ${
                  isActive ? 'text-cinema-primary' : 'text-cinema-muted'
                }`}
              >
                {tpl.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default TemplateSelector;
