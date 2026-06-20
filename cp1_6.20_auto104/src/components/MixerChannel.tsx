import React, { useRef, useEffect, useState } from 'react';
import { AnalyserNode } from 'standardized-audio-context';

interface MixerChannelProps {
  trackIndex: number;
  trackName: string;
  volume: number;
  pan: number;
  muted: boolean;
  solo: boolean;
  hasAudio: boolean;
  analyser?: AnalyserNode;
  onVolumeChange: (v: number) => void;
  onPanChange: (p: number) => void;
  onToggleMute: () => void;
  onToggleSolo: () => void;
  onFileDrop: (file: File) => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDropTrack: (e: React.DragEvent) => void;
  isDragging: boolean;
  dragOver: boolean;
}

const MixerChannel: React.FC<MixerChannelProps> = ({
  trackIndex,
  trackName,
  volume,
  pan,
  muted,
  solo,
  hasAudio,
  analyser,
  onVolumeChange,
  onPanChange,
  onToggleMute,
  onToggleSolo,
  onFileDrop,
  onDragStart,
  onDragOver,
  onDropTrack,
  isDragging,
  dragOver,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showVolumeTip, setShowVolumeTip] = useState(false);
  const [showPanTip, setShowPanTip] = useState(false);
  const [volumeTipPos, setVolumeTipPos] = useState({ x: 0, y: 0 });
  const [panTipPos, setPanTipPos] = useState({ x: 0, y: 0 });
  const panKnobRef = useRef<HTMLDivElement>(null);
  const isDraggingPan = useRef(false);
  const panStartAngle = useRef(0);
  const panStartValue = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);

      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(0, 0, rect.width, rect.height);

      if (analyser && hasAudio) {
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteTimeDomainData(dataArray);

        ctx.lineWidth = 2;
        ctx.strokeStyle = '#7bed9f';
        ctx.beginPath();

        const sliceWidth = rect.width / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0;
          const y = (v * rect.height) / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }

          x += sliceWidth;
        }

        ctx.lineTo(rect.width, rect.height / 2);
        ctx.stroke();
      } else {
        ctx.strokeStyle = 'rgba(123, 237, 159, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, rect.height / 2);
        ctx.lineTo(rect.width, rect.height / 2);
        ctx.stroke();
      }

      animationId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animationId);
  }, [analyser, hasAudio]);

  const handleFileDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      const validTypes = ['audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/x-wav'];
      const isValidType = validTypes.includes(file.type) || file.name.match(/\.(wav|mp3)$/i);
      if (isValidType && file.size <= 10 * 1024 * 1024) {
        onFileDrop(file);
      }
    }
  };

  const handleVolumeMouseMove = (e: React.MouseEvent) => {
    setVolumeTipPos({ x: e.clientX, y: e.clientY });
  };

  const handlePanMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingPan.current = true;
    const knob = panKnobRef.current;
    if (!knob) return;
    const rect = knob.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    panStartAngle.current = Math.atan2(e.clientY - centerY, e.clientX - centerX);
    panStartValue.current = pan;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingPan.current) return;
      const newAngle = Math.atan2(moveEvent.clientY - centerY, moveEvent.clientX - centerX);
      let angleDiff = (newAngle - panStartAngle.current) * (180 / Math.PI);
      if (angleDiff > 180) angleDiff -= 360;
      if (angleDiff < -180) angleDiff += 360;
      let newValue = panStartValue.current + angleDiff * (100 / 270);
      newValue = Math.max(-50, Math.min(50, newValue));
      onPanChange(Math.round(newValue));
    };

    const handleMouseUp = () => {
      isDraggingPan.current = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const panRotation = (pan / 50) * 135;

  return (
    <div
      className={`mixer-channel ${isDragging ? 'dragging' : ''} ${dragOver ? 'drag-over' : ''}`}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDropTrack}
    >
      <div
        className="channel-header"
        onDragOver={handleFileDragOver}
        onDrop={handleFileDrop}
      >
        <span className="track-name">{trackName}</span>
        <span className="track-index">Track {trackIndex + 1}</span>
      </div>

      <div
        className="waveform-container"
        onDragOver={handleFileDragOver}
        onDrop={handleFileDrop}
      >
        <canvas ref={canvasRef} className="waveform-canvas" />
        {!hasAudio && (
          <div className="drop-hint">
            拖拽 wav/mp3 到此处
            <br />
            (≤10MB)
          </div>
        )}
      </div>

      <div className="channel-controls">
        <div className="control-buttons">
          <button
            className={`mute-btn ${muted ? 'active' : ''}`}
            onClick={onToggleMute}
            title="静音"
          >
            M
          </button>
          <button
            className={`solo-btn ${solo ? 'active' : ''}`}
            onClick={onToggleSolo}
            title="独奏"
          >
            S
          </button>
        </div>

        <div
          className="pan-control"
          onMouseEnter={() => setShowPanTip(true)}
          onMouseLeave={() => setShowPanTip(false)}
          onMouseMove={(e) => setPanTipPos({ x: e.clientX, y: e.clientY })}
        >
          <div
            ref={panKnobRef}
            className="pan-knob"
            onMouseDown={handlePanMouseDown}
            style={{ transform: `rotate(${panRotation}deg)` }}
          >
            <div className="pan-knob-indicator" />
          </div>
          <span className="pan-label">PAN</span>
        </div>

        <div
          className="volume-control"
          onMouseEnter={() => setShowVolumeTip(true)}
          onMouseLeave={() => setShowVolumeTip(false)}
          onMouseMove={handleVolumeMouseMove}
        >
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={(e) => onVolumeChange(Number(e.target.value))}
            className="volume-slider vertical"
            style={{ '--slider-color': '#ff6b6b' } as React.CSSProperties}
          />
          <span className="volume-label">VOL</span>
        </div>
      </div>

      {showVolumeTip && (
        <div
          className="tooltip"
          style={{ left: volumeTipPos.x + 10, top: volumeTipPos.y - 30 }}
        >
          {volume}
        </div>
      )}
      {showPanTip && (
        <div
          className="tooltip"
          style={{ left: panTipPos.x + 10, top: panTipPos.y - 30 }}
        >
          {pan > 0 ? `R${pan}` : pan < 0 ? `L${Math.abs(pan)}` : 'C'}
        </div>
      )}
    </div>
  );
};

export default MixerChannel;
