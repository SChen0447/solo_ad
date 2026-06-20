import { useRef, useEffect, useState, useCallback } from 'react';
import { useCardStore } from '@/store/cardStore';
import { CanvasRenderer } from '@/core/CanvasRenderer';
import { exportToPNG, exportToGIF, generateShortLink, serializeCardState, captureAnimatedFrames } from '@/utils/export';
import { Download, Share2, ArrowLeft, Copy, Check, Film } from 'lucide-react';

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  duration: number;
  delay: number;
  shape: 'circle' | 'square' | 'diamond';
}

export default function CardPreview() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<CanvasRenderer | null>(null);
  const { elements, background, backgroundType } = useCardStore();
  const [particles, setParticles] = useState<Particle[]>([]);
  const [shortLink, setShortLink] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [isGeneratingGIF, setIsGeneratingGIF] = useState(false);
  const [animPhase, setAnimPhase] = useState(0);

  useEffect(() => {
    if (!canvasRef.current) return;
    rendererRef.current = new CanvasRenderer(canvasRef.current);
    rendererRef.current.render(elements, background, backgroundType, null);
  }, []);

  const rerender = useCallback(() => {
    if (!rendererRef.current) return;
    rendererRef.current.render(elements, background, backgroundType, null);
  }, [elements, background, backgroundType]);

  useEffect(() => {
    rerender();
  }, [rerender]);

  useEffect(() => {
    const newParticles: Particle[] = [];
    const colors = ['#FFD700', '#FF69B4', '#87CEEB', '#98FB98', '#DDA0DD', '#F0E68C', '#FF6347'];
    const shapes: Particle['shape'][] = ['circle', 'square', 'diamond'];
    for (let i = 0; i < 30; i++) {
      newParticles.push({
        id: i,
        x: Math.random() * 100,
        y: -5 - Math.random() * 20,
        size: 4 + Math.random() * 8,
        color: colors[Math.floor(Math.random() * colors.length)],
        duration: 3 + Math.random() * 4,
        delay: Math.random() * 5,
        shape: shapes[Math.floor(Math.random() * shapes.length)],
      });
    }
    setParticles(newParticles);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setAnimPhase((p) => p + 1);
    }, 50);
    return () => clearInterval(timer);
  }, []);

  const handleExportPNG = () => {
    if (!canvasRef.current) return;
    exportToPNG(canvasRef.current);
  };

  const handleExportGIF = async () => {
    if (!canvasRef.current) return;
    setIsGeneratingGIF(true);
    try {
      const width = 800;
      const height = 600;
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = width;
      tempCanvas.height = height;
      const tempCtx = tempCanvas.getContext('2d')!;
      const renderer = new CanvasRenderer(tempCanvas);
      const originalElements = elements;

      const frames: ImageData[] = [];
      const totalFrames = 24;

      for (let i = 0; i < totalFrames; i++) {
        const progress = i / totalFrames;
        const eased = 1 - Math.pow(1 - progress, 3);
        const animatedElements = originalElements.map((el) => {
          const copy = { ...el };
          if (el.type === 'text') {
            copy.scale = el.scale * (0.5 + eased * 0.5);
          } else {
            copy.scale = el.scale * (0.3 + Math.sin(progress * Math.PI) * 0.7 + 0.3);
            copy.rotation = (el.rotation + eased * 360) % 360;
          }
          return copy;
        });

        renderer.render(animatedElements, background, backgroundType, null);
        frames.push(tempCtx.getImageData(0, 0, width, height));
      }

      await exportToGIF(frames, width, height, { delayMs: 80 });
    } finally {
      setIsGeneratingGIF(false);
    }
  };

  const handleGenerateLink = async () => {
    setIsGeneratingLink(true);
    const data = serializeCardState(elements, background, backgroundType);
    const link = await generateShortLink(data);
    setShortLink(link);
    setIsGeneratingLink(false);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shortLink).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden p-4">
      {/* Particle Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {particles.map((p) => (
          <div
            key={p.id}
            className="particle"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              backgroundColor: p.color,
              borderRadius: p.shape === 'circle' ? '50%' : p.shape === 'diamond' ? '2px' : '0',
              transform: p.shape === 'diamond' ? 'rotate(45deg)' : undefined,
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay}s`,
              opacity: 0.7,
            }}
          />
        ))}
      </div>

      {/* Card Preview */}
      <div className="relative z-10 animate-fadeIn">
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          className="glass-panel max-w-full h-auto shadow-2xl"
          style={{
            animation: 'elasticScale 0.8s ease forwards',
          }}
        />
      </div>

      {/* Animated element indicators */}
      <div className="flex gap-3 mt-2 z-10">
        {elements.map((el, i) => {
          if (el.type === 'text') {
            return (
              <span
                key={el.id}
                className="text-white/60 text-xs animate-textFadeIn"
                style={{ animationDelay: `${0.3 + i * 0.15}s`, opacity: 0 }}
              >
                ✏️ {el.text.slice(0, 6)}
              </span>
            );
          }
          return (
            <span
              key={el.id}
              className="text-white/60 text-xs animate-elasticScale"
              style={{ animationDelay: `${0.5 + i * 0.15}s`, opacity: 0 }}
            >
              {el.shape === 'flower' ? '🌸' : el.shape === 'star' ? '⭐' : '💖'}
            </span>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 mt-8 z-10">
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            window.history.back();
          }}
          className="btn-gradient px-6 py-2.5 text-sm flex items-center gap-2 justify-center"
        >
          <ArrowLeft size={16} />
          返回编辑
        </a>
        <button
          onClick={handleExportPNG}
          className="btn-gradient px-6 py-2.5 text-sm flex items-center gap-2"
        >
          <Download size={16} />
          下载PNG
        </button>
        <button
          onClick={handleExportGIF}
          disabled={isGeneratingGIF}
          className="btn-gradient px-6 py-2.5 text-sm flex items-center gap-2 disabled:opacity-50"
        >
          <Film size={16} />
          {isGeneratingGIF ? '生成中...' : '下载GIF'}
        </button>
        <button
          onClick={handleGenerateLink}
          disabled={isGeneratingLink}
          className="btn-gradient px-6 py-2.5 text-sm flex items-center gap-2 disabled:opacity-50"
        >
          <Share2 size={16} />
          {isGeneratingLink ? '生成中...' : '生成分享链接'}
        </button>
      </div>

      {/* Short Link Display */}
      {shortLink && (
        <div className="mt-4 glass-panel px-4 py-3 flex items-center gap-3 z-10 animate-fadeIn">
          <span className="text-white/90 text-sm font-mono">{shortLink}</span>
          <button
            onClick={handleCopyLink}
            className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors"
          >
            {linkCopied ? <Check size={14} className="text-green-300" /> : <Copy size={14} />}
          </button>
        </div>
      )}
    </div>
  );
}
