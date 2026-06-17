import { useState } from 'react';

interface ControlPanelProps {
  hanziList: string[];
  currentChar: string;
  currentStrokeIndex: number;
  totalStrokes: number;
  isPlaying: boolean;
  playSpeed: number;
  onCharChange: (char: string) => void;
  onTogglePlay: () => void;
  onProgressChange: (index: number) => void;
  onSpeedChange: (speed: number) => void;
}

const interactiveStyle = {
  cursor: 'pointer' as const,
  transition: 'transform 0.2s ease',
  userSelect: 'none' as const,
};

export function ControlPanel({
  hanziList,
  currentChar,
  currentStrokeIndex,
  totalStrokes,
  isPlaying,
  playSpeed,
  onCharChange,
  onTogglePlay,
  onProgressChange,
  onSpeedChange,
}: ControlPanelProps) {
  const [activeElement, setActiveElement] = useState<string | null>(null);

  const getElementStyle = (id: string): React.CSSProperties => ({
    ...interactiveStyle,
    transform: activeElement === id ? 'scale(0.95)' : 'scale(1)',
    transition: activeElement === id ? 'transform 0.1s ease' : 'transform 0.2s ease',
  });

  const handleMouseDown = (id: string) => setActiveElement(id);
  const handleMouseUp = () => setActiveElement(null);
  const handleMouseLeave = () => setActiveElement(null);

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '20px',
        backgroundColor: '#fdf5e6',
        borderRadius: '8px',
        padding: '16px',
        maxWidth: '90vw',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <label htmlFor="hanzi-select" style={{ color: '#2c1810', fontSize: '14px', fontFamily: 'KaiTi, STKaiti, serif' }}>
          选择汉字:
        </label>
        <select
          id="hanzi-select"
          value={currentChar}
          onChange={(e) => onCharChange(e.target.value)}
          onMouseDown={() => handleMouseDown('select')}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          style={{
            ...getElementStyle('select'),
            padding: '8px 12px',
            fontSize: '18px',
            fontFamily: 'KaiTi, STKaiti, serif',
            backgroundColor: '#fff',
            border: '1px solid #8B4513',
            borderRadius: '4px',
            color: '#2c1810',
            minWidth: '70px',
          }}
        >
          {hanziList.map((char) => (
            <option key={char} value={char}>
              {char}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={onTogglePlay}
        onMouseDown={() => handleMouseDown('play')}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        style={{
          ...getElementStyle('play'),
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          border: 'none',
          backgroundColor: '#8B4513',
          color: '#fff',
          fontSize: '18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(139, 69, 19, 0.3)',
        }}
      >
        {isPlaying ? '⏸' : '▶'}
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '80%', minWidth: '200px' }}>
        <label style={{ color: '#2c1810', fontSize: '14px', fontFamily: 'KaiTi, STKaiti, serif', whiteSpace: 'nowrap' }}>
          进度:
        </label>
        <input
          type="range"
          min={0}
          max={Math.max(0, totalStrokes - 1)}
          step={1}
          value={currentStrokeIndex}
          onChange={(e) => onProgressChange(Number(e.target.value))}
          onMouseDown={() => handleMouseDown('progress')}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          style={{
            ...getElementStyle('progress'),
            flex: 1,
            height: '6px',
            accentColor: '#8B4513',
          }}
        />
        <span style={{ color: '#2c1810', fontSize: '14px', fontFamily: 'KaiTi, STKaiti, serif', minWidth: '45px', textAlign: 'right' }}>
          {currentStrokeIndex + 1}/{totalStrokes}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <label style={{ color: '#2c1810', fontSize: '14px', fontFamily: 'KaiTi, STKaiti, serif', whiteSpace: 'nowrap' }}>
          速度:
        </label>
        <input
          type="range"
          min={0.5}
          max={3}
          step={0.25}
          value={playSpeed}
          onChange={(e) => onSpeedChange(Number(e.target.value))}
          onMouseDown={() => handleMouseDown('speed')}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          style={{
            ...getElementStyle('speed'),
            width: '120px',
            height: '6px',
            accentColor: '#8B4513',
          }}
        />
        <span style={{ color: '#2c1810', fontSize: '14px', fontFamily: 'KaiTi, STKaiti, serif', minWidth: '40px' }}>
          {playSpeed}x
        </span>
      </div>
    </div>
  );
}
