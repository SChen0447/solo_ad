import { useEffect, useRef } from 'react';
import { useGradientStore } from '@/store/gradientStore';
import type { EasingType } from '@/types';
import styles from './AnimationController.module.css';

interface EasingMeta {
  key: EasingType;
  label: string;
  desc: string;
  points: [number, number, number, number];
}

const EASING_META: EasingMeta[] = [
  { key: 'linear', label: 'Linear 线性', desc: '匀速运动，速度恒定', points: [0, 0, 1, 1] },
  { key: 'ease', label: 'Ease 缓动', desc: '慢入慢出，平滑自然', points: [0.25, 0.1, 0.25, 1] },
  { key: 'ease-in', label: 'Ease-In 缓入', desc: '慢速开始，逐渐加速', points: [0.42, 0, 1, 1] },
  { key: 'ease-out', label: 'Ease-Out 缓出', desc: '快速开始，逐渐减速', points: [0, 0, 0.58, 1] },
  { key: 'cubic-bezier', label: 'Cubic-Bezier 自定义', desc: '自定义贝塞尔曲线参数', points: [0.4, 0, 0.2, 1] },
];

function bezierY(x1: number, y1: number, x2: number, y2: number, t: number): number {
  let low = 0;
  let high = 1;
  for (let i = 0; i < 18; i++) {
    const mid = (low + high) / 2;
    const bx = 3 * x1 * mid * (1 - mid) ** 2 + 3 * x2 * mid ** 2 * (1 - mid) + mid ** 3;
    if (bx < t) low = mid;
    else high = mid;
  }
  const s = (low + high) / 2;
  return 3 * y1 * s * (1 - s) ** 2 + 3 * y2 * s ** 2 * (1 - s) + s ** 3;
}

export default function AnimationController() {
  const animationParams = useGradientStore((s) => s.animationParams);
  const setAnimationParams = useGradientStore((s) => s.setAnimationParams);
  const easingMeta = EASING_META;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const currentMeta =
    easingMeta.find((m) => m.key === animationParams.easing) || easingMeta[1];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const W = canvas.clientWidth;
    const H = canvas.clientHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.clearRect(0, 0, W, H);

    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      const x = (W / 4) * i;
      const y = (H / 4) * i;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(4, H - 4);
    ctx.lineTo(W - 4, 4);
    ctx.stroke();
    ctx.setLineDash([]);

    const padding = 6;
    const plotW = W - padding * 2;
    const plotH = H - padding * 2;

    let pts: [number, number, number, number];
    if (animationParams.easing === 'cubic-bezier') {
      const m = animationParams.cubicBezierValue.match(
        /cubic-bezier\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)/
      );
      pts = m
        ? [parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3]), parseFloat(m[4])]
        : [0.4, 0, 0.2, 1];
    } else {
      pts = currentMeta.points;
    }

    const gradient = ctx.createLinearGradient(0, H, W, 0);
    gradient.addColorStop(0, '#3b82f6');
    gradient.addColorStop(1, '#8b5cf6');

    ctx.strokeStyle = gradient;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i <= 60; i++) {
      const t = i / 60;
      const x = padding + t * plotW;
      const y = padding + (1 - bezierY(pts[0], pts[1], pts[2], pts[3], t)) * plotH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.arc(padding + pts[0] * plotW, padding + (1 - pts[1]) * plotH, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#8b5cf6';
    ctx.beginPath();
    ctx.arc(padding + pts[2] * plotW, padding + (1 - pts[3]) * plotH, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }, [animationParams.easing, animationParams.cubicBezierValue, currentMeta]);

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>动画参数</h3>

      <div className={styles.control}>
        <label className={styles.label}>
          <span>动画时长</span>
          <span className={styles.valueBubble}>{animationParams.duration}s</span>
        </label>
        <div className={styles.rangeWrapper}>
          <input
            type="range"
            min={1}
            max={10}
            step={0.1}
            value={animationParams.duration}
            onChange={(e) =>
              setAnimationParams({ duration: Number(e.target.value) })
            }
            className={styles.range}
          />
        </div>
      </div>

      <div className={styles.control}>
        <label className={styles.label}>
          <span>延迟时间</span>
          <span className={styles.valueBubble}>{animationParams.delay}s</span>
        </label>
        <div className={styles.rangeWrapper}>
          <input
            type="range"
            min={0}
            max={5}
            step={0.1}
            value={animationParams.delay}
            onChange={(e) =>
              setAnimationParams({ delay: Number(e.target.value) })
            }
            className={styles.range}
          />
        </div>
      </div>

      <div className={styles.control}>
        <label className={styles.label}>
          <span>缓动函数</span>
        </label>
        <div className={styles.selectWrapper}>
          <select
            value={animationParams.easing}
            onChange={(e) =>
              setAnimationParams({ easing: e.target.value as EasingType })
            }
            className={styles.select}
          >
            {easingMeta.map((opt) => (
              <option key={opt.key} value={opt.key}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.easingPreview}>
          <canvas ref={canvasRef} className={styles.curveCanvas} />
          <div className={styles.curveInfo}>
            <span className={styles.curveName}>{currentMeta.label}</span>
            <span className={styles.curveDesc}>{currentMeta.desc}</span>
          </div>
        </div>
      </div>

      {animationParams.easing === 'cubic-bezier' && (
        <div className={styles.control}>
          <label className={styles.label}>
            <span>贝塞尔曲线参数</span>
          </label>
          <input
            type="text"
            value={animationParams.cubicBezierValue}
            onChange={(e) =>
              setAnimationParams({ cubicBezierValue: e.target.value })
            }
            className={styles.textInput}
            placeholder="cubic-bezier(x1, y1, x2, y2)"
          />
        </div>
      )}
    </div>
  );
}
