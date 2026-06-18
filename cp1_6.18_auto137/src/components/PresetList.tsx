import React from 'react';
import { Check } from 'lucide-react';
import { useColorStore } from '../store/colorStore';
import { hslToHex, getContrastColor } from '../utils/colorUtils';

const PresetList: React.FC = () => {
  const presets = useColorStore(state => state.presets);
  const primaryColor = useColorStore(state => state.primaryColor);
  const applyPreset = useColorStore(state => state.applyPreset);

  const currentHex = hslToHex(primaryColor.h, primaryColor.s, primaryColor.l);

  return (
    <div className="px-4 py-8 pb-24">
      <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center" style={{ fontFamily: "'Playfair Display', serif" }}>
        经典预设
      </h2>
      <p className="text-center text-sm text-gray-400 mb-8">
        点击快速应用精选配色方案
      </p>

      <div className="max-w-md mx-auto space-y-4">
        {presets.map((preset) => {
          const presetHex = hslToHex(preset.primary.h, preset.primary.s, preset.primary.l);
          const isActive = presetHex.toLowerCase() === currentHex.toLowerCase();
          const contrastColor = getContrastColor(presetHex);

          return (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset.id)}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 hover:scale-[1.02] ${
                isActive
                  ? 'ring-2 ring-offset-2'
                  : 'backdrop-blur-xl bg-white/40 border border-gray-200/50 hover:bg-white/60 shadow-lg hover:shadow-xl'
              }`}
              style={{
                backgroundColor: isActive ? presetHex : undefined,
                ringColor: isActive ? presetHex : undefined,
              }}
            >
              <div
                className="w-12 h-12 rounded-xl shadow-inner flex-shrink-0"
                style={{
                  backgroundColor: presetHex,
                  boxShadow: `0 4px 12px ${presetHex}40`,
                }}
              />

              <div className="flex-1 text-left">
                <h3
                  className="font-bold text-base"
                  style={{ color: isActive ? contrastColor : '#1F2937' }}
                >
                  {preset.name}
                </h3>
                <p
                  className="font-mono text-sm"
                  style={{ color: isActive ? `${contrastColor}CC` : '#9CA3AF' }}
                >
                  {presetHex} · HSL({preset.primary.h}, {preset.primary.s}%, {preset.primary.l}%)
                </p>
              </div>

              {isActive && (
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: contrastColor, color: presetHex }}
                >
                  <Check size={18} />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default PresetList;
