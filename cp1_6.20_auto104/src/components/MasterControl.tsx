import React, { useRef, useState } from 'react';

interface MasterControlProps {
  masterVolume: number;
  isPlaying: boolean;
  bpm: number;
  currentTime: number;
  duration: number;
  onMasterVolumeChange: (v: number) => void;
  onTogglePlay: () => void;
  onBPMChange: (bpm: number) => void;
  onSeek: (time: number) => void;
}

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const MasterControl: React.FC<MasterControlProps> = ({
  masterVolume,
  isPlaying,
  bpm,
  currentTime,
  duration,
  onMasterVolumeChange,
  onTogglePlay,
  onBPMChange,
  onSeek,
}) => {
  const [showVolumeTip, setShowVolumeTip] = useState(false);
  const [showBpmTip, setShowBpmTip] = useState(false);
  const [tipPos, setTipPos] = useState({ x: 0, y: 0 });
  const progressRef = useRef<HTMLDivElement>(null);
  const bpmKnobRef = useRef<HTMLDivElement>(null);
  const isDraggingBpm = useRef(false);
  const bpmStartAngle = useRef(0);
  const bpmStartValue = useRef(0);

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = progressRef.current?.getBoundingClientRect();
    if (!rect) return;
    const percent = (e.clientX - rect.left) / rect.width;
    onSeek(percent * duration);
  };

  const handleBpmMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingBpm.current = true;
    const knob = bpmKnobRef.current;
    if (!knob) return;
    const rect = knob.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    bpmStartAngle.current = Math.atan2(e.clientY - centerY, e.clientX - centerX);
    bpmStartValue.current = bpm;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingBpm.current) return;
      const newAngle = Math.atan2(moveEvent.clientY - centerY, moveEvent.clientX - centerX);
      let angleDiff = (newAngle - bpmStartAngle.current) * (180 / Math.PI);
      if (angleDiff > 180) angleDiff -= 360;
      if (angleDiff < -180) angleDiff += 360;
      let newValue = bpmStartValue.current + angleDiff * (120 / 270);
      newValue = Math.max(60, Math.min(180, newValue));
      newValue = Math.round(newValue / 5) * 5;
      onBPMChange(newValue);
    };

    const handleMouseUp = () => {
      isDraggingBpm.current = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const bpmRotation = ((bpm - 60) / 120) * 270 - 135;
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const bpmTicks = [];
  for (let i = 60; i <= 180; i += 20) {
    const tickAngle = ((i - 60) / 120) * 270 - 135;
    bpmTicks.push(
      <div
        key={i}
        className="bpm-tick"
        style={{ transform: `rotate(${tickAngle}deg)` }}
      >
        <div className="bpm-tick-line" />
      </div>
    );
  }

  return (
    <div className="master-control">
      <div className="progress-section">
        <span className="time-label">{formatTime(currentTime)}</span>
        <div
          ref={progressRef}
          className="progress-bar"
          onClick={handleProgressClick}
        >
          <div
            className="progress-fill"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <span className="time-label">{formatTime(duration)}</span>
      </div>

      <div className="master-controls-row">
        <div className="play-control">
          <button
            className={`play-btn ${isPlaying ? 'playing' : ''}`}
            onClick={onTogglePlay}
          >
            {isPlaying ? (
              <div className="stop-icon" />
            ) : (
              <div className="play-icon" />
            )}
          </button>
          <span className="control-label">{isPlaying ? 'PAUSE' : 'PLAY'}</span>
        </div>

        <div
          className="bpm-control"
          onMouseEnter={() => setShowBpmTip(true)}
          onMouseLeave={() => setShowBpmTip(false)}
          onMouseMove={(e) => setTipPos({ x: e.clientX, y: e.clientY })}
        >
          <div className="bpm-knob-container">
            {bpmTicks}
            <div
              ref={bpmKnobRef}
              className="bpm-knob"
              onMouseDown={handleBpmMouseDown}
              style={{ transform: `rotate(${bpmRotation}deg)` }}
            >
              <div className="bpm-knob-indicator" />
            </div>
          </div>
          <span className="bpm-value">{bpm} BPM</span>
        </div>

        <div
          className="master-volume-control"
          onMouseEnter={() => setShowVolumeTip(true)}
          onMouseLeave={() => setShowVolumeTip(false)}
          onMouseMove={(e) => setTipPos({ x: e.clientX, y: e.clientY })}
        >
          <span className="control-label">MASTER</span>
          <input
            type="range"
            min="0"
            max="100"
            value={masterVolume}
            onChange={(e) => onMasterVolumeChange(Number(e.target.value))}
            className="volume-slider horizontal"
            style={{ '--slider-color': '#a29bfe', width: '300px' } as React.CSSProperties}
          />
          <span className="volume-value">{masterVolume}%</span>
        </div>
      </div>

      {showVolumeTip && (
        <div
          className="tooltip"
          style={{ left: tipPos.x + 10, top: tipPos.y - 30 }}
        >
          音量: {masterVolume}%
        </div>
      )}
      {showBpmTip && (
        <div
          className="tooltip"
          style={{ left: tipPos.x + 10, top: tipPos.y - 30 }}
        >
          BPM: {bpm}
        </div>
      )}
    </div>
  );
};

export default MasterControl;
