import React, { useRef, useEffect } from 'react';
import { NoteDuration } from './PlaybackEngine';

interface NoteEditorProps {
  selectedDuration: NoteDuration;
  onDurationChange: (duration: NoteDuration) => void;
  isPlaying: boolean;
  playbackSpeed: number;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onSpeedChange: (speed: number) => void;
  noteCount: number;
}

const DURATIONS: { value: NoteDuration; label: string }[] = [
  { value: 4, label: '全音符' },
  { value: 2, label: '二分音符' },
  { value: 1, label: '四分音符' },
  { value: 0.5, label: '八分音符' },
];

const SPEEDS = [0.5, 1, 1.5, 2];

function PaletteNoteIcon({ duration, selected }: { duration: NoteDuration; selected: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = 48 * dpr;
    canvas.height = 48 * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, 48, 48);

    const color = selected ? '#e94560' : '#4a6fa1';
    const strokeColor = selected ? '#e94560' : '#0f3460';

    ctx.fillStyle = color;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1.5;

    if (duration === 4) {
      ctx.beginPath();
      ctx.ellipse(24, 32, 10, 7, -0.2, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.ellipse(24, 32, 10, 7, -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    if (duration !== 4) {
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(33, 32);
      ctx.lineTo(33, 8);
      ctx.stroke();

      if (duration === 1 || duration === 0.5) {
        ctx.fillStyle = strokeColor;
        ctx.beginPath();
        ctx.moveTo(33, 8);
        ctx.lineTo(33 + 9, 13);
        ctx.lineTo(33, 18);
        ctx.closePath();
        ctx.fill();
      }

      if (duration === 0.5) {
        ctx.beginPath();
        ctx.moveTo(33, 14);
        ctx.lineTo(33 + 9, 19);
        ctx.lineTo(33, 24);
        ctx.closePath();
        ctx.fill();
      }
    }

    if (duration === 2) {
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(33, 32);
      ctx.lineTo(33, 8);
      ctx.stroke();
    }
  }, [duration, selected]);

  return <canvas ref={canvasRef} style={{ width: 48, height: 48 }} />;
}

const NoteEditor: React.FC<NoteEditorProps> = ({
  selectedDuration,
  onDurationChange,
  isPlaying,
  playbackSpeed,
  onPlay,
  onPause,
  onStop,
  onSpeedChange,
  noteCount,
}) => {
  return (
    <div className="side-panel">
      <div className="panel-card palette-card">
        <h3>音符时值</h3>
        <div className="palette-grid">
          {DURATIONS.map(d => (
            <div
              key={d.value}
              className={`palette-item ${selectedDuration === d.value ? 'selected' : ''}`}
              onClick={() => onDurationChange(d.value)}
            >
              <PaletteNoteIcon duration={d.value} selected={selectedDuration === d.value} />
              <span>{d.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="panel-card">
        <h3>播放控制</h3>
        <div className="playback-controls">
          <button
            className={`play-btn ${isPlaying ? 'playing' : ''}`}
            onClick={isPlaying ? onPause : onPlay}
          >
            {isPlaying ? '⏸ 暂停' : '▶ 播放'}
          </button>
          <button className="stop-btn" onClick={onStop}>
            ⏹ 停止
          </button>
          <div>
            <h3 style={{ fontSize: '11px', marginBottom: '8px' }}>速度</h3>
            <div className="speed-controls">
              {SPEEDS.map(speed => (
                <button
                  key={speed}
                  className={`speed-btn ${playbackSpeed === speed ? 'active' : ''}`}
                  onClick={() => onSpeedChange(speed)}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="panel-card info-section">
        <h3>信息</h3>
        <div className="note-info">
          <div>音符数量：<strong>{noteCount}</strong></div>
          <div>音高范围：<strong>C4 - C6</strong></div>
        </div>
        <div className="hint-text">
          点击谱面添加音符<br />
          拖拽音符调整位置<br />
          选中音符后按 Delete 删除
        </div>
      </div>
    </div>
  );
};

export default NoteEditor;
