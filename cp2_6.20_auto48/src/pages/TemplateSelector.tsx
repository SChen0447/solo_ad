import { useNavigate } from 'react-router-dom';
import { useCardStore } from '@/store/cardStore';
import { templates } from '@/data/templates';
import type { CardTemplate } from '@/types';

export default function TemplateSelector() {
  const navigate = useNavigate();
  const loadTemplate = useCardStore((s) => s.loadTemplate);

  const handleSelectTemplate = (template: CardTemplate) => {
    loadTemplate(template.id, template.gradientColors, template.defaultText);
    navigate('/editor');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="text-center mb-12 animate-fadeIn">
        <h1 className="text-4xl md:text-5xl font-bold text-white font-display mb-3 drop-shadow-lg">
          🎨 贺卡工坊
        </h1>
        <p className="text-white/80 text-lg font-body">
          选择一个模板，开始创作你的专属贺卡
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-8 max-w-5xl">
        {templates.map((template, index) => (
          <div
            key={template.id}
            className="flex flex-col items-center gap-3 animate-fadeIn"
            style={{ animationDelay: `${index * 0.1}s`, opacity: 0 }}
          >
            <button
              onClick={() => handleSelectTemplate(template)}
              className="template-card group"
              style={{
                background: `linear-gradient(135deg, ${template.gradientColors[0]}, ${template.gradientColors[1]})`,
              }}
            >
              <span className="text-5xl group-hover:scale-110 transition-transform duration-200">
                {template.icon}
              </span>
            </button>
            <span className="text-white/90 text-sm font-semibold font-display">
              {template.name}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-16 text-center animate-fadeIn" style={{ animationDelay: '0.6s', opacity: 0 }}>
        <button
          onClick={() => {
            loadTemplate('blank', ['#FFF8F0', '#FFF8F0'], '');
            navigate('/editor');
          }}
          className="btn-gradient px-8 py-3 text-base"
        >
          ✨ 从空白画布开始
        </button>
      </div>
    </div>
  );
}
