import React from 'react';
import { MATERIALS, AREAS, getMaterialById } from '../data/materials';
import type { AreaId, MaterialConfig, MaterialCategory } from '../types';

interface MaterialPanelProps {
  selectedArea: AreaId;
  onAreaChange: (area: AreaId) => void;
  currentMaterials: Record<AreaId, string>;
  onMaterialSelect: (areaId: AreaId, materialId: string) => void;
  onReset: () => void;
  isAnimating: boolean;
}

const CATEGORIES: { id: MaterialCategory | 'all'; name: string }[] = [
  { id: 'all', name: '全部' },
  { id: 'wood', name: '木质' },
  { id: 'stone', name: '石材' },
  { id: 'fabric', name: '布艺' },
  { id: 'metal', name: '金属' },
  { id: 'glass', name: '玻璃' },
];

const MaterialPanel: React.FC<MaterialPanelProps> = ({
  selectedArea,
  onAreaChange,
  currentMaterials,
  onMaterialSelect,
  onReset,
  isAnimating,
}) => {
  const [selectedCategory, setSelectedCategory] = React.useState<MaterialCategory | 'all'>('all');

  const filteredMaterials = React.useMemo(() => {
    if (selectedCategory === 'all') {
      return MATERIALS.filter(m => m.category !== 'default');
    }
    return MATERIALS.filter(m => m.category === selectedCategory);
  }, [selectedCategory]);

  const currentMaterialId = currentMaterials[selectedArea];
  const currentMaterial = getMaterialById(currentMaterialId);
  const selectedAreaConfig = AREAS.find(a => a.id === selectedArea);

  const generateMaterialStyle = (material: MaterialConfig): React.CSSProperties => {
    let background: React.CSSProperties['background'] = material.color;
    let backgroundSize: React.CSSProperties['backgroundSize'] = undefined;
    
    if (material.category === 'wood') {
      background = `linear-gradient(135deg, ${material.color} 0%, ${adjustColor(material.color, -20)} 50%, ${material.color} 100%)`;
    } else if (material.category === 'stone') {
      background = `linear-gradient(45deg, ${material.color} 25%, ${adjustColor(material.color, 10)} 25%, ${adjustColor(material.color, 10)} 50%, ${material.color} 50%, ${material.color} 75%, ${adjustColor(material.color, 10)} 75%)`;
      backgroundSize = '8px 8px';
    } else if (material.category === 'fabric') {
      background = `repeating-linear-gradient(0deg, ${material.color}, ${adjustColor(material.color, -5)} 2px, ${material.color} 2px, ${adjustColor(material.color, 5)} 4px)`;
    } else if (material.category === 'metal') {
      background = `linear-gradient(135deg, ${adjustColor(material.color, 20)} 0%, ${material.color} 30%, ${adjustColor(material.color, -15)} 50%, ${material.color} 70%, ${adjustColor(material.color, 20)} 100%)`;
    } else if (material.category === 'glass') {
      background = `linear-gradient(135deg, ${material.color}88 0%, ${adjustColor(material.color, 30)}44 50%, ${material.color}88 100%)`;
    }
    
    return { background, backgroundSize };
  };

  return (
    <div className="material-panel">
      <div className="panel-header">
        <h2 className="area-title">{selectedAreaConfig?.name || '选择区域'}</h2>
        <p className="current-material">当前：{currentMaterial?.name || '-'}</p>
      </div>

      <div className="area-tabs">
        {AREAS.map(area => (
          <button
            key={area.id}
            className={`area-tab ${selectedArea === area.id ? 'active' : ''}`}
            onClick={() => onAreaChange(area.id as AreaId)}
          >
            {area.name}
          </button>
        ))}
      </div>

      <div className="category-tabs">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            className={`category-tab ${selectedCategory === cat.id ? 'active' : ''}`}
            onClick={() => setSelectedCategory(cat.id)}
          >
            {cat.name}
          </button>
        ))}
      </div>

      <div className="material-grid">
        {filteredMaterials.map(material => (
          <div
            key={material.id}
            className={`material-item ${currentMaterialId === material.id ? 'selected' : ''}`}
            onClick={() => !isAnimating && onMaterialSelect(selectedArea, material.id)}
          >
            <div 
              className="material-thumbnail"
              style={generateMaterialStyle(material)}
            />
            <span className="material-name">{material.name}</span>
          </div>
        ))}
      </div>

      <button 
        className="reset-button"
        onClick={onReset}
        disabled={isAnimating}
      >
        重置全部材质
      </button>
    </div>
  );
};

function adjustColor(color: string, amount: number): string {
  const hex = color.replace('#', '');
  const num = parseInt(hex, 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
  const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

export default MaterialPanel;
