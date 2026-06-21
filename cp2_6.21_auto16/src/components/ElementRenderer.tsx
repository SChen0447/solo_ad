import React, { useEffect, useRef, useState } from 'react';
import rough from 'roughjs/bundled/rough.esm';
import type {
  CanvasElement,
  PenElement,
  TextElement,
  StickyElement,
  IconElement,
} from '../types';
import { useCanvasStore } from '../store/canvasStore';

const generator = rough.generator();

interface Props {
  element: CanvasElement;
  isSelected: boolean;
  onMouseDown: (e: React.MouseEvent, id: string) => void;
  onDoubleClick: (id: string) => void;
  isNew: boolean;
}

const ElementRenderer: React.FC<Props> = ({
  element,
  isSelected,
  onMouseDown,
  onDoubleClick,
  isNew,
}) => {
  const svgRef = useRef<SVGGElement>(null);
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const editingId = useCanvasStore((s) => s.editingId);
  const setEditing = useCanvasStore((s) => s.setEditing);
  const updateElement = useCanvasStore((s) => s.updateElement);

  useEffect(() => {
    if (isNew) {
      setShouldAnimate(true);
      const timer = setTimeout(() => {
        setShouldAnimate(false);
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [isNew]);

  const isEditing = editingId === element.id;

  const renderShape = () => {
    const { x, y, width, height, color, strokeWidth } = element;
    const opts = {
      stroke: color,
      strokeWidth,
      roughness: 1.2,
      bowing: 1,
      fill: (element as { fill?: string }).fill
        ? (element as { fill: string }).fill
        : undefined,
      fillStyle: 'solid' as const,
      fillWeight: 1,
    };

    switch (element.type) {
      case 'rectangle': {
        const shape = generator.rectangle(x, y, width, height, opts);
        return shape.sets.map((s, i) => {
          const d = s.operations.map((o) => o.data as string).join(' ');
          return (
            <path
              key={i}
              d={d}
              fill={i === 0 && opts.fill ? opts.fill : 'none'}
              stroke={color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        });
      }
      case 'circle': {
        const cx = x + width / 2;
        const cy = y + height / 2;
        const shape = generator.ellipse(cx, cy, width, height, opts);
        return shape.sets.map((s, i) => {
          const d = s.operations.map((o) => o.data as string).join(' ');
          return (
            <path
              key={i}
              d={d}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        });
      }
      case 'pen': {
        const pen = element as PenElement;
        if (pen.points.length < 2) return null;
        const d = pen.points
          .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
          .join(' ');
        return (
          <path
            d={d}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
      }
      case 'text': {
        const t = element as TextElement;
        return (
          <foreignObject
            x={t.x}
            y={t.y}
            width={t.width}
            height={t.height}
            style={{ overflow: 'visible' }}
          >
            <div
              style={{
                width: t.width,
                minHeight: t.height,
                color: t.color,
                fontSize: t.fontSize,
                lineHeight: 1.4,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                pointerEvents: 'none',
              }}
            >
              {t.content || 'Text'}
            </div>
          </foreignObject>
        );
      }
      case 'sticky': {
        const t = element as StickyElement;
        const shape = generator.rectangle(t.x, t.y, t.width, t.height, {
          ...opts,
          fill: t.fill || '#FEF3C7',
        });
        return (
          <g>
            {shape.sets.map((s, i) => {
              const d = s.operations.map((o) => o.data as string).join(' ');
              return (
                <path
                  key={i}
                  d={d}
                  fill={i === 0 ? t.fill || '#FEF3C7' : 'none'}
                  stroke={i === 0 ? 'none' : color}
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              );
            })}
            <foreignObject
              x={t.x + 10}
              y={t.y + 10}
              width={t.width - 20}
              height={t.height - 20}
              style={{ overflow: 'hidden' }}
            >
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  color: '#1f2937',
                  fontSize: 14,
                  lineHeight: 1.5,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  pointerEvents: 'none',
                }}
              >
                {t.content}
              </div>
            </foreignObject>
          </g>
        );
      }
      case 'icon': {
        const ic = element as IconElement;
        const icons: Record<string, JSX.Element> = {
          star: (
            <polygon
              points={getStarPoints(ic.x + ic.width / 2, ic.y + ic.height / 2, ic.width / 2)}
              fill={color}
              stroke={color}
              strokeWidth={0.5}
              strokeLinejoin="round"
            />
          ),
          heart: (
            <path
              d={getHeartPath(ic.x + ic.width / 2, ic.y + ic.height / 2, ic.width / 2)}
              fill={color}
              stroke={color}
              strokeWidth={0.5}
              strokeLinejoin="round"
            />
          ),
          arrow: (
            <path
              d={`M ${ic.x} ${ic.y + ic.height / 2} L ${ic.x + ic.width * 0.7} ${ic.y + ic.height / 2}
                  M ${ic.x + ic.width * 0.6} ${ic.y + ic.height * 0.2}
                  L ${ic.x + ic.width} ${ic.y + ic.height / 2}
                  L ${ic.x + ic.width * 0.6} ${ic.y + ic.height * 0.8}`}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ),
        };
        return icons[ic.iconName] || icons.star;
      }
      default:
        return null;
    }
  };

  return (
    <g
      ref={svgRef}
      className={shouldAnimate ? 'element-pop' : ''}
      style={{
        transformOrigin: `${element.x + element.width / 2}px ${element.y + element.height / 2}px`,
        cursor: 'move',
      }}
      onMouseDown={(e) => onMouseDown(e, element.id)}
      onDoubleClick={() => onDoubleClick(element.id)}
    >
      {renderShape()}
      {isSelected && !isEditing && (
        <rect
          x={element.x - 4}
          y={element.y - 4}
          width={element.width + 8}
          height={element.height + 8}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={1.5}
          strokeDasharray="5 3"
          rx={4}
          style={{ pointerEvents: 'none' }}
        />
      )}
      {isEditing && element.type === 'text' && (
        <foreignObject
          x={element.x}
          y={element.y}
          width={element.width + 100}
          height={element.height + 50}
        >
          <textarea
            autoFocus
            defaultValue={(element as TextElement).content}
            onChange={(e) => {
              updateElement(element.id, {
                content: e.target.value,
                width: Math.max(element.width, 120),
                height: Math.max(element.height, 32),
              } as Partial<CanvasElement>);
            }}
            onBlur={() => setEditing(null)}
            style={{
              width: '100%',
              minHeight: element.height,
              border: '1px solid var(--primary)',
              borderRadius: 4,
              padding: 4,
              fontSize: (element as TextElement).fontSize,
              color: element.color,
              background: 'white',
              resize: 'none',
            }}
          />
        </foreignObject>
      )}
    </g>
  );
};

function getStarPoints(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    const radius = i % 2 === 0 ? r : r * 0.45;
    pts.push(`${cx + Math.cos(angle) * radius},${cy + Math.sin(angle) * radius}`);
  }
  return pts.join(' ');
}

function getHeartPath(cx: number, cy: number, r: number): string {
  return `
    M ${cx} ${cy + r * 0.9}
    C ${cx - r * 1.8} ${cy - r * 0.1}, ${cx - r * 0.9} ${cy - r * 1.1}, ${cx} ${cy - r * 0.3}
    C ${cx + r * 0.9} ${cy - r * 1.1}, ${cx + r * 1.8} ${cy - r * 0.1}, ${cx} ${cy + r * 0.9}
    Z
  `;
}

export default ElementRenderer;
