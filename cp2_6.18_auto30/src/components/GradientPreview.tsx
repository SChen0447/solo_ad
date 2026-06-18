import { useEffect, useRef, useState, useMemo } from 'react';
import { Square } from 'lucide-react';
import { useGradientStore } from '@/store/gradientStore';
import { generateGradientCSS } from '@/utils/cssGenerator';
import styles from './GradientPreview.module.css';

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  const full =
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h;
  const num = parseInt(full, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const to = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

function cubicBezierY(x1: number, y1: number, x2: number, y2: number, t: number): number {
  let low = 0;
  let high = 1;
  for (let i = 0; i < 18; i++) {
    const mid = (low + high) / 2;
    const bx =
      3 * x1 * mid * (1 - mid) ** 2 + 3 * x2 * mid ** 2 * (1 - mid) + mid ** 3;
    if (bx < t) low = mid;
    else high = mid;
  }
  const s = (low + high) / 2;
  return 3 * y1 * s * (1 - s) ** 2 + 3 * y2 * s ** 2 * (1 - s) + s ** 3;
}

function getEasedT(t: number, easing: string, cubicBezier: string): number {
  switch (easing) {
    case 'linear':
      return t;
    case 'ease':
      return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    case 'ease-in':
      return t * t * t;
    case 'ease-out':
      return --t * t * t + 1;
    case 'ease-in-out':
      return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
    default: {
      const m = cubicBezier.match(
        /cubic-bezier\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)/
      );
      if (!m) return t;
      return cubicBezierY(
        parseFloat(m[1]),
        parseFloat(m[2]),
        parseFloat(m[3]),
        parseFloat(m[4]),
        t
      );
    }
  }
}

export default function GradientPreview() {
  const currentScheme = useGradientStore((s) => s.currentScheme);
  const animationParams = useGradientStore((s) => s.animationParams);
  const isPlaying = useGradientStore((s) => s.isPlaying);
  const setIsPlaying = useGradientStore((s) => s.setIsPlaying);
  const animProgress = useGradientStore((s) => s.animProgress);
  const setAnimProgress = useGradientStore((s) => s.setAnimProgress);

  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const lastPauseElapsedRef = useRef<number>(0);
  const [fps, setFps] = useState(0);
  const framesRef = useRef(0);
  const fpsTimerRef = useRef<number>(0);

  const sortedStops = useMemo(
    () => [...currentScheme.colorStops].sort((a, b) => a.position - b.position),
    [currentScheme.colorStops]
  );

  const staticGradient = useMemo(
    () =>
      generateGradientCSS(
        currentScheme.colorStops,
        currentScheme.gradientType,
        currentScheme.angle
      ),
    [currentScheme]
  );

  const computeStopsAtProgress = (progress: number) => {
    if (sortedStops.length < 2) return sortedStops;
    const n = sortedStops.length;
    const rawOffset = progress * n;
    const indexOffset = Math.floor(rawOffset) % n;
    const frac = rawOffset - Math.floor(rawOffset);
    const easedFrac = getEasedT(
      frac,
      animationParams.easing,
      animationParams.cubicBezierValue
    );

    return sortedStops.map((stop, idx) => {
      const colorIdx0 = (idx + indexOffset) % n;
      const colorIdx1 = (idx + indexOffset + 1) % n;
      const a = hexToRgb(sortedStops[colorIdx0].color);
      const b = hexToRgb(sortedStops[colorIdx1].color);
      const r = a.r + (b.r - a.r) * easedFrac;
      const g = a.g + (b.g - a.g) * easedFrac;
      const bl = a.b + (b.b - a.b) * easedFrac;
      return {
        ...stop,
        color: rgbToHex(r, g, bl),
      };
    });
  };

  const getAnimatedGradient = (progress: number) => {
    const stops = computeStopsAtProgress(progress);
    return generateGradientCSS(stops, currentScheme.gradientType, currentScheme.angle);
  };

  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    startTimeRef.current = performance.now() - lastPauseElapsedRef.current;
    fpsTimerRef.current = 0;
    framesRef.current = 0;

    const loop = (now: number) => {
      const totalElapsed = now - startTimeRef.current;
      const delayMs = animationParams.delay * 1000;
      const durationMs = animationParams.duration * 1000;
      const cycleTime = delayMs + durationMs;

      let progress: number;
      if (cycleTime <= 0) {
        progress = 0;
      } else if (totalElapsed < delayMs) {
        progress = 0;
      } else {
        const activeTime = totalElapsed - delayMs;
        progress = activeTime / durationMs;
      }

      const clampedProgress = progress - Math.floor(progress);
      setAnimProgress(clampedProgress);

      framesRef.current += 1;
      if (!fpsTimerRef.current) fpsTimerRef.current = now;
      if (now - fpsTimerRef.current >= 500) {
        const f = (framesRef.current * 1000) / (now - fpsTimerRef.current);
        setFps(Math.round(f));
        framesRef.current = 0;
        fpsTimerRef.current = now;
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      lastPauseElapsedRef.current = performance.now() - startTimeRef.current;
    };
  }, [
    isPlaying,
    animationParams.duration,
    animationParams.delay,
    animationParams.easing,
    animationParams.cubicBezierValue,
  ]);

  const handleTogglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      if (animProgress <= 0 || animProgress >= 1) {
        lastPauseElapsedRef.current = animationParams.delay * 1000;
      }
      setIsPlaying(true);
    }
  };

  const handleStop = () => {
    setIsPlaying(false);
    lastPauseElapsedRef.current = 0;
    setAnimProgress(0);
  };

  const displayedGradient =
    isPlaying || animProgress > 0
      ? getAnimatedGradient(animProgress)
      : staticGradient;

  return (
    <div className={styles.previewContainer}>
      <div className={styles.previewWrapper}>
        <div
          className={styles.previewCanvas}
          style={{
            backgroundImage: displayedGradient,
          }}
        />
        <div className={styles.previewLabel}>
          {currentScheme.gradientType === 'linear' ? '线性渐变预览' : '径向渐变预览'}
        </div>
      </div>

      <div className={styles.controlsRow}>
        <button
          className={styles.playBtn}
          onClick={handleTogglePlay}
          title={isPlaying ? '暂停' : '播放'}
          aria-label={isPlaying ? '暂停' : '播放'}
        >
          <div className={styles.iconWrap}>
            <div
              className={`${styles.iconPlay} ${
                isPlaying ? styles.iconHidden : styles.iconVisible
              }`}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="7,4 21,12 7,20" />
              </svg>
            </div>
            <div
              className={`${styles.iconPause} ${
                isPlaying ? styles.iconVisible : styles.iconHidden
              }`}
            >
              <span className={styles.pauseBar} />
              <span className={styles.pauseBar} />
            </div>
          </div>
        </button>

        <button
          className={styles.stopBtn}
          onClick={handleStop}
          disabled={!isPlaying && animProgress === 0}
          title="停止"
        >
          <Square size={18} fill="currentColor" />
        </button>

        <div className={styles.progressTrack}>
          <div
            className={styles.progressFill}
            style={{ width: `${animProgress * 100}%` }}
          />
        </div>

        <span className={styles.speedBadge}>{fps} FPS</span>
      </div>
    </div>
  );
}
