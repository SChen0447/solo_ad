import { useEffect, useRef, useState } from 'react';
import { useVoteStore } from '../store/useVoteStore';
import type { VoteOption } from '../types';

const COLORS = ['#ff6b6b', '#2ed573', '#4ecdc4', '#ffe66d', '#a29bfe', '#fd79a8', '#74b9ff', '#e17055', '#55efc4', '#dfe6e9'];

const easeOut = (t: number): number => 1 - Math.pow(1 - t, 3);

const ResultChart = () => {
  const { pollData } = useVoteStore();
  const barCanvasRef = useRef<HTMLCanvasElement>(null);
  const doughnutCanvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const prevVotesRef = useRef<Map<string, number>>(new Map());
  const [animatedTotal, setAnimatedTotal] = useState(0);

  useEffect(() => {
    if (!pollData) return;

    const startTotal = animatedTotal;
    const endTotal = pollData.totalVotes;
    const duration = 500;
    const startTime = performance.now();

    const animateNumber = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOut(progress);
      const current = Math.round(startTotal + (endTotal - startTotal) * eased);
      setAnimatedTotal(current);
      if (progress < 1) {
        requestAnimationFrame(animateNumber);
      }
    };

    requestAnimationFrame(animateNumber);
  }, [pollData?.totalVotes]);

  useEffect(() => {
    if (!pollData || !barCanvasRef.current || !doughnutCanvasRef.current) return;

    const barCanvas = barCanvasRef.current;
    const doughnutCanvas = doughnutCanvasRef.current;
    const barCtx = barCanvas.getContext('2d')!;
    const doughnutCtx = doughnutCanvas.getContext('2d')!;

    const dpr = window.devicePixelRatio || 1;

    const setupCanvas = (canvas: HTMLCanvasElement, width: number, height: number) => {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      const ctx = canvas.getContext('2d')!;
      ctx.scale(dpr, dpr);
      return ctx;
    };

    const sortedOptions = [...pollData.options].sort((a, b) => b.votes - a.votes);
    const maxVotes = Math.max(...sortedOptions.map((o) => o.votes), 1);
    const totalVotes = pollData.totalVotes;

    const barWidth = barCanvas.parentElement!.clientWidth;
    const barHeight = sortedOptions.length * 52;
    const doughnutSize = 240;

    setupCanvas(barCanvas, barWidth, barHeight);
    setupCanvas(doughnutCanvas, doughnutSize, doughnutSize);

    const startVotes = new Map<string, number>();
    pollData.options.forEach((opt) => {
      startVotes.set(opt.id, prevVotesRef.current.get(opt.id) || 0);
    });

    const duration = 300;
    const startTime = performance.now();

    const drawBarChart = (progress: number) => {
      barCtx.clearRect(0, 0, barWidth, barHeight);
      const barItemHeight = 52;
      const labelWidth = Math.max(...sortedOptions.map((o) => barCtx.measureText(o.text).width + 80), 140);
      const barAreaStart = labelWidth + 10;
      const barAreaWidth = barWidth - barAreaStart - 50;
      const barMaxWidth = Math.max(barAreaWidth, 50);

      sortedOptions.forEach((opt, index) => {
        const y = index * barItemHeight + 10;
        const startVote = startVotes.get(opt.id) || 0;
        const currentVotes = Math.round(startVote + (opt.votes - startVote) * progress);
        const barLen = (currentVotes / maxVotes) * barMaxWidth;

        barCtx.font = '13px -apple-system, BlinkMacSystemFont, sans-serif';
        barCtx.fillStyle = '#f0f0f5';
        barCtx.textAlign = 'right';
        barCtx.textBaseline = 'middle';

        const displayText = opt.text.length > 12 ? opt.text.slice(0, 11) + '…' : opt.text;
        barCtx.fillText(displayText, labelWidth, y + 16);

        const rankColor = opt.votes === maxVotes && opt.votes > 0 ? '#ff6b6b' : '#2ed573';
        barCtx.fillStyle = 'rgba(255,255,255,0.1)';
        roundRect(barCtx, barAreaStart, y + 6, barMaxWidth, 20, 8);
        barCtx.fill();

        barCtx.fillStyle = opt.votes === maxVotes && opt.votes > 0 ? rankColor : COLORS[index % COLORS.length];
        if (barLen > 0) {
          roundRect(barCtx, barAreaStart, y + 6, Math.max(barLen, 4), 20, 8);
          barCtx.fill();
        }

        barCtx.fillStyle = '#a0a0b0';
        barCtx.textAlign = 'left';
        barCtx.font = '12px monospace';
        barCtx.fillText(`${currentVotes}票`, barAreaStart + barMaxWidth + 8, y + 16);
      });
    };

    const drawDoughnutChart = (progress: number) => {
      doughnutCtx.clearRect(0, 0, doughnutSize, doughnutSize);
      const cx = doughnutSize / 2;
      const cy = doughnutSize / 2;
      const outerR = Math.min(cx, cy) - 10;
      const innerR = outerR * 0.62;

      if (totalVotes === 0) {
        doughnutCtx.beginPath();
        doughnutCtx.arc(cx, cy, outerR, 0, Math.PI * 2);
        doughnutCtx.arc(cx, cy, innerR, Math.PI * 2, 0, true);
        doughnutCtx.fillStyle = 'rgba(255,255,255,0.05)';
        doughnutCtx.fill();

        doughnutCtx.font = 'bold 32px -apple-system, BlinkMacSystemFont, sans-serif';
        doughnutCtx.fillStyle = '#f0f0f5';
        doughnutCtx.textAlign = 'center';
        doughnutCtx.textBaseline = 'middle';
        doughnutCtx.fillText(String(animatedTotal), cx, cy - 4);

        doughnutCtx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
        doughnutCtx.fillStyle = '#a0a0b0';
        doughnutCtx.fillText('总票数', cx, cy + 20);
        return;
      }

      let startAngle = -Math.PI / 2;
      const animatedOptions = sortedOptions.map((opt, idx) => {
        const startVote = startVotes.get(opt.id) || 0;
        const currentVotes = startVote + (opt.votes - startVote) * progress;
        return { ...opt, currentVotes, color: COLORS[idx % COLORS.length] };
      });

      const animatedTotalVotes = animatedOptions.reduce((s, o) => s + o.currentVotes, 0);

      animatedOptions.forEach((opt) => {
        if (opt.currentVotes <= 0) return;
        const sliceAngle = (opt.currentVotes / animatedTotalVotes) * Math.PI * 2 * progress;
        const endAngle = startAngle + sliceAngle;

        doughnutCtx.beginPath();
        doughnutCtx.arc(cx, cy, outerR, startAngle, endAngle);
        doughnutCtx.arc(cx, cy, innerR, endAngle, startAngle, true);
        doughnutCtx.closePath();
        doughnutCtx.fillStyle = opt.color;
        doughnutCtx.fill();

        startAngle = endAngle;
      });

      doughnutCtx.beginPath();
      doughnutCtx.arc(cx, cy, innerR - 2, 0, Math.PI * 2);
      doughnutCtx.fillStyle = '#1a1a2e';
      doughnutCtx.fill();

      doughnutCtx.font = 'bold 32px -apple-system, BlinkMacSystemFont, sans-serif';
      doughnutCtx.fillStyle = '#f0f0f5';
      doughnutCtx.textAlign = 'center';
      doughnutCtx.textBaseline = 'middle';
      doughnutCtx.fillText(String(animatedTotal), cx, cy - 4);

      doughnutCtx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
      doughnutCtx.fillStyle = '#a0a0b0';
      doughnutCtx.fillText('总票数', cx, cy + 20);
    };

    const roundRect = (
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      w: number,
      h: number,
      r: number,
    ) => {
      const radius = Math.min(r, w / 2, h / 2);
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.arcTo(x + w, y, x + w, y + h, radius);
      ctx.arcTo(x + w, y + h, x, y + h, radius);
      ctx.arcTo(x, y + h, x, y, radius);
      ctx.arcTo(x, y, x + w, y, radius);
      ctx.closePath();
    };

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOut(progress);

      drawBarChart(eased);
      drawDoughnutChart(eased);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    pollData.options.forEach((opt) => {
      prevVotesRef.current.set(opt.id, opt.votes);
    });

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [pollData, animatedTotal]);

  if (!pollData) {
    return (
      <div className="chart-card">
        <p style={{ color: 'var(--color-text-muted)', textAlign: 'center' }}>
          加载中...
        </p>
      </div>
    );
  }

  return (
    <div className="chart-card">
      <h3 className="chart-title">实时投票结果</h3>
      <div className="charts-wrapper">
        <div className="bar-chart-container">
          <canvas ref={barCanvasRef} className="chart-canvas" />
        </div>
        <div className="doughnut-chart-container">
          <canvas ref={doughnutCanvasRef} className="chart-canvas" />
        </div>
        <Legend options={pollData.options} />
      </div>
    </div>
  );
};

const Legend = ({ options }: { options: VoteOption[] }) => {
  const total = options.reduce((s, o) => s + o.votes, 0);
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '8px 16px',
      }}
    >
      {options.map((opt, idx) => {
        const pct = total > 0 ? ((opt.votes / total) * 100).toFixed(1) : '0.0';
        return (
          <div key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '2px',
                backgroundColor: COLORS[idx % COLORS.length],
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: '12px', color: '#a0a0b0', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {opt.text}
            </span>
            <span style={{ fontSize: '12px', color: '#f0f0f5', fontFamily: 'monospace' }}>
              {pct}%
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default ResultChart;
