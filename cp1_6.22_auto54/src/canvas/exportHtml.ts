import type { AppNode, AppEdge } from '../App';

const NODE_WIDTH = 80;
const NODE_HEIGHT = 60;

export function generateExportHtml(nodes: AppNode[], edges: AppEdge[]): string {
  const nodesData = JSON.stringify(nodes);
  const edgesData = JSON.stringify(edges);

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>交互式概念图</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f7fafc;
      background-image: 
        linear-gradient(#e2e8f0 1px, transparent 1px),
        linear-gradient(90deg, #e2e8f0 1px, transparent 1px);
      background-size: 40px 40px;
    }
    #canvas {
      position: relative;
      width: 100%;
      height: 100%;
      cursor: grab;
      overflow: hidden;
    }
    #canvas:active {
      cursor: grabbing;
    }
    #svg-layer {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
    }
    #nodes-layer {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    }
    .node {
      position: absolute;
      width: ${NODE_WIDTH}px;
      height: ${NODE_HEIGHT}px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 12px;
      font-weight: bold;
      cursor: pointer;
      box-shadow: 0 2px 6px rgba(0,0,0,0.1);
      transition: box-shadow 0.2s ease-in-out, transform 0.2s ease-in-out;
      user-select: none;
      text-align: center;
      padding: 4px;
      line-height: 1.2;
    }
    .node:hover {
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      transform: translateY(-1px);
    }
    .node.rectangle {
      border-radius: 12px;
    }
    .node.circle {
      border-radius: 50%;
    }
    .edge-path {
      fill: none;
      stroke: #a0aec0;
      stroke-width: 2;
      transition: stroke 0.2s ease-in-out, stroke-width 0.2s ease-in-out;
      cursor: pointer;
      pointer-events: stroke;
    }
    .edge-path:hover {
      stroke: #3182ce;
      stroke-width: 3;
    }
    .edge-label {
      font-size: 11px;
      fill: #4a5568;
      opacity: 0;
      transition: opacity 0.2s ease-in-out;
      pointer-events: none;
    }
    .edge-label.visible {
      opacity: 1;
    }
    .edge-label-bg {
      fill: white;
      opacity: 0;
      transition: opacity 0.2s ease-in-out;
      filter: drop-shadow(0 1px 2px rgba(0,0,0,0.1));
    }
    .edge-label-bg.visible {
      opacity: 1;
    }
    .description-popup {
      position: fixed;
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      padding: 16px;
      max-width: 280px;
      max-height: 200px;
      overflow-y: auto;
      z-index: 1000;
      opacity: 0;
      transition: opacity 0.3s ease-in-out;
      pointer-events: none;
      font-size: 13px;
      color: #2d3748;
      line-height: 1.5;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .description-popup.visible {
      opacity: 1;
    }
    .description-popup .popup-title {
      font-weight: bold;
      margin-bottom: 8px;
      font-size: 14px;
      color: #1a202c;
    }
    .zoom-controls {
      position: fixed;
      bottom: 20px;
      left: 20px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      padding: 4px;
      z-index: 100;
    }
    .zoom-btn {
      width: 32px;
      height: 32px;
      border: none;
      background: white;
      cursor: pointer;
      border-radius: 4px;
      font-size: 16px;
      color: #4a5568;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background-color 0.15s ease-in-out;
    }
    .zoom-btn:hover {
      background-color: #edf2f7;
    }
    .zoom-divider {
      height: 1px;
      background: #e2e8f0;
      margin: 2px 4px;
    }
    .minimap {
      position: fixed;
      top: 20px;
      right: 20px;
      width: 180px;
      height: 120px;
      background: #f7fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      overflow: hidden;
      z-index: 100;
    }
    .minimap-content {
      position: relative;
      width: 100%;
      height: 100%;
    }
    .minimap-node {
      position: absolute;
      border-radius: 2px;
    }
    .minimap-viewport {
      position: absolute;
      border: 1px solid #3182ce;
      background: rgba(49, 130, 206, 0.1);
      pointer-events: none;
    }
    .hint {
      position: fixed;
      bottom: 20px;
      right: 20px;
      font-size: 12px;
      color: #a0aec0;
      z-index: 100;
    }
  </style>
</head>
<body>
  <div id="canvas">
    <svg id="svg-layer"></svg>
    <div id="nodes-layer"></div>
  </div>
  
  <div class="description-popup" id="description-popup">
    <div class="popup-title" id="popup-title"></div>
    <div id="popup-content"></div>
  </div>

  <div class="zoom-controls">
    <button class="zoom-btn" id="zoom-in" title="放大">+</button>
    <div class="zoom-divider"></div>
    <button class="zoom-btn" id="zoom-out" title="缩小">−</button>
    <div class="zoom-divider"></div>
    <button class="zoom-btn" id="zoom-reset" title="重置视图">⌂</button>
  </div>

  <div class="minimap" id="minimap">
    <div class="minimap-content" id="minimap-content"></div>
  </div>

  <div class="hint">拖拽平移 · 滚轮缩放 · 点击节点查看详情 · 悬停连线查看标签</div>

  <script type="application/json" id="concept-map-data">${JSON.stringify({ nodes, edges })}</script>

  <script>
    (function() {
      const nodes = ${nodesData};
      const edges = ${edgesData};
      
      let scale = 1;
      let offsetX = 0;
      let offsetY = 0;
      let isDragging = false;
      let dragStartX = 0;
      let dragStartY = 0;
      let viewStartX = 0;
      let viewStartY = 0;
      
      const canvas = document.getElementById('canvas');
      const svgLayer = document.getElementById('svg-layer');
      const nodesLayer = document.getElementById('nodes-layer');
      const popup = document.getElementById('description-popup');
      const popupTitle = document.getElementById('popup-title');
      const popupContent = document.getElementById('popup-content');
      const minimapContent = document.getElementById('minimap-content');
      
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      nodes.forEach(node => {
        minX = Math.min(minX, node.position.x);
        minY = Math.min(minY, node.position.y);
        maxX = Math.max(maxX, node.position.x + ${NODE_WIDTH});
        maxY = Math.max(maxY, node.position.y + ${NODE_HEIGHT});
      });
      
      function fitView() {
        const canvasRect = canvas.getBoundingClientRect();
        const padding = 100;
        const contentWidth = maxX - minX + padding * 2;
        const contentHeight = maxY - minY + padding * 2;
        const scaleX = canvasRect.width / contentWidth;
        const scaleY = canvasRect.height / contentHeight;
        scale = Math.min(scaleX, scaleY, 1);
        
        const centeredOffsetX = (canvasRect.width - (maxX + minX) * scale) / 2;
        const centeredOffsetY = (canvasRect.height - (maxY + minY) * scale) / 2;
        
        offsetX = centeredOffsetX - minX * scale;
        offsetY = centeredOffsetY - minY * scale;
        
        updateTransform();
      }
      
      function updateTransform() {
        nodesLayer.style.transform = \`translate(\${offsetX}px, \${offsetY}px) scale(\${scale})\`;
        nodesLayer.style.transformOrigin = '0 0';
        svgLayer.style.transform = \`translate(\${offsetX}px, \${offsetY}px) scale(\${scale})\`;
        svgLayer.style.transformOrigin = '0 0';
        updateMinimap();
      }
      
      function renderNodes() {
        nodes.forEach(node => {
          const el = document.createElement('div');
          el.className = \`node \${node.data.shape}\`;
          el.style.left = node.position.x + 'px';
          el.style.top = node.position.y + 'px';
          el.style.backgroundColor = node.data.color;
          el.textContent = node.data.label;
          el.dataset.id = node.id;
          
          el.addEventListener('click', function(e) {
            e.stopPropagation();
            showDescription(node, e.clientX, e.clientY);
          });
          
          nodesLayer.appendChild(el);
        });
      }
      
      function renderEdges() {
        const svgNS = 'http://www.w3.org/2000/svg';
        
        const padding = 2000;
        const svgWidth = (maxX - minX) + padding * 2;
        const svgHeight = (maxY - minY) + padding * 2;
        svgLayer.setAttribute('width', svgWidth);
        svgLayer.setAttribute('height', svgHeight);
        svgLayer.style.left = (offsetX - padding * scale) + 'px';
        svgLayer.style.top = (offsetY - padding * scale) + 'px';
        svgLayer.style.width = svgWidth * scale + 'px';
        svgLayer.style.height = svgHeight * scale + 'px';
        svgLayer.setAttribute('viewBox', \`\${-padding} \${-padding} \${svgWidth} \${svgHeight}\`);
        
        edges.forEach(edge => {
          const sourceNode = nodes.find(n => n.id === edge.source);
          const targetNode = nodes.find(n => n.id === edge.target);
          if (!sourceNode || !targetNode) return;
          
          const sx = sourceNode.position.x + ${NODE_WIDTH} / 2;
          const sy = sourceNode.position.y + ${NODE_HEIGHT} / 2;
          const tx = targetNode.position.x + ${NODE_WIDTH} / 2;
          const ty = targetNode.position.y + ${NODE_HEIGHT} / 2;
          
          const dx = tx - sx;
          const dy = ty - sy;
          const cx1 = sx + dx * 0.5;
          const cy1 = sy;
          const cx2 = sx + dx * 0.5;
          const cy2 = ty;
          
          const path = document.createElementNS(svgNS, 'path');
          path.setAttribute('d', \`M\${sx},\${sy} C\${cx1},\${cy1} \${cx2},\${cy2} \${tx},\${ty}\`);
          path.setAttribute('class', 'edge-path');
          path.setAttribute('data-id', edge.id);
          
          const mx = (sx + tx) / 2;
          const my = (sy + ty) / 2;
          
          const labelBg = document.createElementNS(svgNS, 'rect');
          labelBg.setAttribute('x', mx - 35);
          labelBg.setAttribute('y', my - 10);
          labelBg.setAttribute('width', 70);
          labelBg.setAttribute('height', 20);
          labelBg.setAttribute('rx', 4);
          labelBg.setAttribute('class', 'edge-label-bg');
          labelBg.setAttribute('data-edge-id', edge.id);
          
          const labelText = document.createElementNS(svgNS, 'text');
          labelText.setAttribute('x', mx);
          labelText.setAttribute('y', my + 4);
          labelText.setAttribute('text-anchor', 'middle');
          labelText.setAttribute('class', 'edge-label');
          labelText.setAttribute('data-edge-id', edge.id);
          labelText.textContent = edge.data?.label || '';
          
          path.addEventListener('mouseenter', function() {
            const labels = document.querySelectorAll(\`[data-edge-id="\${edge.id}"]\`);
            labels.forEach(l => l.classList.add('visible'));
          });
          
          path.addEventListener('mouseleave', function() {
            const labels = document.querySelectorAll(\`[data-edge-id="\${edge.id}"]\`);
            labels.forEach(l => l.classList.remove('visible'));
          });
          
          svgLayer.appendChild(path);
          svgLayer.appendChild(labelBg);
          svgLayer.appendChild(labelText);
        });
      }
      
      function showDescription(node, x, y) {
        if (!node.data.description) {
          hideDescription();
          return;
        }
        
        popupTitle.textContent = node.data.label;
        popupContent.textContent = node.data.description;
        
        popup.style.left = x + 15 + 'px';
        popup.style.top = y + 15 + 'px';
        popup.classList.add('visible');
        
        setTimeout(() => {
          const rect = popup.getBoundingClientRect();
          const viewportWidth = window.innerWidth;
          const viewportHeight = window.innerHeight;
          
          let left = x + 15;
          let top = y + 15;
          
          if (rect.right > viewportWidth) {
            left = x - rect.width - 15;
          }
          if (rect.bottom > viewportHeight) {
            top = y - rect.height - 15;
          }
          
          popup.style.left = left + 'px';
          popup.style.top = top + 'px';
        }, 10);
      }
      
      function hideDescription() {
        popup.classList.remove('visible');
      }
      
      function updateMinimap() {
        const minimapRect = document.getElementById('minimap').getBoundingClientRect();
        const canvasRect = canvas.getBoundingClientRect();
        
        const scaleX = minimapRect.width / ((maxX - minX + 200));
        const scaleY = minimapRect.height / ((maxY - minY + 200));
        const minimapScale = Math.min(scaleX, scaleY);
        
        const offsetXMap = (minimapRect.width - (maxX - minX) * minimapScale) / 2 - minX * minimapScale + 100 * minimapScale;
        const offsetYMap = (minimapRect.height - (maxY - minY) * minimapScale) / 2 - minY * minimapScale + 100 * minimapScale;
        
        minimapContent.innerHTML = '';
        
        nodes.forEach(node => {
          const el = document.createElement('div');
          el.className = 'minimap-node';
          el.style.left = (node.position.x * minimapScale + offsetXMap) + 'px';
          el.style.top = (node.position.y * minimapScale + offsetYMap) + 'px';
          el.style.width = (${NODE_WIDTH} * minimapScale) + 'px';
          el.style.height = (${NODE_HEIGHT} * minimapScale) + 'px';
          el.style.backgroundColor = node.data.color;
          if (node.data.shape === 'circle') {
            el.style.borderRadius = '50%';
          }
          minimapContent.appendChild(el);
        });
        
        const viewport = document.createElement('div');
        viewport.className = 'minimap-viewport';
        viewport.style.left = ((-offsetX / scale) * minimapScale + offsetXMap) + 'px';
        viewport.style.top = ((-offsetY / scale) * minimapScale + offsetYMap) + 'px';
        viewport.style.width = (canvasRect.width / scale * minimapScale) + 'px';
        viewport.style.height = (canvasRect.height / scale * minimapScale) + 'px';
        minimapContent.appendChild(viewport);
      }
      
      canvas.addEventListener('mousedown', function(e) {
        if (e.target.classList.contains('node')) return;
        isDragging = true;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        viewStartX = offsetX;
        viewStartY = offsetY;
      });
      
      window.addEventListener('mousemove', function(e) {
        if (!isDragging) return;
        offsetX = viewStartX + (e.clientX - dragStartX);
        offsetY = viewStartY + (e.clientY - dragStartY);
        updateTransform();
      });
      
      window.addEventListener('mouseup', function() {
        isDragging = false;
      });
      
      canvas.addEventListener('wheel', function(e) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const newScale = Math.max(0.3, Math.min(3, scale * delta));
        const scaleRatio = newScale / scale;
        
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        offsetX = mouseX - (mouseX - offsetX) * scaleRatio;
        offsetY = mouseY - (mouseY - offsetY) * scaleRatio;
        scale = newScale;
        
        updateTransform();
      }, { passive: false });
      
      canvas.addEventListener('click', function(e) {
        if (!e.target.classList.contains('node')) {
          hideDescription();
        }
      });
      
      document.getElementById('zoom-in').addEventListener('click', function() {
        const newScale = Math.min(3, scale * 1.2);
        const rect = canvas.getBoundingClientRect();
        const cx = rect.width / 2;
        const cy = rect.height / 2;
        const scaleRatio = newScale / scale;
        offsetX = cx - (cx - offsetX) * scaleRatio;
        offsetY = cy - (cy - offsetY) * scaleRatio;
        scale = newScale;
        updateTransform();
      });
      
      document.getElementById('zoom-out').addEventListener('click', function() {
        const newScale = Math.max(0.3, scale / 1.2);
        const rect = canvas.getBoundingClientRect();
        const cx = rect.width / 2;
        const cy = rect.height / 2;
        const scaleRatio = newScale / scale;
        offsetX = cx - (cx - offsetX) * scaleRatio;
        offsetY = cy - (cy - offsetY) * scaleRatio;
        scale = newScale;
        updateTransform();
      });
      
      document.getElementById('zoom-reset').addEventListener('click', function() {
        fitView();
      });
      
      window.addEventListener('resize', function() {
        updateTransform();
      });
      
      renderNodes();
      renderEdges();
      
      setTimeout(() => {
        fitView();
      }, 50);
    })();
  </script>
</body>
</html>`;

  return html;
}
