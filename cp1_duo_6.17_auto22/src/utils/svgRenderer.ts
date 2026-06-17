import type { IconConfig } from '@/types';

function generateGradientId(config: IconConfig): string {
  return `grad-${config.id || 'preview'}`;
}

function generateGradientDef(config: IconConfig): string {
  const gradId = generateGradientId(config);
  const stops = config.gradientStops
    .sort((a, b) => a.offset - b.offset)
    .map(stop => `    <stop offset="${stop.offset * 100}%" stop-color="${stop.color}" />`)
    .join('\n');

  if (config.fillType === 'linear-gradient') {
    const angle = config.gradientAngle;
    const x1 = Math.round(50 - 50 * Math.cos((angle * Math.PI) / 180));
    const y1 = Math.round(50 - 50 * Math.sin((angle * Math.PI) / 180));
    const x2 = Math.round(50 + 50 * Math.cos((angle * Math.PI) / 180));
    const y2 = Math.round(50 + 50 * Math.sin((angle * Math.PI) / 180));
    return `  <defs>
    <linearGradient id="${gradId}" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%">
${stops}
    </linearGradient>
  </defs>`;
  } else if (config.fillType === 'radial-gradient') {
    return `  <defs>
    <radialGradient id="${gradId}" cx="50%" cy="50%" r="50%">
${stops}
    </radialGradient>
  </defs>`;
  }
  return '';
}

function getFillValue(config: IconConfig): string {
  if (config.fillType === 'solid') return config.fillColor;
  if (config.fillType === 'linear-gradient' || config.fillType === 'radial-gradient') {
    return `url(#${generateGradientId(config)})`;
  }
  return 'none';
}

function getShapePath(config: IconConfig): string {
  const { shape, borderRadius } = config;
  const cx = 50, cy = 50;
  const r = 38;

  switch (shape) {
    case 'square': {
      const size = 76;
      const x = 12, y = 12;
      const radius = Math.min(borderRadius, size / 2);
      return `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${radius}" ry="${radius}" />`;
    }
    case 'circle':
      return `<circle cx="${cx}" cy="${cy}" r="${r}" />`;
    case 'triangle': {
      const h = 78;
      const w = 88;
      const px = cx, py = cy - h / 2 + 4;
      return `<polygon points="${px},${py} ${px + w / 2},${py + h} ${px - w / 2},${py + h}" />`;
    }
    case 'cross': {
      const t = 18;
      const size = 78;
      const s = (100 - size) / 2;
      return `<path d="M${s + (size - t) / 2},${s} h${t} v${(size - t) / 2} h${(size - t) / 2} v${t} h${-(size - t) / 2} v${(size - t) / 2} h${-t} v${-(size - t) / 2} h${-(size - t) / 2} v${-t} h${(size - t) / 2} z" />`;
    }
    case 'star': {
      const outerR = 40, innerR = 18;
      const points: string[] = [];
      for (let i = 0; i < 10; i++) {
        const angle = (Math.PI / 5) * i - Math.PI / 2;
        const radius = i % 2 === 0 ? outerR : innerR;
        points.push(`${cx + radius * Math.cos(angle)},${cy + radius * Math.sin(angle)}`);
      }
      return `<polygon points="${points.join(' ')}" />`;
    }
    case 'arrow': {
      return `<path d="M20,50 h45 m-15,-15 l15,15 l-15,15" />`;
    }
    case 'heart': {
      return `<path d="M50,85 C20,65 5,45 15,30 C25,15 45,20 50,35 C55,20 75,15 85,30 C95,45 80,65 50,85 Z" />`;
    }
    case 'diamond': {
      return `<polygon points="${cx},12 ${88},${cy} ${cx},88 ${12},${cy}" />`;
    }
    default:
      return '';
  }
}

export function renderIconSVG(config: IconConfig, size: number = 100, includeXml: boolean = false): string {
  const fill = getFillValue(config);
  const stroke = config.strokeColor;
  const strokeWidth = config.strokeWidth;
  const defs = config.fillType.includes('gradient') ? generateGradientDef(config) + '\n' : '';
  const shape = getShapePath(config);
  const attributes = `fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"`;

  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}">
${defs}  <g ${attributes}>
    ${shape}
  </g>
</svg>`;

  return includeXml
    ? '<?xml version="1.0" encoding="UTF-8"?>\n' + svgContent
    : svgContent;
}

export function renderIconSVGInline(config: IconConfig, size: number = 100): React.ReactNode {
  const fill = getFillValue(config);
  const stroke = config.strokeColor;
  const strokeWidth = config.strokeWidth;
  const gradId = generateGradientId(config);

  const shapeElement = (() => {
    const { shape, borderRadius } = config;
    const cx = 50, cy = 50;
    const r = 38;

    switch (shape) {
      case 'square': {
        const size = 76;
        const x = 12, y = 12;
        const radius = Math.min(borderRadius, size / 2);
        return <rect x={x} y={y} width={size} height={size} rx={radius} ry={radius} />;
      }
      case 'circle':
        return <circle cx={cx} cy={cy} r={r} />;
      case 'triangle': {
        const h = 78;
        const w = 88;
        const px = cx, py = cy - h / 2 + 4;
        return <polygon points={`${px},${py} ${px + w / 2},${py + h} ${px - w / 2},${py + h}`} />;
      }
      case 'cross': {
        const t = 18;
        const size = 78;
        const s = (100 - size) / 2;
        return <path d={`M${s + (size - t) / 2},${s} h${t} v${(size - t) / 2} h${(size - t) / 2} v${t} h${-(size - t) / 2} v${(size - t) / 2} h${-t} v${-(size - t) / 2} h${-(size - t) / 2} v${-t} h${(size - t) / 2} z`} />;
      }
      case 'star': {
        const outerR = 40, innerR = 18;
        const points: string[] = [];
        for (let i = 0; i < 10; i++) {
          const angle = (Math.PI / 5) * i - Math.PI / 2;
          const radius = i % 2 === 0 ? outerR : innerR;
          points.push(`${cx + radius * Math.cos(angle)},${cy + radius * Math.sin(angle)}`);
        }
        return <polygon points={points.join(' ')} />;
      }
      case 'arrow': {
        return <path d="M20,50 h45 m-15,-15 l15,15 l-15,15" />;
      }
      case 'heart': {
        return <path d="M50,85 C20,65 5,45 15,30 C25,15 45,20 50,35 C55,20 75,15 85,30 C95,45 80,65 50,85 Z" />;
      }
      case 'diamond': {
        return <polygon points={`${cx},12 ${88},${cy} ${cx},88 ${12},${cy}`} />;
      }
      default:
        return null;
    }
  })();

  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width={size} height={size}>
      {config.fillType.includes('gradient') && (
        <defs>
          {config.fillType === 'linear-gradient' ? (
            <linearGradient
              id={gradId}
              x1={`${Math.round(50 - 50 * Math.cos((config.gradientAngle * Math.PI) / 180))}%`}
              y1={`${Math.round(50 - 50 * Math.sin((config.gradientAngle * Math.PI) / 180))}%`}
              x2={`${Math.round(50 + 50 * Math.cos((config.gradientAngle * Math.PI) / 180))}%`}
              y2={`${Math.round(50 + 50 * Math.sin((config.gradientAngle * Math.PI) / 180))}%`}
            >
              {config.gradientStops.sort((a, b) => a.offset - b.offset).map((stop, idx) => (
                <stop key={idx} offset={`${stop.offset * 100}%`} stopColor={stop.color} />
              ))}
            </linearGradient>
          ) : (
            <radialGradient id={gradId} cx="50%" cy="50%" r="50%">
              {config.gradientStops.sort((a, b) => a.offset - b.offset).map((stop, idx) => (
                <stop key={idx} offset={`${stop.offset * 100}%`} stopColor={stop.color} />
              ))}
            </radialGradient>
          )}
        </defs>
      )}
      <g fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        {shapeElement}
      </g>
    </svg>
  );
}
