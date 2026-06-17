import React, { useCallback } from 'react';
import { X, Plus } from 'lucide-react';
import type { Skill } from '../../types';
import { playClickSound } from '../../utils/audio';

interface SkillEditorProps {
  skills: Skill[];
  onUpdate: (skillId: string, updates: Partial<Skill>) => void;
  onAdd: () => void;
  onRemove: (skillId: string) => void;
  disabled?: boolean;
}

export const SkillEditor: React.FC<SkillEditorProps> = ({
  skills,
  onUpdate,
  onAdd,
  onRemove,
  disabled = false,
}) => {
  const handleAddSkill = useCallback(() => {
    if (!disabled && skills.length < 3) {
      playClickSound();
      onAdd();
    }
  }, [disabled, skills.length, onAdd]);

  const handleRemoveSkill = useCallback(
    (skillId: string) => {
      if (!disabled && skills.length > 1) {
        playClickSound();
        onRemove(skillId);
      }
    },
    [disabled, skills.length, onRemove]
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-300">技能配置</span>
        <button
          onClick={handleAddSkill}
          disabled={disabled || skills.length >= 3}
          className="flex items-center gap-1 px-2 py-1 text-xs rounded-md
            bg-secondary/50 text-accent hover:bg-accent hover:text-white
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all duration-300"
        >
          <Plus size={12} />
          添加技能
        </button>
      </div>

      {skills.map((skill, index) => (
        <div
          key={skill.id}
          className="p-3 rounded-lg bg-secondary/60 border border-white/5 animate-fade-in"
        >
          <div className="flex items-start justify-between mb-2">
            <input
              type="text"
              value={skill.name}
              onChange={(e) => onUpdate(skill.id, { name: e.target.value })}
              disabled={disabled}
              className="flex-1 bg-transparent border-b border-white/10 text-white
                focus:border-accent outline-none text-sm font-medium
                disabled:opacity-60 transition-colors duration-300"
              placeholder={`技能 ${index + 1}`}
            />
            {skills.length > 1 && (
              <button
                onClick={() => handleRemoveSkill(skill.id)}
                disabled={disabled}
                className="ml-2 p-1 text-gray-500 hover:text-red-400
                  disabled:opacity-50 transition-colors duration-200"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">伤害系数</label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0.5"
                  max="3"
                  step="0.1"
                  value={skill.damageCoefficient}
                  onChange={(e) =>
                    onUpdate(skill.id, { damageCoefficient: parseFloat(e.target.value) })
                  }
                  disabled={disabled}
                  className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer
                    bg-white/10 accent-accent disabled:opacity-50"
                />
                <span className="text-xs text-accent font-mono w-8 text-right">
                  {skill.damageCoefficient.toFixed(1)}x
                </span>
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-1">冷却回合</label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="1"
                  value={skill.cooldown}
                  onChange={(e) =>
                    onUpdate(skill.id, { cooldown: parseInt(e.target.value, 10) })
                  }
                  disabled={disabled}
                  className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer
                    bg-white/10 accent-accent disabled:opacity-50"
                />
                <span className="text-xs text-accent font-mono w-8 text-right">
                  {skill.cooldown}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-2">
            <input
              type="text"
              value={skill.description}
              onChange={(e) => onUpdate(skill.id, { description: e.target.value })}
              disabled={disabled}
              className="w-full bg-transparent text-xs text-gray-400 border-b border-white/5
                focus:border-accent/50 outline-none disabled:opacity-60
                transition-colors duration-300"
              placeholder="技能描述..."
            />
          </div>
        </div>
      ))}
    </div>
  );
};
