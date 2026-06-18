import { useDesignStore } from '../store/designStore';
import { TemplateType } from '../types/design';
import { getTemplateLabelFn, getTemplateSizeLabelFn } from '../utils/exportUtil';

interface ControlPanelProps {
  templateType: TemplateType;
}

const ControlPanel = ({ templateType }: ControlPanelProps) => {
  const {
    businessCard,
    letterhead,
    socialCover,
    updateBusinessCardFrontElement,
    updateBusinessCardBackElement,
    updateLetterheadElement,
    updateSocialCoverElement
  } = useDesignStore();

  const renderTextElement = (
    label: string, element: any, updateFn: (updates: Partial<any>) => void) => {
    return (
      <div className="control-group">
        <label className="control-label">{label}</label>
        <input
          type="text"
          value={element.content || ''}
          onChange={(e) => updateFn({ content: e.target.value })}
          className="control-input"
        />
        <div className="control-row">
          <div className="control-item">
            <label>字号</label>
            <input
              type="range"
              min="8"
              max="60"
              value={element.fontSize || 16}
              onChange={(e) => updateFn({ fontSize: Number(e.target.value) })}
              className="control-slider"
            />
            <span className="slider-value">{element.fontSize}px</span>
          </div>
          <div className="control-item">
            <label>透明度</label>
            <input
              type="range"
              min="0"
              max="100"
              value={(element.opacity || 1) * 100}
              onChange={(e) => updateFn({ opacity: Number(e.target.value) / 100 })}
              className="control-slider"
            />
            <span className="slider-value">{Math.round((element.opacity || 1) * 100)}%</span>
          </div>
        </div>
      </div>
    );
  };

  const renderLogoControl = () => {
    let logoElement: any;
    let updateFn: (updates: any) => void;

    switch (templateType) {
      case 'business-card-front':
        logoElement = businessCard.front.logo;
        updateFn = (updates) => updateBusinessCardFrontElement('logo', updates);
        break;
      case 'letterhead':
        logoElement = letterhead.logo;
        updateFn = (updates) => updateLetterheadElement('logo', updates);
        break;
      default:
        logoElement = socialCover.logo;
        updateFn = (updates) => updateSocialCoverElement('logo', updates);
    }

    if (!logoElement?.src) return null;

    return (
      <div className="control-group">
        <label className="control-label">Logo 缩放</label>
        <div className="control-item">
          <input
            type="range"
            min="50"
            max="200"
            value={(logoElement.scale || 1) * 100}
            onChange={(e) => updateFn({ scale: Number(e.target.value) / 100 })}
            className="control-slider"
          />
          <span className="slider-value">{Math.round((logoElement.scale || 1) * 100)}%</span>
        </div>
      </div>
    );
  };

  const renderTemplateControls = () => {
    switch (templateType) {
      case 'business-card-front':
        return (
          <>
            {renderTextElement('姓名', businessCard.front.name, (updates) => updateBusinessCardFrontElement('name', updates))}
            {renderTextElement('职位', businessCard.front.title, (updates) => updateBusinessCardFrontElement('title', updates))}
            {renderTextElement('电话', businessCard.front.phone, (updates) => updateBusinessCardFrontElement('phone', updates))}
            {renderTextElement('邮箱', businessCard.front.email, (updates) => updateBusinessCardFrontElement('email', updates))}
            {renderTextElement('网站', businessCard.front.website, (updates) => updateBusinessCardFrontElement('website', updates))}
            {renderLogoControl()}
          </>
        );

      case 'business-card-back':
        return (
          <>
            {renderTextElement('Slogan', businessCard.back.slogan, (updates) => updateBusinessCardBackElement('slogan', updates))}
          </>
        );

      case 'letterhead':
        return (
          <>
            {renderTextElement('公司名称', letterhead.companyName, (updates) => updateLetterheadElement('companyName', updates))}
            {renderTextElement('地址', letterhead.address, (updates) => updateLetterheadElement('address', updates))}
            {renderTextElement('联系方式', letterhead.contact, (updates) => updateLetterheadElement('contact', updates))}
            {renderLogoControl()}
          </>
        );

      case 'twitter-cover':
      case 'instagram-cover':
      case 'linkedin-cover':
        return (
          <>
            {renderTextElement('标题', socialCover.title, (updates) => updateSocialCoverElement('title', updates))}
            {renderTextElement('副标题', socialCover.subtitle, (updates) => updateSocialCoverElement('subtitle', updates))}
            {renderLogoControl()}
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className="control-panel">
      <h3 className="section-title">元素微调</h3>
      <p className="template-info">
        <span className="template-name">{getTemplateLabelFn(templateType)}</span>
        <span className="template-size">{getTemplateSizeLabelFn(templateType)}</span>
      </p>
      <p className="drag-hint">💡 提示：可直接在预览区拖动元素调整位置</p>
      <div className="controls-container">
        {renderTemplateControls()}
      </div>
    </div>
  );
};

export default ControlPanel;
