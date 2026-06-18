import React, { useMemo, useRef, useEffect } from 'react';
import { useCanvasStore } from './store';
import { getNodePortPosition, getConnectionPath, getConnectionMidpoint } from './CanvasLogic';
import { GRID_SIZE } from './types';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PREVIEW_WIDTH = 800;
const PREVIEW_HEIGHT = 600;

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose }) => {
  const { nodes, connections } = useCanvasStore();
  const svgRef = useRef<SVGSVGElement>(null);

  const { contentBounds, scale } = useMemo(() => {
    if (nodes.length === 0) {
      return { contentBounds: { minX: 0, minY: 0, maxX: 200, maxY: 100 }, scale: 1 };
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    nodes.forEach((node) => {
      minX = Math.min(minX, node.x - 50);
      minY = Math.min(minY, node.y - 50);
      maxX = Math.max(maxX, node.x + node.width + 50);
      maxY = Math.max(maxY, node.y + node.height + 50);
    });

    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;

    const scaleX = (PREVIEW_WIDTH - 40) / contentWidth;
    const scaleY = (PREVIEW_HEIGHT - 40) / contentHeight;
    const scale = Math.min(scaleX, scaleY, 1);

    return { contentBounds: { minX, minY, maxX, maxY }, scale };
  }, [nodes]);

  const generateSvgContent = () => {
    const padding = 40;
    const contentWidth = contentBounds.maxX - contentBounds.minX;
    const contentHeight = contentBounds.maxY - contentBounds.minY;
    const svgWidth = contentWidth + padding * 2;
    const svgHeight = contentHeight + padding * 2;

    const offsetX = padding - contentBounds.minX;
    const offsetY = padding - contentBounds.minY;

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}">`;

    svg += `<defs>`;
    svg += `<pattern id="gridPattern" width="${GRID_SIZE}" height="${GRID_SIZE}" patternUnits="userSpaceOnUse">`;
    svg += `<circle cx="1" cy="1" r="0.5" fill="#e0e0e0"/>`;
    svg += `</pattern>`;
    svg += `</defs>`;

    svg += `<rect width="${svgWidth}" height="${svgHeight}" fill="#f9f9f9"/>`;
    svg += `<rect width="${svgWidth}" height="${svgHeight}" fill="url(#gridPattern)"/>`;

    connections.forEach((conn) => {
      const sourceNode = nodes.find((n) => n.id === conn.sourceId);
      const targetNode = nodes.find((n) => n.id === conn.targetId);
      if (!sourceNode || !targetNode) return;

      const sourcePos = {
        x: getNodePortPosition(sourceNode, conn.sourcePort).x + offsetX,
        y: getNodePortPosition(sourceNode, conn.sourcePort).y + offsetY,
      };
      const targetPos = {
        x: getNodePortPosition(targetNode, conn.targetPort).x + offsetX,
        y: getNodePortPosition(targetNode, conn.targetPort).y + offsetY,
      };

      const pathD = getConnectionPath(sourcePos, targetPos, conn.sourcePort, conn.targetPort);
      const midpoint = getConnectionMidpoint(
        sourcePos,
        targetPos,
        conn.sourcePort,
        conn.targetPort
      );

      let dashArray = '';
      if (conn.lineStyle === 'dashed') {
        dashArray = ` stroke-dasharray="${8 + conn.lineWidth * 2}, ${4 + conn.lineWidth}"`;
      } else if (conn.lineStyle === 'dotted') {
        dashArray = ` stroke-dasharray="${conn.lineWidth}, ${conn.lineWidth * 2}"`;
      }

      svg += `<path d="${pathD}" stroke="${conn.color}" stroke-width="${conn.lineWidth}" fill="none"${dashArray}/>`;

      const labelWidth = conn.label.length * 12 + 12;
      svg += `<rect x="${midpoint.x - labelWidth / 2}" y="${
        midpoint.y - 10
      }" width="${labelWidth}" height="20" rx="4" fill="white" stroke="#ddd" stroke-width="1"/>`;
      svg += `<text x="${midpoint.x}" y="${
        midpoint.y + 4
      }" text-anchor="middle" font-size="12" fill="#333" font-family="Arial, sans-serif">${conn.label}</text>`;
    });

    nodes.forEach((node) => {
      const x = node.x + offsetX;
      const y = node.y + offsetY;

      svg += `<defs>`;
      svg += `<clipPath id="clip-${node.id}">`;
      svg += `<rect x="${x}" y="${y}" width="${node.width}" height="${node.height}" rx="${node.borderRadius}" ry="${node.borderRadius}"/>`;
      svg += `</clipPath>`;
      svg += `</defs>`;

      svg += `<rect x="${x}" y="${y}" width="${node.width}" height="${node.height}" rx="${node.borderRadius}" ry="${node.borderRadius}" fill="white" stroke="#e0e0e0" stroke-width="1"/>`;

      const colorMatch = node.color.match(/linear-gradient\(135deg, ([^ ]+) 0%, ([^ ]+) 100%\)/);
      if (colorMatch) {
        const gradId = `grad-${node.id}`;
        svg += `<defs>`;
        svg += `<linearGradient id="${gradId}" x1="0%" y1="0%" x2="100%" y2="100%">`;
        svg += `<stop offset="0%" style="stop-color:${colorMatch[1]}"/>`;
        svg += `<stop offset="100%" style="stop-color:${colorMatch[2]}"/>`;
        svg += `</linearGradient>`;
        svg += `</defs>`;
        svg += `<rect x="${x}" y="${y}" width="6" height="${node.height}" fill="url(#${gradId})" clip-path="url(#clip-${node.id})"/>`;
      } else {
        svg += `<rect x="${x}" y="${y}" width="6" height="${node.height}" fill="${node.color}" clip-path="url(#clip-${node.id})"/>`;
      }

      const iconMap: Record<string, string> = {
        start: '▶',
        action: '⚡',
        decision: '◆',
        end: '⬛',
      };
      const icon = iconMap[node.type] || '●';

      svg += `<text x="${x + 24}" y="${y + node.height / 2 + 8}" font-size="24" fill="${
        colorMatch ? colorMatch[1] : node.color
      }" font-family="Arial, sans-serif">${icon}</text>`;

      svg += `<text x="${x + 56}" y="${y + node.height / 2 + 5}" font-size="14" fill="#333" font-family="Arial, sans-serif">${node.label}</text>`;

      const ports = ['top', 'left', 'bottom', 'right'] as const;
      ports.forEach((port) => {
        const portPos = getNodePortPosition(
          { ...node, x, y },
          port
        );
        const isOutput = port === 'bottom' || port === 'right';
        svg += `<circle cx="${portPos.x}" cy="${portPos.y}" r="6" fill="white" stroke="${
          isOutput ? '#667eea' : '#999'
        }" stroke-width="2"/>`;
      });
    });

    svg += `</svg>`;
    return svg;
  };

  const handleDownload = () => {
    const svgContent = generateSvgContent();
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);

    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const filename = `map-${dateStr}.svg`;

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>导出 SVG</h3>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-body">
          <div
            className="svg-preview-container"
            style={{ width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT }}
          >
            <svg
              ref={svgRef}
              width={PREVIEW_WIDTH}
              height={PREVIEW_HEIGHT}
              viewBox={`0 0 ${PREVIEW_WIDTH} ${PREVIEW_HEIGHT}`}
              className="svg-preview"
            >
              <defs>
                <pattern
                  id="previewGrid"
                  width={GRID_SIZE * scale}
                  height={GRID_SIZE * scale}
                  patternUnits="userSpaceOnUse"
                >
                  <circle cx={1} cy={1} r={0.5} fill="#e0e0e0" />
                </pattern>
              </defs>
              <rect width={PREVIEW_WIDTH} height={PREVIEW_HEIGHT} fill="#f9f9f9" />
              <rect width={PREVIEW_WIDTH} height={PREVIEW_HEIGHT} fill="url(#previewGrid)" />

              <g
                transform={`translate(${
                  (PREVIEW_WIDTH - (contentBounds.maxX - contentBounds.minX) * scale) / 2 -
                  contentBounds.minX * scale
                }, ${
                  (PREVIEW_HEIGHT - (contentBounds.maxY - contentBounds.minY) * scale) / 2 -
                  contentBounds.minY * scale
                }) scale(${scale})`}
              >
                {connections.map((conn) => {
                  const sourceNode = nodes.find((n) => n.id === conn.sourceId);
                  const targetNode = nodes.find((n) => n.id === conn.targetId);
                  if (!sourceNode || !targetNode) return null;

                  const sourcePos = getNodePortPosition(sourceNode, conn.sourcePort);
                  const targetPos = getNodePortPosition(targetNode, conn.targetPort);
                  const pathD = getConnectionPath(
                    sourcePos,
                    targetPos,
                    conn.sourcePort,
                    conn.targetPort
                  );
                  const midpoint = getConnectionMidpoint(
                    sourcePos,
                    targetPos,
                    conn.sourcePort,
                    conn.targetPort
                  );

                  let dashArray = 'none';
                  if (conn.lineStyle === 'dashed') {
                    dashArray = `${8 + conn.lineWidth * 2}, ${4 + conn.lineWidth}`;
                  } else if (conn.lineStyle === 'dotted') {
                    dashArray = `${conn.lineWidth}, ${conn.lineWidth * 2}`;
                  }

                  return (
                    <g key={conn.id}>
                      <path
                        d={pathD}
                        stroke={conn.color}
                        strokeWidth={conn.lineWidth}
                        fill="none"
                        strokeDasharray={dashArray}
                      />
                      <rect
                        x={midpoint.x - (conn.label.length * 12) / 2 - 6}
                        y={midpoint.y - 10}
                        width={conn.label.length * 12 + 12}
                        height={20}
                        rx={4}
                        fill="white"
                        stroke="#ddd"
                        strokeWidth={1}
                      />
                      <text
                        x={midpoint.x}
                        y={midpoint.y + 4}
                        textAnchor="middle"
                        fontSize={12}
                        fill="#333"
                        fontFamily="Arial, sans-serif"
                      >
                        {conn.label}
                      </text>
                    </g>
                  );
                })}

                {nodes.map((node) => {
                  const iconMap: Record<string, string> = {
                    start: '▶',
                    action: '⚡',
                    decision: '◆',
                    end: '⬛',
                  };
                  const icon = iconMap[node.type] || '●';

                  return (
                    <g key={node.id}>
                      <defs>
                        <clipPath id={`preview-clip-${node.id}`}>
                          <rect
                            x={node.x}
                            y={node.y}
                            width={node.width}
                            height={node.height}
                            rx={node.borderRadius}
                            ry={node.borderRadius}
                          />
                        </clipPath>
                      </defs>
                      <rect
                        x={node.x}
                        y={node.y}
                        width={node.width}
                        height={node.height}
                        rx={node.borderRadius}
                        ry={node.borderRadius}
                        fill="white"
                        stroke="#e0e0e0"
                        strokeWidth={1}
                      />
                      <rect
                        x={node.x}
                        y={node.y}
                        width={6}
                        height={node.height}
                        fill={node.color}
                        clipPath={`url(#preview-clip-${node.id})`}
                      />
                      <text
                        x={node.x + 24}
                        y={node.y + node.height / 2 + 8}
                        fontSize={24}
                        fill="#667eea"
                        fontFamily="Arial, sans-serif"
                      >
                        {icon}
                      </text>
                      <text
                        x={node.x + 56}
                        y={node.y + node.height / 2 + 5}
                        fontSize={14}
                        fill="#333"
                        fontFamily="Arial, sans-serif"
                      >
                        {node.label}
                      </text>
                      {(['top', 'left', 'bottom', 'right'] as const).map((port) => {
                        const portPos = getNodePortPosition(node, port);
                        const isOutput = port === 'bottom' || port === 'right';
                        return (
                          <circle
                            key={port}
                            cx={portPos.x}
                            cy={portPos.y}
                            r={6}
                            fill="white"
                            stroke={isOutput ? '#667eea' : '#999'}
                            strokeWidth={2}
                          />
                        );
                      })}
                    </g>
                  );
                })}
              </g>
            </svg>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            取消
          </button>
          <button className="btn btn-primary" onClick={handleDownload}>
            下载 SVG
          </button>
        </div>
      </div>
    </div>
  );
};
