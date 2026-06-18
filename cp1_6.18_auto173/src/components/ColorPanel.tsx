import { useState } from 'react';
import { useDesignStore } from '../store/designStore';
import { darkenColor, lightenColor } from '../utils/colorUtils';

const ColorPanel = () => {
  const { primaryColor, secondaryColor, accentColor, recommendedColors, setPrimaryColor } = useDesignStore();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const handleColorClick = (color: string, index: number) => {
    setPrimaryColor(color);
    setSelectedIndex(index);
  };

  const handleManualInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    if (!value.startsWith('#')) {
      value = '#' + value;
    }
    if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
      setPrimaryColor(value);
    }
  };

  return (
    <div className="color-panel">
      <h3 className="section-title">品牌主色调</h3>
      
      <div className="current-colors">
        <div className="color-item">
          <div 
            className="color-swatch large" 
            style={{ backgroundColor: primaryColor }}
            title="主色"
          />
          <span className="color-label">主色</span>
        </div>
        <div className="color-item">
          <div 
            className="color-swatch" 
            style={{ backgroundColor: secondaryColor }}
            title="辅助色（浅10%）"
          />
          <span className="color-label">浅色</span>
        </div>
        <div className="color-item">
          <div 
            className="color-swatch" 
            style={{ backgroundColor: accentColor }}
            title="强调色（深20%）"
          />
          <span className="color-label">深色</span>
        </div>
      </div>

      <div className="manual-input">
        <label htmlFor="color-input">十六进制色值</label>
        <input
          id="color-input"
          type="text"
          value={primaryColor}
          onChange={handleManualInput}
          placeholder="#4F46E5"
          className="color-input"
        />
        <input
          type="color"
          value={primaryColor}
          onChange={(e) => setPrimaryColor(e.target.value)}
          className="color-picker"
        />
      </div>

      {recommendedColors.length > 0 && (
        <div className="recommended-colors">
          <h4>推荐配色</h4>
          <div className="color-buttons">
            {recommendedColors.map((color, index) => (
              <button
                key={index}
                className={`color-circle-btn ${selectedIndex === index ? 'selected' : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => handleColorClick(color, index)}
                title={color}
              />
            ))}
          </div>
          <p className="hint-text">从Logo图片中提取</p>
        </div>
      )}
    </div>
  );
};

export default ColorPanel;
