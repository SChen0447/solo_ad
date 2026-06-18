import { useEffect, useRef, useCallback } from 'react';
import {
  useGameStore,
  Fragment,
  FragmentShape,
  Particle,
} from '../store/gameStore';
import {
  getGridConfig,
  getFragmentPosition,
  findFragmentAtPosition,
  collectFragment,
  getColorHex,
} from '../game/collectible';
import { checkHiddenStoryUnlock } from '../game/blessing';

export default function SceneRenderer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const collectingFragmentsRef = useRef<Map<string, { progress: number; x: number; y: number; color: string; shape: FragmentShape }>>(
    new Map()
  );
  const portalPulseRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);

  const fragments = useGameStore((s) => s.fragments);
  const particles = useGameStore((s) => s.particles);
  const flashActive = useGameStore((s) => s.flashActive);
  const portalVisible = useGameStore((s) => s.portalVisible);
  const dialogueVisible = useGameStore((s) => s.dialogueVisible);
  const dialogueText = useGameStore((s) => s.dialogueText);
  const showDialogue = useGameStore((s) => s.showDialogue);
  const updateParticle = useGameStore((s) => s.updateParticle);
  const removeParticle = useGameStore((s) => s.removeParticle);

  useEffect(() => {
    particlesRef.current = particles;
  }, [particles]);

  const drawStar = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    color: string,
    glow: boolean = true
  ) => {
    ctx.save();
    if (glow) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 15;
    }
    ctx.fillStyle = color;
    ctx.beginPath();
    const spikes = 5;
    const outerRadius = size;
    const innerRadius = size * 0.4;
    for (let i = 0; i < spikes * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (Math.PI * i) / spikes - Math.PI / 2;
      const px = x + Math.cos(angle) * radius;
      const py = y + Math.sin(angle) * radius;
      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  const drawDiamond = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    color: string,
    glow: boolean = true
  ) => {
    ctx.save();
    if (glow) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 15;
    }
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y - size);
    ctx.lineTo(x + size * 0.6, y);
    ctx.lineTo(x, y + size);
    ctx.lineTo(x - size * 0.6, y);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  const drawDrop = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    color: string,
    glow: boolean = true
  ) => {
    ctx.save();
    if (glow) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 15;
    }
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y - size);
    ctx.bezierCurveTo(
      x + size * 0.8,
      y - size * 0.2,
      x + size * 0.6,
      y + size * 0.8,
      x,
      y + size * 0.8
    );
    ctx.bezierCurveTo(
      x - size * 0.6,
      y + size * 0.8,
      x - size * 0.8,
      y - size * 0.2,
      x,
      y - size
    );
    ctx.fill();
    ctx.restore();
  };

  const drawFragment = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      fragment: Fragment,
      x: number,
      y: number,
      scale: number = 1
    ) => {
      const size = 16 * scale;
      const color = getColorHex(fragment.color);

      switch (fragment.shape) {
        case 'star':
          drawStar(ctx, x, y, size, color);
          break;
        case 'diamond':
          drawDiamond(ctx, x, y, size, color);
          break;
        case 'drop':
          drawDrop(ctx, x, y, size, color);
          break;
      }
    },
    []
  );

  const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const config = getGridConfig(width, height);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;

    for (let i = 0; i < config.gridSize; i++) {
      const x = config.offsetX + i * config.cellSize;
      ctx.beginPath();
      ctx.moveTo(x, config.offsetY);
      ctx.lineTo(x, config.offsetY + (config.gridSize - 1) * config.cellSize);
      ctx.stroke();
    }

    for (let i = 0; i < config.gridSize; i++) {
      const y = config.offsetY + i * config.cellSize;
      ctx.beginPath();
      ctx.moveTo(config.offsetX, y);
      ctx.lineTo(config.offsetX + (config.gridSize - 1) * config.cellSize, y);
      ctx.stroke();
    }
  };

  const drawBackground = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#0a0e27');
    gradient.addColorStop(1, '#1a1a2e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    const radialGradient = ctx.createRadialGradient(
      width / 2,
      height / 2,
      0,
      width / 2,
      height / 2,
      Math.max(width, height) * 0.7
    );
    radialGradient.addColorStop(0, 'rgba(74, 105, 189, 0.15)');
    radialGradient.addColorStop(1, 'rgba(74, 105, 189, 0)');
    ctx.fillStyle = radialGradient;
    ctx.fillRect(0, 0, width, height);
  };

  const drawPortal = (ctx: CanvasRenderingContext2D, x: number, y: number, time: number) => {
    const pulse = Math.sin(time * 3) * 0.3 + 0.7;
    const baseRadius = 35;

    const gradient = ctx.createRadialGradient(x, y, 0, x, y, baseRadius * 1.5);
    gradient.addColorStop(0, `rgba(108, 92, 231, ${0.8 * pulse})`);
    gradient.addColorStop(0.5, `rgba(162, 155, 254, ${0.4 * pulse})`);
    gradient.addColorStop(1, 'rgba(108, 92, 231, 0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, baseRadius * 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(time * 2);
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 * i) / 6;
      const px = Math.cos(angle) * baseRadius * 0.7;
      const py = Math.sin(angle) * baseRadius * 0.7;
      ctx.fillStyle = `rgba(240, 230, 140, ${0.6 + 0.4 * Math.sin(time * 5 + i)})`;
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('传送门', x, y + baseRadius + 20);
  };

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const time = performance.now() / 1000;
      const config = getGridConfig(canvas.width, canvas.height);

      if (portalVisible) {
        const portalX = 80;
        const portalY = canvas.height - 100;
        const dx = x - portalX;
        const dy = y - portalY;
        if (Math.sqrt(dx * dx + dy * dy) < 45) {
          const dialogues = [
            '「在这片梦境深处，我仿佛看到了曾经的自己...」',
            '「那些被遗忘的记忆，正以碎片的形式重新拼凑。」',
            '「每一个祝福，都是一段被封印的过往。」',
            '「当所有祝福汇聚，真相将会浮现...」',
          ];
          const randomDialogue = dialogues[Math.floor(Math.random() * dialogues.length)];
          showDialogue(randomDialogue);
          return;
        }
      }

      const fragment = findFragmentAtPosition(x, y, config, time);
      if (fragment) {
        const pos = getFragmentPosition(fragment, config, time);
        collectingFragmentsRef.current.set(fragment.id, {
          progress: 0,
          x: pos.x,
          y: pos.y,
          color: getColorHex(fragment.color),
          shape: fragment.shape,
        });
        collectFragment(fragment.id);
      }
    },
    [portalVisible, showDialogue]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const container = canvas.parentElement;
      if (container) {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = container.clientWidth * dpr;
        canvas.height = container.clientHeight * dpr;
        canvas.style.width = `${container.clientWidth}px`;
        canvas.style.height = `${container.clientHeight}px`;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.scale(dpr, dpr);
        }
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const animate = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const delta = (timestamp - lastTimeRef.current) / 1000;
      lastTimeRef.current = timestamp;
      const time = timestamp / 1000;

      const dpr = window.devicePixelRatio || 1;
      const width = canvas.width / dpr;
      const height = canvas.height / dpr;

      ctx.clearRect(0, 0, width, height);

      drawBackground(ctx, width, height);
      drawGrid(ctx, width, height);

      const config = getGridConfig(width, height);

      fragments.forEach((fragment) => {
        if (fragment.collected) return;
        const pos = getFragmentPosition(fragment, config, time);
        drawFragment(ctx, fragment, pos.x, pos.y);
      });

      const collecting = collectingFragmentsRef.current;
      collecting.forEach((data, id) => {
        data.progress += delta * 5;
        if (data.progress >= 1) {
          collecting.delete(id);
        } else {
          const scale = 1 + data.progress * 0.8;
          const alpha = 1 - data.progress;
          ctx.globalAlpha = alpha;
          const size = 16 * scale;
          switch (data.shape) {
            case 'star':
              drawStar(ctx, data.x, data.y, size, data.color);
              break;
            case 'diamond':
              drawDiamond(ctx, data.x, data.y, size, data.color);
              break;
            case 'drop':
              drawDrop(ctx, data.x, data.y, size, data.color);
              break;
          }
          ctx.globalAlpha = 1;
        }
      });

      const currentParticles = particlesRef.current;
      currentParticles.forEach((p) => {
        if (p.life <= 0) return;
        const alpha = p.life / p.maxLife;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        updateParticle(p.id, delta);
        if (p.life - delta <= 0) {
          removeParticle(p.id);
        }
      });

      if (portalVisible) {
        portalPulseRef.current = time;
        drawPortal(ctx, 80, height - 100, time);
      }

      if (flashActive) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fillRect(0, 0, width, height);
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [fragments, flashActive, portalVisible, drawFragment, updateParticle, removeParticle]);

  useEffect(() => {
    checkHiddenStoryUnlock();
  }, [fragments]);

  return (
    <div className="scene-container">
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        style={{ cursor: 'pointer' }}
      />
      {dialogueVisible && (
        <div className="dialogue-bubble">
          <p>{dialogueText}</p>
        </div>
      )}
    </div>
  );
}
