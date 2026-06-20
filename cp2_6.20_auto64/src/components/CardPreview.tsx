import React, { useRef, useEffect, useState, useCallback } from 'react';
import { CanvasRenderer, CANVAS_W, CANVAS_H } from '../core/CanvasRenderer';
import { Particle, TextElement, DecorationElement } from '../types';
import { downloadPNG, generateShareLink } from '../utils/export';

interface CardPreviewProps {
  renderer: CanvasRenderer;
  onBack: () => void;
}

const PARTICLE_COLORS = [
  'rgba(255,182,193,0.6)',
  'rgba(173,216,230,0.6)',
  'rgba(255,218,185,0.5)',
  'rgba(221,160,221,0.5)',
  'rgba(176,224,230,0.5)',
  'rgba(255,255,200,0.5)',
];

function createParticle(): Particle {
  return {
    x: Math.random() * CANVAS_W,
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

const CardPreview: React.FC<CardPreviewProps> = ({ renderer, onBack }) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const particleCanvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number>(0);
  const [shareLink, setShareLink] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const cardCanvas = renderer.getCanvas();

  useEffect(() => {
    const pCanvas = particleCanvasRef.current;
    if (!pCanvas) return;
    pCanvas.width = window.innerWidth;
    pCanvas.height = window.innerHeight;
    const pCtx = pCanvas.getContext('2d')!;

    for (let i = 0; i < 50; i++) {
      const p = createParticle();
      p.y = Math.random() * pCanvas.height;
      p.life = Math.random() * p.maxLife;
      particlesRef.current.push(p);
    }

    const animate = () => {
      pCtx.clearRect(0, 0, pCanvas.width, pCanvas.height);

      if (particlesRef.current.length < 50 && Math.random() < 0.1) {
        particlesRef.current.push(createParticle());
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
    };
  }, []);

  const handleDownload = useCallback(async () => {
    setDownloading(true);
    try {
      await downloadPNG(cardCanvas);
    } finally {
      setDownloading(false);
    }
  }, [cardCanvas]);

  const handleShare = useCallback(async () => {
    setGenerating(true);
    try {
      const link = await generateShareLink(cardCanvas);
      setShareLink(link);
    } finally {
      setGenerating(false);
    }
  }, [cardCanvas]);

  const handleCopyLink = useCallback(() => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink).then(() => {
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
      });
    }
  }, [shareLink]);

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

      <div className="preview-canvas-wrapper animate-scale-in" style={{ position: 'relative', zIndex: 1 }}>
        <canvas
          width={CANVAS_W}
          height={CANVAS_H}
          ref={(ref) => {
            if (ref && cardCanvas) {
              const ctx = ref.getContext('2d');
              if (ctx) ctx.drawImage(cardCanvas, 0, 0);
            }
          }}
          style={{ maxWidth: '90vw', maxHeight: '70vh', borderRadius: '12px' }}
        />
      </div>

      <div className="preview-toolbar glass-panel" style={{ position: 'fixed', zIndex: 2 }}>
        <button className="btn" onClick={onBack}>
          ← 返回编辑
        </button>
        <button className="btn" onClick={handleDownload} disabled={downloading}>
          {downloading ? '导出中...' : '下载PNG'}
        </button>
        <button className="btn" onClick={handleShare} disabled={generating}>
          {generating ? '生成中...' : '生成分享链接'}
        </button>
        {shareLink && (
          <div className="share-link-box">
            <input className="share-link-input" value={shareLink} readOnly />
            <button className="btn btn-sm" onClick={handleCopyLink}>
              {linkCopied ? '已复制 ✓' : '复制'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CardPreview;
