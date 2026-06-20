import type { MouseEvent } from 'react';
import type { StyleType, StyleOption } from '../types';
import { fireGoldConfetti } from '../utils/confetti';

const STYLES: StyleOption[] = [
  {
    id: 'watercolor',
    name: '水彩',
    thumbnail: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=watercolor%20painting%20style%20abstract%20soft%20colors%20artistic&image_size=square'
  },
  {
    id: 'oil',
    name: '油画',
    thumbnail: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=oil%20painting%20thick%20brushstrokes%20rich%20colors%20classical&image_size=square'
  },
  {
    id: 'sketch',
    name: '素描',
    thumbnail: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=pencil%20sketch%20pencil%20drawing%20monochrome%20lines&image_size=square'
  },
  {
    id: 'pixel',
    name: '像素风',
    thumbnail: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=pixel%20art%208bit%20retro%20game%20style&image_size=square'
  },
  {
    id: 'impressionism',
    name: '印象派',
    thumbnail: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=impressionism%20painting%20monet%20short%20brushstrokes%20light&image_size=square'
  }
];

interface StyleSelectorProps {
  selectedStyle: StyleType | null;
  onSelectStyle: (style: StyleType) => void;
  disabled: boolean;
}

export const StyleSelector = ({ selectedStyle, onSelectStyle, disabled }: StyleSelectorProps) => {
  const handleSelect = (style: StyleType, e: MouseEvent<HTMLDivElement>) => {
    if (disabled) return;
    fireGoldConfetti(e.currentTarget);
    onSelectStyle(style);
  };

  return (
    <div className="style-selector">
      <h3 className="style-selector-title">选择风格</h3>
      <div className="style-cards-container">
        <div className="style-cards">
          {STYLES.map(style => (
            <div
              key={style.id}
              className={`style-card ${selectedStyle === style.id ? 'selected' : ''}`}
              onClick={e => handleSelect(style.id, e)}
            >
              <div
                className="style-card-bg"
                style={{ backgroundImage: `url(${style.thumbnail})` }}
              />
              <span className="style-card-name">{style.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
