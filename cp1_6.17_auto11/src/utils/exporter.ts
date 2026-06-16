import { v4 as uuidv4 } from 'uuid';
import { GraphNode, GraphEdge } from '../types';

function generateShortId(): string {
  return Math.random().toString(36).substring(2, 8);
}

export function exportToSVG(
  nodes: GraphNode[],
  edges: GraphEdge[],
  width: number = 1200,
  height: number = 800
): string {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  const visibleNodes = nodes.filter((n) => !n.collapsed);
  const visibleNodeIds = new Set(visibleNodes.map((n) => n.id));
  const visibleEdges = edges.filter(
    (e) => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target)
  );

  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  visibleNodes.forEach((node) => {
    const size = node.size || 30;
    const x = node.x || 0;
    const y = node.y || 0;
    minX = Math.min(minX, x - size);
    minY = Math.min(minY, y - size);
    maxX = Math.max(maxX, x + size);
    maxY = Math.max(maxY, y + size);
  });

  const padding = 50;
  const viewBoxX = minX - padding;
  const viewBoxY = minY - padding;
  const viewBoxWidth = maxX - minX + padding * 2;
  const viewBoxHeight = maxY - minY + padding * 2;

  const getNodeColor = (depth: number): string => {
    const colors = [
      '#60a5fa',
      '#3b82f6',
      '#2563eb',
      '#1d4ed8',
      '#1e40af',
      '#1e3a8a',
      '#172554',
    ];
    return colors[Math.min(depth, colors.length - 1)];
  };

  const edgesSvg = visibleEdges
    .map((edge) => {
      const source = nodeMap.get(edge.source);
      const target = nodeMap.get(edge.target);
      if (!source || !target) return '';

      const x1 = source.x || 0;
      const y1 = source.y || 0;
      const x2 = target.x || 0;
      const y2 = target.y || 0;
      const dx = x2 - x1;
      const dy = y2 - y1;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance === 0) return '';

      const sourceRadius = source.size || 30;
      const targetRadius = target.size || 30;

      const sx = x1 + (dx / distance) * sourceRadius;
      const sy = y1 + (dy / distance) * sourceRadius;
      const tx = x2 - (dx / distance) * targetRadius;
      const ty = y2 - (dy / distance) * targetRadius;

      const midX = (sx + tx) / 2;
      const midY = (sy + ty) / 2;
      const perpX = -dy / distance * 30;
      const perpY = dx / distance * 30;
      const ctrlX = midX + perpX;
      const ctrlY = midY + perpY;

      const strokeColor = edge.type === 'manual' ? '#f59e0b' : '#60a5fa';
      const opacity = 0.4;

      return `  <path d="M ${sx} ${sy} Q ${ctrlX} ${ctrlY} ${tx} ${ty}" fill="none" stroke="${strokeColor}" stroke-width="1.5" opacity="${opacity}" ${edge.type === 'manual' ? 'stroke-dasharray="6,4"' : ''} />`;
    })
    .join('\n');

  const nodesSvg = visibleNodes
    .map((node) => {
      const x = node.x || 0;
      const y = node.y || 0;
      const radius = node.size || 30;
      const color = getNodeColor(node.depth);
      const textColor = node.depth <= 2 ? '#1e1e2e' : '#ffffff';
      const label = node.label.length > 10 ? node.label.slice(0, 9) + '…' : node.label;
      const childCount = node.childIds.length;

      let svg = `  <g transform="translate(${x}, ${y})">\n`;
      svg += `    <circle r="${radius}" fill="${color}" stroke="rgba(255,255,255,0.2)" stroke-width="2" />\n`;

      if (node.type === 'code-block') {
        svg += `    <text y="${-radius / 4}" text-anchor="middle" fill="${textColor}" font-size="${radius * 0.6}" font-weight="bold">&lt;/&gt;</text>\n`;
      }

      svg += `    <text y="${node.type === 'code-block' ? radius / 3 : radius / 6}" text-anchor="middle" fill="${textColor}" font-size="${radius * 0.35}" font-weight="500">${label}</text>\n`;

      if (childCount > 0) {
        const badgeX = radius * 0.7;
        const badgeY = -radius * 0.7;
        svg += `    <circle cx="${badgeX}" cy="${badgeY}" r="10" fill="${node.collapsed ? '#f59e0b' : '#10b981'}" stroke="#fff" stroke-width="1.5" />\n`;
        svg += `    <text x="${badgeX}" y="${badgeY + 3.5}" text-anchor="middle" fill="#fff" font-size="9" font-weight="bold">${node.collapsed ? '+' : childCount}</text>\n`;
      }

      svg += `  </g>`;
      return svg;
    })
    .join('\n');

  const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}" style="background-color: #1e1e2e;">
  <defs>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.03)" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#grid)" />
${edgesSvg}
${nodesSvg}
</svg>`;

  return svgContent;
}

export function downloadSVG(svgContent: string, filename: string = 'knowledge-graph.svg'): void {
  const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportToHTML(
  nodes: GraphNode[],
  edges: GraphEdge[],
  title: string = '知识图谱'
): string {
  const data = { nodes, edges };

  const htmlContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #1e1e2e; color: #fff; }
    #graph-container { width: 100%; height: 100%; position: relative; }
    svg { width: 100%; height: 100%; cursor: grab; }
    svg:active { cursor: grabbing; }
    .node { cursor: pointer; }
    .tooltip { position: fixed; background: rgba(30,30,46,0.95); backdrop-filter: blur(8px); padding: 8px 12px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.1); font-size: 12px; pointer-events: none; z-index: 100; display: none; }
    .info-bar { position: fixed; bottom: 16px; right: 16px; background: rgba(30,30,46,0.8); backdrop-filter: blur(8px); padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); font-size: 12px; color: rgba(255,255,255,0.6); }
  </style>
</head>
<body>
  <div id="graph-container">
    <svg id="graph-svg"></svg>
  </div>
  <div class="tooltip" id="tooltip"></div>
  <div class="info-bar" id="info-bar"></div>
  <script>
    const graphData = ${JSON.stringify(data)};
    
    function getNodeColor(depth) {
      const colors = ['#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a', '#172554'];
      return colors[Math.min(depth, colors.length - 1)];
    }
    
    function init() {
      const svg = document.getElementById('graph-svg');
      const tooltip = document.getElementById('tooltip');
      const infoBar = document.getElementById('info-bar');
      const container = document.getElementById('graph-container');
      
      const width = container.clientWidth;
      const height = container.clientHeight;
      
      svg.setAttribute('viewBox', \`0 0 \${width} \${height}\`);
      
      const nodeMap = new Map(graphData.nodes.map(n => [n.id, {...n}]));
      const visibleNodes = graphData.nodes.filter(n => !n.collapsed);
      const visibleIds = new Set(visibleNodes.map(n => n.id));
      const visibleEdges = graphData.edges.filter(e => visibleIds.has(e.source) && visibleIds.has(e.target));
      
      const padding = 100;
      const minX = Math.min(...visibleNodes.map(n => n.x || 0)) - padding;
      const minY = Math.min(...visibleNodes.map(n => n.y || 0)) - padding;
      const maxX = Math.max(...visibleNodes.map(n => n.x || 0)) + padding;
      const maxY = Math.max(...visibleNodes.map(n => n.y || 0)) + padding;
      const dataWidth = maxX - minX;
      const dataHeight = maxY - minY;
      const scale = Math.min(width / dataWidth, height / dataHeight);
      const offsetX = (width - dataWidth * scale) / 2 - minX * scale;
      const offsetY = (height - dataHeight * scale) / 2 - minY * scale;
      
      let transform = { x: offsetX, y: offsetY, scale: scale };
      
      function updateTransform() {
        g.setAttribute('transform', \`translate(\${transform.x}, \${transform.y}) scale(\${transform.scale})\`);
      }
      
      const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      defs.innerHTML = \`<pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.03)" stroke-width="1"/></pattern>\`;
      svg.appendChild(defs);
      
      const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      bg.setAttribute('width', '100%');
      bg.setAttribute('height', '100%');
      bg.setAttribute('fill', 'url(#grid)');
      svg.appendChild(bg);
      
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      svg.appendChild(g);
      updateTransform();
      
      visibleEdges.forEach(edge => {
        const source = nodeMap.get(edge.source);
        const target = nodeMap.get(edge.target);
        if (!source || !target) return;
        
        const x1 = source.x || 0, y1 = source.y || 0;
        const x2 = target.x || 0, y2 = target.y || 0;
        const dx = x2 - x1, dy = y2 - y1;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist === 0) return;
        
        const sr = source.size || 30, tr = target.size || 30;
        const sx = x1 + dx/dist * sr, sy = y1 + dy/dist * sr;
        const tx = x2 - dx/dist * tr, ty = y2 - dy/dist * tr;
        const midX = (sx + tx) / 2, midY = (sy + ty) / 2;
        const perpX = -dy/dist * 30, perpY = dx/dist * 30;
        
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', \`M \${sx} \${sy} Q \${midX + perpX} \${midY + perpY} \${tx} \${ty}\`);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', edge.type === 'manual' ? '#f59e0b' : '#60a5fa');
        path.setAttribute('stroke-width', '1.5');
        path.setAttribute('opacity', '0.4');
        if (edge.type === 'manual') path.setAttribute('stroke-dasharray', '6,4');
        g.appendChild(path);
      });
      
      visibleNodes.forEach(node => {
        const nodeG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        nodeG.setAttribute('transform', \`translate(\${node.x}, \${node.y})\`);
        nodeG.classList.add('node');
        
        const radius = node.size || 30;
        const color = getNodeColor(node.depth);
        
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('r', radius);
        circle.setAttribute('fill', color);
        circle.setAttribute('stroke', 'rgba(255,255,255,0.2)');
        circle.setAttribute('stroke-width', '2');
        nodeG.appendChild(circle);
        
        const label = node.label.length > 10 ? node.label.slice(0, 9) + '…' : node.label;
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('y', radius / 6);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('fill', node.depth <= 2 ? '#1e1e2e' : '#fff');
        text.setAttribute('font-size', radius * 0.35);
        text.setAttribute('font-weight', '500');
        text.textContent = label;
        nodeG.appendChild(text);
        
        nodeG.addEventListener('mouseenter', (e) => {
          tooltip.textContent = node.label;
          tooltip.style.display = 'block';
        });
        nodeG.addEventListener('mousemove', (e) => {
          tooltip.style.left = e.clientX + 10 + 'px';
          tooltip.style.top = e.clientY + 10 + 'px';
        });
        nodeG.addEventListener('mouseleave', () => {
          tooltip.style.display = 'none';
        });
        
        g.appendChild(nodeG);
      });
      
      infoBar.textContent = \`节点: \${visibleNodes.length}\`;
      
      let isDragging = false;
      let startX = 0, startY = 0;
      
      svg.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX - transform.x;
        startY = e.clientY - transform.y;
      });
      
      window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        transform.x = e.clientX - startX;
        transform.y = e.clientY - startY;
        updateTransform();
      });
      
      window.addEventListener('mouseup', () => {
        isDragging = false;
      });
      
      svg.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const newScale = Math.max(0.2, Math.min(3, transform.scale * delta));
        
        const rect = svg.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const worldX = (mouseX - transform.x) / transform.scale;
        const worldY = (mouseY - transform.y) / transform.scale;
        
        transform.scale = newScale;
        transform.x = mouseX - worldX * newScale;
        transform.y = mouseY - worldY * newScale;
        
        updateTransform();
      });
    }
    
    window.addEventListener('load', init);
    window.addEventListener('resize', () => {
      const svg = document.getElementById('graph-svg');
      if (svg) {
        svg.innerHTML = '';
        init();
      }
    });
  </script>
</body>
</html>`;

  return htmlContent;
}

export function downloadHTML(htmlContent: string, filename: string = 'knowledge-graph.html'): void {
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

const SHORT_LINK_STORAGE_KEY = 'knowledge_graph_short_links';

export interface ShortLinkData {
  id: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  createdAt: number;
}

export function generateShortLink(nodes: GraphNode[], edges: GraphEdge[]): string {
  const shortId = generateShortId();
  const data: ShortLinkData = {
    id: shortId,
    nodes,
    edges,
    createdAt: Date.now(),
  };

  const links = getAllShortLinks();
  links[shortId] = data;
  localStorage.setItem(SHORT_LINK_STORAGE_KEY, JSON.stringify(links));

  return `${window.location.origin}${window.location.pathname}?share=${shortId}`;
}

export function getAllShortLinks(): Record<string, ShortLinkData> {
  try {
    const stored = localStorage.getItem(SHORT_LINK_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

export function getShortLinkData(shortId: string): ShortLinkData | null {
  const links = getAllShortLinks();
  return links[shortId] || null;
}

export function deleteShortLink(shortId: string): void {
  const links = getAllShortLinks();
  delete links[shortId];
  localStorage.setItem(SHORT_LINK_STORAGE_KEY, JSON.stringify(links));
}
