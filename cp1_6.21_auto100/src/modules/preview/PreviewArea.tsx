import { useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { useAnimationStore } from '@/store/useAnimationStore';
import { AnimationRunner } from './AnimationRunner';
import type { AnimationSlice } from '@/types';

const EASING_FNS: Record<string, (t: number) => number> = {
  linear: (t) => t,
  ease: (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  'ease-in': (t) => t * t,
  'ease-out': (t) => 1 - (1 - t) * (1 - t),
  'ease-in-out': (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
};

function applyEasing(easing: string, t: number) {
  return (EASING_FNS[easing] ?? EASING_FNS.ease)(t);
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function computeStyle(slices: AnimationSlice[], currentTime: number) {
  let tx = 0, ty = 0, rot = 0, sc = 1, sx = 0, sy = 0;
  let opacity = 1;
  let r = 0, g = 217, b = 170;

  for (const s of slices) {
    const start = s.startTime + s.delay;
    const end = start + s.duration;
    if (currentTime >= start && currentTime < end) {
      const raw = (currentTime - start) / s.duration;
      const p = applyEasing(s.easing, Math.max(0, Math.min(1, raw)));
      tx += s.transform.translateX * p;
      ty += s.transform.translateY * p;
      rot += s.transform.rotate * p;
      sc *= 1 + (s.transform.scale - 1) * p;
      sx += s.transform.skewX * p;
      sy += s.transform.skewY * p;
      opacity = lerp(1, s.opacity, p);
      const [sr, sg, sb] = hexToRgb(s.color.startColor);
      const [er, eg, eb] = hexToRgb(s.color.endColor);
      r = Math.round(lerp(sr, er, p));
      g = Math.round(lerp(sg, eg, p));
      b = Math.round(lerp(sb, eb, p));
    }
  }

  return {
    transform: `translate(${tx}px,${ty}px) rotate(${rot}deg) scale(${sc}) skew(${sx}deg,${sy}deg)`,
    opacity,
    backgroundColor: `rgb(${r},${g},${b})`,
  };
}

export default function PreviewArea() {
  const { slices, isPlaying, currentTime, totalDuration, setPlaying, setCurrentTime } = useAnimationStore();
  const runnerRef = useRef<AnimationRunner | null>(null);

  const handleTick = useCallback((t: number) => setCurrentTime(t), [setCurrentTime]);
  const handleEnd = useCallback(() => setPlaying(false), [setPlaying]);

  useEffect(() => {
    if (isPlaying) {
      const runner = new AnimationRunner(handleTick, handleEnd);
      runnerRef.current = runner;
      runner.start(totalDuration);
      return () => runner.destroy();
    }
    runnerRef.current?.destroy();
    runnerRef.current = null;
  }, [isPlaying, totalDuration, handleTick, handleEnd]);

  const style = computeStyle(slices, currentTime);

  return (
    <div className="flex flex-col gap-3">
      <div className="text-sm font-medium text-gray-600">预览区域</div>
      <div
        className="relative w-full h-64 rounded-lg border border-gray-200 flex items-center justify-center"
        style={{
          backgroundColor: '#f9fafb',
          backgroundImage: 'radial-gradient(circle, #d1d5db 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      >
        <div
          className="w-[120px] h-[120px] rounded-xl"
          style={{
            ...style,
            transition: 'transform 100ms, opacity 100ms, background-color 100ms',
          }}
        />
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => setPlaying(!isPlaying)}
          className="p-2 rounded-md hover:bg-gray-100 text-gray-700"
          title={isPlaying ? '暂停' : '播放'}
        >
          {isPlaying ? <Pause size={18} /> : <Play size={18} />}
        </button>
        <button
          onClick={() => { setPlaying(false); setCurrentTime(0); }}
          className="p-2 rounded-md hover:bg-gray-100 text-gray-700"
          title="重置"
        >
          <RotateCcw size={18} />
        </button>
        <input
          type="range"
          min={0}
          max={totalDuration || 1}
          step={1}
          value={currentTime}
          onChange={(e) => setCurrentTime(Number(e.target.value))}
          className="flex-1"
        />
        <span className="text-xs text-gray-500 w-24 text-right">
          {(currentTime / 1000).toFixed(1)}秒 / {(totalDuration / 1000).toFixed(1)}秒
        </span>
      </div>
    </div>
  );
}
