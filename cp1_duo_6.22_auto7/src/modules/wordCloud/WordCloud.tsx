import { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import type { KeywordResult } from '@/shared/types';

interface WordCloudProps {
  keywords: KeywordResult[];
  selectedWords: string[];
  onWordSelect: (word: string) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  positive: '#2e7d32',
  negative: '#c62828',
  neutral: '#757575',
};

const MIN_FONT = 12;
const MAX_FONT = 50;

interface WordLayout {
  text: string;
  size: number;
  x: number;
  y: number;
  rotation: number;
  frequency: number;
  category: string;
}

export default function WordCloud({ keywords, selectedWords, onWordSelect }: WordCloudProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{ word: string; count: number; x: number; y: number } | null>(null);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, rotation: 0 });
  const [fadeIn, setFadeIn] = useState(false);

  useEffect(() => {
    if (keywords.length === 0) {
      setFadeIn(false);
      return;
    }
    const timer = setTimeout(() => setFadeIn(true), 10);
    return () => clearTimeout(timer);
  }, [keywords]);

  useEffect(() => {
    if (!svgRef.current || keywords.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('g.word-group').remove();

    const rect = svgRef.current.getBoundingClientRect();
    const width = rect.width || 400;
    const height = rect.height || 300;

    const maxFreq = Math.max(...keywords.map(k => k.frequency), 1);
    const minFreq = Math.min(...keywords.map(k => k.frequency));

    const layouts: WordLayout[] = keywords.map((k, i) => {
      const t = maxFreq === minFreq ? 0.5 : (k.frequency - minFreq) / (maxFreq - minFreq);
      const size = MIN_FONT + t * (MAX_FONT - MIN_FONT);
      const angle = (i % 5 - 2) * 12;
      return {
        text: k.word,
        size,
        x: 0,
        y: 0,
        rotation: angle,
        frequency: k.frequency,
        category: k.category,
      };
    });

    const placed: WordLayout[] = [];
    const centerX = width / 2;
    const centerY = height / 2;

    for (const word of layouts) {
      let bestX = centerX;
      let bestY = centerY;
      let found = false;

      for (let ring = 0; ring < 50 && !found; ring++) {
        const steps = Math.max(8, ring * 6);
        for (let step = 0; step < steps && !found; step++) {
          const angle = (step / steps) * Math.PI * 2;
          const radius = ring * (MAX_FONT * 0.6);
          const x = centerX + Math.cos(angle) * radius;
          const y = centerY + Math.sin(angle) * radius;

          if (x < word.size || x > width - word.size || y < word.size || y > height - word.size) {
            continue;
          }

          let overlap = false;
          for (const p of placed) {
            const dx = x - p.x;
            const dy = y - p.y;
            const minDist = (word.size + p.size) * 0.5;
            if (dx * dx + dy * dy < minDist * minDist) {
              overlap = true;
              break;
            }
          }

          if (!overlap) {
            bestX = x;
            bestY = y;
            found = true;
          }
        }
      }

      word.x = bestX;
      word.y = bestY;
      placed.push(word);
    }

    const g = svg.append('g').attr('class', 'word-group');

    g.selectAll('text')
      .data(placed)
      .enter()
      .append('text')
      .attr('x', d => d.x)
      .attr('y', d => d.y)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('font-size', d => d.size)
      .attr('font-weight', d => d.frequency > (maxFreq * 0.6) ? 700 : 500)
      .attr('fill', d => CATEGORY_COLORS[d.category] || '#757575')
      .attr('transform', d => `rotate(${d.rotation}, ${d.x}, ${d.y})`)
      .attr('cursor', 'pointer')
      .text(d => d.text)
      .style('opacity', d => {
        if (selectedWords.length === 0) return 1;
        return selectedWords.includes(d.text) ? 1 : 0.3;
      })
      .style('transition', 'opacity 0.15s')
      .on('click', function (_event, d) {
        onWordSelect(d.text);
      })
      .on('mouseenter', function (event, d) {
        d3.select(this).attr('font-weight', 900);
        const svgRect = svgRef.current?.getBoundingClientRect();
        if (svgRect) {
          setTooltip({
            word: d.text,
            count: d.frequency,
            x: event.clientX - svgRect.left,
            y: event.clientY - svgRect.top,
          });
        }
      })
      .on('mouseleave', function (_event, d) {
        d3.select(this).attr('font-weight', d.frequency > (maxFreq * 0.6) ? 700 : 500);
        setTooltip(null);
      });

  }, [keywords, selectedWords, onWordSelect]);

  useEffect(() => {
    if (!svgRef.current) return;
    const g = svgRef.current.querySelector('.word-group');
    if (g) {
      (g as SVGGElement).setAttribute('transform', `rotate(${rotation}) scale(${scale})`);
    }
  }, [scale, rotation]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as SVGElement).tagName === 'text') return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, rotation };
  }, [rotation]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    setRotation(dragStartRef.current.rotation + dx * 0.3);
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    setScale(prev => Math.min(2, Math.max(0.5, prev + delta)));
  }, []);

  const resetTransform = useCallback(() => {
    setScale(1);
    setRotation(0);
  }, []);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>关键词词云</h2>
        <div style={styles.controls}>
          <button onClick={resetTransform} style={styles.resetBtn}>重置</button>
          <span style={styles.scaleLabel}>{(scale * 100).toFixed(0)}%</span>
        </div>
      </div>

      <div
        ref={containerRef}
        style={{
          ...styles.cloudArea,
          opacity: fadeIn ? 1 : 0,
          transform: fadeIn ? 'translateY(0)' : 'translateY(8px)',
        }}
      >
        {keywords.length === 0 ? (
          <div style={styles.empty}>点击"开始分析"生成词云</div>
        ) : (
          <svg
            ref={svgRef}
            width="100%"
            height="100%"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
            style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
          />
        )}

        {tooltip && (
          <div style={{ ...styles.tooltip, left: tooltip.x, top: tooltip.y - 40 }}>
            <strong>{tooltip.word}</strong> · 出现 {tooltip.count} 次
          </div>
        )}
      </div>

      <div style={styles.zoomBar}>
        <button onClick={() => setScale(p => Math.max(0.5, p - 0.1))} style={styles.zoomBtn}>−</button>
        <input
          type="range"
          min="0.5"
          max="2"
          step="0.05"
          value={scale}
          onChange={e => setScale(parseFloat(e.target.value))}
          style={styles.zoomSlider}
        />
        <button onClick={() => setScale(p => Math.min(2, p + 0.1))} style={styles.zoomBtn}>+</button>
      </div>

      <div style={styles.legend}>
        <span style={{ ...styles.legendItem, color: '#2e7d32' }}>● 优点</span>
        <span style={{ ...styles.legendItem, color: '#c62828' }}>● 缺点</span>
        <span style={{ ...styles.legendItem, color: '#757575' }}>● 中性</span>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    border: '1px solid #e8e8e8',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px 8px',
  },
  title: {
    margin: 0,
    fontSize: 16,
    fontWeight: 700,
    color: '#1a237e',
  },
  controls: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  resetBtn: {
    background: 'none',
    border: '1px solid #e0e0e0',
    borderRadius: 6,
    padding: '2px 10px',
    fontSize: 11,
    color: '#757575',
    cursor: 'pointer',
  },
  scaleLabel: {
    fontSize: 11,
    color: '#9e9e9e',
    minWidth: 36,
    textAlign: 'right',
  },
  cloudArea: {
    flex: 1,
    position: 'relative',
    margin: '0 20px',
    overflow: 'hidden',
    transition: 'opacity 300ms ease-out, transform 300ms ease-out',
  },
  empty: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: '#bdbdbd',
    fontSize: 13,
  },
  tooltip: {
    position: 'absolute',
    padding: '6px 12px',
    backgroundColor: 'rgba(26, 35, 126, 0.9)',
    color: '#fff',
    fontSize: 12,
    borderRadius: 6,
    pointerEvents: 'none',
    whiteSpace: 'nowrap',
    zIndex: 10,
    transform: 'translateX(-50%)',
  },
  zoomBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 20px',
  },
  zoomBtn: {
    width: 28,
    height: 28,
    border: '1px solid #e0e0e0',
    borderRadius: 6,
    background: '#fff',
    fontSize: 16,
    cursor: 'pointer',
    color: '#424242',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomSlider: {
    flex: 1,
    accentColor: '#1a237e',
    height: 4,
  },
  legend: {
    display: 'flex',
    justifyContent: 'center',
    gap: 16,
    padding: '4px 20px 12px',
  },
  legendItem: {
    fontSize: 11,
    fontWeight: 500,
  },
};
