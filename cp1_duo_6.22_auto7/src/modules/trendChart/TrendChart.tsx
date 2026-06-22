import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import type { KeywordResult } from '@/shared/types';

interface TrendChartProps {
  keywords: KeywordResult[];
  selectedWords: string[];
}

const COLORS = ['#1a237e', '#e65100', '#2e7d32', '#c62828', '#6a1b9a'];

export default function TrendChart({ keywords, selectedWords }: TrendChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [fadeIn, setFadeIn] = useState(false);

  useEffect(() => {
    if (selectedWords.length === 0) {
      setFadeIn(false);
      return;
    }
    const timer = setTimeout(() => setFadeIn(true), 10);
    return () => clearTimeout(timer);
  }, [selectedWords]);

  useEffect(() => {
    if (!svgRef.current || selectedWords.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const rect = svgRef.current.getBoundingClientRect();
    const width = rect.width || 350;
    const height = rect.height || 240;

    const margin = { top: 20, right: 20, bottom: 40, left: 36 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const selectedKeywords = keywords.filter(k => selectedWords.includes(k.word));

    const allWeeks = new Set<string>();
    selectedKeywords.forEach(k => {
      k.weeklyData.forEach(d => allWeeks.add(d.week));
    });
    const weeks = Array.from(allWeeks).sort();

    if (weeks.length === 0) {
      const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
      g.append('text')
        .attr('x', innerW / 2)
        .attr('y', innerH / 2)
        .attr('text-anchor', 'middle')
        .attr('fill', '#bdbdbd')
        .attr('font-size', 13)
        .text('暂无趋势数据');
      return;
    }

    const seriesData = selectedKeywords.map(k => {
      const weekMap = new Map(k.weeklyData.map(d => [d.week, d.count]));
      return {
        word: k.word,
        values: weeks.map(w => ({ week: w, count: weekMap.get(w) || 0 })),
      };
    });

    const maxCount = Math.max(
      ...seriesData.flatMap(s => s.values.map(v => v.count)),
      1
    );

    const x = d3.scalePoint<string>()
      .domain(weeks)
      .range([0, innerW])
      .padding(0.3);

    const y = d3.scaleLinear()
      .domain([0, maxCount * 1.15])
      .range([innerH, 0]);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    g.append('g')
      .attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(x).tickFormat((d: string) => {
        const parts = d.split('-');
        return `${parts[1]}/${parts[2]}`;
      }))
      .selectAll('text')
      .attr('fill', '#9e9e9e')
      .attr('font-size', 10)
      .attr('transform', 'rotate(-30)')
      .style('text-anchor', 'end');

    g.append('g')
      .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format('d')))
      .selectAll('text')
      .attr('fill', '#9e9e9e')
      .attr('font-size', 10);

    g.selectAll('.domain').attr('stroke', '#e0e0e0');
    g.selectAll('.tick line').attr('stroke', '#f0f0f0');

    g.append('g')
      .selectAll('line')
      .data(y.ticks(5).slice(1))
      .enter()
      .append('line')
      .attr('x1', 0)
      .attr('x2', innerW)
      .attr('y1', d => y(d))
      .attr('y2', d => y(d))
      .attr('stroke', '#f5f5f5')
      .attr('stroke-dasharray', '4,4');

    seriesData.forEach((series, idx) => {
      const color = COLORS[idx % COLORS.length];

      const line = d3.line<{ week: string; count: number }>()
        .x(d => x(d.week) || 0)
        .y(d => y(d.count))
        .curve(d3.curveMonotoneX);

      const path = g.append('path')
        .datum(series.values)
        .attr('fill', 'none')
        .attr('stroke', color)
        .attr('stroke-width', 2)
        .attr('d', line);

      const totalLength = path.node()?.getTotalLength() || 0;
      path
        .attr('stroke-dasharray', `${totalLength} ${totalLength}`)
        .attr('stroke-dashoffset', totalLength)
        .transition()
        .duration(400)
        .ease(d3.easeCubicOut)
        .attr('stroke-dashoffset', 0);

      g.selectAll(`.dot-${idx}`)
        .data(series.values)
        .enter()
        .append('circle')
        .attr('cx', d => x(d.week) || 0)
        .attr('cy', d => y(d.count))
        .attr('r', 0)
        .attr('fill', color)
        .attr('stroke', '#fff')
        .attr('stroke-width', 1.5)
        .transition()
        .delay(400)
        .duration(200)
        .attr('r', 3.5);
    });
  }, [keywords, selectedWords]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>热词趋势</h2>
        <span style={styles.hint}>从词云中选择关键词对比</span>
      </div>

      <div
        style={{
          ...styles.chartArea,
          opacity: fadeIn ? 1 : 0,
          transform: fadeIn ? 'translateY(0)' : 'translateY(8px)',
        }}
      >
        {selectedWords.length === 0 ? (
          <div style={styles.empty}>在词云中点击关键词查看趋势</div>
        ) : (
          <svg ref={svgRef} width="100%" height="100%" />
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
  },
  empty: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: '#bdbdbd',
    fontSize: 13,
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
