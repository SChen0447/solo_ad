import React from 'react';
import { Download, Gauge, Volume2, Palette } from 'lucide-react';

interface ControlPanelProps {
  speed: number;
  volume: number;
  style: string;
  onSpeedChange: (speed: number) => void;
  onVolumeChange: (volume: number) => void;
  onStyleChange: (style: string) => void;
  onExport: () => void;
  isExporting: boolean;
  hasVideo: boolean;
}

const STYLES = [
  { id: 'nature', label: '自然风光', icon: '🏔️' },
  { id: 'city', label: '城市夜景', icon: '🌃' },
  { id: 'ocean', label: '海洋波涛', icon: '🌊' },
  { id: 'forest', label: '森林秘境', icon: '🌲' },
  { id: 'sunset', label: '落日余晖', icon: '🌅' },
  { id: 'space', label: '星空宇宙', icon: '✨' },
];

export const ControlPanel: React.FC<ControlPanelProps> = ({
  speed,
  volume,
  style,
  onSpeedChange,
  onVolumeChange,
  onStyleChange,
  onExport,
  isExporting,
  hasVideo,
}) => {
  return (
    <div className="card p-5 flex flex-col gap-6 animate-fade-in">
      <h2 className="font-display text-xl font-bold text-white">控制面板</h2>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-text-secondary">
              <Gauge className="w-4 h-4" />
              <span className="font-medium">语速</span>
            </div>
            <span className="text-accent font-bold font-mono">{speed.toFixed(1)}x</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={speed}
            onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
            className="slider-track"
          />
          <div className="flex justify-between text-xs text-text-secondary/60">
            <span>0.5x</span>
            <span>1.0x</span>
            <span>2.0x</span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-text-secondary">
              <Volume2 className="w-4 h-4" />
              <span className="font-medium">背景音乐音量</span>
            </div>
            <span className="text-accent font-bold font-mono">{Math.round(volume * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className="slider-track"
          />
          <div className="flex justify-between text-xs text-text-secondary/60">
            <span>静音</span>
            <span>50%</span>
            <span>最大</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-text-secondary">
          <Palette className="w-4 h-4" />
          <span className="font-medium">背景风格</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {STYLES.map((s) => (
            <button
              key={s.id}
              onClick={() => onStyleChange(s.id)}
              className={`style-btn flex items-center gap-2 justify-center text-sm ${
                style === s.id ? 'style-btn-active' : ''
              }`}
            >
              <span>{s.icon}</span>
              <span>{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-auto pt-4 border-t border-white/10">
        <button
          onClick={onExport}
          disabled={!hasVideo || isExporting}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {isExporting ? (
            <>
              <span className="animate-spin">⏳</span>
              <span>导出中...</span>
            </>
          ) : (
            <>
              <Download className="w-5 h-5" />
              <span>导出 MP4 视频</span>
            </>
          )}
        </button>
        {!hasVideo && (
          <p className="text-text-secondary/60 text-xs text-center mt-2">
            请先输入并分析诗歌以生成视频
          </p>
        )}
      </div>
    </div>
  );
};
