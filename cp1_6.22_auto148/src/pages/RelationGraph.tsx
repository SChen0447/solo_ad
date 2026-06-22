import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import * as d3 from 'd3';
import { GraphData, GraphNode, GraphLink } from '../types';

interface D3GraphNode extends d3.SimulationNodeDatum {
  id: string;
  title: string;
  content: string;
  tags: string[];
  wordCount: number;
  imageUrl: string | null;
  createdAt: number;
  cluster: number;
  color: string;
}

interface D3GraphLink extends d3.SimulationLinkDatum<D3GraphNode> {
  similarity: number;
  tagSimilarity: number;
  keywordSimilarity: number;
}

export const RelationGraph: React.FC = () => {
  const navigate = useNavigate();
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [showLabels, setShowLabels] = useState(true);
  const [showLinks, setShowLinks] = useState(true);
  const [enabledClusters, setEnabledClusters] = useState<Set<number>>(new Set());
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const simulationRef = useRef<d3.Simulation<D3GraphNode, D3GraphLink> | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const gRef = useRef<SVGGElement | null>(null);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadGraphData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get<GraphData>('/api/graph');
      setGraphData(res.data);
      const clusters = new Set(res.data.nodes.map(n => n.cluster).filter(c => c !== -1));
      setEnabledClusters(clusters);
    } catch (err) {
      console.error('加载图谱数据失败:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGraphData();
  }, [loadGraphData]);

  const toggleCluster = (cluster: number) => {
    setEnabledClusters(prev => {
      const next = new Set(prev);
      if (next.has(cluster)) {
        next.delete(cluster);
      } else {
        next.add(cluster);
      }
      return next;
    });
  };

  useEffect(() => {
    if (!graphData || !svgRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const svg = d3.select(svgRef.current);
    const width = container.clientWidth;
    const height = container.clientHeight;

    svg.selectAll('*').remove();

    const defs = svg.append('defs');
    const gradient = defs.append('radialGradient')
      .attr('id', 'bg-gradient')
      .attr('cx', '50%')
      .attr('cy', '50%')
      .attr('r', '70%');
    gradient.append('stop').attr('offset', '0%').attr('stop-color', '#1e293b');
    gradient.append('stop').attr('offset', '100%').attr('stop-color', '#0f172a');

    svg.attr('viewBox', [0, 0, width, height]);
    svg.append('rect').attr('width', '100%').attr('height', '100%').attr('fill', 'url(#bg-gradient)');

    const visibleNodeIds = new Set(
      graphData.nodes
        .filter(n => n.cluster === -1 || enabledClusters.has(n.cluster))
        .map(n => n.id)
    );

    const nodes: D3GraphNode[] = graphData.nodes
      .filter(n => visibleNodeIds.has(n.id))
      .map(n => ({ ...n } as D3GraphNode));

    const nodeMap = new Map(nodes.map(n => [n.id, n]));

    const links: D3GraphLink[] = graphData.links
      .filter(l => {
        const sId = typeof l.source === 'string' ? l.source : (l.source as GraphNode).id;
        const tId = typeof l.target === 'string' ? l.target : (l.target as GraphNode).id;
        return visibleNodeIds.has(sId) && visibleNodeIds.has(tId);
      })
      .map(l => {
        const sId = typeof l.source === 'string' ? l.source : (l.source as GraphNode).id;
        const tId = typeof l.target === 'string' ? l.target : (l.target as GraphNode).id;
        return {
          source: nodeMap.get(sId)!,
          target: nodeMap.get(tId)!,
          similarity: l.similarity,
          tagSimilarity: l.tagSimilarity,
          keywordSimilarity: l.keywordSimilarity
        };
      });

    const g = svg.append('g');
    gRef.current = g.node() as SVGGElement;

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });
    svg.call(zoom);
    zoomRef.current = zoom;

    const minWordCount = Math.min(...nodes.map(n => n.wordCount || 1), 1);
    const maxWordCount = Math.max(...nodes.map(n => n.wordCount || 1), 100);
    const scaleRadius = d3.scaleSqrt()
      .domain([minWordCount, maxWordCount])
      .range([10, 32]);

    const linkGroup = g.append('g').attr('class', 'links').style('opacity', showLinks ? 1 : 0);
    const linkLabelGroup = g.append('g').attr('class', 'link-labels').style('opacity', showLinks ? 1 : 0);
    const nodeGroup = g.append('g').attr('class', 'nodes');
    const labelGroup = g.append('g').attr('class', 'labels').style('opacity', showLabels ? 1 : 0);

    const link = linkGroup
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', d => {
        const alpha = 0.3 + d.similarity * 0.6;
        return `rgba(56, 189, 248, ${alpha})`;
      })
      .attr('stroke-width', d => 1 + d.similarity * 3)
      .attr('stroke-linecap', 'round');

    const linkLabel = linkLabelGroup
      .selectAll('text')
      .data(links)
      .join('text')
      .text(d => `${Math.round(d.similarity * 100)}%`)
      .attr('font-size', '12px')
      .attr('fill', '#94a3b8')
      .attr('text-anchor', 'middle')
      .attr('pointer-events', 'none')
      .attr('paint-order', 'stroke')
      .attr('stroke', '#0f172a')
      .attr('stroke-width', '3px')
      .attr('stroke-opacity', 0.85);

    const node = nodeGroup
      .selectAll('circle')
      .data(nodes)
      .join('circle')
      .attr('r', d => scaleRadius(d.wordCount || 10))
      .attr('fill', d => d.color)
      .attr('stroke', '#0f172a')
      .attr('stroke-width', 2.5)
      .attr('cursor', 'grab')
      .style('filter', 'drop-shadow(0 4px 10px rgba(0,0,0,0.4))')
      .on('mouseenter', function(event, d) {
        d3.select(this)
          .transition().duration(150)
          .attr('r', scaleRadius(d.wordCount || 10) * 1.25)
          .attr('stroke-width', 4)
          .attr('stroke', '#fff');
        const graphNode: GraphNode = {
          id: d.id, title: d.title, content: d.content,
          tags: d.tags, wordCount: d.wordCount, imageUrl: d.imageUrl,
          createdAt: d.createdAt, cluster: d.cluster, color: d.color
        };
        setHoveredNode(graphNode);
        setMousePos({ x: event.clientX, y: event.clientY });
      })
      .on('mousemove', function(event) {
        setMousePos({ x: event.clientX, y: event.clientY });
      })
      .on('mouseleave', function(event, d) {
        d3.select(this)
          .transition().duration(150)
          .attr('r', scaleRadius(d.wordCount || 10))
          .attr('stroke-width', 2.5)
          .attr('stroke', '#0f172a');
        setHoveredNode(null);
      });

    const label = labelGroup
      .selectAll('text')
      .data(nodes)
      .join('text')
      .text(d => d.title.length > 10 ? d.title.slice(0, 9) + '…' : d.title)
      .attr('font-size', '11px')
      .attr('fill', '#e2e8f0')
      .attr('text-anchor', 'middle')
      .attr('pointer-events', 'none')
      .attr('dy', d => scaleRadius(d.wordCount || 10) + 14)
      .attr('font-weight', 500)
      .attr('paint-order', 'stroke')
      .attr('stroke', '#0f172a')
      .attr('stroke-width', '3px')
      .attr('stroke-opacity', 0.9);

    const drag = d3.drag<SVGCircleElement, D3GraphNode>()
      .on('start', (event, d) => {
        if (!event.active && simulationRef.current) {
          simulationRef.current.alphaTarget(0.3).restart();
        }
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, d) => {
        if (!event.active && simulationRef.current) {
          simulationRef.current.alphaTarget(0);
        }
        d.fx = null;
        d.fy = null;
      });

    (node as unknown as d3.Selection<SVGCircleElement, D3GraphNode, any, any>).call(drag);

    const simulation = d3.forceSimulation<D3GraphNode>(nodes)
      .force('link', d3.forceLink<D3GraphNode, D3GraphLink>(links)
        .id(d => d.id)
        .distance(d => 140 - d.similarity * 60)
        .strength(d => 0.3 + d.similarity * 0.5)
      )
      .force('charge', d3.forceManyBody().strength(-350))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide<D3GraphNode>().radius(d => scaleRadius(d.wordCount || 10) + 8))
      .alphaDecay(0.02)
      .on('tick', () => {
        link
          .attr('x1', d => (d.source as D3GraphNode).x!)
          .attr('y1', d => (d.source as D3GraphNode).y!)
          .attr('x2', d => (d.target as D3GraphNode).x!)
          .attr('y2', d => (d.target as D3GraphNode).y!);

        linkLabel
          .attr('x', d => ((d.source as D3GraphNode).x! + (d.target as D3GraphNode).x!) / 2)
          .attr('y', d => ((d.source as D3GraphNode).y! + (d.target as D3GraphNode).y!) / 2 - 6);

        node
          .attr('cx', d => d.x!)
          .attr('cy', d => d.y!);

        label
          .attr('x', d => d.x!)
          .attr('y', d => d.y!);
      });

    simulationRef.current = simulation;

    return () => {
      simulation.stop();
    };
  }, [graphData, enabledClusters, showLabels, showLinks]);

  const isMobile = windowWidth < 768;

  const clusterInfo = graphData ? (() => {
    const map = new Map<number, { name: string; color: string; count: number }>();
    graphData.nodes.forEach(n => {
      if (n.tags.length > 0) {
        if (!map.has(n.cluster)) {
          map.set(n.cluster, { name: n.tags[0], color: n.color, count: 0 });
        }
        map.get(n.cluster)!.count++;
      } else if (n.cluster === -1) {
        if (!map.has(-1)) {
          map.set(-1, { name: '未分类', color: '#64748b', count: 0 });
        }
        map.get(-1)!.count++;
      }
    });
    return Array.from(map.entries()).map(([cluster, info]) => ({ cluster, ...info }));
  })() : [];

  const totalVisibleNodes = graphData ? graphData.nodes.filter(n =>
    n.cluster === -1 || enabledClusters.has(n.cluster)
  ).length : 0;

  return (
    <div style={{
      width: '100vw', height: '100vh', overflow: 'hidden',
      background: '#0f172a', display: 'flex', position: 'relative'
    }}>
      <aside style={{
        width: isMobile ? (mobileMenuOpen ? '280px' : '0px') : '280px',
        flexShrink: 0, background: 'rgba(30, 41, 59, 0.95)',
        backdropFilter: 'blur(12px)',
        borderRight: '1px solid #334155', overflow: 'hidden',
        transition: 'width 300ms cubic-bezier(0.4, 0, 0.2, 1)',
        position: isMobile ? 'fixed' : 'relative',
        zIndex: 100, height: '100%'
      }}>
        <div style={{ width: '280px', height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div style={{
            padding: '20px',
            borderBottom: '1px solid #334155'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '12px',
                background: 'linear-gradient(135deg, #a855f7, #ec4899)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '20px'
              }}>🕸</div>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#f1f5f9' }}>关联图谱</div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>
                  {graphData ? `${graphData.nodes.length} 节点 · ${graphData.links.length} 连线` : '加载中...'}
                </div>
              </div>
            </div>

            {!isMobile && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => navigate('/board')} style={{
                  flex: 1, padding: '9px', borderRadius: '9px',
                  background: '#334155', border: 'none',
                  color: '#e2e8f0', fontSize: '12px', fontWeight: 500,
                  cursor: 'pointer', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                  transition: 'all 150ms'
                }}
                  onMouseEnter={e => e.currentTarget.style.background = '#475569'}
                  onMouseLeave={e => e.currentTarget.style.background = '#334155'}
                >📋 灵感板</button>
                <button onClick={() => navigate('/graph')} style={{
                  flex: 1, padding: '9px', borderRadius: '9px',
                  background: 'linear-gradient(135deg, #6366f1, #38bdf8)',
                  border: 'none', color: '#fff', fontSize: '12px', fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px'
                }}>🕸 图谱</button>
              </div>
            )}
          </div>

          <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
            <div style={{
              fontSize: '12px', color: '#64748b', fontWeight: 600,
              textTransform: 'uppercase', marginBottom: '12px',
              letterSpacing: '0.05em'
            }}>显示控制</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
              <label style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 12px', background: '#0f172a',
                borderRadius: '9px', cursor: 'pointer',
                border: '1px solid #334155', transition: 'all 150ms'
              }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#475569'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#334155'}
              >
                <input type="checkbox" checked={showLabels}
                  onChange={e => setShowLabels(e.target.checked)}
                  style={{
                    width: '16px', height: '16px', accentColor: '#6366f1',
                    cursor: 'pointer'
                  }} />
                <span style={{ fontSize: '13px', color: '#e2e8f0' }}>显示节点标签</span>
              </label>
              <label style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 12px', background: '#0f172a',
                borderRadius: '9px', cursor: 'pointer',
                border: '1px solid #334155', transition: 'all 150ms'
              }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#475569'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#334155'}
              >
                <input type="checkbox" checked={showLinks}
                  onChange={e => setShowLinks(e.target.checked)}
                  style={{
                    width: '16px', height: '16px', accentColor: '#6366f1',
                    cursor: 'pointer'
                  }} />
                <span style={{ fontSize: '13px', color: '#e2e8f0' }}>显示连线与相似度</span>
              </label>
            </div>

            <div style={{
              fontSize: '12px', color: '#64748b', fontWeight: 600,
              textTransform: 'uppercase', marginBottom: '12px',
              letterSpacing: '0.05em',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <span>标签簇图例</span>
              <span style={{ fontSize: '11px', fontWeight: 400, textTransform: 'none' }}>
                显示 {totalVisibleNodes} 个
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {clusterInfo.map(({ cluster, name, color, count }) => {
                const enabled = cluster === -1 ? true : enabledClusters.has(cluster);
                return (
                  <div key={cluster}
                    onClick={() => cluster !== -1 && toggleCluster(cluster)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '9px 11px', borderRadius: '9px',
                      background: enabled ? 'rgba(99,102,241,0.08)' : 'transparent',
                      border: `1px solid ${enabled ? 'rgba(99,102,241,0.25)' : 'transparent'}`,
                      cursor: cluster === -1 ? 'default' : 'pointer',
                      opacity: enabled ? 1 : 0.4,
                      transition: 'all 150ms'
                    }}
                    onMouseEnter={e => {
                      if (cluster !== -1 && !enabled) e.currentTarget.style.background = '#334155';
                    }}
                    onMouseLeave={e => {
                      if (cluster !== -1) e.currentTarget.style.background = enabled ? 'rgba(99,102,241,0.08)' : 'transparent';
                    }}
                  >
                    <div style={{
                      width: '16px', height: '16px', borderRadius: '50%',
                      background: color, flexShrink: 0,
                      boxShadow: `0 0 10px ${color}60`,
                      border: '2px solid rgba(15,23,42,0.8)'
                    }} />
                    <span style={{
                      flex: 1, fontSize: '13px', color: '#cbd5e1',
                      overflow: 'hidden', textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>#{name}</span>
                    <span style={{
                      fontSize: '11px', color: '#64748b',
                      background: '#334155', padding: '2px 7px',
                      borderRadius: '10px', fontWeight: 600
                    }}>{count}</span>
                  </div>
                );
              })}
              {clusterInfo.length === 0 && !loading && (
                <div style={{ padding: '16px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
                  暂无数据
                </div>
              )}
            </div>

            <div style={{
              marginTop: '20px', padding: '12px',
              background: 'rgba(56, 189, 248, 0.06)',
              border: '1px solid rgba(56, 189, 248, 0.15)',
              borderRadius: '10px'
            }}>
              <div style={{
                fontSize: '11px', color: '#38bdf8', fontWeight: 600,
                marginBottom: '8px', display: 'flex',
                alignItems: 'center', gap: '5px'
              }}>💡 使用提示</div>
              <div style={{ fontSize: '11px', color: '#94a3b8', lineHeight: 1.7 }}>
                • 拖拽节点可重新布局<br />
                • 鼠标滚轮可缩放视图<br />
                • 悬停节点查看详情<br />
                • 节点大小与字数成正比
              </div>
            </div>
          </div>

          {loading && graphData === null && (
            <div style={{ padding: '16px', textAlign: 'center' }}>
              <div style={{
                width: '28px', height: '28px', border: '3px solid #334155',
                borderTopColor: '#6366f1', borderRadius: '50%',
                animation: 'spin 0.8s linear infinite', margin: '0 auto'
              }} />
            </div>
          )}
        </div>
      </aside>

      {isMobile && mobileMenuOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99 }}
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          padding: isMobile ? '12px 16px' : '16px 24px',
          display: 'flex', alignItems: 'center', gap: '12px',
          zIndex: 10,
          background: 'linear-gradient(180deg, rgba(15,23,42,0.8) 0%, transparent 100%)',
          pointerEvents: 'none'
        }}>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              width: '40px', height: '40px', borderRadius: '10px',
              background: 'rgba(30, 41, 59, 0.9)',
              border: '1px solid #334155', color: '#e2e8f0',
              cursor: 'pointer', fontSize: '18px',
              display: isMobile ? 'flex' : 'none',
              alignItems: 'center', justifyContent: 'center',
              fontFamily: 'inherit', pointerEvents: 'auto'
            }}
          >☰</button>

          {isMobile && (
            <div style={{ flex: 1, display: 'flex', gap: '8px', pointerEvents: 'auto' }}>
              <button onClick={() => navigate('/board')} style={{
                flex: 1, padding: '9px', borderRadius: '10px',
                background: 'rgba(30, 41, 59, 0.9)',
                border: '1px solid #334155',
                color: '#e2e8f0', fontSize: '12px', fontWeight: 500,
                cursor: 'pointer', fontFamily: 'inherit'
              }}>📋 灵感板</button>
              <button onClick={() => navigate('/graph')} style={{
                flex: 1, padding: '9px', borderRadius: '10px',
                background: 'linear-gradient(135deg, #6366f1, #38bdf8)',
                border: 'none', color: '#fff', fontSize: '12px', fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit'
              }}>🕸 图谱</button>
            </div>
          )}

          <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', pointerEvents: 'auto' }}>
            <button
              onClick={loadGraphData}
              title="重新计算"
              style={{
                width: '40px', height: '40px', borderRadius: '10px',
                background: 'rgba(30, 41, 59, 0.9)',
                border: '1px solid #334155', color: '#e2e8f0',
                cursor: 'pointer', fontSize: '16px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 150ms', fontFamily: 'inherit'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#334155'; e.currentTarget.style.borderColor = '#475569'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(30, 41, 59, 0.9)'; e.currentTarget.style.borderColor = '#334155'; }}
            >↻</button>
          </div>
        </div>

        <div ref={containerRef} style={{ flex: 1, width: '100%', height: '100%' }}>
          <svg ref={svgRef} style={{ display: 'block', width: '100%', height: '100%' }} />
        </div>

        {loading && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: '16px', background: 'rgba(15,23,42,0.7)',
            backdropFilter: 'blur(4px)'
          }}>
            <div style={{
              width: '48px', height: '48px', border: '4px solid #334155',
              borderTopColor: '#6366f1', borderRadius: '50%',
              animation: 'spin 0.8s linear infinite'
            }} />
            <div style={{ fontSize: '14px', color: '#94a3b8' }}>计算关联图谱中...</div>
          </div>
        )}

        {!loading && graphData && graphData.nodes.length === 0 && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: '14px'
          }}>
            <div style={{
              fontSize: '56px', opacity: 0.5
            }}>🕸️</div>
            <div style={{ fontSize: '16px', color: '#94a3b8' }}>暂无灵感数据，无法生成图谱</div>
            <button onClick={() => navigate('/board')} style={{
              padding: '10px 22px',
              background: 'linear-gradient(135deg, #6366f1, #38bdf8)',
              border: 'none', borderRadius: '10px',
              color: '#fff', fontSize: '14px', fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit'
            }}>去记录灵感</button>
          </div>
        )}
      </div>

      {hoveredNode && (
        <div style={{
          position: 'fixed',
          left: Math.min(mousePos.x + 16, window.innerWidth - 300),
          top: Math.min(mousePos.y + 16, window.innerHeight - 220),
          width: '280px',
          background: '#1e293b',
          border: `1px solid ${hoveredNode.color}`,
          borderRadius: '14px',
          padding: '16px',
          boxShadow: `0 16px 40px rgba(0,0,0,0.6), 0 0 24px ${hoveredNode.color}30`,
          zIndex: 200,
          pointerEvents: 'none',
          animation: 'fadeIn 150ms ease'
        }}>
          {hoveredNode.imageUrl && (
            <img src={hoveredNode.imageUrl} alt=""
              onError={e => (e.currentTarget.style.display = 'none')}
              style={{
                width: '100%', height: '90px', objectFit: 'cover',
                borderRadius: '10px', marginBottom: '12px'
              }}
            />
          )}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            marginBottom: '8px'
          }}>
            <div style={{
              width: '10px', height: '10px', borderRadius: '50%',
              background: hoveredNode.color, flexShrink: 0
            }} />
            <h4 style={{
              fontSize: '15px', fontWeight: 600, color: '#f1f5f9',
              lineHeight: 1.3,
              overflow: 'hidden', textOverflow: 'ellipsis',
              display: '-webkit-box', WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical'
            }}>{hoveredNode.title}</h4>
          </div>
          {hoveredNode.tags && hoveredNode.tags.length > 0 && (
            <div style={{
              display: 'flex', flexWrap: 'wrap', gap: '5px',
              marginBottom: '10px'
            }}>
              {hoveredNode.tags.slice(0, 3).map((t, i) => (
                <span key={i} style={{
                  padding: '3px 8px', background: '#3b82f6',
                  color: '#fff', borderRadius: '999px',
                  fontSize: '10px', fontWeight: 500
                }}>#{t}</span>
              ))}
              {hoveredNode.tags.length > 3 && (
                <span style={{
                  padding: '3px 7px', background: '#334155',
                  color: '#94a3b8', borderRadius: '999px',
                  fontSize: '10px'
                }}>+{hoveredNode.tags.length - 3}</span>
              )}
            </div>
          )}
          <p style={{
            fontSize: '12px', color: '#94a3b8', lineHeight: 1.6,
            marginBottom: '12px',
            overflow: 'hidden', textOverflow: 'ellipsis',
            display: '-webkit-box', WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical'
          }}>{hoveredNode.content}</p>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            fontSize: '11px', color: '#64748b',
            paddingTop: '10px', borderTop: '1px solid #334155'
          }}>
            <span>{hoveredNode.wordCount} 字</span>
            <span>{new Date(hoveredNode.createdAt).toLocaleDateString('zh-CN')}</span>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default RelationGraph;
