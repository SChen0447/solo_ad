import React from 'react';

interface ControlPanelProps {
  chars: string[];
  currentChar: string;
  onCharChange: (char: string) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  currentStrokeIndex: number;
  totalStrokes: number;
  onProgressChange: (index: number) => void;
  speed: number;
  onSpeedChange: (speed: number) => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  chars,
  currentChar,
  onCharChange,
  isPlaying,
  onTogglePlay,
  currentStrokeIndex,
  totalStrokes,
  onProgressChange,
  speed,
  onSpeedChange,
}) => {
  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onCharChange(e.target.value);
  };

  const handleProgressInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    onProgressChange(Number(e.target.value));
  };

  const handleSpeedInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSpeedChange(Number(e.target.value));
  };

  return (
    <div className="control-panel">
      <div className="control-group">
        <label className="control-label">汉字：</label>
        <select
          className="hanzi-select"
          value={currentChar}
          onChange={handleSelectChange}
        >
          {chars.map((char) => (
            <option key={char} value={char}>
              {char}
            </option>
          ))}
        </select>
      </div>

      <div className="control-group">
        <button
          className="play-btn"
          onClick={onTogglePlay}
          title={isPlaying ? '暂停' : '播放'}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>
      </div>

      <div className="control-group progress-group">
        <div className="progress-label-row">
          <label className="control-label">进度：</label>
          <span className="stroke-info">
            第{currentStrokeIndex + 1}笔/共{totalStrokes}笔
          </span>
        </div>
        <input
          type="range"
          className="progress-slider"
          min={0}
          max={Math.max(0, totalStrokes - 1)}
          step={1}
          value={currentStrokeIndex}
          onChange={handleProgressInput}
        />
      </div>

      <div className="control-group">
        <label className="control-label">速度：</label>
        <input
          type="range"
          className="speed-slider"
          min={0.5}
          max={3}
          step={0.25}
          value={speed}
          onChange={handleSpeedInput}
        />
        <span className="speed-value">{speed.toFixed(1)}x</span>
      </div>
    </div>
  );
};

export default React.memo(ControlPanel);
