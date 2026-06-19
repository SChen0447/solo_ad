import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { WordCloudRenderer } from '../modules/wordcloud/WordCloudRenderer';
import { WordCloudEngine } from '../modules/wordcloud/WordCloudEngine';
import type { WordData, Theme } from '../types';

interface WordCloudCanvasProps {
  words: Map<string, number>;
  theme: Theme;
  onRendererReady?: (renderer: WordCloudRenderer) => void;
}

export interface WordCloudCanvasRef {
  getRenderer: () => WordCloudRenderer | null;
  clearWithAnimation: () => void;
  addRocketAnimation: (startX: number, startY: number) => void;
  exportPNG: () => string;
}

const WordCloudCanvas = forwardRef<WordCloudCanvasRef, WordCloudCanvasProps>(
  ({ words, theme, onRendererReady },
  ref
) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<WordCloudRenderer | null>(null);
  const engineRef = useRef<WordCloudEngine | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const wordDataRef = useRef<WordData[]>([]);

  useImperativeHandle(ref, () => ({
    getRenderer: () => rendererRef.current,
    clearWithAnimation: () => {
      if (rendererRef.current) {
        rendererRef.current.clearWithAnimation();
      }
    },
    addRocketAnimation: (startX: number, startY: number) => {
      if (rendererRef.current && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        rendererRef.current.addRocketParticles(
          startX - rect.left,
          startY - rect.top,
          centerX,
          centerY
        );
      }
    },
    exportPNG: () => {
      if (rendererRef.current) {
        return rendererRef.current.exportPNG();
      }
      return '';
    }
  }));

  const initRenderer = useCallback(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const dpr = window.devicePixelRatio || 1;
    canvasRef.current.width = width * dpr;
    canvasRef.current.height = height * dpr;
    canvasRef.current.style.width = `${width}px`;
    canvasRef.current.style.height = `${height}px`;

    const ctx = canvasRef.current.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
    }

    if (!engineRef.current) {
      engineRef.current = new WordCloudEngine({
        width,
        height,
        minFontSize: 14,
        maxFontSize: 64,
        rotationRange: [-30, 30],
        colors: theme.textColors,
        backgroundColor: theme.backgroundColor
      });
    } else {
      engineRef.current.updateConfig({
        width,
        height,
        colors: theme.textColors,
        backgroundColor: theme.backgroundColor
      });
    }

    if (!rendererRef.current) {
      rendererRef.current = new WordCloudRenderer(canvasRef.current);
      if (onRendererReady) {
        onRendererReady(rendererRef.current);
      }
    }

    rendererRef.current.setBackgroundColor(theme.backgroundColor);
    rendererRef.current.resize(width * dpr, height * dpr);

    if (engineRef.current) {
      wordDataRef.current = engineRef.current.generate(words);
      rendererRef.current.updateWords(wordDataRef.current);
    }
  }, [theme, words, onRendererReady]);

  useEffect(() => {
    initRenderer();

    const handleResize = () => {
      initRenderer();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [initRenderer]);

  useEffect(() => {
    if (engineRef.current && rendererRef.current) {
      engineRef.current.updateConfig({
        colors: theme.textColors,
        backgroundColor: theme.backgroundColor
      });
      rendererRef.current.setBackgroundColor(theme.backgroundColor);
      wordDataRef.current = engineRef.current.generate(words);
      rendererRef.current.updateWords(wordDataRef.current);
    }
  }, [words, theme]);

  return (
    <div ref={containerRef} className="wordcloud-canvas-container">
      <canvas
        ref={canvasRef}
        className="wordcloud-canvas"
        style={{ backgroundColor: theme.backgroundColor }}
      />
    </div>
  );
});

WordCloudCanvas.displayName = 'WordCloudCanvas';

export default WordCloudCanvas;
