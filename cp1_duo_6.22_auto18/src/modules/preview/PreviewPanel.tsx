import React, { useEffect, useRef, useState } from 'react';
import { audioEngine } from '../audio/AudioEngine';
import { synthEngine } from '../audio/SynthEngine';
import { formatTimestamp } from '../../store';

const WAVEFORM_SAMPLES = 512;

interface WaveformCanvasProps {
  zoom: number;
  scrollLeft: number;
  setScrollLeft: (v: number) => void;
}

const WaveformCanvas: React.FC<WaveformCanvasProps> = ({ zoom, scrollLeft, setScrollLeft }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const draggingRef = useRef<{ startX: number; wasPlaying: boolean } | null>(null);
  const lastScrollRef = useRef(0);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (container && 'ResizeObserver' in window) {
      resizeObserverRef.current = new ResizeObserver(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const dpr = window.devicePixelRatio || 1;
        const rect = container.getBoundingClientRect();
        canvas.width = Math.floor(rect.width * dpr);
        canvas.height = Math.floor(rect.height * dpr);
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
      });
      resizeObserverRef.current.observe(container);
    }
    return () => {
      resizeObserverRef.current?.disconnect();
    };
  }, []);

  const getViewRange = () => {
    const duration = audioEngine.getDuration() || 1;
    const visibleMs = Math.max(500, duration / zoom);
    const maxLeft = Math.max(0, duration - visibleMs);
    const startMs = Math.min(maxLeft, Math.max(0, scrollLeft));
    const endMs = Math.min(duration, startMs + visibleMs);
    return { startMs, endMs, visibleMs, duration };
  };

  useEffect(() => {
    const draw = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }
      const dpr = window.devicePixelRatio || 1;
      const rect = container.getBoundingClientRect();
      if (canvas.width !== Math.floor(rect.width * dpr) || canvas.height !== Math.floor(rect.height * dpr)) {
        canvas.width = Math.floor(rect.width * dpr);
        canvas.height = Math.floor(rect.height * dpr);
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
      }
      const ctx = canvas.getContext('2d')!;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const w = canvas.width;
      const h = canvas.height;
      const { startMs, endMs, visibleMs, duration } = getViewRange();
      const data = audioEngine.getZoomedWaveformData(startMs, endMs, WAVEFORM_SAMPLES);
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#0f3460');
      grad.addColorStop(1, '#e94560');
      ctx.fillStyle = grad;
      const step = w / data.length;
      let maxVal = 0.0001;
      for (let i = 0; i < data.length; i++) if (data[i] > maxVal) maxVal = data[i];
      for (let i = 0; i < data.length; i++) {
        const v = data[i] / maxVal;
        const barH = Math.max(1, v * h * 0.9);
        const x = i * step;
        ctx.fillRect(x, (h - barH) / 2, step * 0.85, barH);
      }
      const currentMs = audioEngine.getCurrentTime();
      if (visibleMs > 0 && duration > 0 && currentMs >= startMs && currentMs <= endMs) {
        const ratio = (currentMs - startMs) / (endMs - startMs);
        const cursorX = ratio * w;
        ctx.save();
        ctx.shadowColor = 'rgba(255, 255, 255, 0.9)';
        ctx.shadowBlur = 12 * dpr;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2 * dpr;
        ctx.beginPath();
        ctx.moveTo(cursorX, 0);
        ctx.lineTo(cursorX, h);
        ctx.stroke();
        ctx.restore();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(cursorX, h / 2, 5 * dpr, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = `${12 * dpr}px monospace`;
      ctx.fillText(formatTimestamp(startMs), 4 * dpr, 14 * dpr);
      ctx.textAlign = 'right';
      ctx.fillText(formatTimestamp(endMs), w - 4 * dpr, 14 * dpr);
      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [zoom, scrollLeft]);

  const pxToMs = (px: number) => {
    const container = containerRef.current;
    if (!container) return 0;
    const rect = container.getBoundingClientRect();
    const { startMs, visibleMs } = getViewRange();
    const ratio = (px - rect.left) / rect.width;
    return startMs + ratio * visibleMs;
  };

  return (
    <div
      ref={containerRef}
      className="lf-waveform"
      onMouseDown={(e) => {
        draggingRef.current = {
          startX: e.clientX,
          wasPlaying: audioEngine.getPlayState().isPlaying,
        };
        const target = pxToMs(e.clientX);
        audioEngine.seek(target);
      }}
      onMouseMove={(e) => {
        if (draggingRef.current) {
          const target = pxToMs(e.clientX);
          audioEngine.seek(target);
        }
      }}
      onMouseUp={() => {
        draggingRef.current = null;
      }}
      onWheel={(e) => {
        e.preventDefault();
        const { duration } = getViewRange();
        const step = Math.max(50, duration / 100);
        setScrollLeft(Math.max(0, scrollLeft + (e.deltaY > 0 ? step : -step)));
      }}
    >
      <canvas ref={canvasRef} className="lf-waveform-canvas" />
    </div>
  );
};

export const PreviewPanel: React.FC = () => {
  const [playState, setPlayState] = useState(audioEngine.getPlayState());
  const [zoom, setZoom] = useState(1);
  const [scrollLeft, setScrollLeft] = useState(0);

  useEffect(() => {
    const unsub = audioEngine.onStateChange((ev) => {
      setPlayState((prev) => ({
        ...prev,
        currentTime: ev.currentTime,
        isPlaying: ev.isPlaying,
        duration: ev.duration,
      }));
    });
    return unsub;
  }, []);

  const togglePlay = () => {
    if (playState.isPlaying) {
      audioEngine.pause();
    } else {
      const ctx = audioEngine.getContext();
      if (ctx.state === 'suspended') ctx.resume();
      if (!audioEngine.getAudioBuffer()) {
        synthEngine.renderFullBuffer(
          (window as any).__lyricLines ?? []
        );
      }
      audioEngine.play();
    }
  };

  return (
    <div className="lf-preview">
      <div className="lf-preview-header">
        <h3>预览</h3>
        <div className="lf-time-display">
          <span className="lf-timestamp">{formatTimestamp(playState.currentTime)}</span>
          <span>/</span>
          <span className="lf-timestamp">{formatTimestamp(playState.duration)}</span>
        </div>
      </div>
      <WaveformCanvas zoom={zoom} scrollLeft={scrollLeft} setScrollLeft={setScrollLeft} />
      <div className="lf-preview-controls">
        <button
          className={`lf-btn lf-btn--primary ${playState.isPlaying ? 'lf-btn--playing' : ''}`}
          onClick={togglePlay}
        >
          {playState.isPlaying ? '⏸ 暂停' : '▶ 播放'}
        </button>
        <button
          className="lf-btn lf-btn--ghost"
          onClick={() => audioEngine.reset()}
        >
          ⟲ 重置
        </button>
        <div className="lf-slider-group">
          <label>速度</label>
          <input
            type="range"
            min={0.5}
            max={2}
            step={0.05}
            value={playState.playbackRate}
            onChange={(e) => audioEngine.setPlaybackRate(parseFloat(e.target.value))}
          />
          <span>{playState.playbackRate.toFixed(2)}x</span>
        </div>
        <div className="lf-slider-group">
          <label>缩放</label>
          <button
            className="lf-btn lf-btn--sm lf-btn--ghost lf-step-btn"
            onClick={() => setZoom((z) => Math.max(1, z - 0.5))}
          >
            −
          </button>
          <input
            type="range"
            min={1}
            max={10}
            step={0.1}
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
          />
          <button
            className="lf-btn lf-btn--sm lf-btn--ghost lf-step-btn"
            onClick={() => setZoom((z) => Math.min(10, z + 0.5))}
          >
            +
          </button>
          <span>{zoom.toFixed(1)}x</span>
          <button
            className="lf-btn lf-btn--sm lf-btn--ghost lf-step-btn"
            onClick={() => setZoom(1)}
          >
            1x
          </button>
        </div>
      </div>
      <div className="lf-presets">
        <h4>音色预设（每词可独立设置）</h4>
        <div className="lf-preset-list">
          {synthEngine.getPresets().map((p) => (
            <div key={p.id} className="lf-preset-tag">
              <span className="lf-preset-name">{p.name}</span>
              <span className="lf-preset-type">{p.type}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
