import { useState } from 'react';
import { useDesignStore } from '../store/designStore';
import { TemplateCategory, TemplateType } from '../types/design';

const TEMPLATE_CATEGORIES: { id: TemplateCategory; label: string; templates: TemplateType[]; templateLabels: string[] }[] = [
  {
    id: 'business-card',
    label: '名片',
    templates: ['business-card-front', 'business-card-back'],
    templateLabels: ['正面', '背面']
  },
  {
    id: 'letterhead',
    label: '信纸',
    templates: ['letterhead'],
    templateLabels: ['A4信纸']
  },
  {
    id: 'social-cover',
    label: '社交封面',
    templates: ['twitter-cover', 'instagram-cover', 'linkedin-cover'],
    templateLabels: ['Twitter', 'Instagram', 'LinkedIn']
  }
];

const TemplateTabs = () => {
  const { activeCategory, activeTemplate, setActiveCategory, setActiveTemplate } = useDesignStore();
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const tabRefs: Record<string, HTMLButtonElement | null> = {};

  const handleCategoryClick = (category: TemplateCategory, label: string) => {
    setActiveCategory(category);
    const catData = TEMPLATE_CATEGORIES.find((c) => c.id === category);
    if (catData) {
      setActiveTemplate(catData.templates[0]);
    }
  };

  const handleTemplateClick = (template: TemplateType) => {
    setActiveTemplate(template);
  };

  const currentCategory = TEMPLATE_CATEGORIES.find((c) => c.id === activeCategory);

  return (
    <div className="template-tabs">
      <div className="category-tabs">
        {TEMPLATE_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            ref={(el) => (tabRefs[cat.id] = el)}
            className={`category-tab ${activeCategory === cat.id ? 'active' : ''}`}
            onClick={() => handleCategoryClick(cat.id, cat.label)}
          >
            {cat.label}
          </button>
        ))}
        <div className="tab-indicator" style={indicatorStyle} />
      </div>

      {currentCategory && currentCategory.templates.length > 1 && (
        <div className="sub-template-tabs">
          {currentCategory.templates.map((template, index) => (
            <button
              key={template}
              className={`sub-tab ${activeTemplate === template ? 'active' : ''}`}
              onClick={() => handleTemplateClick(template)}
            >
              {currentCategory.templateLabels[index]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default TemplateTabs;
