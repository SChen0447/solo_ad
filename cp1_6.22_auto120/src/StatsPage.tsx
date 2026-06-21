import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

interface StatsData {
  total: number;
  unread: number;
  reading: number;
  read: number;
  totalMinutes: number;
  monthlyMinutes: { month: string; minutes: number }[];
}

function DonutChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = 240;
    const height = 240;
    const radius = Math.min(width, height) / 2;

    const g = svg
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${width / 2},${height / 2})`);

    const total = data.reduce((s, d) => s + d.value, 0);
    if (total === 0) {
      g.append('circle')
        .attr('r', radius - 20)
        .attr('fill', 'none')
        .attr('stroke', '#4a5568')
        .attr('stroke-width', 20);
      g.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '0.35em')
        .attr('fill', '#e2e8f0')
        .attr('font-size', '14px')
        .text('暂无数据');
      return;
    }

    const pie = d3.pie<{ label: string; value: number; color: string }>()
      .value((d) => d.value)
      .sort(null);

    const arc = d3.arc<d3.PieArcDatum<{ label: string; value: number; color: string }>>()
      .innerRadius(radius - 40)
      .outerRadius(radius - 10);

    const arcs = g.selectAll('path')
      .data(pie(data))
      .enter()
      .append('path')
      .attr('fill', (d) => d.data.color)
      .attr('stroke', '#2d3748')
      .attr('stroke-width', 2)
      .each(function (d) { (this as SVGPathElement)._current = { startAngle: d.startAngle, endAngle: d.startAngle }; })
      .transition()
      .duration(800)
      .attrTween('d', function (d) {
        const i = d3.interpolate(this._current, d);
        this._current = i(1);
        return (t: number) => arc(i(t)) || '';
      });

    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '-0.1em')
      .attr('fill', '#e2e8f0')
      .attr('font-size', '24px')
      .attr('font-weight', 'bold')
      .text(total);

    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '1.2em')
      .attr('fill', '#a0aec0')
      .attr('font-size', '12px')
      .text('总藏书');
  }, [data]);

  return <svg ref={svgRef} />;
}

function LineChart({ data }: { data: { month: string; minutes: number }[] }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || data.length === 0) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 20, right: 30, bottom: 40, left: 50 };
    const width = 700 - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    const g = svg
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scalePoint<string>()
      .domain(data.map((d) => d.month))
      .range([0, width]);

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, (d) => d.minutes) || 100])
      .nice()
      .range([height, 0]);

    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x).tickValues(data.filter((_, i) => i % 2 === 0).map((d) => d.month)))
      .selectAll('text')
      .attr('fill', '#a0aec0')
      .attr('font-size', '10px')
      .attr('transform', 'rotate(-30)')
      .style('text-anchor', 'end');

    g.append('g')
      .call(d3.axisLeft(y).ticks(5))
      .selectAll('text')
      .attr('fill', '#a0aec0');

    g.selectAll('.domain, .tick line').attr('stroke', '#4a5568');

    const line = d3.line<{ month: string; minutes: number }>()
      .x((d) => x(d.month) || 0)
      .y((d) => y(d.minutes))
      .curve(d3.curveMonotoneX);

    const path = g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#3b82f6')
      .attr('stroke-width', 2.5)
      .attr('d', line);

    const totalLength = path.node()?.getTotalLength() || 0;
    path
      .attr('stroke-dasharray', `${totalLength} ${totalLength}`)
      .attr('stroke-dashoffset', totalLength)
      .transition()
      .duration(1500)
      .ease(d3.easeCubicInOut)
      .attr('stroke-dashoffset', 0);

    g.selectAll('.dot')
      .data(data)
      .enter()
      .append('circle')
      .attr('cx', (d) => x(d.month) || 0)
      .attr('cy', (d) => y(d.minutes))
      .attr('r', 0)
      .attr('fill', '#3b82f6')
      .attr('stroke', '#1a202c')
      .attr('stroke-width', 2)
      .transition()
      .delay((_, i) => 60 * i)
      .duration(300)
      .attr('r', 4);
  }, [data]);

  return <svg ref={svgRef} className="line-chart-svg" />;
}

export default function StatsPage() {
  const [stats, setStats] = useState<StatsData | null>(null);

  useEffect(() => {
    fetch('/api/stats')
      .then((res) => res.json())
      .then((data) => setStats(data))
      .catch((e) => console.error('Failed to load stats', e));
  }, []);

  if (!stats) {
    return <div className="loading-text">加载统计数据...</div>;
  }

  const donutData = [
    { label: '未读', value: stats.unread, color: '#3b82f6' },
    { label: '在读', value: stats.reading, color: '#f59e0b' },
    { label: '已读', value: stats.read, color: '#10b981' },
  ];

  return (
    <div className="stats-page">
      <div className="page-header">
        <h1 className="page-title">数据统计</h1>
      </div>

      <div className="stats-cards">
        <div className="stat-card">
          <span className="stat-card-number">{stats.total}</span>
          <span className="stat-card-label">总藏书量</span>
        </div>
        <div className="stat-card">
          <span className="stat-card-number">{stats.unread}</span>
          <span className="stat-card-label">未读</span>
        </div>
        <div className="stat-card">
          <span className="stat-card-number">{stats.reading}</span>
          <span className="stat-card-label">在读</span>
        </div>
        <div className="stat-card">
          <span className="stat-card-number">{stats.read}</span>
          <span className="stat-card-label">已读</span>
        </div>
        <div className="stat-card">
          <span className="stat-card-number">{Math.round(stats.totalMinutes / 60)}</span>
          <span className="stat-card-label">总阅读时长（小时）</span>
        </div>
      </div>

      <div className="charts-row">
        <div className="chart-card">
          <h3 className="chart-title">阅读状态分布</h3>
          <DonutChart data={donutData} />
          <div className="chart-legend">
            {donutData.map((d) => (
              <span key={d.label} className="chart-legend-item">
                <span className="legend-dot" style={{ backgroundColor: d.color }} />
                {d.label}: {d.value}
              </span>
            ))}
          </div>
        </div>

        <div className="chart-card chart-card-wide">
          <h3 className="chart-title">月度阅读时长趋势</h3>
          <LineChart data={stats.monthlyMinutes} />
        </div>
      </div>
    </div>
  );
}
