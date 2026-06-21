import { useEffect, useRef } from 'react';
import * as d3 from 'd3-force';
import { select } from 'd3-selection';

interface Member {
  id: string;
  name: string;
  color: string;
}

interface EvaluationItem {
  style: string;
  content: string;
}

interface WordFreq {
  encourage: Record<string, number>;
  constructive: Record<string, number>;
  humorous: Record<string, number>;
}

interface ForceGraphProps {
  members: Member[];
  evaluationsByMember: Record<string, EvaluationItem[]>;
  wordFreqByMember: Record<string, WordFreq>;
}

const STYLE_COLORS: Record<string, string> = {
  encourage: '#48bb78',
  constructive: '#ed8936',
  humorous: '#9f7aea'
};

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  type: 'member' | 'tag';
  name?: string;
  color?: string;
  memberId?: string;
  style?: string;
  word?: string;
  freq?: number;
  size?: number;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
}

export default function ForceGraph({
  members,
  evaluationsByMember,
  wordFreqByMember
}: ForceGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = Math.max(500, container.clientHeight);

    const svg = select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [0, 0, width, height]);

    svg.selectAll('*').remove();

    const defs = svg.append('defs');
    const filter = defs.append('filter')
      .attr('id', 'glow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');
    filter.append('feGaussianBlur')
      .attr('stdDeviation', '2')
      .attr('result', 'coloredBlur');
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];

    members.forEach((member, index) => {
      nodes.push({
        id: `member-${member.id}`,
        type: 'member',
        name: member.name,
        color: member.color,
        size: 36
      });

      const wordFreq = wordFreqByMember[member.id];
      if (wordFreq) {
        const allWords: Array<{ word: string; style: string; freq: number }> = [];
        Object.entries(wordFreq).forEach(([style, words]) => {
          Object.entries(words as Record<string, number>).forEach(([word, freq]) => {
            allWords.push({ word, style, freq: freq as number });
          });
        });

        allWords.sort((a, b) => b.freq - a.freq);
        const topWords = allWords.slice(0, 6);

        topWords.forEach((item) => {
          const tagId = `tag-${member.id}-${item.word}-${item.style}`;
          const fontSize = Math.max(10, Math.min(18, 10 + item.freq * 2));
          nodes.push({
            id: tagId,
            type: 'tag',
            word: item.word,
            style: item.style,
            freq: item.freq,
            memberId: member.id,
            color: STYLE_COLORS[item.style],
            size: fontSize
          });
          links.push({
            source: `member-${member.id}`,
            target: tagId
          });
        });
      }
    });

    if (members.length >= 2) {
      for (let i = 0; i < members.length; i++) {
        for (let j = i + 1; j < members.length; j++) {
          links.push({
            source: `member-${members[i].id}`,
            target: `member-${members[j].id}`
          });
        }
      }
    }

    const totalNodes = nodes.length;
    const maxFps = totalNodes <= 20 ? 60 : 30;
    const frameInterval = 1000 / maxFps;

    const simulation = d3.forceSimulation<GraphNode>(nodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(links)
        .id((d: any) => d.id)
        .distance((d: any) => {
          const source = typeof d.source === 'object' ? d.source : { type: '' };
          const target = typeof d.target === 'object' ? d.target : { type: '' };
          if (source.type === 'member' && target.type === 'member') return 180;
          if (source.type === 'tag' || target.type === 'tag') return 60;
          return 100;
        })
        .strength((d: any) => {
          const source = typeof d.source === 'object' ? d.source : { type: '' };
          const target = typeof d.target === 'object' ? d.target : { type: '' };
          if (source.type === 'member' && target.type === 'member') return 0.15;
          return 0.8;
        })
      )
      .force('charge', d3.forceManyBody()
        .strength((d: any) => d.type === 'member' ? -300 : -80)
      )
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide<GraphNode>().radius((d: any) => {
        if (d.type === 'member') return 55;
        return (d.size || 12) + 4;
      }));

    const gLinks = svg.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', (d: any) => {
        const source = typeof d.source === 'object' ? d.source : { type: '' };
        const target = typeof d.target === 'object' ? d.target : { type: '' };
        if (source.type === 'tag') return source.color || '#cbd5e0';
        if (target.type === 'tag') return target.color || '#cbd5e0';
        return '#e2e8f0';
      })
      .attr('stroke-opacity', (d: any) => {
        const source = typeof d.source === 'object' ? d.source : { type: '' };
        const target = typeof d.target === 'object' ? d.target : { type: '' };
        if (source.type === 'tag' || target.type === 'tag') return 0.6;
        return 0.3;
      })
      .attr('stroke-width', (d: any) => {
        const source = typeof d.source === 'object' ? d.source : { type: '' };
        const target = typeof d.target === 'object' ? d.target : { type: '' };
        if (source.type === 'tag' || target.type === 'tag') return 1.5;
        return 1;
      })
      .attr('stroke-dasharray', (d: any) => {
        const source = typeof d.source === 'object' ? d.source : { type: '' };
        const target = typeof d.target === 'object' ? d.target : { type: '' };
        if (source.type === 'member' && target.type === 'member') return '4 3';
        return 'none';
      });

    const gNodes = svg.append('g')
      .selectAll<SVGGElement, GraphNode>('g.node')
      .data(nodes)
      .join('g')
      .attr('class', 'node');

    const gMembers = gNodes.filter((d: any) => d.type === 'member');

    gMembers.append('circle')
      .attr('class', 'pulse')
      .attr('r', (d: any) => (d.size || 36) + 4)
      .attr('fill', (d: any) => d.color || '#ed8936')
      .attr('opacity', 0.2);

    gMembers.append('circle')
      .attr('r', (d: any) => d.size || 36)
      .attr('fill', (d: any) => d.color || '#ed8936')
      .attr('stroke', '#fff')
      .attr('stroke-width', 3)
      .style('filter', 'url(#glow)');

    gMembers.append('text')
      .text((d: any) => (d.name || '').charAt(0))
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('fill', '#fff')
      .attr('font-size', 18)
      .attr('font-weight', 700)
      .style('pointer-events', 'none')
      .style('user-select', 'none');

    gMembers.append('text')
      .text((d: any) => d.name || '')
      .attr('text-anchor', 'middle')
      .attr('y', (d: any) => (d.size || 36) + 20)
      .attr('fill', '#2d3748')
      .attr('font-size', 14)
      .attr('font-weight', 600)
      .style('pointer-events', 'none')
      .style('user-select', 'none');

    const gTags = gNodes.filter((d: any) => d.type === 'tag');

    gTags.each(function(d: any) {
      const g = select(this);
      const fontSize = d.size || 12;
      const text = d.word || '';
      const paddingX = 8;
      const paddingY = 4;
      const approxWidth = text.length * fontSize * 0.7 + paddingX * 2;
      const approxHeight = fontSize + paddingY * 2;

      g.append('rect')
        .attr('rx', 8)
        .attr('ry', 8)
        .attr('x', -approxWidth / 2)
        .attr('y', -approxHeight / 2)
        .attr('width', approxWidth)
        .attr('height', approxHeight)
        .attr('fill', (d: any) => d.color || '#ed8936')
        .attr('fill-opacity', 0.12)
        .attr('stroke', (d: any) => d.color || '#ed8936')
        .attr('stroke-width', 1.5);

      g.append('text')
        .text(text)
        .attr('text-anchor', 'middle')
        .attr('dy', '0.35em')
        .attr('fill', (d: any) => d.color || '#ed8936')
        .attr('font-size', fontSize)
        .attr('font-weight', 600)
        .style('pointer-events', 'none')
        .style('user-select', 'none');
    });

    let dragging = false;
    let lastFrameTime = 0;

    function tick(timestamp: number) {
      if (timestamp - lastFrameTime < frameInterval) {
        requestAnimationFrame(tick);
        return;
      }
      lastFrameTime = timestamp;

      if (!dragging) {
        simulation.tick();
      }

      gLinks
        .attr('x1', (d: any) => (typeof d.source === 'object' ? d.source.x : 0) || 0)
        .attr('y1', (d: any) => (typeof d.source === 'object' ? d.source.y : 0) || 0)
        .attr('x2', (d: any) => (typeof d.target === 'object' ? d.target.x : 0) || 0)
        .attr('y2', (d: any) => (typeof d.target === 'object' ? d.target.y : 0) || 0);

      gNodes.attr('transform', (d: any) => `translate(${d.x || 0}, ${d.y || 0})`);

      requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);

    let pulseStart: number | null = null;
    function pulse(timestamp: number) {
      if (!pulseStart) pulseStart = timestamp;
      const elapsed = timestamp - pulseStart;
      const t = (elapsed % 800) / 800;
      const pulseScale = 1 + Math.sin(t * 2 * Math.PI) * 0.15;
      const pulseOpacity = 0.15 + Math.sin(t * 2 * Math.PI) * 0.1;

      gMembers.selectAll('circle.pulse')
        .attr('r', (d: any) => ((d.size || 36) + 4) * pulseScale)
        .attr('opacity', pulseOpacity);

      requestAnimationFrame(pulse);
    }
    requestAnimationFrame(pulse);

    let dragTimeout: number | null = null;
    let activeDrag: GraphNode | null = null;

    function getSvgPoint(clientX: number, clientY: number) {
      const svgEl = svgRef.current;
      if (!svgEl) return { x: 0, y: 0 };
      const rect = svgEl.getBoundingClientRect();
      const viewBox = svgEl.viewBox.baseVal;
      const scaleX = (viewBox.width || rect.width) / rect.width;
      const scaleY = (viewBox.height || rect.height) / rect.height;
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
      };
    }

    function onMouseDown(event: MouseEvent | TouchEvent, d: GraphNode) {
      event.preventDefault();
      activeDrag = d;
      dragging = true;
      simulation.alphaTarget(0.3).restart();
      const point = 'touches' in event
        ? getSvgPoint(event.touches[0].clientX, event.touches[0].clientY)
        : getSvgPoint((event as MouseEvent).clientX, (event as MouseEvent).clientY);
      d.fx = point.x;
      d.fy = point.y;
    }

    function onMouseMove(event: MouseEvent | TouchEvent) {
      if (!activeDrag) return;
      event.preventDefault();
      const point = 'touches' in event
        ? getSvgPoint(event.touches[0].clientX, event.touches[0].clientY)
        : getSvgPoint((event as MouseEvent).clientX, (event as MouseEvent).clientY);
      activeDrag.fx = point.x;
      activeDrag.fy = point.y;
    }

    function onMouseUp() {
      if (!activeDrag) return;
      if (dragTimeout) clearTimeout(dragTimeout);
      const node = activeDrag;
      dragTimeout = window.setTimeout(() => {
        dragging = false;
        if (node) {
          node.fx = null;
          node.fy = null;
        }
        simulation.alphaTarget(0);
      }, 500);
      activeDrag = null;
    }

    gMembers
      .on('mousedown', function(event: MouseEvent, d: GraphNode) { onMouseDown(event, d); })
      .on('touchstart', function(event: TouchEvent, d: GraphNode) { onMouseDown(event, d); })
      .style('cursor', 'grab');

    gTags
      .on('mousedown', function(event: MouseEvent, d: GraphNode) { onMouseDown(event, d); })
      .on('touchstart', function(event: TouchEvent, d: GraphNode) { onMouseDown(event, d); })
      .style('cursor', 'grab');

    const svgElement = svg.node();
    if (svgElement) {
      svgElement.addEventListener('mousemove', onMouseMove as EventListener);
      svgElement.addEventListener('touchmove', onMouseMove as EventListener, { passive: false });
      window.addEventListener('mouseup', onMouseUp);
      window.addEventListener('touchend', onMouseUp);
    }

    const handleResize = () => {
      const newWidth = container.clientWidth;
      svg.attr('width', newWidth);
      simulation.force('center', d3.forceCenter(newWidth / 2, height / 2));
      simulation.alpha(0.3).restart();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (svgElement) {
        svgElement.removeEventListener('mousemove', onMouseMove as EventListener);
        svgElement.removeEventListener('touchmove', onMouseMove as EventListener);
        window.removeEventListener('mouseup', onMouseUp);
        window.removeEventListener('touchend', onMouseUp);
      }
      simulation.stop();
      if (dragTimeout) clearTimeout(dragTimeout);
    };
  }, [members, evaluationsByMember, wordFreqByMember]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        minHeight: 500,
        position: 'relative'
      }}
    >
      <svg
        ref={svgRef}
        style={{
          display: 'block',
          width: '100%'
        }}
      />
    </div>
  );
}
