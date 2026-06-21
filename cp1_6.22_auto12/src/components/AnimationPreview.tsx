import {
  useRef,
  useEffect,
  useState,
  useMemo,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from 'react';
import {
  AnimationStyle,
  KeyframePositions,
  CharState,
  Particle,
  computeFrame,
  initParticles,
  mixColorWithWhite,
} from '../utils/animationEngine';
// @ts-ignore
import GIF from 'gif.js';
import { saveAs } from 'file-saver';

interface AnimationPreviewProps {
  text: string;
  animationStyle: AnimationStyle;
  duration: number;
  fontSize: number;
  color: string;
  waveAmplitude: number;
  keyframes: KeyframePositions;
  isPlaying: boolean;
}

export interface AnimationPreviewRef {
  exportGIF: () => Promise<void>;
  exportMP4: () => Promise<void>;
}

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 200;

const AnimationPreview = forwardRef<AnimationPreviewRef, AnimationPreviewProps>(
  ({ text, animationStyle, duration, fontSize, color, waveAmplitude, keyframes, isPlaying }, ref) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const rafRef = useRef<number | null>(null);
    const startTimeRef = useRef<number>(performance.now());
    const pausedTimeRef = useRef<number>(0);
    const [frameResult, setFrameResult] = useState<{
      charStates: CharState[];
      particles: Particle[];
      neonGlow?: { intensity: number; color: string };
      showText: boolean;
      t: number;
    } | null>(null);

    const chars = useMemo(() => Array.from(text || ' '), [text]);
    const particles = useMemo(
      () =>
        initParticles(chars, fontSize, CANVAS_WIDTH, CANVAS_HEIGHT, color),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [chars.length, fontSize, color]
    );

    const config = useMemo(
      () => ({
        text,
        style: animationStyle,
        fontSize,
        color,
        duration,
        waveAmplitude,
      }),
      [text, animationStyle, fontSize, color, duration, waveAmplitude]
    );

    const renderFrame = useCallback(
      (rawT: number) => {
        const result = computeFrame(
          config,
          keyframes,
          rawT,
          CANVAS_WIDTH,
          CANVAS_HEIGHT,
          chars,
          particles
        );
        setFrameResult({ ...result, t: rawT });
      },
      [config, keyframes, chars, particles]
    );

    useEffect(() => {
      const tick = (now: number) => {
        if (isPlaying) {
          const elapsed = (now - startTimeRef.current) / 1000;
          const t = duration > 0 ? (elapsed % duration) / duration : 0;
          renderFrame(t);
        } else {
          startTimeRef.current = now - pausedTimeRef.current;
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
      return () => {
        if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      };
    }, [isPlaying, duration, renderFrame]);

    useEffect(() => {
      if (!isPlaying && frameResult) {
        pausedTimeRef.current = frameResult.t * duration * 1000;
      }
    }, [isPlaying, frameResult, duration]);

    useEffect(() => {
      if (!frameResult) renderFrame(0);
    }, [renderFrame, frameResult]);

    const getOffscreenCanvas = useCallback(() => {
      if (!offscreenCanvasRef.current) {
        const c = document.createElement('canvas');
        c.width = CANVAS_WIDTH;
        c.height = CANVAS_HEIGHT;
        offscreenCanvasRef.current = c;
      }
      return offscreenCanvasRef.current;
    }, []);

    const svgToCanvas = useCallback(
      (t: number, canvas: HTMLCanvasElement): Promise<void> => {
        return new Promise((resolve) => {
          const result = computeFrame(
            config,
            keyframes,
            t,
            CANVAS_WIDTH,
            CANVAS_HEIGHT,
            chars,
            particles
          );

          const ctx = canvas.getContext('2d')!;
          ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

          ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
          ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

          ctx.textAlign = 'center';
          ctx.textBaseline = 'alphabetic';

          if (result.showText || animationStyle !== 'particle') {
            result.charStates.forEach((cs, idx) => {
              const finalColor =
                result.neonGlow && animationStyle === 'neon'
                  ? mixColorWithWhite(color, (1 - Math.sin(t * Math.PI * 10)) * 0.4)
                  : color;
              ctx.save();
              ctx.globalAlpha = cs.opacity;
              ctx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
              ctx.translate(cs.x + cs.offsetX, cs.y + cs.offsetY);
              if (cs.rotation) ctx.rotate((cs.rotation * Math.PI) / 180);
              if (cs.scale && cs.scale !== 1) ctx.scale(cs.scale, cs.scale);

              if (result.neonGlow && animationStyle === 'neon') {
                const glow = result.neonGlow.intensity;
                ctx.shadowColor = color;
                ctx.shadowBlur = 8 + glow * 20;
                ctx.fillStyle = mixColorWithWhite(color, glow * 0.5);
              } else {
                ctx.fillStyle = finalColor;
              }
              ctx.fillText(cs.char, 0, 0);
              void idx;
              ctx.restore();
            });
          }

          if (result.particles.length > 0) {
            result.particles.forEach((p) => {
              ctx.save();
              ctx.globalAlpha = p.opacity;
              ctx.fillStyle = color;
              ctx.beginPath();
              ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
              ctx.fill();
              ctx.restore();
            });
          }

          resolve();
        });
      },
      [config, keyframes, chars, particles, color, fontSize, animationStyle]
    );

    const exportGIF = useCallback(async () => {
      const canvas = getOffscreenCanvas();
      const gif = new GIF({
        workers: 2,
        quality: 10,
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        workerScript:
          'https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.worker.js',
      });

      const fps = 5;
      const totalFrames = Math.max(8, Math.floor(fps * Math.min(duration, 4)));

      for (let i = 0; i < totalFrames; i++) {
        const t = i / totalFrames;
        await svgToCanvas(t, canvas);
        gif.addFrame(canvas, { copy: true, delay: 1000 / fps });
      }

      return new Promise<void>((resolve, reject) => {
        gif.on('finished', (blob: Blob) => {
          const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
          const fileName = `logo_${animationStyle}_${text || 'empty'}_${ts}.gif`;
          saveAs(blob, fileName);
          resolve();
        });
        gif.on('error', (err: unknown) => reject(err));
        gif.render();
      });
    }, [getOffscreenCanvas, svgToCanvas, duration, animationStyle, text]);

    const exportMP4 = useCallback(async () => {
      const canvas = getOffscreenCanvas();
      const stream = (canvas as HTMLCanvasElement & { captureStream: (fps: number) => MediaStream }).captureStream(30);

      let mime = 'video/webm;codecs=vp9';
      if (!MediaRecorder.isTypeSupported(mime)) {
        mime = 'video/webm;codecs=vp8';
      }
      if (!MediaRecorder.isTypeSupported(mime)) {
        mime = 'video/webm';
      }

      const recorder = new MediaRecorder(stream, {
        mimeType: mime,
        videoBitsPerSecond: 2500000,
      });

      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      const finished = new Promise<Blob>((resolve) => {
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: mime });
          resolve(blob);
        };
      });

      const recordDuration = Math.min(duration * 1000, 3000);
      recorder.start();

      const fps = 30;
      const totalFrames = Math.ceil(recordDuration / 1000 * fps);
      const frameDelay = 1000 / fps;

      let frameIdx = 0;
      const drawNext = () => {
        const t = (frameIdx / totalFrames) % 1;
        svgToCanvas(t, canvas).then(() => {
          frameIdx++;
          if (frameIdx < totalFrames) {
            setTimeout(drawNext, frameDelay);
          } else {
            setTimeout(() => recorder.stop(), frameDelay);
          }
        });
      };
      drawNext();

      const blob = await finished;
      const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const isWebm = mime.includes('webm');
      const ext = isWebm ? 'webm' : 'mp4';
      const fileName = `logo_${animationStyle}_${text || 'empty'}_${ts}.${ext}`;
      saveAs(blob, fileName);
    }, [getOffscreenCanvas, svgToCanvas, duration, animationStyle, text]);

    useImperativeHandle(
      ref,
      () => ({
        exportGIF,
        exportMP4,
      }),
      [exportGIF, exportMP4]
    );

    const fr = frameResult;
    const neonFilterId = 'neon-glow-filter';

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            position: 'relative',
            width: CANVAS_WIDTH,
            height: CANVAS_HEIGHT,
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow:
              '0 10px 40px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.96)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              border: '1px dashed rgba(120, 120, 140, 0.6)',
              borderRadius: '12px',
              pointerEvents: 'none',
              zIndex: 10,
            }}
          />
          <svg
            ref={svgRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
            style={{ display: 'block' }}
          >
            <defs>
              <filter id={neonFilterId} x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur
                  stdDeviation={fr?.neonGlow ? 2 + fr.neonGlow.intensity * 6 : 4}
                  result="coloredBlur"
                />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="soft-shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15" />
              </filter>
            </defs>

            {fr &&
              fr.particles.map((p) => (
                <circle
                  key={p.id}
                  cx={p.x}
                  cy={p.y}
                  r={p.radius}
                  fill={color}
                  opacity={p.opacity}
                />
              ))}

            {fr &&
              fr.showText &&
              fr.charStates.map((cs, i) => {
                const tx = cs.x + cs.offsetX;
                const ty = cs.y + cs.offsetY;
                const fillColor =
                  fr.neonGlow && animationStyle === 'neon'
                    ? mixColorWithWhite(color, fr.neonGlow.intensity * 0.5)
                    : color;
                return (
                  <text
                    key={i}
                    x={tx}
                    y={ty}
                    fontSize={fontSize}
                    fontFamily={"-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"}
                    fontWeight={600}
                    textAnchor="middle"
                    dominantBaseline="alphabetic"
                    fill={fillColor}
                    opacity={cs.opacity}
                    transform={
                      cs.rotation || cs.scale !== 1
                        ? `rotate(${cs.rotation} ${tx} ${ty}) scale(${cs.scale} ${cs.scale}) translate(${tx * (1 - 1 / (cs.scale || 1)) / (1 || 1)} 0)`
                        : undefined
                    }
                    filter={
                      animationStyle === 'neon'
                        ? `url(#${neonFilterId})`
                        : animationStyle === 'particle'
                        ? undefined
                        : 'url(#soft-shadow)'
                    }
                    style={{
                      transition: 'none',
                    }}
                  >
                    {cs.char}
                  </text>
                );
              })}
          </svg>
        </div>
      </div>
    );
  }
);

AnimationPreview.displayName = 'AnimationPreview';

export default AnimationPreview;
