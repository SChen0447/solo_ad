import { useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { Shape, Keyframe, KeyframeProperty, Point } from './types';

interface Props {
  shapes: Shape[];
  keyframes: Keyframe[];
  duration: number;
  onClose: () => void;
}

function generateShapePath(shape: Shape): string {
  const { type, anchors } = shape;
  switch (type) {
    case 'circle': {
      const center = anchors.find(a => a.type === 'move')!;
      const radius = anchors.find(a => a.type === 'radius')!;
      const r = Math.hypot(radius.x - center.x, radius.y - center.y);
      return `M ${center.x + r} ${center.y} A ${r} ${r} 0 1 1 ${center.x - r} ${center.y} A ${r} ${r} 0 1 1 ${center.x + r} ${center.y} Z`;
    }
    case 'rectangle': {
      if (anchors.length < 4) return '';
      return `M ${anchors[0].x} ${anchors[0].y} L ${anchors[1].x} ${anchors[1].y} L ${anchors[2].x} ${anchors[2].y} L ${anchors[3].x} ${anchors[3].y} Z`;
    }
    case 'star': {
      if (anchors.length < 2) return '';
      let d = `M ${anchors[0].x} ${anchors[0].y}`;
      for (let i = 1; i < anchors.length; i++) {
        d += ` L ${anchors[i].x} ${anchors[i].y}`;
      }
      return d + ' Z';
    }
    case 'bezier': {
      if (anchors.length < 4) return '';
      const [s, c1, c2, e] = anchors;
      return `M ${s.x} ${s.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${e.x} ${e.y}`;
    }
    default:
      return '';
  }
}

function getShapeCenter(shape: Shape): { x: number; y: number } {
  if (shape.type === 'circle') {
    const center = shape.anchors.find(a => a.type === 'move');
    return center ? { x: center.x, y: center.y } : { x: 400, y: 250 };
  }
  let sumX = 0, sumY = 0;
  shape.anchors.forEach(a => { sumX += a.x; sumY += a.y; });
  return { x: sumX / (shape.anchors.length || 1), y: sumY / (shape.anchors.length || 1) };
}

interface KfTrack {
  property: KeyframeProperty;
  keyframes: { time: number; value: string }[];
}

function buildKfTracks(kfs: Keyframe[], shape: Shape): KfTrack[] {
  const center = getShapeCenter(shape);
  const result: KfTrack[] = [];

  const props: KeyframeProperty[] = ['position', 'rotation', 'scale', 'strokeLength'];
  props.forEach(prop => {
    const list = kfs.filter(k => k.property === prop).sort((a, b) => a.time - b.time);
    if (list.length === 0) return;

    const track: KfTrack = { property: prop, keyframes: [] };
    list.forEach(kf => {
      const pct = (kf.time / 1) * 100; // 以 duration 为基准换算
      if (prop === 'position') {
        const v = kf.value as Point;
        track.keyframes.push({ time: pct, value: `translate(${v.x}px, ${v.y}px)` });
      } else if (prop === 'rotation') {
        const v = kf.value as number;
        track.keyframes.push({ time: pct, value: `translate(-50%, -50%) rotate(${v}deg) translate(${center.x}px, ${center.y}px)` });
      } else if (prop === 'scale') {
        const v = kf.value as number;
        track.keyframes.push({ time: pct, value: `scale(${v})` });
      } else {
        const v = kf.value as number;
        track.keyframes.push({ time: pct, value: `${v}` });
      }
    });
    result.push(track);
  });

  return result;
}

function generateHTML(shapes: Shape[], keyframes: Keyframe[], duration: number): string {
  const shapeHTMLs = shapes.map((shape, idx) => {
    const path = generateShapePath(shape);
    const cx = getShapeCenter(shape).x;
    const cy = getShapeCenter(shape).y;
    const kfs = keyframes.filter(k => k.shapeId === shape.id);
    const track = buildKfTracks(kfs, shape);
    const transformOrigin = `${cx}px ${cy}px`;

    const animNames: string[] = [];
    const animDurations: string[] = [];
    const animTimings: string[] = [];

    track.forEach((t, i) => {
      animNames.push(`anim-${idx}-${i}`);
      animDurations.push(`${duration / 1000}s`);
      animTimings.push('ease-in-out');
    });

    const strokeKf = track.find(t => t.property === 'strokeLength');
    const dashAnimName = strokeKf ? `anim-${idx}-${track.indexOf(strokeKf)}` : '';

    const extraStyles: string[] = [];
    if (strokeKf) {
      extraStyles.push(`stroke-dasharray: 99999;`);
      extraStyles.push(`animation: ${dashAnimName} ${duration / 1000}s ease-in-out infinite;`);
    }
    if (track.length > 0) {
      const nonStrokeAnims = track.filter(t => t.property !== 'strokeLength');
      if (nonStrokeAnims.length > 0) {
        const combinedName = `combine-${idx}`;
        animNames.push(combinedName);
        animDurations.push(`${duration / 1000}s`);
        animTimings.push('ease-in-out');
      }
    }

    const animationStyle = animNames.length > 0 && !strokeKf
      ? `animation: ${animNames.join(', ')} ${duration / 1000}s ease-in-out infinite;`
      : '';

    return `      <path
        class="shape-${idx}"
        d="${path}"
        fill="${shape.fill}"
        stroke="${shape.stroke}"
        stroke-width="${shape.strokeWidth}"
        stroke-linecap="round"
        stroke-linejoin="round"
        style="transform-origin: ${transformOrigin}; ${animationStyle} ${extraStyles.join(' ')}"
      />`;
  });

  let cssKfDefs = '';
  shapes.forEach((shape, idx) => {
    const kfs = keyframes.filter(k => k.shapeId === shape.id);
    const tracks = buildKfTracks(kfs, shape);
    const center = getShapeCenter(shape);

    tracks.forEach((track, i) => {
      if (track.property === 'strokeLength') {
        const name = `anim-${idx}-${i}`;
        cssKfDefs += `@keyframes ${name} {\n`;
        track.keyframes.forEach(kf => {
          const val = parseFloat(kf.value);
          cssKfDefs += `  ${kf.time * (duration / 100) / (duration / 1000)}% { stroke-dashoffset: ${(1 - val) * 99999}; }\n`;
        });
        cssKfDefs += `}\n\n`;
      } else if (track.property === 'position') {
        const name = `anim-${idx}-${i}`;
        cssKfDefs += `@keyframes ${name} {\n`;
        track.keyframes.forEach(kf => {
          const pct = (kf.time / duration) * 100;
          cssKfDefs += `  ${pct}% { transform: ${kf.value}; }\n`;
        });
        cssKfDefs += `}\n\n`;
      } else if (track.property === 'rotation') {
        const name = `anim-${idx}-${i}`;
        cssKfDefs += `@keyframes ${name} {\n`;
        track.keyframes.forEach(kf => {
          const pct = (kf.time / duration) * 100;
          cssKfDefs += `  ${pct}% { transform: ${kf.value}; }\n`;
        });
        cssKfDefs += `}\n\n`;
      } else if (track.property === 'scale') {
        const name = `anim-${idx}-${i}`;
        cssKfDefs += `@keyframes ${name} {\n`;
        track.keyframes.forEach(kf => {
          const pct = (kf.time / duration) * 100;
          cssKfDefs += `  ${pct}% { transform: translate(-50%, -50%) ${kf.value} translate(50%, 50%); }\n`;
        });
        cssKfDefs += `}\n\n`;
      }
    });
  });

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>SVG 动画</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .wrap {
      padding: 40px;
      background: #ffffff;
      border-radius: 16px;
      box-shadow: 0 8px 30px rgba(0,0,0,0.08);
    }
    h1 {
      font-size: 14px;
      color: #64748b;
      margin-bottom: 16px;
      font-weight: 500;
      text-align: center;
    }
    svg { display: block; }
${cssKfDefs}  </style>
</head>
<body>
  <div class="wrap">
    <h1>SVG Animation Export</h1>
    <svg width="800" height="500" viewBox="0 0 800 500">
${shapeHTMLs.join('\n')}
    </svg>
  </div>
</body>
</html>`;
}

export default function ExportPanel({ shapes, keyframes, duration, onClose }: Props) {
  const htmlContent = useMemo(() => generateHTML(shapes, keyframes, duration), [shapes, keyframes, duration]);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [flash, setFlash] = useState(false);

  const handleDownload = () => {
    setFlash(true);
    setTimeout(() => setFlash(false), 200);
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `svg-animation-${Date.now()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(htmlContent);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.5)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 20,
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        style={{
          width: 600,
          height: 400,
          background: '#ffffff',
          borderRadius: 16,
          boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid #e2e8f0',
        }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1e293b', margin: 0 }}>导出预览</h3>
            <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0 0' }}>
              {shapes.length} 个图形 · {keyframes.length} 个关键帧 · {duration / 1000}s
            </p>
          </div>
          <motion.button
            whileHover={{ background: '#f1f5f9' }}
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'transparent',
              color: '#64748b',
              fontSize: 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✕
          </motion.button>
        </div>

        <div style={{
          flex: 1,
          padding: 16,
          overflow: 'hidden',
        }}>
          <iframe
            ref={iframeRef}
            srcDoc={htmlContent}
            title="preview"
            style={{
              width: '100%',
              height: '100%',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              background: '#f8fafc',
            }}
          />
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 10,
          padding: '12px 20px',
          borderTop: '1px solid #e2e8f0',
          background: '#f8fafc',
        }}>
          <motion.button
            whileHover={{ background: '#e2e8f0' }}
            whileTap={{ scale: 0.95 }}
            onClick={handleCopyCode}
            style={{
              height: 40,
              padding: '0 16px',
              borderRadius: 8,
              background: '#ffffff',
              color: '#475569',
              fontSize: 13,
              fontWeight: 500,
              border: '1px solid #e2e8f0',
            }}
          >
            复制代码
          </motion.button>
          <motion.button
            whileHover={{
              background: flash ? '#86efac' : '#16a34a',
              transition: { duration: 0.2 },
            }}
            animate={{
              scale: flash ? [0.95, 1] : 1,
              transition: { duration: 0.2 },
            }}
            whileTap={{ scale: 0.95 }}
            onClick={handleDownload}
            style={{
              width: 140,
              height: 40,
              borderRadius: 8,
              background: flash ? '#86efac' : '#22c55e',
              color: '#ffffff',
              fontSize: 14,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              boxShadow: flash ? '0 0 16px rgba(34,197,94,0.6)' : '0 2px 8px rgba(34,197,94,0.3)',
            }}
          >
            ⬇ 下载 HTML
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
