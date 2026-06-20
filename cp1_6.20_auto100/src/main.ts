import { createEggState, drawEgg, updateEggParams, type EggState, EGG_LONG_AXIS, EGG_SHORT_AXIS } from './egg.js';
import {
  generateDragon,
  drawDragon,
  drawDragonSilhouette,
  feedDragon,
  spawnFood,
  drawFood,
  type Dragon,
  type FoodItem
} from './dragon.js';
import { spawnParticles, updateParticles, drawParticles } from './particles.js';

type Scene = 'egg' | 'pasture';

interface GameState {
  scene: Scene;
  egg: EggState;
  dragon: Dragon | null;
  progress: number;
  hatched: boolean;
  foods: FoodItem[];
  lastFoodSpawn: number;
  elapsed: number;
}

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

const tempSlider = document.getElementById('tempSlider') as HTMLInputElement;
const humSlider = document.getElementById('humSlider') as HTMLInputElement;
const tempVal = document.getElementById('tempVal') as HTMLElement;
const humVal = document.getElementById('humVal') as HTMLElement;
const progressFill = document.getElementById('progressFill') as HTMLElement;
const progressText = document.getElementById('progressText') as HTMLElement;
const switchBtn = document.getElementById('switchBtn') as HTMLButtonElement;
const resetBtn = document.getElementById('resetBtn') as HTMLButtonElement;
const sceneName = document.getElementById('sceneName') as HTMLElement;
const growthText = document.getElementById('growthText') as HTMLElement;
const eggSliders = document.getElementById('eggSliders') as HTMLElement;
const resultMask = document.getElementById('resultMask') as HTMLElement;
const resultPanel = document.getElementById('resultPanel') as HTMLElement;
const resultAttrs = document.getElementById('resultAttrs') as HTMLElement;
const silhouetteCanvas = document.getElementById('silhouetteCanvas') as HTMLCanvasElement;
const silCtx = silhouetteCanvas.getContext('2d')!;

let state: GameState = createInitialState();
let dpr = Math.max(1, window.devicePixelRatio || 1);
let canvasW = 0;
let canvasH = 0;

function createInitialState(): GameState {
  return {
    scene: 'egg',
    egg: createEggState(35, 60),
    dragon: null,
    progress: 0,
    hatched: false,
    foods: [],
    lastFoodSpawn: 0,
    elapsed: 0
  };
}

function resizeCanvas(): void {
  const rect = canvas.getBoundingClientRect();
  canvasW = rect.width;
  canvasH = rect.height;
  dpr = Math.max(1, window.devicePixelRatio || 1);
  canvas.width = Math.floor(canvasW * dpr);
  canvas.height = Math.floor(canvasH * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function bindUI(): void {
  tempSlider.addEventListener('input', () => {
    const v = parseFloat(tempSlider.value);
    state.egg.targetTemperature = v;
    tempVal.textContent = v.toFixed(1);
    const rect = tempSlider.getBoundingClientRect();
    spawnParticlesAtPercent(rect, tempSlider.min, tempSlider.max, v);
  });

  humSlider.addEventListener('input', () => {
    const v = parseInt(humSlider.value, 10);
    state.egg.targetHumidity = v;
    humVal.textContent = String(v);
    const rect = humSlider.getBoundingClientRect();
    spawnParticlesAtPercent(rect, humSlider.min, humSlider.max, v);
  });

  switchBtn.addEventListener('click', () => {
    if (state.scene === 'egg' && state.hatched) {
      state.scene = 'pasture';
      if (state.dragon) state.dragon.isFlying = false;
      eggSliders.style.display = 'none';
      switchBtn.textContent = '🥚 返回孵育室';
      sceneName.textContent = '小草原';
      spawnParticlesAtEl(switchBtn);
    } else if (state.scene === 'pasture') {
      state.scene = 'egg';
      eggSliders.style.display = 'flex';
      switchBtn.textContent = '🌿 前往喂养场景';
      sceneName.textContent = '孵育室';
      spawnParticlesAtEl(switchBtn);
    }
  });

  resetBtn.addEventListener('click', () => {
    state = createInitialState();
    tempSlider.value = '35';
    humSlider.value = '60';
    tempVal.textContent = '35.0';
    humVal.textContent = '60';
    eggSliders.style.display = 'flex';
    switchBtn.disabled = true;
    switchBtn.textContent = '🌿 前往喂养场景';
    sceneName.textContent = '孵育室';
    resultMask.classList.remove('show');
    updateProgressUI();
    updateGrowthUI();
    spawnParticlesAtEl(resetBtn);
  });

  canvas.addEventListener('click', onCanvasClick);
  canvas.addEventListener('touchstart', onCanvasTouch, { passive: false });

  resultMask.addEventListener('click', (e) => {
    if (e.target === resultMask) {
      resultMask.classList.remove('show');
    }
  });

  window.addEventListener('resize', resizeCanvas);
}

function onCanvasTouch(e: TouchEvent): void {
  e.preventDefault();
  if (e.touches.length > 0) {
    const t = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    handleCanvasTap(t.clientX - rect.left, t.clientY - rect.top);
  }
}

function onCanvasClick(e: MouseEvent): void {
  const rect = canvas.getBoundingClientRect();
  handleCanvasTap(e.clientX - rect.left, e.clientY - rect.top);
}

function handleCanvasTap(x: number, y: number): void {
  spawnParticles(x, y, 5 + Math.floor(Math.random() * 4));

  if (state.scene === 'pasture' && state.hatched && state.dragon) {
    let hitIdx = -1;
    for (let i = 0; i < state.foods.length; i++) {
      const f = state.foods[i];
      const dx = f.x - x;
      const dy = f.y - y;
      const r = f.type === 'fruit' ? 14 : 12;
      if (dx * dx + dy * dy <= r * r) {
        hitIdx = i;
        break;
      }
    }
    if (hitIdx >= 0) {
      const food = state.foods[hitIdx];
      state.foods.splice(hitIdx, 1);
      const result = feedDragon(state.dragon, food);
      spawnParticles(food.x, food.y, 8, {
        color: food.type === 'bug' ? '#e74c3c' : '#2ecc71'
      });
      if (result.evolved) {
        state.dragon.isFlying = true;
        const cx = canvasW / 2;
        const cy = canvasH / 2;
        for (let i = 0; i < 4; i++) {
          setTimeout(() => {
            spawnParticles(cx + (Math.random() - 0.5) * 100, cy + (Math.random() - 0.5) * 100, 10, {
              color: '#f4d03f'
            });
          }, i * 80);
        }
      }
      updateGrowthUI();
    }
  }
}

function spawnParticlesAtEl(el: HTMLElement): void {
  const rect = el.getBoundingClientRect();
  const canvasRect = canvas.getBoundingClientRect();
  const x = rect.left - canvasRect.left + rect.width / 2;
  const y = rect.top - canvasRect.top + rect.height / 2;
  spawnParticles(x, y, 6);
}

function spawnParticlesAtPercent(rect: DOMRect, minStr: string, maxStr: string, v: number): void {
  const min = parseFloat(minStr);
  const max = parseFloat(maxStr);
  const pct = clamp((v - min) / (max - min), 0, 1);
  const canvasRect = canvas.getBoundingClientRect();
  const trackLeft = rect.left + 12;
  const trackW = rect.width - 24;
  const x = trackLeft + pct * trackW - canvasRect.left;
  const y = rect.top + rect.height / 2 - canvasRect.top;
  spawnParticles(x, y, 5);
}

function updateProgressUI(): void {
  const p = Math.max(0, Math.min(100, state.progress));
  progressFill.style.width = p + '%';
  progressText.textContent = Math.floor(p) + '%';
}

function updateGrowthUI(): void {
  if (state.dragon) {
    growthText.textContent = `${state.dragon.growth.toFixed(1)} / ${state.dragon.maxGrowth}`;
  } else {
    growthText.textContent = '0 / 30';
  }
}

function hatchEgg(): void {
  state.hatched = true;
  state.dragon = generateDragon();
  switchBtn.disabled = false;
  updateGrowthUI();
  showResultPanel();
  const cx = canvasW / 2;
  const cy = canvasH / 2;
  for (let i = 0; i < 6; i++) {
    setTimeout(() => {
      spawnParticles(cx, cy, 10, {
        color: state.dragon!.skinColor
      });
    }, i * 100);
  }
}

function showResultPanel(): void {
  if (!state.dragon) return;
  silCtx.clearRect(0, 0, silhouetteCanvas.width, silhouetteCanvas.height);
  drawDragonSilhouette(silCtx, silhouetteCanvas.width, silhouetteCanvas.height, state.dragon);
  const d = state.dragon;
  resultAttrs.innerHTML = `
    <div class="attr-row"><span class="attr-name">🎨 肤色</span><span class="attr-val">${d.skinName}</span></div>
    <div class="attr-row"><span class="attr-name">🧠 性格</span><span class="attr-val">${d.personalityName}</span></div>
    <div class="attr-row" style="font-size:13px;color:#aaa;justify-content:flex-end;padding-top:0;background:transparent">
      ${d.personalityDesc}
    </div>
    <div class="attr-row">
      <span class="attr-name">💪 力量</span>
      <div class="stat-bar"><div class="stat-fill" style="width:${(d.strength / 30) * 100}%"></div></div>
      <span class="attr-val">${d.strength}</span>
    </div>
    <div class="attr-row">
      <span class="attr-name">⚡ 敏捷</span>
      <div class="stat-bar"><div class="stat-fill" style="width:${(d.agility / 30) * 100}%"></div></div>
      <span class="attr-val">${d.agility}</span>
    </div>
    <div class="attr-row">
      <span class="attr-name">📚 智力</span>
      <div class="stat-bar"><div class="stat-fill" style="width:${(d.intelligence / 30) * 100}%"></div></div>
      <span class="attr-val">${d.intelligence}</span>
    </div>
  `;
  resultMask.classList.add('show');
}

let lastTime = performance.now();

function loop(now: number): void {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  state.elapsed += dt;

  update(dt, now);
  render(now);

  requestAnimationFrame(loop);
}

function update(dt: number, now: number): void {
  updateEggParams(state.egg, dt);
  updateParticles(dt);

  if (!state.hatched && state.scene === 'egg') {
    const temp = state.egg.temperature;
    const hum = state.egg.humidity;
    const tempOptimal = 35;
    const humOptimal = 60;
    const tempScore = 1 - clamp(Math.abs(temp - tempOptimal) / 5, 0, 1);
    const humScore = 1 - clamp(Math.abs(hum - humOptimal) / 20, 0, 1);
    const rate = (0.3 + 0.7 * (tempScore * 0.6 + humScore * 0.4)) * 1.8;
    state.progress += rate * dt;
    if (state.progress >= 100) {
      state.progress = 100;
      updateProgressUI();
      hatchEgg();
    } else {
      updateProgressUI();
    }
  }

  if (state.scene === 'pasture' && state.dragon) {
    if (now - state.lastFoodSpawn > 2000 && state.foods.length < 5) {
      state.foods.push(spawnFood(canvasW, canvasH, 50));
      state.lastFoodSpawn = now;
    }
    for (let i = state.foods.length - 1; i >= 0; i--) {
      if (now - state.foods[i].born > 6000) {
        state.foods.splice(i, 1);
      }
    }
  }
}

function render(now: number): void {
  ctx.clearRect(0, 0, canvasW, canvasH);
  const t = now / 1000;

  if (state.scene === 'egg') {
    drawEggScene(t);
  } else {
    drawPastureScene(t);
  }

  drawParticles(ctx);
}

function drawEggScene(t: number): void {
  const grad = ctx.createLinearGradient(0, 0, 0, canvasH);
  grad.addColorStop(0, '#1a1a2e');
  grad.addColorStop(1, '#16213e');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvasW, canvasH);

  // 魔法光环
  const cx = canvasW / 2;
  const cy = canvasH / 2;
  const glowSize = Math.max(EGG_LONG_AXIS, EGG_SHORT_AXIS) * 1.6;
  const pulse = 0.7 + 0.3 * Math.sin(t * 1.2);
  const eggColor = state.egg.displayColor;
  const glowColor = `rgba(${Math.round(eggColor[0])}, ${Math.round(eggColor[1])}, ${Math.round(eggColor[2])}, 0.15)`;
  const ring = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowSize);
  ring.addColorStop(0, glowColor);
  ring.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = pulse;
  ctx.fillStyle = ring;
  ctx.fillRect(0, 0, canvasW, canvasH);
  ctx.globalAlpha = 1;

  // 背景星点
  ctx.fillStyle = 'rgba(240, 230, 211, 0.4)';
  for (let i = 0; i < 30; i++) {
    const sx = (i * 97) % canvasW;
    const sy = (i * 53) % canvasH;
    const s = 1 + ((i * 7) % 2);
    const twinkle = 0.3 + 0.7 * Math.abs(Math.sin(t * 2 + i));
    ctx.globalAlpha = twinkle * 0.5;
    ctx.fillRect(sx, sy, s, s);
  }
  ctx.globalAlpha = 1;

  drawEgg(ctx, cx, cy, state.egg, t);
}

function drawPastureScene(t: number): void {
  // 天空
  const skyGrad = ctx.createLinearGradient(0, 0, 0, canvasH);
  skyGrad.addColorStop(0, '#6ab7ff');
  skyGrad.addColorStop(0.6, '#b8e1ff');
  skyGrad.addColorStop(1, '#8ed26f');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, canvasW, canvasH);

  // 草地
  const groundY = canvasH * 0.68;
  const grassGrad = ctx.createLinearGradient(0, groundY, 0, canvasH);
  grassGrad.addColorStop(0, '#6abe30');
  grassGrad.addColorStop(1, '#3d8b20');
  ctx.fillStyle = grassGrad;
  ctx.fillRect(0, groundY, canvasW, canvasH - groundY);

  // 草地纹理
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  for (let i = 0; i < 40; i++) {
    const gx = (i * 73 + 10) % canvasW;
    const gy = groundY + 10 + ((i * 37) % Math.floor(canvasH - groundY - 20));
    ctx.fillRect(gx, gy, 2, 4);
  }

  // 远山
  ctx.fillStyle = 'rgba(100, 160, 100, 0.45)';
  ctx.beginPath();
  ctx.moveTo(0, groundY);
  ctx.lineTo(canvasW * 0.15, groundY - 50);
  ctx.lineTo(canvasW * 0.3, groundY - 20);
  ctx.lineTo(canvasW * 0.5, groundY - 70);
  ctx.lineTo(canvasW * 0.7, groundY - 30);
  ctx.lineTo(canvasW * 0.88, groundY - 55);
  ctx.lineTo(canvasW, groundY - 10);
  ctx.lineTo(canvasW, groundY);
  ctx.closePath();
  ctx.fill();

  // 小花
  const flowerColors = ['#f4d03f', '#e74c3c', '#ffffff', '#9b59b6'];
  for (let i = 0; i < 12; i++) {
    const fx = (i * 89 + 30) % canvasW;
    const fy = groundY + 20 + ((i * 47) % (canvasH - groundY - 30));
    const fc = flowerColors[i % flowerColors.length];
    ctx.fillStyle = fc;
    for (let p = 0; p < 5; p++) {
      const ang = (p / 5) * Math.PI * 2;
      const px = fx + Math.cos(ang) * 3;
      const py = fy + Math.sin(ang) * 3;
      ctx.beginPath();
      ctx.arc(px, py, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#f39c12';
    ctx.beginPath();
    ctx.arc(fx, fy, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // 云
  drawCloud(t * 8, canvasH * 0.12, 0.9);
  drawCloud(canvasW * 0.4 + t * 5, canvasH * 0.2, 1.1);
  drawCloud(canvasW * 0.75 + t * 10, canvasH * 0.08, 0.7);

  // 食物
  for (const food of state.foods) {
    drawFood(ctx, food, t);
  }

  // 龙
  if (state.dragon) {
    const dragonCy = state.dragon.isFlying ? canvasH * 0.45 : groundY - 50;
    drawDragon(ctx, canvasW / 2, dragonCy, state.dragon, t);
  }
}

function drawCloud(baseX: number, y: number, scale: number): void {
  const x = ((baseX % (canvasW + 200)) - 100 + canvasW + 200) % (canvasW + 200) - 100;
  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  const s = scale;
  ctx.beginPath();
  ctx.arc(x, y, 18 * s, 0, Math.PI * 2);
  ctx.arc(x + 20 * s, y - 8 * s, 22 * s, 0, Math.PI * 2);
  ctx.arc(x + 45 * s, y, 18 * s, 0, Math.PI * 2);
  ctx.arc(x + 25 * s, y + 6 * s, 16 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function clamp(v: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, v));
}

function init(): void {
  resizeCanvas();
  bindUI();
  updateProgressUI();
  updateGrowthUI();
  requestAnimationFrame((now) => {
    lastTime = now;
    loop(now);
  });
}

init();
