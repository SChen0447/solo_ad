import React, { useState, useCallback, useEffect } from 'react';
import { Check, X } from 'lucide-react';
import { useColorStore } from '../store/colorStore';
import { getContrastColor } from '../utils/colorUtils';
import type { Swatch, HSL } from '../types';

interface SwatchCardProps {
  swatch: Swatch;
  onCopy: (hex: string) => void;
  copiedId: string | null;
  onDoubleClick: (swatch: Swatch) => void;
}

const SwatchCard: React.FC<SwatchCardProps> = React.memo(({ swatch, onCopy, copiedId, onDoubleClick }) => {
  const contrastColor = getContrastColor(swatch.hex);
  const isCopied = copiedId === swatch.id;

  return (
    <div
      key={swatch.id}
      className="relative flex flex-col rounded-xl overflow-hidden backdrop-blur-xl bg-white/40 border border-gray-200/50 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-400 cursor-pointer group"
      style={{
        width: '120px',
        height: '160px',
        animation: 'fadeIn 0.4s ease-out',
      }}
      onClick={() => onCopy(swatch.hex)}
      onDoubleClick={() => onDoubleClick(swatch)}
    >
      <div
        className="flex-1 relative transition-all duration-400"
        style={{ backgroundColor: swatch.hex }}
      >
        <div
          className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${
            isCopied ? 'opacity-100' : 'opacity-0 group-hover:opacity-80'
          }`}
          style={{ backgroundColor: `${swatch.hex}CC` }}
        >
          {isCopied ? (
            <div className="flex items-center gap-1" style={{ color: contrastColor }}>
              <Check size={16} />
              <span className="text-xs font-medium">已复制</span>
            </div>
          ) : (
            <span className="text-xs font-medium" style={{ color: contrastColor }}>
              点击复制
            </span>
          )}
        </div>
      </div>

      <div className="p-3 bg-white/80 backdrop-blur-sm">
        <p className="text-xs text-gray-500 font-medium mb-1">{swatch.label}</p>
        <p className="font-mono text-sm text-gray-800 font-bold">{swatch.hex}</p>
      </div>

      {isCopied && (
        <div
          className="absolute -top-8 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full text-xs font-medium shadow-lg animate-bounce-in"
          style={{ backgroundColor: swatch.hex, color: contrastColor }}
        >
          复制成功!
        </div>
      )}
    </div>
  );
});

SwatchCard.displayName = 'SwatchCard';

const SwatchPanel: React.FC = () => {
  const swatches = useColorStore(state => state.swatches);
  const updateSwatch = useColorStore(state => state.updateSwatch);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingSwatch, setEditingSwatch] = useState<Swatch | null>(null);
  const [tempHsl, setTempHsl] = useState<HSL | null>(null);

  const handleCopy = useCallback(async (hex: string) => {
    try {
      await navigator.clipboard.writeText(hex);
      const swatch = swatches.find(s => s.hex === hex);
      if (swatch) {
        setCopiedId(swatch.id);
        setTimeout(() => setCopiedId(null), 1500);
      }
    } catch {
      console.error('Failed to copy');
    }
  }, [swatches]);

  const handleDoubleClick = useCallback((swatch: Swatch) => {
    setEditingSwatch(swatch);
    setTempHsl({ ...swatch.hsl });
  }, []);

  const handleCloseEditor = useCallback(() => {
    setEditingSwatch(null);
    setTempHsl(null);
  }, []);

  const handleSliderChange = useCallback((key: keyof HSL, value: number) => {
    if (!editingSwatch || !tempHsl) return;

    const newHsl: HSL = { ...tempHsl, [key]: value };
    setTempHsl(newHsl);
    updateSwatch(editingSwatch.id, newHsl);
  }, [editingSwatch, tempHsl, updateSwatch]);

  useEffect(() => {
    if (editingSwatch) {
      const updated = swatches.find(s => s.id === editingSwatch.id);
      if (updated) {
        setEditingSwatch(updated);
      }
    }
  }, [swatches, editingSwatch]);

  return (
    <div className="px-4 py-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center" style={{ fontFamily: "'Playfair Display', serif" }}>
        配色方案
      </h2>

      <div className="flex flex-wrap justify-center gap-4 mb-8">
        {swatches.map((swatch, index) => (
          <div
            key={swatch.id}
            style={{ animationDelay: `${index * 0.08}s` }}
          >
            <SwatchCard
              swatch={swatch}
              onCopy={handleCopy}
              copiedId={copiedId}
              onDoubleClick={handleDoubleClick}
            />
          </div>
        ))}
      </div>

      <p className="text-center text-sm text-gray-400 mb-4">
        双击色块可微调 · 点击色块复制色值
      </p>

      {editingSwatch && tempHsl && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-end justify-center z-50 animate-fadeIn">
          <div className="w-full max-w-lg bg-white rounded-t-3xl p-6 shadow-2xl animate-slideUp">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-gray-800">
                微调 {editingSwatch.label}
              </h3>
              <button
                onClick={handleCloseEditor}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <div
              className="w-full h-20 rounded-xl mb-6 shadow-inner"
              style={{ backgroundColor: editingSwatch.hex }}
            />

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600 font-medium">色相 (H)</span>
                  <span className="font-mono text-gray-800">{tempHsl.h}°</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={tempHsl.h}
                  onChange={(e) => handleSliderChange('h', Number(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, 
                      hsl(0, ${tempHsl.s}%, ${tempHsl.l}%), 
                      hsl(60, ${tempHsl.s}%, ${tempHsl.l}%), 
                      hsl(120, ${tempHsl.s}%, ${tempHsl.l}%), 
                      hsl(180, ${tempHsl.s}%, ${tempHsl.l}%), 
                      hsl(240, ${tempHsl.s}%, ${tempHsl.l}%), 
                      hsl(300, ${tempHsl.s}%, ${tempHsl.l}%), 
                      hsl(360, ${tempHsl.s}%, ${tempHsl.l}%)
                    )`,
                  }}
                />
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600 font-medium">饱和度 (S)</span>
                  <span className="font-mono text-gray-800">{tempHsl.s}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={tempHsl.s}
                  onChange={(e) => handleSliderChange('s', Number(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, 
                      hsl(${tempHsl.h}, 0%, ${tempHsl.l}%), 
                      hsl(${tempHsl.h}, 100%, ${tempHsl.l}%)
                    )`,
                  }}
                />
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600 font-medium">明度 (L)</span>
                  <span className="font-mono text-gray-800">{tempHsl.l}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={tempHsl.l}
                  onChange={(e) => handleSliderChange('l', Number(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, 
                      hsl(${tempHsl.h}, ${tempHsl.s}%, 0%), 
                      hsl(${tempHsl.h}, ${tempHsl.s}%, 50%), 
                      hsl(${tempHsl.h}, ${tempHsl.s}%, 100%)
                    )`,
                  }}
                />
              </div>
            </div>

            <div className="mt-6 p-4 bg-gray-50 rounded-xl">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">当前色值</span>
                <span className="font-mono text-lg font-bold text-gray-800">
                  {editingSwatch.hex}
                </span>
              </div>
            </div>

            {editingSwatch.name === 'primary' && (
              <p className="mt-3 text-xs text-gray-400 text-center">
                调整主色将同步更新其他相关色块
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SwatchPanel;
