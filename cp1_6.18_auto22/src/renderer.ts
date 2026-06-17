import type { GameState, Player, Enemy, Bullet, PowerUp, Particle } from './gameState';

export function render(ctx: CanvasRenderingContext2D, state: GameState): void {
  const { width, height } = state;

  ctx.save();
  ctx.imageSmoothingEnabled = false;

  drawBackground(ctx, state);
  drawStars(ctx, state);
  drawPowerUps(ctx, state);
  drawBullets(ctx, state);
  drawEnemies(ctx, state);
  drawPlayer(ctx, state);
  drawParticles(ctx, state);
  drawHUD(ctx, state);
  drawScanlines(ctx, width, height);

  if (state.isGameOver) {
    drawGameOverlay(ctx, state);
  }

  ctx.restore();
}

function drawBackground(ctx: CanvasRenderingContext2D, state: GameState): void {
  const { width, height } = state;
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#0a0020');
  gradient.addColorStop(0.5, '#1a0a35');
  gradient.addColorStop(1, '#0d0525');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const nebula = ctx.createRadialGradient(
    width * 0.3, height * 0.4, 0,
    width * 0.3, height * 0.4, width * 0.5
  );
  nebula.addColorStop(0, 'rgba(100, 30, 150, 0.15)');
  nebula.addColorStop(1, 'rgba(100, 30, 150, 0)');
  ctx.fillStyle = nebula;
  ctx.fillRect(0, 0, width, height);

  const nebula2 = ctx.createRadialGradient(
    width * 0.75, height * 0.6, 0,
    width * 0.75, height * 0.6, width * 0.4
  );
  nebula2.addColorStop(0, 'rgba(30, 60, 150, 0.12)');
  nebula2.addColorStop(1, 'rgba(30, 60, 150, 0)');
  ctx.fillStyle = nebula2;
  ctx.fillRect(0, 0, width, height);
}

function drawStars(ctx: CanvasRenderingContext2D, state: GameState): void {
  for (const s of state.stars) {
    const alpha = s.brightness;
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    const size = s.speed > 0.6 ? 2 : 1;
    ctx.fillRect(Math.floor(s.x), Math.floor(s.y), size, size);
  }
}

function drawPlayer(ctx: CanvasRenderingContext2D, state: GameState): void {
  const p = state.player;

  if (p.invincibleTime > 0 && Math.floor(p.invincibleTime * 10) % 2 === 0) {
    return;
  }

  drawEngineFlame(ctx, p);

  const px = Math.floor(p.x - p.width / 2);
  const py = Math.floor(p.y - p.height / 2);

  const shipPattern = [
    '....XX....',
    '...XXXX...',
    '..XXXXXX..',
    '.XXYYYYXX.',
    'XXYYYYYYXX',
    'XXYYYYYYXX',
    'X.CCCCCCC.X'.slice(0, 10),
    '..C....C..'
  ];

  const pixelSize = p.width / 10;
  const colors: Record<string, string> = {
    'X': '#3a5fcd',
    'Y': '#6699ff',
    'C': '#99ccff'
  };

  for (let row = 0; row < shipPattern.length; row++) {
    for (let col = 0; col < shipPattern[row].length; col++) {
      const ch = shipPattern[row][col];
      if (ch === '.') continue;
      ctx.fillStyle = colors[ch] || '#ffffff';
      ctx.fillRect(
        Math.floor(px + col * pixelSize),
        Math.floor(py + row * pixelSize),
        Math.ceil(pixelSize),
        Math.ceil(pixelSize)
      );
    }
  }

  ctx.fillStyle = '#ffcc33';
  ctx.fillRect(Math.floor(p.x - pixelSize), Math.floor(py + 2 * pixelSize), Math.ceil(pixelSize * 2), Math.ceil(pixelSize * 2));
}

function drawEngineFlame(ctx: CanvasRenderingContext2D, p: Player): void {
  const flameHeight = 6 + Math.sin(p.engineFlamePhase) * 3;
  const px = Math.floor(p.x);
  const py = Math.floor(p.y + p.height / 2);

  const gradient = ctx.createLinearGradient(px, py, px, py + flameHeight + 4);
  gradient.addColorStop(0, '#ffffff');
  gradient.addColorStop(0.3, '#ffff66');
  gradient.addColorStop(0.6, '#ff8800');
  gradient.addColorStop(1, 'rgba(255, 50, 0, 0)');

  ctx.fillStyle = gradient;

  const w1 = 4 + Math.sin(p.engineFlamePhase * 1.3) * 1;
  ctx.fillRect(px - w1, py, w1 * 2, flameHeight);

  const w2 = 2 + Math.cos(p.engineFlamePhase * 1.7) * 0.5;
  ctx.fillRect(px - w2 - 6, py + 2, w2 * 2, flameHeight * 0.7);
  ctx.fillRect(px + 6 - w2, py + 2, w2 * 2, flameHeight * 0.7);
}

function drawEnemies(ctx: CanvasRenderingContext2D, state: GameState): void {
  for (const e of state.enemies) {
    if (e.flashTime > 0 && e.type === 'ship') {
      ctx.globalAlpha = 0.5 + Math.sin(e.flashTime * 50) * 0.5;
    }

    if (e.type === 'meteor') {
      drawMeteor(ctx, e);
    } else {
      drawEnemyShip(ctx, e);
    }

    ctx.globalAlpha = 1;
  }
}

function drawMeteor(ctx: CanvasRenderingContext2D, e: Enemy): void {
  const size = e.width;
  const px = Math.floor(e.x - size / 2);
  const py = Math.floor(e.y - size / 2);
  const s = size / 8;

  const pattern = [
    '..XXXX..',
    '.XXXXXX.',
    'XXXXXXXX',
    'XXXXXXXX',
    'XXXXXXXX',
    'XXXXXXXX',
    '.XXXXXX.',
    '..XXXX..'
  ];

  const colors: Record<string, string> = {
    'X': '#8b4513'
  };

  for (let row = 0; row < pattern.length; row++) {
    for (let col = 0; col < pattern[row].length; col++) {
      const ch = pattern[row][col];
      if (ch === '.') continue;
      const shade = Math.random() > 0.7 ? '#a0522d' : '#6b3510';
      ctx.fillStyle = shade;
      ctx.fillRect(
        Math.floor(px + col * s),
        Math.floor(py + row * s),
        Math.ceil(s),
        Math.ceil(s)
      );
    }
  }

  ctx.fillStyle = '#654321';
  ctx.fillRect(px + s * 2, py + s * 3, s, s);
  ctx.fillRect(px + s * 5, py + s * 2, s, s);
  ctx.fillRect(px + s * 3, py + s * 5, s, s);
}

function drawEnemyShip(ctx: CanvasRenderingContext2D, e: Enemy): void {
  const px = Math.floor(e.x - e.width / 2);
  const py = Math.floor(e.y - e.height / 2);
  const s = e.width / 10;

  const pattern = [
    '..XXXXXX..',
    '.XXXXXXXX.',
    'XX..XX..XX',
    'XXXXXXXXXX',
    '.X.XXXX.X.',
    '..XXX.XXX.'
  ];

  const colors: Record<string, string> = {
    'X': e.flashTime > 0 ? '#ffffff' : '#cc3366'
  };

  for (let row = 0; row < pattern.length; row++) {
    for (let col = 0; col < pattern[row].length; col++) {
      const ch = pattern[row][col];
      if (ch === '.') continue;
      ctx.fillStyle = colors[ch] || '#cc3366';
      ctx.fillRect(
        Math.floor(px + col * s),
        Math.floor(py + row * s),
        Math.ceil(s),
        Math.ceil(s)
      );
    }
  }

  ctx.fillStyle = '#ff6699';
  ctx.fillRect(Math.floor(e.x - s), Math.floor(py + s), Math.ceil(s * 2), Math.ceil(s * 2));

  if (e.hp < e.maxHp) {
    const barWidth = e.width;
    const barHeight = 3;
    const barY = py - 6;
    ctx.fillStyle = '#330011';
    ctx.fillRect(px, barY, barWidth, barHeight);
    ctx.fillStyle = '#ff3366';
    ctx.fillRect(px, barY, barWidth * (e.hp / e.maxHp), barHeight);
  }
}

function drawBullets(ctx: CanvasRenderingContext2D, state: GameState): void {
  for (const b of state.bullets) {
    if (b.isEnemy) {
      ctx.fillStyle = '#ff3366';
      ctx.fillRect(
        Math.floor(b.x - b.width / 2),
        Math.floor(b.y - b.height / 2),
        b.width,
        b.height
      );
      ctx.fillStyle = '#ff99bb';
      ctx.fillRect(
        Math.floor(b.x - 1),
        Math.floor(b.y - b.height / 2 + 1),
        2,
        b.height - 2
      );
    } else {
      const gradient = ctx.createLinearGradient(b.x, b.y - b.height / 2, b.x, b.y + b.height / 2);
      gradient.addColorStop(0, '#ffffaa');
      gradient.addColorStop(0.5, '#ffcc33');
      gradient.addColorStop(1, '#ff8800');
      ctx.fillStyle = gradient;
      ctx.fillRect(
        Math.floor(b.x - b.width / 2),
        Math.floor(b.y - b.height / 2),
        b.width,
        b.height
      );
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(
        Math.floor(b.x - 1),
        Math.floor(b.y - b.height / 2),
        2,
        Math.floor(b.height / 2)
      );
    }
  }
}

function drawPowerUps(ctx: CanvasRenderingContext2D, state: GameState): void {
  const time = performance.now() / 1000;
  for (const p of state.powerUps) {
    const pulse = 1 + Math.sin(time * 4) * 0.15;
    const w = p.width * pulse;
    const h = p.height * pulse;

    ctx.shadowColor = '#3399ff';
    ctx.shadowBlur = 12;

    const px = Math.floor(p.x - w / 2);
    const py = Math.floor(p.y - h / 2);
    const s = w / 6;

    const pattern = [
      '..XX..',
      '.XXXX.',
      'XXXXXX',
      'XXXXXX',
      '.XXXX.',
      '..XX..'
    ];

    for (let row = 0; row < pattern.length; row++) {
      for (let col = 0; col < pattern[row].length; col++) {
        const ch = pattern[row][col];
        if (ch === '.') continue;
        const isCore = row >= 2 && row <= 3 && col >= 2 && col <= 3;
        ctx.fillStyle = isCore ? '#aaddff' : '#3399ff';
        ctx.fillRect(
          Math.floor(px + col * s),
          Math.floor(py + row * s),
          Math.ceil(s),
          Math.ceil(s)
        );
      }
    }

    ctx.shadowBlur = 0;
  }
}

function drawParticles(ctx: CanvasRenderingContext2D, state: GameState): void {
  for (const p of state.particles) {
    const alpha = p.life / p.maxLife;

    if (p.type === 'flash') {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (1 - alpha + 0.5), 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    } else if (p.type === 'smoke') {
      ctx.globalAlpha = alpha * 0.5;
      ctx.fillStyle = p.color;
      const size = p.size * (1 + (1 - alpha) * 0.5);
      ctx.fillRect(
        Math.floor(p.x - size / 2),
        Math.floor(p.y - size / 2),
        Math.floor(size),
        Math.floor(size)
      );
      ctx.globalAlpha = 1;
    } else {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.fillRect(
        Math.floor(p.x - p.size / 2),
        Math.floor(p.y - p.size / 2),
        p.size,
        p.size
      );
      ctx.globalAlpha = 1;
    }
  }
}

function drawHUD(ctx: CanvasRenderingContext2D, state: GameState): void {
  const padding = 12;

  ctx.fillStyle = '#ffcc33';
  ctx.font = 'bold 16px monospace, "Courier New"';
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.fillText(`得分: ${state.score}`, padding, padding);

  drawLives(ctx, state, padding, padding + 24);
  drawWeaponLevel(ctx, state, state.width - padding - 90, padding);
  drawHeatBar(ctx, state, padding, state.height - 20);
}

function drawLives(ctx: CanvasRenderingContext2D, state: GameState, x: number, y: number): void {
  const p = state.player;
  const heartSize = 14;
  const gap = 4;

  for (let i = 0; i < p.maxLives; i++) {
    const hx = x + i * (heartSize + gap);
    const filled = i < p.lives;
    drawHeart(ctx, hx, y, heartSize, filled);
  }
}

function drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, filled: boolean): void {
  const s = size / 5;
  const pattern = [
    '.X.X.',
    'XXXXX',
    'XXXXX',
    '.XXX.',
    '..X..'
  ];

  const color = filled ? '#ff3366' : '#442233';
  const highlight = filled ? '#ff88aa' : '#553344';

  for (let row = 0; row < pattern.length; row++) {
    for (let col = 0; col < pattern[row].length; col++) {
      const ch = pattern[row][col];
      if (ch === '.') continue;
      const isHL = row === 0 || col === 0;
      ctx.fillStyle = isHL && filled ? highlight : color;
      ctx.fillRect(
        Math.floor(x + col * s),
        Math.floor(y + row * s),
        Math.ceil(s),
        Math.ceil(s)
      );
    }
  }
}

function drawWeaponLevel(ctx: CanvasRenderingContext2D, state: GameState, x: number, y: number): void {
  const p = state.player;

  ctx.fillStyle = '#99ccff';
  ctx.font = 'bold 12px monospace, "Courier New"';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.fillText('武器等级', x + 80, y);

  const barWidth = 80;
  const barHeight = 10;
  const barY = y + 16;
  const startX = x;

  ctx.fillStyle = '#1a1a3a';
  ctx.fillRect(startX, barY, barWidth, barHeight);

  const levelProgress = (p.weaponLevel - 1) / 2;
  const fillW = barWidth * levelProgress;

  const gradient = ctx.createLinearGradient(startX, barY, startX + barWidth, barY);
  gradient.addColorStop(0, '#3399ff');
  gradient.addColorStop(0.5, '#66ccff');
  gradient.addColorStop(1, '#99ffff');
  ctx.fillStyle = gradient;
  ctx.fillRect(startX, barY, fillW, barHeight);

  for (let i = 1; i < 3; i++) {
    const segX = startX + (barWidth / 3) * i;
    ctx.fillStyle = '#2a2a5a';
    ctx.fillRect(segX - 1, barY, 2, barHeight);
  }

  ctx.strokeStyle = '#6699cc';
  ctx.lineWidth = 1;
  ctx.strokeRect(startX + 0.5, barY + 0.5, barWidth - 1, barHeight - 1);

  for (let i = 0; i < 3; i++) {
    const active = i < p.weaponLevel;
    const bx = startX + (barWidth / 6) * (i * 2 + 1) - 3;
    const by = barY + barHeight + 4;
    ctx.fillStyle = active ? '#ffcc33' : '#333355';
    ctx.fillRect(bx, by, 6, 3);
  }
}

function drawHeatBar(ctx: CanvasRenderingContext2D, state: GameState, x: number, y: number): void {
  const p = state.player;
  const barWidth = 120;
  const barHeight = 6;

  ctx.fillStyle = '#1a0a1a';
  ctx.fillRect(x, y, barWidth, barHeight);

  const ratio = p.heat / p.maxHeat;
  const gradient = ctx.createLinearGradient(x, y, x + barWidth, y);
  gradient.addColorStop(0, '#33ff66');
  gradient.addColorStop(0.5, '#ffcc33');
  gradient.addColorStop(1, p.isOverheated ? '#ff2244' : '#ff6633');
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, barWidth * ratio, barHeight);

  ctx.strokeStyle = '#664466';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, barWidth - 1, barHeight - 1);

  ctx.fillStyle = p.isOverheated ? '#ff3355' : '#998899';
  ctx.font = '10px monospace, "Courier New"';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(p.isOverheated ? '过热!' : '能量', x, y - 12);
}

function drawScanlines(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.06)';
  for (let y = 0; y < height; y += 3) {
    ctx.fillRect(0, y, width, 1);
  }

  const gradient = ctx.createRadialGradient(
    width / 2, height / 2, Math.min(width, height) * 0.3,
    width / 2, height / 2, Math.max(width, height) * 0.7
  );
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0.35)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

function drawGameOverlay(ctx: CanvasRenderingContext2D, state: GameState): void {
  const { width, height } = state;

  const flashAlpha = Math.min(0.6, state.gameOverTime * 2);
  const pulse = 0.3 + Math.sin(state.gameOverTime * 8) * 0.15;
  ctx.fillStyle = `rgba(255, 0, 50, ${flashAlpha * pulse})`;
  ctx.fillRect(0, 0, width, height);

  if (state.gameOverTime < 1.2) return;

  const panelW = Math.min(300, width * 0.8);
  const panelH = 200;
  const px = (width - panelW) / 2;
  const py = (height - panelH) / 2;

  ctx.fillStyle = 'rgba(15, 5, 35, 0.92)';
  ctx.fillRect(px, py, panelW, panelH);

  ctx.strokeStyle = '#ff3366';
  ctx.lineWidth = 2;
  ctx.strokeRect(px + 1, py + 1, panelW - 2, panelH - 2);

  ctx.fillStyle = '#ff3366';
  ctx.font = 'bold 28px monospace, "Courier New"';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('游戏结束', width / 2, py + 20);

  ctx.fillStyle = '#ffcc33';
  ctx.font = 'bold 18px monospace, "Courier New"';
  ctx.fillText(`最终得分: ${state.score}`, width / 2, py + 70);

  ctx.fillStyle = '#99ccff';
  ctx.font = '14px monospace, "Courier New"';
  ctx.fillText(`武器等级: ${state.player.weaponLevel}`, width / 2, py + 100);

  const btnW = 140;
  const btnH = 40;
  const btnX = (width - btnW) / 2;
  const btnY = py + 140;

  const btnGlow = 0.5 + Math.sin(state.gameOverTime * 3) * 0.3;
  ctx.shadowColor = '#ffcc33';
  ctx.shadowBlur = 10 * btnGlow;

  ctx.fillStyle = '#ffcc33';
  ctx.fillRect(btnX, btnY, btnW, btnH);

  ctx.shadowBlur = 0;

  ctx.fillStyle = '#1a0a35';
  ctx.font = 'bold 16px monospace, "Courier New"';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('重新开始', width / 2, btnY + btnH / 2);
}

export function isRestartButtonClicked(state: GameState, x: number, y: number): boolean {
  if (!state.isGameOver || state.gameOverTime < 1.2) return false;

  const { width, height } = state;
  const panelW = Math.min(300, width * 0.8);
  const panelH = 200;
  const py = (height - panelH) / 2;

  const btnW = 140;
  const btnH = 40;
  const btnX = (width - btnW) / 2;
  const btnY = py + 140;

  return x >= btnX && x <= btnX + btnW && y >= btnY && y <= btnY + btnH;
}
