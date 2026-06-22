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

const MIN_FONT_SIZE = 12;
const MAX_FONT_SIZE = 50;
const SCALE_MIN = 0.5;
const SCALE_MAX = 2;

interface WordLayout {
  text: string;
  size: number;
  x: number;
  y: number;
  rotation: number;
  frequency: number;
  category: string;
}

function clampFontSize(size: number): number {
  return Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE, size));
}

function clampScale(s: number): number {
  return Math.max(SCALE_MIN, Math.min(SCALE_MAX, s));
}

export default function WordCloud({ keywords, selectedWords, onWordSelect }: WordCloudProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [tooltip, setTooltip] = useState<{ word: string; count: number; x: number; y: number } | null>(null);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStateRef = useRef<{
    mode: 'rotate' | null;
    startX: number;
    startY: number;
    startRotation: number;
    centerX: number;
    centerY: number;
    startAngle: number;
  }>({
    mode: null,
    startX: 0,
    startY: 0,
    startRotation: 0,
    centerX: 0,
    centerY: 0,
    startAngle: 0,
  });
  const scaleRef = useRef(1);
  const rotationRef = useRef(0);
  const [fadeIn, setFadeIn] = useState(false);

  useEffect(() => {
    if (keywords.length === 0) {
      setFadeIn(false);
      return;
    }
    const timer = setTimeout(() => setFadeIn(true), 10);
    return () => clearTimeout(timer);
  }, [keywords]);

  const updateGroupTransform = useCallback(() => {
    if (!svgRef.current) return;
    const g = svgRef.current.querySelector('.word-group') as SVGGElement | null;
    if (!g) return;
    const rect = svgRef.current.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const s = scaleRef.current;
    const r = rotationRef.current;
    g.setAttribute('transform', `translate(${cx}, ${cy}) scale(${s}) rotate(${r}) translate(${-cx}, ${-cy})`);
  }, []);

  useEffect(() => {
    scaleRef.current = scale;
    updateGroupTransform();
  }, [scale, updateGroupTransform]);

  useEffect(() => {
    rotationRef.current = rotation;
    updateGroupTransform();
  }, [rotation, updateGroupTransform]);

  useEffect(() => {
    if (!svgRef.current || keywords.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('g.word-group').remove();
    svg.selectAll('g.zoom-layer').remove();

    const rect = svgRef.current.getBoundingClientRect();
    const width = rect.width || 400;
    const height = rect.height || 300;

    const zoomLayer = svg.append('g').attr('class', 'zoom-layer');
    const g = zoomLayer.append('g').attr('class', 'word-group');

    const maxFreq = Math.max(...keywords.map(k => k.frequency), 1);
    const minFreq = Math.min(...keywords.map(k => k.frequency));
    const freqRange = Math.max(1, maxFreq - minFreq);

    const layouts: WordLayout[] = keywords.map((k, i) => {
      const t = (k.frequency - minFreq) / freqRange;
      const rawSize = MIN_FONT_SIZE + t * (MAX_FONT_SIZE - MIN_FONT_SIZE);
      const size = clampFontSize(rawSize);
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

      for (let ring = 0; ring < 60 && !found; ring++) {
        const steps = Math.max(12, ring * 8);
        for (let step = 0; step < steps && !found; step++) {
          const angle = (step / steps) * Math.PI * 2;
          const radius = ring * (MAX_FONT_SIZE * 0.55);
          const x = centerX + Math.cos(angle) * radius;
          const y = centerY + Math.sin(angle) * radius;

          if (x < word.size * 1.2 || x > width - word.size * 1.2 ||
              y < word.size * 1.2 || y > height - word.size * 1.2) {
            continue;
          }

          let overlap = false;
          for (const p of placed) {
            const dx = x - p.x;
            const dy = y - p.y;
            const minDist = (word.size + p.size) * 0.6;
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
      .attr('class', 'word-text')
      .text(d => d.text)
      .style('opacity', d => {
        if (selectedWords.length === 0) return 1;
        return selectedWords.includes(d.text) ? 1 : 0.3;
      })
      .style('transition', 'opacity 100ms ease-out')
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

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([SCALE_MIN, SCALE_MAX])
      .on('zoom', (event) => {
        setScale(clampScale(event.transform.k));
      });
    zoomRef.current = zoom;
    svg.call(zoom);

    svg.on('mousedown.rotate', null);
    svg.on('mousedown.drag', null);

    updateGroupTransform();

  }, [keywords, onWordSelect, updateGroupTransform]);

  useEffect(() => {
    if (!svgRef.current) return;
    const texts = svgRef.current.querySelectorAll('text.word-text');
    texts.forEach((el) => {
      const d = (el as SVGTextElement).textContent || '';
      let opacity = '1';
      if (selectedWords.length > 0) {
        opacity = selectedWords.includes(d) ? '1' : '0.3';
      }
      (el as SVGTextElement).style.opacity = opacity;
    });
  }, [selectedWords]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const target = e.target as SVGElement;
    if (target.classList && target.classList.contains('word-text')) return;
    if (target.tagName === 'text') return;

    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const relX = startX - rect.left - cx;
    const relY = startY - rect.top - cy;
    const startAngle = Math.atan2(relY, relX) * (180 / Math.PI);

    setIsDragging(true);
    dragStateRef.current = {
      mode: 'rotate',
      startX,
      startY,
      startRotation: rotation,
      centerX: cx,
      centerY: cy,
      startAngle,
    };
  }, [rotation]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || dragStateRef.current.mode !== 'rotate') return;
    if (!svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const curX = e.clientX;
    const curY = e.clientY;
    const relX = curX - rect.left - dragStateRef.current.centerX;
    const relY = curY - rect.top - dragStateRef.current.centerY;
    const curAngle = Math.atan2(relY, relX) * (180 / Math.PI);

    let deltaAngle = curAngle - dragStateRef.current.startAngle;
    if (deltaAngle > 180) deltaAngle -= 360;
    if (deltaAngle < -180) deltaAngle += 360;

    const dxHorizontal = curX - dragStateRef.current.startX;
    const useHorizontal = Math.abs(relX) < 30 && Math.abs(relY) < 30;
    const finalDelta = useHorizontal ? dxHorizontal * 0.4 : deltaAngle;

    setRotation(dragStateRef.current.startRotation + finalDelta);
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    dragStateRef.current.mode = null;
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    setScale(prev => clampScale(prev + delta));
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
          <span style={styles.rotLabel}>{rotation.toFixed(0)}°</span>
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
          <div style={styles.emptyPlaceholder}>输入评论并点击分析，即可生成词云</div>
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
          <div style={{ ...styles.tooltip, left: tooltip.x, top: tooltip.y - 44 }}>
            <strong>{tooltip.word}</strong> · 出现 {tooltip.count} 次
          </div>
        )}
      </div>

      <div style={styles.zoomBar}>
        <button
          onClick={() => setScale(p => clampScale(p - 0.1))}
          disabled={scale <= SCALE_MIN}
          style={{
            ...styles.zoomBtn,
            opacity: scale <= SCALE_MIN ? 0.4 : 1,
          }}
        >−</button>
        <input
          type="range"
          min={SCALE_MIN}
          max={SCALE_MAX}
          step="0.05"
          value={scale}
          onChange={e => setScale(clampScale(parseFloat(e.target.value)))}
          style={styles.zoomSlider}
        />
        <button
          onClick={() => setScale(p => clampScale(p + 0.1))}
          disabled={scale >= SCALE_MAX}
          style={{
            ...styles.zoomBtn,
            opacity: scale >= SCALE_MAX ? 0.4 : 1,
          }}
        >+</button>
      </div>

      <div style={styles.hintBar}>
        <span style={styles.hintText}>提示：拖拽旋转 · 滚轮缩放 · 悬停查看详情</span>
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
    minWidth: 34,
    textAlign: 'right',
  },
  rotLabel: {
    fontSize: 11,
    color: '#bdbdbd',
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
  emptyPlaceholder: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    width: '100%',
    textAlign: 'center',
    color: '#9e9e9e',
    fontSize: 16,
    padding: '0 24px',
    lineHeight: 1.6,
  },
  tooltip: {
    position: 'absolute',
    padding: '6px 12px',
    backgroundColor: 'rgba(26, 35, 126, 0.92)',
    color: '#fff',
    fontSize: 12,
    borderRadius: 6,
    pointerEvents: 'none',
    whiteSpace: 'nowrap',
    zIndex: 10,
    transform: 'translateX(-50%)',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  },
  zoomBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 20px 4px',
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
  hintBar: {
    padding: '0 20px 4px',
    textAlign: 'center',
  },
  hintText: {
    fontSize: 10,
    color: '#c0c0c0',
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
