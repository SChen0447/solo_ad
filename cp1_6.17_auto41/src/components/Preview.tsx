import React, { useRef, useEffect, useCallback } from 'react';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import type { FrameInfo } from '../types';
import { CANVAS_SIZE, MIN_FPS, MAX_FPS } from '../types';
import { drawPixelFrame } from '../utils/canvasUtils';

interface PreviewProps {
  frameSequence: FrameInfo[];
  currentFrame: number;
  isPlaying: boolean;
  fps: number;
  onFrameChange: (frame: number) => void;
  onPlayingChange: (playing: boolean) => void;
  onFpsChange: (fps: number) => void;
}

const Preview: React.FC<PreviewProps> = ({
  frameSequence,
  currentFrame,
  isPlaying,
  fps,
  onFrameChange,
  onPlayingChange,
  onFpsChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);

  const previewSize = Math.min(CANVAS_SIZE * 8, 256);
  const scale = previewSize / CANVAS_SIZE;
  const totalFrames = frameSequence.length;

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, previewSize, previewSize);

    if (frameSequence.length > 0 && currentFrame < frameSequence.length) {
      const frame = frameSequence[currentFrame].frame;
      drawPixelFrame(ctx, frame, scale);
    }
  }, [frameSequence, currentFrame, previewSize, scale]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  useEffect(() => {
    if (!isPlaying || totalFrames === 0) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    const frameInterval = 1000 / fps;

    const animate = (timestamp: number) => {
      if (timestamp - lastFrameTimeRef.current >= frameInterval) {
        onFrameChange((currentFrame + 1) % totalFrames);
        lastFrameTimeRef.current = timestamp;
      }
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, fps, totalFrames, currentFrame, onFrameChange]);

  const handlePrevFrame = () => {
    if (totalFrames === 0) return;
    onPlayingChange(false);
    onFrameChange((currentFrame - 1 + totalFrames) % totalFrames);
  };

  const handleNextFrame = () => {
    if (totalFrames === 0) return;
    onPlayingChange(false);
    onFrameChange((currentFrame + 1) % totalFrames);
  };

  const togglePlay = () => {
    if (totalFrames === 0) return;
    onPlayingChange(!isPlaying);
  };

  return (
    <div className="preview-container">
      <div className="preview-header">
        <h2>动画预览</h2>
        {totalFrames > 0 && (
          <span className="frame-counter">
            {currentFrame + 1} / {totalFrames}
          </span>
        )}
      </div>

      <div className="preview-canvas-wrapper">
        <canvas
          ref={canvasRef}
          width={previewSize}
          height={previewSize}
          className="preview-canvas"
        />
        {totalFrames === 0 && (
          <div className="preview-placeholder">
            <p>创建至少3个关键帧</p>
            <p>以生成动画预览</p>
          </div>
        )}
      </div>

      <div className="preview-controls">
        <div className="playback-buttons">
          <button
            className="control-button"
            onClick={handlePrevFrame}
            disabled={totalFrames === 0}
            title="上一帧"
          >
            <SkipBack size={18} />
          </button>
          <button
            className="control-button play-button"
            onClick={togglePlay}
            disabled={totalFrames === 0}
            title={isPlaying ? '暂停' : '播放'}
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} />}
          </button>
          <button
            className="control-button"
            onClick={handleNextFrame}
            disabled={totalFrames === 0}
            title="下一帧"
          >
            <SkipForward size={18} />
          </button>
        </div>

        <div className="speed-control">
          <label htmlFor="fps-slider">速度: {fps} fps</label>
          <input
            id="fps-slider"
            type="range"
            min={MIN_FPS}
            max={MAX_FPS}
            value={fps}
            onChange={(e) => onFpsChange(Number(e.target.value))}
            className="fps-slider"
          />
          <div className="fps-labels">
            <span>{MIN_FPS}</span>
            <span>{MAX_FPS}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Preview;
