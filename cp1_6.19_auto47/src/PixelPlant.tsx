import React, { useMemo } from 'react';

type PixelType = 'stem' | 'leaf' | 'flower' | 'fruit' | 'root' | 'soil' | null;

interface PixelData {
  x: number;
  y: number;
  type: PixelType;
}

const GRID_SIZE = 24;
const SOIL_START_ROW = 19;

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((x) => {
        const hex = Math.max(0, Math.min(255, Math.round(x))).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      })
      .join('')
  );
}

function lerpColor(color1: string, color2: string, t: number): string {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  return rgbToHex(
    c1.r + (c2.r - c1.r) * t,
    c1.g + (c2.g - c1.g) * t,
    c1.b + (c2.b - c1.b) * t
  );
}

function generateStage0(): PixelData[] {
  const pixels: PixelData[] = [];
  for (let x = 9; x <= 14; x++) {
    pixels.push({ x, y: 23, type: 'root' });
  }
  for (let x = 10; x <= 13; x++) {
    pixels.push({ x, y: 22, type: 'root' });
  }
  pixels.push({ x: 11, y: 18, type: 'stem' });
  pixels.push({ x: 12, y: 18, type: 'stem' });
  pixels.push({ x: 11, y: 17, type: 'leaf' });
  pixels.push({ x: 12, y: 17, type: 'leaf' });
  return pixels;
}

function generateStage1(): PixelData[] {
  const pixels: PixelData[] = [];
  for (let x = 8; x <= 15; x++) {
    pixels.push({ x, y: 23, type: 'root' });
  }
  for (let x = 9; x <= 14; x++) {
    pixels.push({ x, y: 22, type: 'root' });
  }
  for (let x = 10; x <= 13; x++) {
    pixels.push({ x, y: 21, type: 'root' });
  }
  for (let y = 15; y <= 18; y++) {
    pixels.push({ x: 11, y, type: 'stem' });
    pixels.push({ x: 12, y, type: 'stem' });
  }
  pixels.push({ x: 8, y: 14, type: 'leaf' });
  pixels.push({ x: 9, y: 14, type: 'leaf' });
  pixels.push({ x: 9, y: 13, type: 'leaf' });
  pixels.push({ x: 10, y: 13, type: 'leaf' });
  pixels.push({ x: 14, y: 14, type: 'leaf' });
  pixels.push({ x: 15, y: 14, type: 'leaf' });
  pixels.push({ x: 14, y: 13, type: 'leaf' });
  pixels.push({ x: 15, y: 13, type: 'leaf' });
  return pixels;
}

function generateStage2(): PixelData[] {
  const pixels: PixelData[] = [];
  for (let x = 7; x <= 16; x++) {
    pixels.push({ x, y: 23, type: 'root' });
  }
  for (let x = 8; x <= 15; x++) {
    pixels.push({ x, y: 22, type: 'root' });
    pixels.push({ x, y: 21, type: 'root' });
  }
  for (let y = 10; y <= 18; y++) {
    pixels.push({ x: 11, y, type: 'stem' });
    pixels.push({ x: 12, y, type: 'stem' });
  }
  pixels.push({ x: 6, y: 16, type: 'leaf' });
  pixels.push({ x: 7, y: 16, type: 'leaf' });
  pixels.push({ x: 7, y: 15, type: 'leaf' });
  pixels.push({ x: 8, y: 15, type: 'leaf' });
  pixels.push({ x: 8, y: 14, type: 'leaf' });
  pixels.push({ x: 9, y: 14, type: 'leaf' });

  pixels.push({ x: 15, y: 16, type: 'leaf' });
  pixels.push({ x: 16, y: 16, type: 'leaf' });
  pixels.push({ x: 15, y: 15, type: 'leaf' });
  pixels.push({ x: 16, y: 15, type: 'leaf' });
  pixels.push({ x: 14, y: 14, type: 'leaf' });
  pixels.push({ x: 15, y: 14, type: 'leaf' });

  pixels.push({ x: 7, y: 11, type: 'leaf' });
  pixels.push({ x: 8, y: 11, type: 'leaf' });
  pixels.push({ x: 8, y: 10, type: 'leaf' });
  pixels.push({ x: 9, y: 10, type: 'leaf' });
  pixels.push({ x: 9, y: 9, type: 'leaf' });
  pixels.push({ x: 10, y: 9, type: 'leaf' });

  pixels.push({ x: 14, y: 11, type: 'leaf' });
  pixels.push({ x: 15, y: 11, type: 'leaf' });
  pixels.push({ x: 14, y: 10, type: 'leaf' });
  pixels.push({ x: 15, y: 10, type: 'leaf' });
  pixels.push({ x: 13, y: 9, type: 'leaf' });
  pixels.push({ x: 14, y: 9, type: 'leaf' });

  pixels.push({ x: 10, y: 8, type: 'leaf' });
  pixels.push({ x: 11, y: 8, type: 'leaf' });
  pixels.push({ x: 12, y: 8, type: 'leaf' });
  pixels.push({ x: 13, y: 8, type: 'leaf' });
  return pixels;
}

function generateStage3(): PixelData[] {
  const pixels = generateStage2();
  pixels.push({ x: 11, y: 7, type: 'stem' });
  pixels.push({ x: 12, y: 7, type: 'stem' });
  pixels.push({ x: 11, y: 6, type: 'stem' });
  pixels.push({ x: 12, y: 6, type: 'stem' });

  pixels.push({ x: 10, y: 5, type: 'flower' });
  pixels.push({ x: 11, y: 5, type: 'flower' });
  pixels.push({ x: 12, y: 5, type: 'flower' });
  pixels.push({ x: 13, y: 5, type: 'flower' });
  pixels.push({ x: 10, y: 4, type: 'flower' });
  pixels.push({ x: 11, y: 4, type: 'flower' });
  pixels.push({ x: 12, y: 4, type: 'flower' });
  pixels.push({ x: 13, y: 4, type: 'flower' });
  pixels.push({ x: 11, y: 3, type: 'flower' });
  pixels.push({ x: 12, y: 3, type: 'flower' });
  return pixels;
}

function generateStage4(): PixelData[] {
  const pixels = generateStage3();

  pixels.push({ x: 4, y: 13, type: 'stem' });
  pixels.push({ x: 5, y: 13, type: 'stem' });
  pixels.push({ x: 5, y: 12, type: 'stem' });
  pixels.push({ x: 6, y: 12, type: 'stem' });

  pixels.push({ x: 3, y: 11, type: 'flower' });
  pixels.push({ x: 4, y: 11, type: 'flower' });
  pixels.push({ x: 5, y: 11, type: 'flower' });
  pixels.push({ x: 3, y: 10, type: 'flower' });
  pixels.push({ x: 4, y: 10, type: 'flower' });
  pixels.push({ x: 5, y: 10, type: 'flower' });
  pixels.push({ x: 4, y: 9, type: 'flower' });

  pixels.push({ x: 18, y: 13, type: 'stem' });
  pixels.push({ x: 19, y: 13, type: 'stem' });
  pixels.push({ x: 17, y: 12, type: 'stem' });
  pixels.push({ x: 18, y: 12, type: 'stem' });

  pixels.push({ x: 18, y: 11, type: 'flower' });
  pixels.push({ x: 19, y: 11, type: 'flower' });
  pixels.push({ x: 20, y: 11, type: 'flower' });
  pixels.push({ x: 18, y: 10, type: 'flower' });
  pixels.push({ x: 19, y: 10, type: 'flower' });
  pixels.push({ x: 20, y: 10, type: 'flower' });
  pixels.push({ x: 19, y: 9, type: 'flower' });

  pixels.push({ x: 6, y: 7, type: 'flower' });
  pixels.push({ x: 7, y: 7, type: 'flower' });
  pixels.push({ x: 6, y: 6, type: 'flower' });
  pixels.push({ x: 7, y: 6, type: 'flower' });
  pixels.push({ x: 16, y: 7, type: 'flower' });
  pixels.push({ x: 17, y: 7, type: 'flower' });
  pixels.push({ x: 16, y: 6, type: 'flower' });
  pixels.push({ x: 17, y: 6, type: 'flower' });
  return pixels;
}

function generateStage5(): PixelData[] {
  const pixels = generateStage4();

  pixels.push({ x: 3, y: 8, type: 'fruit' });
  pixels.push({ x: 4, y: 8, type: 'fruit' });
  pixels.push({ x: 3, y: 7, type: 'fruit' });
  pixels.push({ x: 4, y: 7, type: 'fruit' });

  pixels.push({ x: 19, y: 8, type: 'fruit' });
  pixels.push({ x: 20, y: 8, type: 'fruit' });
  pixels.push({ x: 19, y: 7, type: 'fruit' });
  pixels.push({ x: 20, y: 7, type: 'fruit' });

  pixels.push({ x: 5, y: 5, type: 'fruit' });
  pixels.push({ x: 6, y: 5, type: 'fruit' });
  pixels.push({ x: 5, y: 4, type: 'fruit' });
  pixels.push({ x: 6, y: 4, type: 'fruit' });

  pixels.push({ x: 17, y: 5, type: 'fruit' });
  pixels.push({ x: 18, y: 5, type: 'fruit' });
  pixels.push({ x: 17, y: 4, type: 'fruit' });
  pixels.push({ x: 18, y: 4, type: 'fruit' });

  pixels.push({ x: 11, y: 1, type: 'fruit' });
  pixels.push({ x: 12, y: 1, type: 'fruit' });
  pixels.push({ x: 11, y: 2, type: 'fruit' });
  pixels.push({ x: 12, y: 2, type: 'fruit' });
  return pixels;
}

const stageGenerators = [
  generateStage0,
  generateStage1,
  generateStage2,
  generateStage3,
  generateStage4,
  generateStage5,
];

interface PixelPlantProps {
  stage: number;
  water: number;
  light: number;
  fertilizer: number;
  isUpgrading: boolean;
}

const PixelPlant: React.FC<PixelPlantProps> = ({ stage, water, light, fertilizer, isUpgrading }) => {
  const plantPixels = useMemo(() => {
    const generator = stageGenerators[Math.min(stage, stageGenerators.length - 1)];
    return generator();
  }, [stage]);

  const pixelMap = useMemo(() => {
    const map = new Map<string, PixelType>();
    plantPixels.forEach((p) => {
      map.set(`${p.x},${p.y}`, p.type);
    });
    return map;
  }, [plantPixels]);

  const getColor = (type: PixelType): string => {
    if (!type) return 'transparent';

    const waterT = water / 100;
    const lightT = light / 100;
    const fertT = fertilizer / 100;

    switch (type) {
      case 'leaf': {
        const baseLight = lerpColor('#7ec850', '#4caf50', waterT);
        const sunBoost = lerpColor(baseLight, '#8bc34a', lightT * 0.3);
        return sunBoost;
      }
      case 'stem': {
        return lerpColor('#8d6e63', '#558b2f', waterT * 0.5 + lightT * 0.3);
      }
      case 'flower': {
        const basePink = lerpColor('#f8bbd9', '#e91e63', fertT);
        const sunLit = lerpColor(basePink, '#ff4081', lightT * 0.4);
        return sunLit;
      }
      case 'fruit': {
        return lerpColor('#ffcc80', '#ff5722', fertT * 0.7 + lightT * 0.3);
      }
      case 'root': {
        return '#6d4c41';
      }
      case 'soil': {
        return '#8B4513';
      }
      default:
        return 'transparent';
    }
  };

  const allPixels: { x: number; y: number; type: PixelType }[] = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      if (y >= SOIL_START_ROW) {
        allPixels.push({ x, y, type: 'soil' });
      } else {
        const key = `${x},${y}`;
        const pType = pixelMap.get(key);
        if (pType) {
          allPixels.push({ x, y, type: pType });
        }
      }
    }
  }

  const pixelSize = 'var(--pixel-size)';
  const containerSize = `calc(${GRID_SIZE} * ${pixelSize})`;

  return (
    <div
      style={{
        position: 'relative',
        width: containerSize,
        height: containerSize,
        margin: '0 auto',
      }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${GRID_SIZE} ${GRID_SIZE}`}
        style={{ display: 'block', imageRendering: 'pixelated' }}
      >
        {allPixels.map((p, idx) => {
          const color = getColor(p.type);
          if (color === 'transparent') return null;
          return (
            <rect
              key={idx}
              x={p.x}
              y={p.y}
              width={1}
              height={1}
              fill={color}
              style={{
                transition: 'fill 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            />
          );
        })}
      </svg>
      {isUpgrading && (
        <div
          className="upgrade-ripple"
          style={{
            left: '50%',
            top: '50%',
            width: '80px',
            height: '80px',
            marginLeft: '-40px',
            marginTop: '-40px',
          }}
        />
      )}
    </div>
  );
};

export default PixelPlant;
