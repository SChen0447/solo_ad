const PIXEL_SIZE = 4;
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 400;

type SceneData = {
  terrain: string[];
  buildings: string[];
  weather: string;
  timeOfDay: string;
};

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) || 1;
}

function drawPixelBlock(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(
    Math.floor(x / PIXEL_SIZE) * PIXEL_SIZE,
    Math.floor(y / PIXEL_SIZE) * PIXEL_SIZE,
    PIXEL_SIZE,
    PIXEL_SIZE
  );
}

function drawGrass(ctx: CanvasRenderingContext2D, x: number, y: number, width: number) {
  const greens = ['#4a7c3f', '#5d9c4a', '#3d6b33'];
  const rand = seededRandom(42);

  for (let px = x; px < x + width; px += PIXEL_SIZE) {
    const heightBlocks = Math.floor(rand() * 6) + 3;
    for (let row = 0; row < heightBlocks; row++) {
      const drawY = y - row * PIXEL_SIZE;
      const color = greens[Math.floor(rand() * greens.length)];
      drawPixelBlock(ctx, px, drawY, color);
    }
  }
}

function drawRiver(ctx: CanvasRenderingContext2D, x: number, y: number, width: number) {
  const blues = ['#3b82f6', '#60a5fa', '#2563eb'];
  const rand = seededRandom(77);

  for (let px = x; px < x + width; px += PIXEL_SIZE) {
    const waveOffset = Math.sin(px * 0.02) * PIXEL_SIZE * 2;
    const centerY = y + waveOffset;

    for (let row = -3; row <= 3; row++) {
      const drawY = centerY + row * PIXEL_SIZE;
      const color = blues[Math.abs(row) % blues.length];
      drawPixelBlock(ctx, px, drawY, color);
    }
  }
}

function drawMountain(ctx: CanvasRenderingContext2D, x: number, y: number, width: number) {
  const grays = ['#6b7280', '#9ca3af', '#4b5563'];
  const snowColor = '#ffffff';
  const halfWidth = Math.floor(width / 2);
  const height = halfWidth;

  for (let row = 0; row < height; row += PIXEL_SIZE) {
    const rowProgress = row / height;
    const currentHalfWidth = Math.floor(halfWidth * (1 - rowProgress));

    for (let px = -currentHalfWidth; px <= currentHalfWidth; px += PIXEL_SIZE) {
      const drawX = x + halfWidth + px;
      const drawY = y - row;
      const isSnow = rowProgress > 0.8;
      const color = isSnow ? snowColor : grays[Math.abs(px) % grays.length];
      drawPixelBlock(ctx, drawX, drawY, color);
    }
  }
}

function drawHut(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const baseColor = '#92400e';
  const roofColor = '#78350f';
  const windowColor = '#fbbf24';

  for (let bx = 0; bx < 8; bx++) {
    for (let by = 0; by < 6; by++) {
      drawPixelBlock(ctx, x + bx * PIXEL_SIZE, y + by * PIXEL_SIZE, baseColor);
    }
  }

  for (let row = 0; row < 5; row++) {
    const roofWidth = 5 - row;
    for (let px = 0; px < roofWidth; px++) {
      drawPixelBlock(ctx, x + (2 - Math.floor(roofWidth / 2) + px) * PIXEL_SIZE, (y - (row + 1) * PIXEL_SIZE), roofColor);
    }
  }

  drawPixelBlock(ctx, x + 3 * PIXEL_SIZE, y + 2 * PIXEL_SIZE, windowColor);
  drawPixelBlock(ctx, x + 4 * PIXEL_SIZE, y + 2 * PIXEL_SIZE, windowColor);
  drawPixelBlock(ctx, x + 3 * PIXEL_SIZE, y + 3 * PIXEL_SIZE, windowColor);
  drawPixelBlock(ctx, x + 4 * PIXEL_SIZE, y + 3 * PIXEL_SIZE, windowColor);
}

function drawCastle(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const wallColor = '#6b7280';
  const flagColor = '#ef4444';

  for (let bx = 0; bx < 14; bx++) {
    for (let by = 0; by < 12; by++) {
      drawPixelBlock(ctx, x + bx * PIXEL_SIZE, y + by * PIXEL_SIZE, wallColor);
    }
  }

  for (let i = 0; i < 7; i++) {
    const bOffset = i * 2;
    drawPixelBlock(ctx, x + bOffset * PIXEL_SIZE, (y - PIXEL_SIZE), wallColor);
  }

  for (let by = 0; by < 4; by++) {
    drawPixelBlock(ctx, x + 7 * PIXEL_SIZE, (y - (by + 1) * PIXEL_SIZE), wallColor);
  }

  for (let fx = 0; fx < 3; fx++) {
    for (let fy = 0; fy < 2; fy++) {
      drawPixelBlock(ctx, x + (8 + fx) * PIXEL_SIZE, (y - 4 - fy) * PIXEL_SIZE, flagColor);
    }
  }
}

function drawTower(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const towerColor = '#4b5563';
  const roofColor = '#1e3a5f';
  const windowColor = '#fbbf24';

  for (let bx = 0; bx < 5; bx++) {
    for (let by = 0; by < 16; by++) {
      drawPixelBlock(ctx, x + bx * PIXEL_SIZE, y + by * PIXEL_SIZE, towerColor);
    }
  }

  for (let row = 0; row < 5; row++) {
    const roofWidth = 4 - Math.floor(row / 2);
    for (let px = 0; px < roofWidth; px++) {
      drawPixelBlock(ctx, x + (1 + px) * PIXEL_SIZE, (y - (row + 1) * PIXEL_SIZE), roofColor);
    }
  }

  drawPixelBlock(ctx, x + 2 * PIXEL_SIZE, y + 4 * PIXEL_SIZE, windowColor);
  drawPixelBlock(ctx, x + 2 * PIXEL_SIZE, y + 8 * PIXEL_SIZE, windowColor);
  drawPixelBlock(ctx, x + 2 * PIXEL_SIZE, y + 12 * PIXEL_SIZE, windowColor);
}

function drawRain(ctx: CanvasRenderingContext2D, width: number, height: number, frame: number) {
  const color = '#60a5fa';
  ctx.fillStyle = color;
  const rand = seededRandom(frame * 7 + 100);

  for (let i = 0; i < 40; i++) {
    const startX = Math.floor(rand() * width);
    const speed = 8 + Math.floor(rand() * 8);
    const startY = ((rand() * height + frame * speed) % (height + 20)) - 10;
    const length = PIXEL_SIZE * 2;

    ctx.fillRect(
      Math.floor(startX / PIXEL_SIZE) * PIXEL_SIZE,
      Math.floor(startY / PIXEL_SIZE) * PIXEL_SIZE,
      PIXEL_SIZE,
      length
    );
  }
}

function drawSnow(ctx: CanvasRenderingContext2D, width: number, height: number, frame: number) {
  const colors = ['#ffffff', '#e5e7eb'];
  const rand = seededRandom(frame * 13 + 200);

  for (let i = 0; i < 40; i++) {
    const startX = Math.floor(rand() * width);
    const speed = 1 + Math.floor(rand() * 3);
    const drift = Math.sin(frame * 0.05 + i) * PIXEL_SIZE * 2;
    const startY = ((rand() * height + frame * speed) % (height + 20)) - 10;
    const drawX = Math.floor((startX + drift) / PIXEL_SIZE) * PIXEL_SIZE;
    const drawY = Math.floor(startY / PIXEL_SIZE) * PIXEL_SIZE;
    const color = colors[Math.floor(rand() * colors.length)];

    ctx.fillStyle = color;
    ctx.fillRect(drawX, drawY, PIXEL_SIZE, PIXEL_SIZE);
  }
}

function drawSunbeams(ctx: CanvasRenderingContext2D, width: number, height: number, frame: number) {
  const colors = ['#fbbf24', '#f59e0b'];
  const rayCount = 8;
  const originX = width - 40;
  const originY = 40;
  const baseAngle = -Math.PI * 0.75 + frame * 0.005;

  for (let i = 0; i < rayCount; i++) {
    const angle = baseAngle + (i / rayCount) * Math.PI * 0.8;
    const rayLength = Math.max(width, height) * 1.2;
    const endX = originX + Math.cos(angle) * rayLength;
    const endY = originY + Math.sin(angle) * rayLength;
    const color = colors[i % colors.length];

    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.15;
    ctx.lineWidth = PIXEL_SIZE * 3;
    ctx.beginPath();
    ctx.moveTo(
      Math.floor(originX / PIXEL_SIZE) * PIXEL_SIZE,
      Math.floor(originY / PIXEL_SIZE) * PIXEL_SIZE
    );
    ctx.lineTo(
      Math.floor(endX / PIXEL_SIZE) * PIXEL_SIZE,
      Math.floor(endY / PIXEL_SIZE) * PIXEL_SIZE
    );
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  ctx.fillStyle = '#fbbf24';
  ctx.globalAlpha = 0.3;
  ctx.beginPath();
  ctx.arc(
    Math.floor(originX / PIXEL_SIZE) * PIXEL_SIZE,
    Math.floor(originY / PIXEL_SIZE) * PIXEL_SIZE,
    PIXEL_SIZE * 6,
    0,
    Math.PI * 2
  );
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(
    Math.floor(originX / PIXEL_SIZE) * PIXEL_SIZE - PIXEL_SIZE * 2,
    Math.floor(originY / PIXEL_SIZE) * PIXEL_SIZE - PIXEL_SIZE * 2,
    PIXEL_SIZE * 4,
    PIXEL_SIZE * 4
  );
}

class SceneRenderer {
  renderScene(ctx: CanvasRenderingContext2D, sceneData: SceneData, frame: number): void {
    const seed = hashString(
      sceneData.terrain.join(',') + sceneData.buildings.join(',') + sceneData.weather + sceneData.timeOfDay
    );
    const rand = seededRandom(seed);

    const isNight = sceneData.timeOfDay === 'night';
    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    if (isNight) {
      gradient.addColorStop(0, '#0a0a1a');
      gradient.addColorStop(1, '#1a1a3e');
    } else {
      gradient.addColorStop(0, '#1a1a3e');
      gradient.addColorStop(1, '#2d1b69');
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const terrainY = CANVAS_HEIGHT - PIXEL_SIZE * 8;
    const terrainFunctions: Record<string, (ctx: CanvasRenderingContext2D, x: number, y: number, width: number) => void> = {
      grass: drawGrass,
      river: drawRiver,
      mountain: drawMountain,
    };

    for (const terrain of sceneData.terrain) {
      const fn = terrainFunctions[terrain];
      if (fn) {
        const tx = Math.floor(rand() * (CANVAS_WIDTH * 0.4));
        const tw = Math.floor(rand() * 200) + 200;
        fn(ctx, tx, terrainY, tw);
      }
    }

    const buildingY = CANVAS_HEIGHT - PIXEL_SIZE * 14;
    const buildingFunctions: Record<string, (ctx: CanvasRenderingContext2D, x: number, y: number) => void> = {
      hut: drawHut,
      castle: drawCastle,
      tower: drawTower,
    };

    for (const building of sceneData.buildings) {
      const fn = buildingFunctions[building];
      if (fn) {
        const bx = Math.floor(rand() * (CANVAS_WIDTH - 100)) + 50;
        fn(ctx, bx, buildingY);
      }
    }

    const weatherFunctions: Record<string, (ctx: CanvasRenderingContext2D, width: number, height: number, frame: number) => void> = {
      rain: drawRain,
      snow: drawSnow,
      sun: drawSunbeams,
    };

    const weatherFn = weatherFunctions[sceneData.weather];
    if (weatherFn) {
      weatherFn(ctx, CANVAS_WIDTH, CANVAS_HEIGHT, frame);
    }
  }
}

export { SceneRenderer };
export type { SceneData };
