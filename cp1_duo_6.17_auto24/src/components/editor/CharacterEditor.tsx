import React, { useState, useCallback, useRef } from 'react';
import { Trash2, Edit2, Check, X } from 'lucide-react';
import type { CombatUnit, AttributeConfig } from '../../types';
import { ATTRIBUTE_CONFIGS, CHARACTER_ICONS, MONSTER_ICONS } from '../../types';
import { interpolateColor } from '../../utils/color';
import { playSliderSound, playClickSound } from '../../utils/audio';
import { SkillEditor } from './SkillEditor';

interface CharacterEditorProps {
  unit: CombatUnit;
  onUpdate: (updates: Partial<CombatUnit>) => void;
  onRemove: () => void;
  onToggleSelection: () => void;
  isSelected: boolean;
  onUpdateSkill: (skillId: string, updates: Partial<CombatUnit['skills'][0]>) => void;
  onAddSkill: () => void;
  onRemoveSkill: (skillId: string) => void;
  disabled?: boolean;
}

export const CharacterEditor: React.FC<CharacterEditorProps> = ({
  unit,
  onUpdate,
  onRemove,
  onToggleSelection,
  isSelected,
  onUpdateSkill,
  onAddSkill,
  onRemoveSkill,
  disabled = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(unit.name);
  const [editIcon, setEditIcon] = useState(unit.icon);
  const sliderTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSliderChange = useCallback(
    (key: AttributeConfig['key'], value: number) => {
      if (disabled) return;

      onUpdate({ [key]: value });

      if (sliderTimeoutRef.current) {
        clearTimeout(sliderTimeoutRef.current);
      }
      sliderTimeoutRef.current = setTimeout(() => {
        playSliderSound();
      }, 50);
    },
    [disabled, onUpdate]
  );

  const handleCardClick = useCallback(() => {
    if (disabled) return;
    playClickSound();
    if (!isEditing) {
      onToggleSelection();
    }
  }, [disabled, isEditing, onToggleSelection]);

  const handleStartEdit = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (disabled) return;
      playClickSound();
      setEditName(unit.name);
      setEditIcon(unit.icon);
      setIsEditing(true);
    },
    [disabled, unit.name, unit.icon]
  );

  const handleSaveEdit = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      playClickSound();
      onUpdate({ name: editName.trim() || '单位', icon: editIcon });
      setIsEditing(false);
    },
    [editName, editIcon, onUpdate]
  );

  const handleCancelEdit = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsEditing(false);
    },
    []
  );

  const handleRemove = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (disabled) return;
      playClickSound();
      onRemove();
    },
    [disabled, onRemove]
  );

  const icons = unit.type === 'character' ? CHARACTER_ICONS : MONSTER_ICONS;
  const gradient =
    unit.type === 'character'
      ? 'from-char-gradient-start to-char-gradient-end'
      : 'from-mon-gradient-start to-mon-gradient-end';

  return (
    <div
      className={`relative rounded-xl overflow-hidden transition-all duration-300 cursor-pointer
        ${isSelected ? 'ring-2 ring-accent scale-[1.02]' : ''}
        ${isEditing ? 'ring-2 ring-accent/50' : ''}
        hover:shadow-lg hover:shadow-accent/10
        bg-gradient-to-br ${gradient} p-[1px]`}
      onClick={handleCardClick}
    >
      <div className="bg-secondary rounded-[11px] p-4 h-full">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            {isEditing ? (
              <div className="flex gap-1 flex-wrap max-w-[120px]">
                {icons.map((icon) => (
                  <button
                    key={icon}
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditIcon(icon);
                    }}
                    className={`text-xl p-1 rounded transition-all duration-200
                      ${editIcon === icon ? 'bg-accent/30 scale-110' : 'hover:bg-white/10'}`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            ) : (
              <span className="text-3xl">{unit.icon}</span>
            )}

            <div>
              {isEditing ? (
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-transparent border-b border-accent text-white font-bold
                    focus:outline-none text-lg"
                  autoFocus
                />
              ) : (
                <h3 className="text-lg font-bold text-white">{unit.name}</h3>
              )}
              <span className="text-xs text-gray-400">
                {unit.type === 'character' ? '角色' : '怪物'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {isEditing ? (
              <>
                <button
                  onClick={handleSaveEdit}
                  className="p-1.5 rounded-md bg-green-500/20 text-green-400
                    hover:bg-green-500/40 transition-colors duration-200"
                >
                  <Check size={14} />
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="p-1.5 rounded-md bg-red-500/20 text-red-400
                    hover:bg-red-500/40 transition-colors duration-200"
                >
                  <X size={14} />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleStartEdit}
                  disabled={disabled}
                  className="p-1.5 rounded-md bg-white/5 text-gray-400
                    hover:bg-accent/20 hover:text-accent
                    disabled:opacity-50 transition-colors duration-200"
                >
                  <Edit2 size={14} />
                </button>
                <button
                  onClick={handleRemove}
                  disabled={disabled}
                  className="p-1.5 rounded-md bg-white/5 text-gray-400
                    hover:bg-red-500/20 hover:text-red-400
                    disabled:opacity-50 transition-colors duration-200"
                >
                  <Trash2 size={14} />
                </button>
              </>
            )}
          </div>
        </div>

        <div className="space-y-2">
          {ATTRIBUTE_CONFIGS.map((config) => {
            const value = unit[config.key];
            const color = interpolateColor(value, config.min, config.max);
            const percentage = ((value - config.min) / (config.max - config.min)) * 100;

            return (
              <div key={config.key} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">{config.label}</span>
                  <span className="font-mono text-white">
                    {value}
                    {config.unit || ''}
                  </span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${percentage}%`, backgroundColor: color }}
                  />
                </div>
                {!disabled && (
                  <input
                    type="range"
                    min={config.min}
                    max={config.max}
                    value={value}
                    onChange={(e) =>
                      handleSliderChange(config.key, parseInt(e.target.value, 10))
                    }
                    className="w-full h-1 -mt-0.5 opacity-0 cursor-pointer"
                    style={{ position: 'relative', top: '-8px' }}
                  />
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-4 pt-3 border-t border-white/10">
          <SkillEditor
            skills={unit.skills}
            onUpdate={onUpdateSkill}
            onAdd={onAddSkill}
            onRemove={onRemoveSkill}
            disabled={disabled}
          />
        </div>

        {isSelected && !isEditing && (
          <div className="absolute top-2 right-2 w-3 h-3 rounded-full bg-accent animate-pulse" />
        )}
      </div>
    </div>
  );
};
