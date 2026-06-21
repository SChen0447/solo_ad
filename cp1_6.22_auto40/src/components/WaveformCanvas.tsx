import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Marker,
  Selection,
  FadeEffect,
  FadeCurveType,
  sampleToTime,
  timeToSample,
  getFadeEnvelopePoints
} from '../utils/audioProcessor';

interface WaveformCanvasProps {
  audioBuffer: AudioBuffer | null;
  markers: Marker[];
  selection: Selection | null;
  currentTime: number;
  fades: FadeEffect[];
  onAddMarker: (sample: number) => void;
  onRemoveMarker: (id: string) => void;
  onSelectionChange: (selection: Selection | null) => void;
  onSeek: (time: number) => void;
  onAddFade: (type: 'fadeIn' | 'fadeOut', curve: FadeCurveType) => void;
  onCropSelection: () => void;
  onSplitAtMarker: () => void;
}

interface ContextMenu {
  visible: boolean;
  x: number;
  y: number;
}

export const WaveformCanvas: React.FC<WaveformCanvasProps> = ({
  audioBuffer,
  markers,
  selection,
  currentTime,
  fades,
  onAddMarker,
  onRemoveMarker,
  onSelectionChange,
  onSeek,
  onAddFade,
  onCropSelection,
  onSplitAtMarker
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>(0);
  const [viewport, setViewport] = useState({ startSample: 0, samplesPerPixel: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; sample: number } | null>(null);
  const [draggingMarker, setDraggingMarker] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenu>({ visible: false, x: 0, y: 0 });
  const [selectedCurve, setSelectedCurve] = useState<FadeCurveType>('linear');
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  const handleResize = useCallback(() => {
    if (containerRef.current && canvasRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const width = rect.width;
      const height = rect.height;
      canvasRef.current.width = width * dpr;
      canvasRef.current.height = height * dpr;
      canvasRef.current.style.width = `${width}px`;
      canvasRef.current.style.height = `${height}px`;
      setCanvasSize({ width: width * dpr, height: height * dpr });
    }
  }, []);

  useEffect(() => {
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  useEffect(() => {
    if (audioBuffer) {
      setViewport(vp => ({
        ...vp,
        samplesPerPixel: Math.max(1, Math.floor(audioBuffer.length / (canvasSize.width / (window.devicePixelRatio || 1))))
      }));
    }
  }, [audioBuffer, canvasSize.width]);

  const xToSample = useCallback((x: number): number => {
    const dpr = window.devicePixelRatio || 1;
    const pixelX = x * dpr;
    return Math.floor(viewport.startSample + pixelX * viewport.samplesPerPixel);
  }, [viewport]);

  const sampleToX = useCallback((sample: number): number => {
    const dpr = window.devicePixelRatio || 1;
    return ((sample - viewport.startSample) / viewport.samplesPerPixel) / dpr;
  }, [viewport]);

  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !audioBuffer) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    const dpr = window.devicePixelRatio || 1;
    const centerY = height / 2;
    const samplesPerPixel = viewport.samplesPerPixel;
    const startSample = viewport.startSample;
    const totalPixels = Math.floor(width / dpr);

    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = '#1a202c';
    ctx.fillRect(0, 0, width, height);

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#3182ce');
    gradient.addColorStop(1, '#805ad5');
    ctx.fillStyle = gradient;
    ctx.strokeStyle = gradient;

    for (let ch = 0; ch < Math.min(audioBuffer.numberOfChannels, 2); ch++) {
      const channelData = audioBuffer.getChannelData(ch);
      const channelOffset = ch === 0 ? -height * 0.22 : height * 0.22;
      const channelColor = ch === 0 ? 'rgba(0, 181, 216, 0.6)' : 'rgba(255, 109, 0, 0.6)';

      ctx.beginPath();
      ctx.moveTo(0, centerY + channelOffset);

      for (let px = 0; px < totalPixels; px++) {
        const sampleStart = Math.floor(startSample + px * samplesPerPixel);
        const sampleEnd = Math.min(sampleStart + samplesPerPixel, audioBuffer.length);

        let min = 0;
        let max = 0;

        if (sampleStart < audioBuffer.length) {
          min = 1;
          max = -1;
          for (let s = sampleStart; s < sampleEnd; s++) {
            const v = channelData[s];
            if (v < min) min = v;
            if (v > max) max = v;
          }
        }

        const amplitude = height * 0.35;
        const x = px * dpr;
        const yMax = centerY + channelOffset - max * amplitude;
        const yMin = centerY + channelOffset - min * amplitude;

        if (px === 0) {
          ctx.moveTo(x, yMin);
        }
        ctx.lineTo(x, yMax);
      }

      ctx.strokeStyle = channelColor;
      ctx.lineWidth = dpr;
      ctx.stroke();
    }

    if (selection && audioBuffer) {
      const startX = sampleToX(selection.startSample) * dpr;
      const endX = sampleToX(selection.endSample) * dpr;

      ctx.save();
      ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
      ctx.shadowBlur = 10 * dpr;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.fillRect(startX, 0, endX - startX, height);

      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 2 * dpr;
      ctx.beginPath();
      ctx.moveTo(startX, 0);
      ctx.lineTo(startX, height);
      ctx.moveTo(endX, 0);
      ctx.lineTo(endX, height);
      ctx.stroke();
      ctx.restore();
    }

    fades.forEach(fade => {
      const ch = fades.indexOf(fade) % 2;
      const fadeColor = ch === 0 ? '#00b5d8' : '#ff6d00';
      const startX = sampleToX(fade.startSample) * dpr;
      const endX = sampleToX(fade.endSample) * dpr;
      const points = getFadeEnvelopePoints(
        fade,
        audioBuffer.sampleRate,
        endX - startX,
        height * 0.8,
        startX,
        endX
      );

      const yOffset = ch === 0 ? height * 0.1 : height * 0.5;

      ctx.beginPath();
      ctx.strokeStyle = fadeColor;
      ctx.lineWidth = 2 * dpr;
      points.forEach((pt, i) => {
        const adjustedY = pt.y * 0.4 + yOffset;
        if (i === 0) ctx.moveTo(pt.x, adjustedY);
        else ctx.lineTo(pt.x, adjustedY);
      });
      ctx.stroke();
    });

    markers.forEach(marker => {
      const x = sampleToX(marker.sample) * dpr;
      if (x >= 0 && x <= width) {
        ctx.beginPath();
        ctx.arc(x, centerY, 8 * dpr, 0, Math.PI * 2);
        ctx.fillStyle = '#ecc94b';
        ctx.shadowColor = 'rgba(236, 201, 75, 0.6)';
        ctx.shadowBlur = 6 * dpr;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    });

    if (audioBuffer) {
      const playSample = timeToSample(currentTime, audioBuffer.sampleRate);
      const playX = sampleToX(playSample) * dpr;

      if (playX >= 0 && playX <= width) {
        ctx.beginPath();
        ctx.strokeStyle = '#48bb78';
        ctx.lineWidth = 2 * dpr;
        ctx.shadowColor = 'rgba(72, 187, 120, 0.8)';
        ctx.shadowBlur = 8 * dpr;
        ctx.moveTo(playX, 0);
        ctx.lineTo(playX, height);
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.beginPath();
        ctx.fillStyle = '#48bb78';
        ctx.moveTo(playX - 8 * dpr, 0);
        ctx.lineTo(playX + 8 * dpr, 0);
        ctx.lineTo(playX, 12 * dpr);
        ctx.closePath();
        ctx.fill();
      }
    }
  }, [audioBuffer, markers, selection, currentTime, viewport, fades, sampleToX]);

  useEffect(() => {
    const render = () => {
      drawWaveform();
      animationFrameRef.current = requestAnimationFrame(render);
    };
    animationFrameRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [drawWaveform]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!audioBuffer) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const sample = xToSample(x);
    const clampedSample = Math.max(0, Math.min(audioBuffer.length, sample));

    const clickedMarker = markers.find(m => {
      const mx = sampleToX(m.sample);
      return Math.abs(mx - x) < 12;
    });

    if (e.ctrlKey) {
      onSeek(sampleToTime(clampedSample, audioBuffer.sampleRate));
      return;
    }

    if (clickedMarker) {
      setDraggingMarker(clickedMarker.id);
      return;
    }

    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x, sample: clampedSample });
      onSelectionChange({ startSample: clampedSample, endSample: clampedSample });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!audioBuffer) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const sample = xToSample(x);
    const clampedSample = Math.max(0, Math.min(audioBuffer.length, sample));

    if (draggingMarker) {
      onRemoveMarker(draggingMarker);
      onAddMarker(clampedSample);
      return;
    }

    if (isDragging && dragStart) {
      const startS = Math.min(dragStart.sample, clampedSample);
      const endS = Math.max(dragStart.sample, clampedSample);
      onSelectionChange({ startSample: startS, endSample: endS });
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!audioBuffer) return;

    if (draggingMarker) {
      setDraggingMarker(null);
      return;
    }

    if (isDragging && dragStart) {
      const rect = canvasRef.current!.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const sample = xToSample(x);
      const clampedSample = Math.max(0, Math.min(audioBuffer.length, sample));

      if (Math.abs(clampedSample - dragStart.sample) < 10) {
        onSelectionChange(null);
      }
    }

    setIsDragging(false);
    setDragStart(null);
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!audioBuffer || draggingMarker || isDragging || e.ctrlKey) return;

    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const sample = xToSample(x);
    const clampedSample = Math.max(0, Math.min(audioBuffer.length, sample));

    if (!dragStart || Math.abs(clampedSample - dragStart.sample) < 10) {
      onAddMarker(clampedSample);
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    if (!audioBuffer) return;
    e.preventDefault();

    const delta = e.deltaY;
    const factor = delta > 0 ? 1.2 : 0.8;
    const rect = canvasRef.current!.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseSample = xToSample(mouseX);

    const newSamplesPerPixel = Math.max(1, Math.min(
      audioBuffer.length,
      Math.floor(viewport.samplesPerPixel * factor)
    ));

    const newStartSample = Math.max(0, Math.min(
      audioBuffer.length,
      mouseSample - mouseX * (window.devicePixelRatio || 1) * newSamplesPerPixel
    ));

    setViewport({ startSample: newStartSample, samplesPerPixel: newSamplesPerPixel });
  };

  const handleContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (selection && selection.endSample > selection.startSample) {
      setContextMenu({ visible: true, x: e.clientX, y: e.clientY });
    }
  };

  const closeContextMenu = () => {
    setContextMenu({ visible: false, x: 0, y: 0 });
  };

  const handleTimelineScroll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioBuffer) return;
    const value = parseInt(e.target.value);
    const maxStart = audioBuffer.length - viewport.samplesPerPixel * (canvasSize.width / (window.devicePixelRatio || 1));
    setViewport(vp => ({ ...vp, startSample: Math.max(0, Math.min(maxStart, value)) }));
  };

  const maxTimelineValue = audioBuffer
    ? Math.max(0, audioBuffer.length - viewport.samplesPerPixel * (canvasSize.width / (window.devicePixelRatio || 1)))
    : 0;

  return (
    <div
      ref={containerRef}
      className="waveform-container"
      style={{
        position: 'relative',
        width: '100%',
        height: '400px',
        borderRadius: '12px',
        overflow: 'hidden',
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          cursor: isDragging || draggingMarker ? 'grabbing' : 'crosshair'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleClick}
        onWheel={handleWheel}
        onContextMenu={handleContextMenu}
      />

      <div
        style={{
          position: 'absolute',
          bottom: '8px',
          right: '12px',
          display: 'flex',
          gap: '6px',
          zIndex: 10
        }}
      >
        {(['linear', 'logarithmic', 'exponential'] as FadeCurveType[]).map(curve => (
          <button
            key={curve}
            onClick={() => setSelectedCurve(curve)}
            style={{
              padding: '4px 10px',
              borderRadius: '4px',
              border: selectedCurve === curve ? '1px solid #ecc94b' : '1px solid rgba(255,255,255,0.2)',
              background: selectedCurve === curve ? 'rgba(236, 201, 75, 0.2)' : 'rgba(255, 255, 255, 0.05)',
              color: selectedCurve === curve ? '#ecc94b' : '#a0aec0',
              fontSize: '11px',
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            {curve === 'linear' ? '线性' : curve === 'logarithmic' ? '对数' : '指数'}
          </button>
        ))}
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}
      >
        <input
          type="range"
          min={0}
          max={maxTimelineValue}
          value={viewport.startSample}
          onChange={handleTimelineScroll}
          style={{
            flex: 1,
            height: '4px',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '2px',
            appearance: 'none',
            cursor: 'pointer'
          }}
        />
      </div>

      {contextMenu.visible && (
        <>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 99
            }}
            onClick={closeContextMenu}
          />
          <div
            style={{
              position: 'fixed',
              top: contextMenu.y,
              left: contextMenu.x,
              background: '#2d3748',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '8px',
              padding: '6px',
              zIndex: 100,
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
              minWidth: '140px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
            }}
          >
            <button
              onClick={() => { closeContextMenu(); onCropSelection(); }}
              style={menuItemStyle}
            >
              裁剪选区
            </button>
            <button
              onClick={() => { closeContextMenu(); onAddFade('fadeIn', selectedCurve); }}
              style={menuItemStyle}
            >
              添加淡入
            </button>
            <button
              onClick={() => { closeContextMenu(); onAddFade('fadeOut', selectedCurve); }}
              style={menuItemStyle}
            >
              添加淡出
            </button>
            <button
              onClick={() => { closeContextMenu(); onSplitAtMarker(); }}
              style={menuItemStyle}
            >
              分割片段
            </button>
          </div>
        </>
      )}
    </div>
  );
};

const menuItemStyle: React.CSSProperties = {
  padding: '8px 12px',
  background: 'transparent',
  border: 'none',
  color: '#e2e8f0',
  fontSize: '13px',
  textAlign: 'left',
  cursor: 'pointer',
  borderRadius: '4px',
  transition: 'all 0.2s ease-out'
};
