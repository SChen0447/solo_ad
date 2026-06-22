import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import type { KeywordResult } from '@/shared/types';

interface TrendChartProps {
  keywords: KeywordResult[];
  selectedWords: string[];
}

const COLORS = ['#1a237e', '#e65100', '#2e7d32', '#c62828', '#6a1b9a'];
const TRANSITION_MS = 400;

interface SeriesDatum {
  week: string;
  count: number;
}
interface SeriesData {
  word: string;
  color: string;
  values: SeriesDatum[];
}

function formatWeekLabel(weekKey: string): string {
  const parts = weekKey.split('-');
  if (parts.length < 3) return weekKey;
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  const onejan = new Date(d.getFullYear(), 0, 1);
  const weekNum = Math.ceil(
    ((d.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7
  );
  return `${parts[0].slice(2)}/${parts[1]}/${parts[2]}`;
}

export default function TrendChart({ keywords, selectedWords }: TrendChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const prevDataRef = useRef<{
    weeks: string[];
    series: SeriesData[];
  } | null>(null);
  const [fadeIn, setFadeIn] = useState(false);
  const [hoverPoint, setHoverPoint] = useState<{
    x: number;
    y: number;
    word: string;
    week: string;
    count: number;
    color: string;
  } | null>(null);

  useEffect(() => {
    if (selectedWords.length === 0) {
      setFadeIn(false);
      return;
    }
    const timer = setTimeout(() => setFadeIn(true), 10);
    return () => clearTimeout(timer);
  }, [selectedWords]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!svgRef.current || selectedWords.length === 0) return;

    const selectedKeywords = keywords.filter(k => selectedWords.includes(k.word));
    if (selectedKeywords.length === 0) return;

    const rawWeeks = new Set<string>();
    selectedKeywords.forEach(k => {
      k.weeklyData.forEach(d => rawWeeks.add(d.week));
    });
    const weeks = Array.from(rawWeeks).sort();

    if (weeks.length === 0) return;

    const series: SeriesData[] = selectedKeywords.map((k, idx) => {
      const weekMap = new Map(k.weeklyData.map(d => [d.week, d.count]));
      return {
        word: k.word,
        color: COLORS[idx % COLORS.length],
        values: weeks.map(w => ({ week: w, count: weekMap.get(w) || 0 })),
      };
    });

    const prev = prevDataRef.current;
    prevDataRef.current = { weeks, series };

    const hasSignificantChange =
      !prev ||
      prev.weeks.length !== weeks.length ||
      prev.series.length !== series.length ||
      prev.series.some((s, i) => s.word !== series[i].word);

    const renderFrame = () => {
      rafRef.current = null;
      if (!svgRef.current) return;

      const svg = d3.select(svgRef.current);
      const node = svgRef.current;
      const rect = node.getBoundingClientRect();
      const width = rect.width || 350;
      const height = rect.height || 240;

      const margin = { top: 20, right: 20, bottom: 40, left: 36 };
      const innerW = Math.max(50, width - margin.left - margin.right);
      const innerH = Math.max(50, height - margin.top - margin.bottom);

      const maxCount = Math.max(
        1,
        ...series.flatMap(s => s.values.map(v => v.count))
      );

      if (hasSignificantChange) {
        svg.selectAll('*').remove();
      }

      let g = svg.select<SVGGElement>('g.chart-root');
      if (g.empty()) {
        g = svg.append('g').attr('class', 'chart-root');
      }
      g.attr('transform', `translate(${margin.left},${margin.top})`);

      const x = d3.scalePoint<string>()
        .domain(weeks)
        .range([0, innerW])
        .padding(0.3);

      const y = d3.scaleLinear()
        .domain([0, maxCount * 1.15])
        .range([innerH, 0])
        .nice();

      const xAxisSel = g.select<SVGGElement>('g.x-axis');
      if (xAxisSel.empty()) {
        g.append('g')
          .attr('class', 'x-axis')
          .attr('transform', `translate(0,${innerH})`);
      }
      g.select<SVGGElement>('g.x-axis')
        .transition()
        .duration(hasSignificantChange ? 0 : TRANSITION_MS)
        .ease(d3.easeCubicOut)
        .call(
          d3.axisBottom(x).tickFormat((d: string) => formatWeekLabel(d as string))
        )
        .selectAll('text')
        .attr('fill', '#9e9e9e')
        .attr('font-size', 10)
        .attr('transform', 'rotate(-30)')
        .style('text-anchor', 'end');

      const yAxisSel = g.select<SVGGElement>('g.y-axis');
      if (yAxisSel.empty()) {
        g.append('g').attr('class', 'y-axis');
      }
      g.select<SVGGElement>('g.y-axis')
        .transition()
        .duration(hasSignificantChange ? 0 : TRANSITION_MS)
        .ease(d3.easeCubicOut)
        .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format('d')))
        .selectAll('text')
        .attr('fill', '#9e9e9e')
        .attr('font-size', 10);

      g.selectAll('.domain').attr('stroke', '#e0e0e0');
      g.selectAll('.tick line').attr('stroke', '#f0f0f0');

      const gridSel = g.select<SVGGElement>('g.grid');
      if (gridSel.empty()) {
        g.insert('g', ':first-child').attr('class', 'grid');
      }
      const gridLines = gridSel.selectAll<SVGLineElement, number>('line').data(y.ticks(5).slice(1));
      gridLines.exit().remove();
      const gridEnter = gridLines.enter().append('line')
        .attr('x1', 0)
        .attr('stroke', '#f5f5f5')
        .attr('stroke-dasharray', '4,4');
      gridEnter.merge(gridLines)
        .transition()
        .duration(hasSignificantChange ? 0 : TRANSITION_MS)
        .ease(d3.easeCubicOut)
        .attr('x2', innerW)
        .attr('y1', d => y(d))
        .attr('y2', d => y(d));

      const seriesGroup = g.select<SVGGElement>('g.series');
      if (seriesGroup.empty()) {
        g.append('g').attr('class', 'series');
      }
      const sg = g.select<SVGGElement>('g.series');

      const seriesGroups = sg.selectAll<SVGGElement, SeriesData>('g.single-series')
        .data(series, d => d.word);

      seriesGroups.exit().remove();

      const seriesEnter = seriesGroups.enter()
        .append('g')
        .attr('class', 'single-series');

      seriesEnter.append('path').attr('class', 'series-line');
      seriesEnter.append('g').attr('class', 'series-dots');

      const seriesMerged = seriesEnter.merge(seriesGroups);

      const line = d3.line<SeriesDatum>()
        .x(d => (x(d.week) ?? 0))
        .y(d => y(d.count))
        .curve(d3.curveMonotoneX);

      const paths = seriesMerged.select<SVGPathElement>('path.series-line')
        .datum(d => d.values)
        .attr('fill', 'none')
        .attr('stroke', (_, i, nodes) => {
          const parent = nodes[i].parentElement;
          if (!parent) return COLORS[0];
          const bound = d3.select(parent as unknown as SVGGElement).datum() as SeriesData;
          return bound.color;
        })
        .attr('stroke-width', 2)
        .attr('stroke-linejoin', 'round')
        .attr('stroke-linecap', 'round');

      if (hasSignificantChange) {
        paths.each(function () {
          const path = this as SVGPathElement;
          const totalLength = path.getTotalLength() || 100;
          d3.select(path)
            .attr('stroke-dasharray', `${totalLength} ${totalLength}`)
            .attr('stroke-dashoffset', totalLength)
            .attr('d', function () { return d3.select(this).attr('d') || line(d3.select(this).datum() as SeriesDatum[]); })
            .transition()
            .duration(TRANSITION_MS)
            .ease(d3.easeCubicOut)
            .attr('stroke-dashoffset', 0)
            .on('end', function () {
              d3.select(this).attr('stroke-dasharray', null).attr('stroke-dashoffset', null);
            });
        });
      } else {
        paths
          .transition()
          .duration(TRANSITION_MS)
          .ease(d3.easeCubicOut)
          .attr('d', function (d) { return line(d as unknown as SeriesDatum[]); });
      }

      const dotsGroups = seriesMerged.select<SVGGElement>('g.series-dots');
      const colorForDots = (_d: unknown, i: number, nodes: SVGElement[]) => {
        const parent = nodes[i].closest('g.single-series');
        if (!parent) return COLORS[0];
        const bound = d3.select(parent as SVGGElement).datum() as SeriesData;
        return bound.color;
      };
      const wordForDots = (_d: unknown, i: number, nodes: SVGElement[]) => {
        const parent = nodes[i].closest('g.single-series');
        if (!parent) return '';
        const bound = d3.select(parent as SVGGElement).datum() as SeriesData;
        return bound.word;
      };

      seriesMerged.each(function (sd) {
        const group = d3.select(this);
        const dotsG = group.select<SVGGElement>('g.series-dots');
        const dots = dotsG.selectAll<SVGCircleElement, SeriesDatum>('circle')
          .data(sd.values, d => d.week);

        dots.exit().remove();

        const dotsEnter = dots.enter().append('circle')
          .attr('cx', d => x(d.week) || 0)
          .attr('cy', d => y(d.count))
          .attr('r', 0)
          .attr('fill', sd.color)
          .attr('stroke', '#fff')
          .attr('stroke-width', 1.5)
          .style('cursor', 'pointer');

        dotsEnter.merge(dots)
          .on('mouseenter', function (event, d) {
            const svgRect = svgRef.current?.getBoundingClientRect();
            if (svgRect) {
              setHoverPoint({
                word: sd.word,
                week: d.week,
                count: d.count,
                x: event.clientX - svgRect.left,
                y: event.clientY - svgRect.top,
                color: sd.color,
              });
            }
          })
          .on('mouseleave', () => setHoverPoint(null))
          .transition()
          .delay(hasSignificantChange ? TRANSITION_MS : 0)
          .duration(200)
          .ease(d3.easeCubicOut)
          .attr('cx', d => x(d.week) || 0)
          .attr('cy', d => y(d.count))
          .attr('r', 3.5)
          .attr('fill', sd.color);
      });

      void colorForDots;
      void wordForDots;
    };

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }
    rafRef.current = requestAnimationFrame(renderFrame);

  }, [keywords, selectedWords]);

  return (
    <div ref={containerRef} style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>热词趋势</h2>
        <span style={styles.hint}>按周聚合 · 最多5个</span>
      </div>

      <div
        style={{
          ...styles.chartArea,
          opacity: fadeIn ? 1 : 0,
          transform: fadeIn ? 'translateY(0)' : 'translateY(8px)',
        }}
      >
        {selectedWords.length === 0 ? (
          <div style={styles.emptyPlaceholder}>从词云中选择最多5个关键词，查看趋势变化</div>
        ) : (
          <svg ref={svgRef} width="100%" height="100%" />
        )}

        {hoverPoint && (
          <div style={{ ...styles.tooltip, left: hoverPoint.x, top: hoverPoint.y - 48 }}>
            <div style={{ color: hoverPoint.color || '#1a237e', fontWeight: 600 }}>{hoverPoint.word}</div>
            <div style={{ fontSize: 11, opacity: 0.9 }}>
              {formatWeekLabel(hoverPoint.week)} · {hoverPoint.count} 次
            </div>
          </div>
        )}
      </div>

      {selectedWords.length > 0 && (
        <div style={styles.legend}>
          {selectedWords.map((word, i) => (
            <span key={word} style={styles.legendItem}>
              <span style={{ ...styles.legendDot, backgroundColor: COLORS[i % COLORS.length] }} />
              {word}
            </span>
          ))}
        </div>
      )}
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
  hint: {
    fontSize: 11,
    color: '#bdbdbd',
  },
  chartArea: {
    flex: 1,
    margin: '0 12px',
    transition: 'opacity 300ms ease-out, transform 300ms ease-out',
    minHeight: 200,
    position: 'relative',
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
    padding: '6px 10px',
    backgroundColor: 'rgba(26, 35, 126, 0.92)',
    color: '#fff',
    fontSize: 12,
    borderRadius: 6,
    pointerEvents: 'none',
    whiteSpace: 'nowrap',
    zIndex: 10,
    transform: 'translate(-50%, 0)',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    lineHeight: 1.4,
  },
  legend: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 12,
    padding: '8px 20px 14px',
    justifyContent: 'center',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 11,
    color: '#616161',
  },
  legendDot: {
    display: 'inline-block',
    width: 8,
    height: 8,
    borderRadius: '50%',
  },
};
