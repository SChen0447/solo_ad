import { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import type { Theme } from './theme';

export interface MatrixRainConfig {
  speedMultiplier: number;
  fontSize: number;
  colorTheme: Theme;
  columnSpacing: number;
  backgroundOpacity: number;
  fps: 30 | 60;
  enableBlink: boolean;
  enableTrail: boolean;
}

export interface MatrixRainRef {
  getCanvas: () => HTMLCanvasElement | null;
  captureFrame: () => void;
  renderFrame: () => void;
}

interface Column {
  x: number;
  y: number;
  speed: number;
  chars: string[];
  charCount: number;
  trailOpacity: number[];
}

const MatrixRain = forwardRef<MatrixRainRef, { config: MatrixRainConfig }>(({ config }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const columnsRef = useRef<Column[]>([]);
  const animationFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const frameIntervalRef = useRef<number>(1000 / 60);
  const configRef = useRef(config);
  const dimensionsRef = useRef({ width: 0, height: 0 });

  useImperativeHandle(ref, () => ({
    getCanvas: () => canvasRef.current,
    captureFrame: () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      render();
    },
    renderFrame: () => {
      render();
    }
  }));

  useEffect(() => {
    configRef.current = config;
    frameIntervalRef.current = 1000 / config.fps;
  }, [config]);

  const getRandomChar = (): string => {
    return String.fromCharCode(Math.floor(Math.random() * 95) + 32);
  };

  const initColumns = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const width = window.innerWidth;
    const height = window.innerHeight;

    dimensionsRef.current = { width, height };

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
    }

    const { columnSpacing, fontSize } = configRef.current;
    const columnCount = Math.ceil(width / columnSpacing);
    const maxChars = Math.ceil(height / fontSize) + 10;

    const columns: Column[] = [];
    for (let i = 0; i < columnCount; i++) {
      const charCount = Math.floor(Math.random() * maxChars * 0.6) + Math.floor(maxChars * 0.3);
      const chars: string[] = [];
      const trailOpacity: number[] = [];

      for (let j = 0; j < charCount; j++) {
        chars.push(getRandomChar());
        const opacity = 0.8 - (j / charCount) * 0.8;
        trailOpacity.push(opacity);
      }

      columns.push({
        x: i * columnSpacing + columnSpacing / 2,
        y: Math.random() * height * 2 - height,
        speed: (Math.random() * 19 + 1),
        chars,
        charCount,
        trailOpacity
      });
    }

    columnsRef.current = columns;

    if (ctx) {
      ctx.fillStyle = '#0A0A0A';
      ctx.fillRect(0, 0, width, height);
    }
  };

  const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        }
      : { r: 0, g: 255, b: 0 };
  };

  const render = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = dimensionsRef.current;
    const {
      speedMultiplier,
      fontSize,
      colorTheme,
      backgroundOpacity,
      enableBlink,
      enableTrail
    } = configRef.current;

    const primaryRgb = hexToRgb(colorTheme.primary);
    const secondaryRgb = hexToRgb(colorTheme.secondary);

    if (enableTrail) {
      ctx.fillStyle = `rgba(10, 10, 10, ${backgroundOpacity})`;
      ctx.fillRect(0, 0, width, height);
    } else {
      ctx.fillStyle = `rgba(10, 10, 10, ${backgroundOpacity})`;
      ctx.fillRect(0, 0, width, height);
    }

    ctx.font = `${fontSize}px 'Courier New', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const columns = columnsRef.current;

    for (let i = 0; i < columns.length; i++) {
      const col = columns[i];
      col.y += col.speed * speedMultiplier;

      if (col.y - col.charCount * fontSize > height) {
        col.y = -col.charCount * fontSize;
        for (let j = 0; j < col.charCount; j++) {
          col.chars[j] = getRandomChar();
        }
      }

      if (Math.random() < 0.02) {
        const randomIndex = Math.floor(Math.random() * col.charCount);
        col.chars[randomIndex] = getRandomChar();
      }

      for (let j = 0; j < col.charCount; j++) {
        const charY = col.y - j * fontSize;

        if (charY < -fontSize || charY > height + fontSize) continue;

        const progress = j / col.charCount;
        const r = Math.round(primaryRgb.r + (secondaryRgb.r - primaryRgb.r) * progress);
        const g = Math.round(primaryRgb.g + (secondaryRgb.g - primaryRgb.g) * progress);
        const b = Math.round(primaryRgb.b + (secondaryRgb.b - primaryRgb.b) * progress);

        let opacity = enableTrail ? col.trailOpacity[j] : Math.max(0.3, 1 - progress * 0.7);
        let color = `rgba(${r}, ${g}, ${b}, ${opacity})`;

        if (j === 0) {
          color = `rgba(255, 255, 255, ${opacity})`;
        }

        if (enableBlink && Math.random() < 0.01) {
          color = 'rgba(255, 255, 255, 1)';
        }

        ctx.fillStyle = color;
        ctx.fillText(col.chars[j], col.x, charY);
      }
    }
  };

  const animate = (timestamp: number) => {
    if (!lastTimeRef.current) {
      lastTimeRef.current = timestamp;
    }

    const delta = timestamp - lastTimeRef.current;

    if (delta >= frameIntervalRef.current) {
      lastTimeRef.current = timestamp - (delta % frameIntervalRef.current);
      render();
    }

    animationFrameRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    initColumns();
    animationFrameRef.current = requestAnimationFrame(animate);

    const handleResize = () => {
      initColumns();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    initColumns();
  }, [config.columnSpacing, config.fontSize]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        display: 'block'
      }}
    />
  );
});

MatrixRain.displayName = 'MatrixRain';

export default MatrixRain;
