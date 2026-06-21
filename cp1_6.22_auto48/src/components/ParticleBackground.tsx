import React, { useRef, useEffect } from 'react';
import { ParticleSystem } from '@/utils/animation';

const ParticleBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particleSystemRef = useRef<ParticleSystem | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const container = canvas.parentElement;
    if (!container) return;

    const resizeCanvas = () => {
      canvas.width = container.scrollWidth;
      canvas.height = container.clientHeight;
      if (particleSystemRef.current) {
        particleSystemRef.current.resize(canvas.width, canvas.height);
      }
    };

    resizeCanvas();
    particleSystemRef.current = new ParticleSystem(canvas, 50);
    particleSystemRef.current.start();

    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(container);

    return () => {
      if (particleSystemRef.current) {
        particleSystemRef.current.stop();
      }
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="particle-canvas"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
};

export default ParticleBackground;
