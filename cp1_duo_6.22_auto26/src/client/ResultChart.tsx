import { useEffect, useRef } from 'react';

interface VoteOption {
  id: string;
  text: string;
  voteCount: number;
  voters?: string[];
}

interface ResultChartProps {
  options: VoteOption[];
  totalVotes: number;
}

function getOptionColor(index: number, total: number): string {
  const startH = 250;
  const endH = 280;
  const h = total <= 1 ? startH : startH + ((endH - startH) * index) / (total - 1);
  return `hsl(${h}, 80%, 65%)`;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export default function ResultChart({ options }: ResultChartProps) {
  const pieCanvasRef = useRef<HTMLCanvasElement>(null);
  const barCanvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const displayDataRef = useRef<number[]>([]);
  const targetDataRef = useRef<number[]>([]);
  const startDataRef = useRef<number[]>([]);
  const animatingRef = useRef(false);
  const pieCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const barCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const pieSizeRef = useRef(280);
  const barSizeRef = useRef({ width: 400, height: 200 });
  const optionsRef = useRef<VoteOption[]>(options);
  const animationStartRef = useRef(0);
  const animationDurationRef = useRef(300);
  const initializedRef = useRef(false);

  const drawPieChart = (ctx: CanvasRenderingContext2D, data: number[], size: number, currentOptions: VoteOption[]) => {
    const cx = size / 2;
    const cy = size / 2;
    const radius = Math.min(cx, cy) - 20;
    const innerRadius = radius * 0.55;

    ctx.clearRect(0, 0, size, size);

    const currentTotal = data.reduce((a, b) => a + b, 0);

    if (currentTotal === 0) {
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.arc(cx, cy, innerRadius, 0, Math.PI * 2, true);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.fill();

      ctx.fillStyle = '#666';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('暂无投票', cx, cy);
    } else {
      let startAngle = -Math.PI / 2;

      data.forEach((count, idx) => {
        if (count <= 0) return;
        const sliceAngle = (count / currentTotal) * Math.PI * 2;
        const endAngle = startAngle + sliceAngle;
        const color = getOptionColor(idx, currentOptions.length);

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius, startAngle, endAngle);
        ctx.closePath();

        const gradient = ctx.createRadialGradient(cx, cy, innerRadius * 0.5, cx, cy, radius);
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, color + 'CC');
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.strokeStyle = '#1E1E1E';
        ctx.lineWidth = 3;
        ctx.stroke();

        startAngle = endAngle;
      });

      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(cx, cy, innerRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';

      ctx.beginPath();
      ctx.arc(cx, cy, innerRadius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(30, 30, 30, 0.95)';
      ctx.fill();

      ctx.fillStyle = '#FFF';
      ctx.font = 'bold 32px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${Math.round(currentTotal)}`, cx, cy - 8);

      ctx.fillStyle = '#888';
      ctx.font = '12px sans-serif';
      ctx.fillText('总票数', cx, cy + 16);
    }
  };

  const drawBarChart = (ctx: CanvasRenderingContext2D, data: number[], width: number, height: number, currentOptions: VoteOption[]) => {
    const padding = { top: 20, right: 10, bottom: 40, left: 30 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    ctx.clearRect(0, 0, width, height);

    const currentMax = Math.max(...data, 1);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartHeight / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      const value = Math.round(currentMax - (currentMax / 4) * i);
      ctx.fillStyle = '#666';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(value), padding.left - 6, y);
    }

    const barCount = currentOptions.length;
    const barGroupWidth = chartWidth / barCount;
    const barWidth = Math.min(barGroupWidth * 0.6, 36);

    currentOptions.forEach((opt, idx) => {
      const value = data[idx] ?? 0;
      const barHeight = (value / currentMax) * chartHeight;
      const x = padding.left + barGroupWidth * idx + (barGroupWidth - barWidth) / 2;
      const y = padding.top + chartHeight - barHeight;
      const color = getOptionColor(idx, currentOptions.length);

      const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, color + '88');

      ctx.fillStyle = gradient;
      const r = Math.min(6, barWidth / 2);
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + barWidth - r, y);
      ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + r);
      ctx.lineTo(x + barWidth, y + barHeight);
      ctx.lineTo(x, y + barHeight);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.fill();

      if (value > 0.5) {
        ctx.fillStyle = '#FFF';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(String(Math.round(value)), x + barWidth / 2, y - 4);
      }

      ctx.fillStyle = '#AAA';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const label = opt.text.length > 6 ? opt.text.slice(0, 5) + '…' : opt.text;
      ctx.fillText(label, x + barWidth / 2, padding.top + chartHeight + 6);
    });
  };

  const runAnimation = (now: number) => {
    if (!pieCtxRef.current || !barCtxRef.current) return;

    const elapsed = now - animationStartRef.current;
    const t = Math.min(elapsed / animationDurationRef.current, 1);
    const eased = easeOut(t);

    const target = targetDataRef.current;
    const start = startDataRef.current;
    const current = target.map((val, i) => lerp(start[i] ?? 0, val, eased));
    displayDataRef.current = current;

    drawPieChart(pieCtxRef.current, current, pieSizeRef.current, optionsRef.current);
    drawBarChart(barCtxRef.current, current, barSizeRef.current.width, barSizeRef.current.height, optionsRef.current);

    if (t < 1) {
      animationRef.current = requestAnimationFrame(runAnimation);
    } else {
      animatingRef.current = false;
      animationRef.current = null;
    }
  };

  const cancelRunningAnimation = () => {
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    animatingRef.current = false;
  };

  useEffect(() => {
    optionsRef.current = options;

    const pieCanvas = pieCanvasRef.current;
    const barCanvas = barCanvasRef.current;
    if (!pieCanvas || !barCanvas) return;

    if (!initializedRef.current) {
      const pieCtx = pieCanvas.getContext('2d');
      const barCtx = barCanvas.getContext('2d');
      if (!pieCtx || !barCtx) return;

      const dpr = window.devicePixelRatio || 1;
      const pieSize = 280;
      const barWidth = 400;
      const barHeight = 200;

      pieCanvas.width = pieSize * dpr;
      pieCanvas.height = pieSize * dpr;
      pieCanvas.style.width = `${pieSize}px`;
      pieCanvas.style.height = `${pieSize}px`;
      pieCtx.scale(dpr, dpr);

      barCanvas.width = barWidth * dpr;
      barCanvas.height = barHeight * dpr;
      barCanvas.style.width = `${barWidth}px`;
      barCanvas.style.height = `${barHeight}px`;
      barCtx.scale(dpr, dpr);

      pieCtxRef.current = pieCtx;
      barCtxRef.current = barCtx;
      pieSizeRef.current = pieSize;
      barSizeRef.current = { width: barWidth, height: barHeight };

      displayDataRef.current = options.map(() => 0);
      initializedRef.current = true;
    }

    cancelRunningAnimation();

    const newTargetData = options.map(o => o.voteCount);
    const optionCount = options.length;

    const prevDisplay = displayDataRef.current;
    let newStartData: number[];
    if (prevDisplay.length === optionCount) {
      newStartData = [...prevDisplay];
    } else {
      newStartData = new Array(optionCount).fill(0);
      if (prevDisplay.length > 0) {
        for (let i = 0; i < Math.min(prevDisplay.length, optionCount); i++) {
          newStartData[i] = prevDisplay[i];
        }
      }
    }

    const noChange = newTargetData.every((v, i) => Math.abs(v - (newStartData[i] ?? 0)) < 0.001);
    if (noChange) {
      if (pieCtxRef.current && barCtxRef.current) {
        drawPieChart(pieCtxRef.current, newTargetData, pieSizeRef.current, options);
        drawBarChart(barCtxRef.current, newTargetData, barSizeRef.current.width, barSizeRef.current.height, options);
      }
      displayDataRef.current = [...newTargetData];
      return;
    }

    startDataRef.current = newStartData;
    targetDataRef.current = [...newTargetData];
    animationStartRef.current = performance.now();
    animationDurationRef.current = 300;
    animatingRef.current = true;

    animationRef.current = requestAnimationFrame(runAnimation);

    return cancelRunningAnimation;
  }, [options]);

  return (
    <div
      style={{
        padding: 24,
        backgroundColor: 'rgba(30, 30, 30, 0.8)',
        backdropFilter: 'blur(12px)',
        borderRadius: 16,
        border: '1px solid rgba(255, 255, 255, 0.06)',
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.3)',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <h3 style={{ fontSize: 16, fontWeight: 600, color: '#FFF' }}>📊 实时结果</h3>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
        <div style={{ position: 'relative' }}>
          <canvas ref={pieCanvasRef} />
        </div>

        <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
          <canvas ref={barCanvasRef} />
        </div>

        <div style={{ width: '100%', display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
          {options.map((opt, idx) => (
            <div
              key={opt.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px',
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                borderRadius: 6,
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: getOptionColor(idx, options.length),
                }}
              />
              <span style={{ fontSize: 11, color: '#CCC' }}>{opt.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
