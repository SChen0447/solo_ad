import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Filter, GripVertical, Trash2, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { FilterPreset } from '@/types';
import { filterPresetManager } from '@/engine/FilterPresetManager';
import { eventBus } from '@/utils/EventBus';

interface FilterListProps {
  selectedPresetId: string | null;
  onPresetSelect: (preset: FilterPreset | null) => void;
}

export const FilterList: React.FC<FilterListProps> = ({ selectedPresetId, onPresetSelect }) => {
  const [presets, setPresets] = useState<FilterPreset[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    setPresets(filterPresetManager.getAllPresets());
    
    const unsubscribe = eventBus.on('PRESETS_UPDATED', (updatedPresets) => {
      setPresets(updatedPresets);
    });

    return unsubscribe;
  }, []);

  const handlePresetClick = (preset: FilterPreset) => {
    if (selectedPresetId === preset.id) {
      onPresetSelect(null);
      eventBus.emit('SELECTED_PRESET_CHANGED', null);
    } else {
      onPresetSelect(preset);
      eventBus.emit('SELECTED_PRESET_CHANGED', preset.id);
    }
  };

  const handleDeletePreset = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    filterPresetManager.deletePreset(id);
    if (selectedPresetId === id) {
      onPresetSelect(null);
      eventBus.emit('SELECTED_PRESET_CHANGED', null);
    }
  };

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  }, [dragOverIndex]);

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      filterPresetManager.reorderPresets(draggedIndex, dropIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, [draggedIndex]);

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, []);

  const builtInPresets = presets.filter((p) => p.isBuiltIn);
  const customPresets = presets.filter((p) => !p.isBuiltIn);

  const FilterCard = ({ preset, index }: { preset: FilterPreset; index: number }) => (
    <div
      key={preset.id}
      className={`filter-card ${selectedPresetId === preset.id ? 'selected' : ''} ${draggedIndex === index ? 'dragging' : ''} ${dragOverIndex === index ? 'drag-over' : ''}`}
      draggable
      onDragStart={(e) => handleDragStart(e, index)}
      onDragOver={(e) => handleDragOver(e, index)}
      onDragLeave={handleDragLeave}
      onDrop={(e) => handleDrop(e, index)}
      onDragEnd={handleDragEnd}
      onClick={() => handlePresetClick(preset)}
    >
      <div className="drag-handle">
        <GripVertical size={12} />
      </div>
      <div className="filter-thumbnail">
        {preset.thumbnail ? (
          <img src={preset.thumbnail} alt={preset.name} />
        ) : (
          <div className="thumbnail-placeholder">
            <Filter size={24} />
          </div>
        )}
      </div>
      <div className="filter-name">{preset.name}</div>
      {!preset.isBuiltIn && (
        <button
          className="delete-preset-btn"
          onClick={(e) => handleDeletePreset(e, preset.id)}
          title="删除预设"
        >
          <Trash2 size={12} />
        </button>
      )}
      {selectedPresetId === preset.id && (
        <div className="selected-glow" />
      )}
    </div>
  );

  const MobileHeader = (
    <div 
      className="drawer-header" 
      onClick={() => setIsDrawerOpen(!isDrawerOpen)}
    >
      <div className="drawer-title">
        <Filter size={18} />
        <span>滤镜预设</span>
        <span className="preset-count">({presets.length})</span>
      </div>
      {isDrawerOpen ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
    </div>
  );

  const FilterContent = (
    <div className={`filter-content ${isMobile && !isDrawerOpen ? 'collapsed' : ''}`}>
      {builtInPresets.length > 0 && (
        <div className="filter-group">
          <div className="group-title">内置预设</div>
          <div className="filter-cards" ref={listRef}>
            {builtInPresets.map((preset, index) => (
              <FilterCard key={preset.id} preset={preset} index={index} />
            ))}
          </div>
        </div>
      )}
      
      {customPresets.length > 0 && (
        <div className="filter-group">
          <div className="group-title">
            自定义预设
            <span className="custom-count">({customPresets.length})</span>
          </div>
          <div className="filter-cards">
            {customPresets.map((preset, index) => (
              <FilterCard 
                key={preset.id} 
                preset={preset} 
                index={builtInPresets.length + index} 
              />
            ))}
          </div>
        </div>
      )}

      {customPresets.length === 0 && (
        <div className="no-custom-presets">
          <Plus size={20} />
          <p>调节参数后可保存为自定义预设</p>
        </div>
      )}
    </div>
  );

  return (
    <div className={`filter-list ${isMobile ? 'mobile' : 'desktop'}`}>
      {isMobile && MobileHeader}
      {(!isMobile || isDrawerOpen) && FilterContent}
    </div>
  );
};
