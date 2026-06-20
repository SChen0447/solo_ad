import React, { useRef, useEffect, useState, useCallback } from 'react';
import { CanvasRenderer, CANVAS_W, CANVAS_H } from '../core/CanvasRenderer';
import { Particle } from '../types';
import { downloadPNG, generateShareLink, generateShortLink } from '../utils/export';
import { useCardStore } from '../store';

const PARTICLE_COLORS = [
  'rgba(255,182,193,0.6)',
  'rgba(173,216,230,0.6)',
  'rgba(255,218,185,0.5)',
  'rgba(221,160,221,0.5)',
  'rgba(176,224,230,0.5)',
  'rgba(255,255,200,0.5)',
];

function createParticle(width: number, height: number): Particle {
  return {
    x: Math.random() * width,
    y: -10,
    vx: (Math.random() - 0.5) * 1.5,
    vy: 0.5 + Math.random() * 1.5,
    size: 2 + Math.random() * 4,
    opacity: 0.3 + Math.random() * 0.5,
    color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
    life: 0,
    maxLife: 300 + Math.random() * 200,
  };
}

const CardPreview: React.FC = () => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const particleCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<CanvasRenderer | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number>(0);
  const [shareLink, setShareLink] = useState('');
  const [shortLink, setShortLink] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const [shortCopied, setShortCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [shortGenerating, setShortGenerating] = useState(false);

  const previewCanvasData = useCardStore((state) => state.previewCanvasData);
  const selectedTemplate = useCardStore((state) => state.selectedTemplate);
  const texts = useCardStore((state) => state.texts);
  const decorations = useCardStore((state) => state.decorations);
  const background = useCardStore((state) => state.background);
  const storeSetShareLink = useCardStore((state) => state.setShareLink);
  const storeGoBack = useCardStore((state) => state.goBack);

  useEffect(() => {
    if (previewCanvasRef.current) {
      const canvas = previewCanvasRef.current;
      canvas.width = CANVAS_W;
      canvas.height = CANVAS_H;
      const ctx = canvas.getContext('2d')!;
      if (previewCanvasData) {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0);
        };
        img.src = previewCanvasData;
      }
      if (!rendererRef.current) {
        rendererRef.current = new CanvasRenderer(canvas);
      }
    }
  }, [previewCanvasData]);

  useEffect(() => {
    const pCanvas = particleCanvasRef.current;
    if (!pCanvas) return;
    const handleResize = () => {
      pCanvas.width = window.innerWidth;
      pCanvas.height = window.innerHeight;
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    const pCtx = pCanvas.getContext('2d')!;

    for (let i = 0; i < 60; i++) {
      const p = createParticle(pCanvas.width, pCanvas.height);
      p.y = Math.random() * pCanvas.height;
      p.life = Math.random() * p.maxLife;
      particlesRef.current.push(p);
    }

    const animate = () => {
      pCtx.clearRect(0, 0, pCanvas.width, pCanvas.height);

      if (particlesRef.current.length < 60 && Math.random() < 0.1) {
        particlesRef.current.push(createParticle(pCanvas.width, pCanvas.height));
      }

      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life++;
        p.vx += (Math.random() - 0.5) * 0.05;

        const lifeRatio = p.life / p.maxLife;
        const alpha = lifeRatio > 0.7 ? p.opacity * (1 - (lifeRatio - 0.7) / 0.3) : p.opacity;

        pCtx.save();
        pCtx.globalAlpha = alpha;
        pCtx.fillStyle = p.color;
        pCtx.beginPath();
        pCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        pCtx.fill();

        pCtx.shadowBlur = p.size * 2;
        pCtx.shadowColor = p.color;
        pCtx.beginPath();
        pCtx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2);
        pCtx.fill();
        pCtx.restore();

        if (p.life >= p.maxLife || p.y > pCanvas.height + 20) {
          particlesRef.current.splice(i, 1);
        }
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleDownload = useCallback(async () => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    setDownloading(true);
    try {
      await downloadPNG(canvas);
    } finally {
      setDownloading(false);
    }
  }, []);

  const handleShare = useCallback(async () => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    setGenerating(true);
    try {
      const link = await generateShareLink(canvas);
      setShareLink(link);
      storeSetShareLink(link);
    } finally {
      setGenerating(false);
    }
  }, [storeSetShareLink]);

  const handleGenerateShortLink = useCallback(async () => {
    if (!selectedTemplate) return;
    setShortGenerating(true);
    try {
      const link = await generateShortLink(
        selectedTemplate.id,
        texts,
        decorations,
        background
      );
      setShortLink(link);
    } finally {
      setShortGenerating(false);
    }
  }, [selectedTemplate, texts, decorations, background]);

  const handleCopyShareLink = useCallback(() => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink).then(() => {
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
      });
    }
  }, [shareLink]);

  const handleCopyShortLink = useCallback(() => {
    if (shortLink) {
      navigator.clipboard.writeText(shortLink).then(() => {
        setShortCopied(true);
        setTimeout(() => setShortCopied(false), 2000);
      });
    }
  }, [shortLink]);

  return (
    <div className="preview-overlay" ref={overlayRef}>
      <canvas
        ref={particleCanvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      />

      <div
        className="preview-canvas-wrapper"
        style={{
          position: 'relative',
          zIndex: 1,
          animation: 'scaleIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
        }}
      >
        <canvas
          ref={previewCanvasRef}
          style={{ maxWidth: '90vw', maxHeight: '65vh', borderRadius: '12px' }}
        />
      </div>

      <div className="preview-toolbar glass-panel" style={{ position: 'fixed', zIndex: 2, flexWrap: 'wrap' }}>
        <button className="btn" onClick={storeGoBack}>
          ← 返回编辑
        </button>
        <button className="btn" onClick={handleDownload} disabled={downloading}>
          {downloading ? '导出中...' : '下载PNG'}
        </button>
        <button className="btn" onClick={handleShare} disabled={generating}>
          {generating ? '生成中...' : '生成图片链接'}
        </button>
        <button className="btn" onClick={handleGenerateShortLink} disabled={shortGenerating}>
          {shortGenerating ? '生成中...' : '生成状态链接'}
        </button>
        {shareLink && (
          <div className="share-link-box">
            <input className="share-link-input" value={shareLink} readOnly style={{ width: '180px' }} />
            <button className="btn btn-sm" onClick={handleCopyShareLink}>
              {linkCopied ? '✓' : '复制'}
            </button>
          </div>
        )}
        {shortLink && (
          <div className="share-link-box">
            <input className="share-link-input" value={shortLink} readOnly style={{ width: '180px' }} />
            <button className="btn btn-sm" onClick={handleCopyShortLink}>
              {shortCopied ? '✓' : '复制'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CardPreview;
