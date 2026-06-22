import React, { useRef, useEffect } from 'react';

interface WaveformCanvasProps {
  analyserNode: AnalyserNode | null;
  isPlaying: boolean;
  width?: number;
  height?: number;
}

const WaveformCanvas: React.FC<WaveformCanvasProps> = ({
  analyserNode,
  isPlaying,
  width = 200,
  height = 40,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);

  useEffect(() => {
    if (analyserNode && !dataArrayRef.current) {
      const bufferLength = analyserNode.frequencyBinCount;
      dataArrayRef.current = new Uint8Array(bufferLength);
    }
  }, [analyserNode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);

      ctx.clearRect(0, 0, width, height);

      if (!isPlaying || !analyserNode || !dataArrayRef.current) {
        ctx.fillStyle = 'rgba(233, 69, 96, 0.2)';
        const barWidth = 3;
        const barGap = 2;
        const barCount = Math.floor(width / (barWidth + barGap));
        
        for (let i = 0; i < barCount; i++) {
          const barHeight = 4 + Math.sin(Date.now() / 500 + i * 0.3) * 3;
          const x = i * (barWidth + barGap);
          const y = (height - barHeight) / 2;
          ctx.fillRect(x, y, barWidth, barHeight);
        }
        return;
      }

      analyserNode.getByteFrequencyData(dataArrayRef.current);

      const bufferLength = dataArrayRef.current.length;
      const barWidth = width / bufferLength;
      
      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArrayRef.current[i] / 255) * height * 0.9;
        const x = i * barWidth;
        const y = (height - barHeight) / 2;
        
        const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
        gradient.addColorStop(0, '#e94560');
        gradient.addColorStop(1, '#ff6b8a');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, Math.max(1, barWidth - 1), barHeight);
      }
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [analyserNode, isPlaying, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ display: 'block' }}
    />
  );
};

export default WaveformCanvas;
