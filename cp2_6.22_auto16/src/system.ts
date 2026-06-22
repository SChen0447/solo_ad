import {
  Weapon,
  WeaponType,
  ProjectileData,
  EnergyGun,
  MissileLauncher,
  Shotgun,
  EffectType
} from './weapons';

export interface EnemyData {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  color: string;
  flashTime: number;
  alive: boolean;
}

export interface ParticleData {
  id: number;
  effectType: EffectType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  maxSize: number;
  color: string;
  colorEnd: string;
  life: number;
  maxLife: number;
  angle: number;
  rotationSpeed: number;
}

export interface ShardData {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
  angle: number;
  rotationSpeed: number;
}

export interface WeaponAnimState {
  type: WeaponType;
  scale: number;
  targetScale: number;
  animTime: number;
  animDuration: number;
  isHovered: boolean;
}

export interface HitEffectData {
  id: number;
  x: number;
  y: number;
  weaponType: WeaponType;
  life: number;
  maxLife: number;
  timestamp: number;
}

export interface MuzzleFlashData {
  id: number;
  x: number;
  y: number;
  weaponType: WeaponType;
  life: number;
  maxLife: number;
  angle: number;
}

let hitEffectIdCounter = 0;
let muzzleFlashIdCounter = 0;
function nextHitEffectId(): number { return ++hitEffectIdCounter; }
function nextMuzzleFlashId(): number { return ++muzzleFlashIdCounter; }

export interface SystemState {
  projectiles: ProjectileData[];
  enemies: EnemyData[];
  particles: ParticleData[];
  shards: ShardData[];
  hitEffects: HitEffectData[];
  muzzleFlashes: MuzzleFlashData[];
  currentWeapon: WeaponType;
  weapons: Record<WeaponType, Weapon>;
  weaponAnims: Record<WeaponType, WeaponAnimState>;
  mechX: number;
  mechY: number;
  turretAngle: number;
  mouseX: number;
  mouseY: number;
  enemySpawnTimer: number;
  enemySpawnInterval: number;
  maxProjectiles: number;
  maxEnemies: number;
  canvasWidth: number;
  canvasHeight: number;
}

let enemyIdCounter = 0;
let particleIdCounter = 0;
let shardIdCounter = 0;

function nextEnemyId(): number { return ++enemyIdCounter; }
function nextParticleId(): number { return ++particleIdCounter; }
function nextShardId(): number { return ++shardIdCounter; }

function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function randomGreenColor(): string {
  const r = Math.floor(Math.random() * 51);
  const g = Math.floor(200 + Math.random() * 55);
  const b = Math.floor(Math.random() * 51);
  return `rgb(${r},${g},${b})`;
}

export function createSystemState(canvasWidth: number, canvasHeight: number): SystemState {
  const mechX = canvasWidth / 2;
  const mechY = canvasHeight - 60;

  const weapons: Record<WeaponType, Weapon> = {
    energy: new EnergyGun(),
    missile: new MissileLauncher(),
    shotgun: new Shotgun()
  };

  const weaponAnims: Record<WeaponType, WeaponAnimState> = {
    energy:  { type: 'energy',  scale: 1.15, targetScale: 1.15, animTime: 0, animDuration: 0.2, isHovered: false },
    missile: { type: 'missile', scale: 1.0,  targetScale: 1.0,  animTime: 0, animDuration: 0.2, isHovered: false },
    shotgun: { type: 'shotgun', scale: 1.0,  targetScale: 1.0,  animTime: 0, animDuration: 0.2, isHovered: false }
  };

  return {
    projectiles: [],
    enemies: [],
    particles: [],
    shards: [],
    hitEffects: [],
    muzzleFlashes: [],
    currentWeapon: 'energy',
    weapons,
    weaponAnims,
    mechX,
    mechY,
    turretAngle: -Math.PI / 2,
    mouseX: canvasWidth / 2,
    mouseY: canvasHeight / 2,
    enemySpawnTimer: 0,
    enemySpawnInterval: 2,
    maxProjectiles: 50,
    maxEnemies: 20,
    canvasWidth,
    canvasHeight
  };
}

export function getMuzzlePosition(state: SystemState): { x: number; y: number } {
  const barrelLen = 35;
  return {
    x: state.mechX + Math.cos(state.turretAngle) * barrelLen,
    y: state.mechY + Math.sin(state.turretAngle) * barrelLen
  };
}

export function fireWeapon(state: SystemState): boolean {
  const weapon = state.weapons[state.currentWeapon];
  if (!weapon.canFire()) return false;

  const muzzle = getMuzzlePosition(state);
  const newProjectiles = weapon.fire(muzzle.x, muzzle.y, state.mouseX, state.mouseY);

  if (newProjectiles.length > 0) {
    state.muzzleFlashes.push({
      id: nextMuzzleFlashId(),
      x: muzzle.x,
      y: muzzle.y,
      weaponType: state.currentWeapon,
      life: 0.1,
      maxLife: 0.1,
      angle: state.turretAngle
    });
  }

  for (const proj of newProjectiles) {
    state.projectiles.push(proj);
    if (state.projectiles.length > state.maxProjectiles) {
      state.projectiles.shift();
    }
  }

  return true;
}

export function switchWeapon(state: SystemState, type: WeaponType): void {
  if (state.currentWeapon === type) return;

  state.weaponAnims[state.currentWeapon].targetScale = 1.0;
  state.weaponAnims[state.currentWeapon].animTime = 0;

  state.currentWeapon = type;
  state.weapons[type].startSwitch();

  const anim = state.weaponAnims[type];
  anim.targetScale = 1.15;
  anim.animTime = 0;
}

export function setWeaponHover(state: SystemState, type: WeaponType, hovered: boolean): void {
  state.weaponAnims[type].isHovered = hovered;
}

export function updateTurretAngle(state: SystemState): void {
  const dx = state.mouseX - state.mechX;
  const dy = state.mouseY - state.mechY;
  state.turretAngle = Math.atan2(dy, dx);
}

function spawnEnemy(state: SystemState): void {
  if (state.enemies.length >= state.maxEnemies) return;

  const enemy: EnemyData = {
    id: nextEnemyId(),
    x: state.canvasWidth + 20,
    y: 40 + Math.random() * (state.canvasHeight - 180),
    width: 40,
    height: 60,
    vx: -(60 + Math.random() * 60),
    vy: 0,
    hp: 30 + Math.floor(Math.random() * 50),
    maxHp: 0,
    color: randomGreenColor(),
    flashTime: 0,
    alive: true
  };
  enemy.maxHp = enemy.hp;
  state.enemies.push(enemy);
}

function createExplosion(state: SystemState, x: number, y: number, radius: number = 30): void {
  const count = 20 + Math.floor(Math.random() * 10);
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const speed = 50 + Math.random() * 200;
    const size = 5 + Math.random() * 10;
    state.particles.push({
      id: nextParticleId(),
      effectType: 'explosion',
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size,
      maxSize: radius,
      color: '#FF6600',
      colorEnd: '#FF3300',
      life: 0.8,
      maxLife: 0.8,
      angle,
      rotationSpeed: 0
    });
  }
}

function createShards(state: SystemState, enemy: EnemyData): void {
  const cx = enemy.x + enemy.width / 2;
  const cy = enemy.y + enemy.height / 2;
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI * 2 * i) / 8 + Math.random() * 0.3;
    const speed = 100 + Math.random() * 200;
    state.shards.push({
      id: nextShardId(),
      x: cx,
      y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 8 + Math.random() * 8,
      color: enemy.color,
      life: 0.5,
      maxLife: 0.5,
      angle: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 10
    });
  }
}

function detectCollision(proj: ProjectileData, enemy: EnemyData): boolean {
  const ex = enemy.x + enemy.width / 2;
  const ey = enemy.y + enemy.height / 2;
  const dist = Math.hypot(proj.x - ex, proj.y - ey);
  return dist < 25;
}

function updateMissileTrajectory(proj: ProjectileData, dt: number): void {
  const progress = proj.traveled / proj.maxDistance;
  if (progress > 1) return;
  const curveHeight = 80 * Math.sin(Math.PI * progress);
  const perpX = -Math.sin(proj.angle);
  const perpY = Math.cos(proj.angle);
  proj.x += perpX * curveHeight * dt * 2;
  proj.y += perpY * curveHeight * dt * 2;
}

export function update(state: SystemState, dt: number): void {
  updateTurretAngle(state);

  for (const weapon of Object.values(state.weapons)) {
    weapon.update(dt);
  }

  for (const anim of Object.values(state.weaponAnims)) {
    if (anim.animTime < anim.animDuration) {
      anim.animTime += dt;
      const t = Math.min(anim.animTime / anim.animDuration, 1);
      const baseScale = 1.0;
      const selectedScale = 1.15;
      const hoverScale = anim.isHovered ? 1.05 : 1.0;
      const target = anim.targetScale === selectedScale ? selectedScale : hoverScale;
      anim.scale = baseScale + (target - baseScale) * easeOut(t);
    } else {
      const selectedScale = 1.15;
      const hoverScale = anim.isHovered ? 1.05 : 1.0;
      const target = anim.targetScale === selectedScale ? selectedScale : hoverScale;
      anim.scale += (target - anim.scale) * Math.min(dt * 10, 1);
    }
  }

  state.enemySpawnTimer += dt;
  if (state.enemySpawnTimer >= state.enemySpawnInterval) {
    state.enemySpawnTimer = 0;
    const batch = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < batch; i++) {
      spawnEnemy(state);
    }
  }

  for (let i = state.projectiles.length - 1; i >= 0; i--) {
    const proj = state.projectiles[i];
    const moveX = proj.vx * dt;
    const moveY = proj.vy * dt;
    proj.x += moveX;
    proj.y += moveY;
    proj.traveled += Math.hypot(moveX, moveY);
    proj.life -= dt;

    if (proj.effectType === 'missile') {
      updateMissileTrajectory(proj, dt);
    }

    let hit = false;
    for (const enemy of state.enemies) {
      if (!enemy.alive) continue;
      if (detectCollision(proj, enemy)) {
        enemy.hp -= proj.damage;
        enemy.flashTime = 0.2;
        hit = true;

        state.hitEffects.push({
          id: nextHitEffectId(),
          x: proj.x,
          y: proj.y,
          weaponType: proj.type,
          life: 0.3,
          maxLife: 0.3,
          timestamp: performance.now()
        });

        if (proj.effectType === 'missile') {
          createExplosion(state, proj.x, proj.y, 30);
        }

        if (enemy.hp <= 0) {
          enemy.alive = false;
          createShards(state, enemy);
        }
        break;
      }
    }

    let remove = hit;
    if (!remove) {
      if (proj.effectType === 'pellet') {
        if (proj.traveled >= proj.maxDistance) remove = true;
      }
      if (proj.life <= 0) remove = true;
      if (proj.x < -50 || proj.x > state.canvasWidth + 50 ||
          proj.y < -50 || proj.y > state.canvasHeight + 50) {
        remove = true;
        if (proj.effectType === 'missile') {
          createExplosion(state, proj.x, proj.y, 30);
        }
      }
    }

    if (remove) {
      state.projectiles.splice(i, 1);
    }
  }

  for (let i = state.enemies.length - 1; i >= 0; i--) {
    const enemy = state.enemies[i];
    if (!enemy.alive) {
      state.enemies.splice(i, 1);
      continue;
    }
    enemy.x += enemy.vx * dt;
    enemy.y += enemy.vy * dt;
    if (enemy.flashTime > 0) enemy.flashTime -= dt;
    if (enemy.x < -enemy.width - 10) {
      state.enemies.splice(i, 1);
    }
  }

  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.96;
    p.vy *= 0.96;
    p.life -= dt;
    if (p.life <= 0) state.particles.splice(i, 1);
  }

  for (let i = state.shards.length - 1; i >= 0; i--) {
    const s = state.shards[i];
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.vy += 400 * dt;
    s.angle += s.rotationSpeed * dt;
    s.life -= dt;
    if (s.life <= 0) state.shards.splice(i, 1);
  }

  for (let i = state.hitEffects.length - 1; i >= 0; i--) {
    state.hitEffects[i].life -= dt;
    if (state.hitEffects[i].life <= 0) state.hitEffects.splice(i, 1);
  }

  for (let i = state.muzzleFlashes.length - 1; i >= 0; i--) {
    state.muzzleFlashes[i].life -= dt;
    if (state.muzzleFlashes[i].life <= 0) state.muzzleFlashes.splice(i, 1);
  }
}

export function getRenderState(state: SystemState) {
  return {
    projectiles: state.projectiles,
    enemies: state.enemies,
    particles: state.particles,
    shards: state.shards,
    hitEffects: state.hitEffects,
    muzzleFlashes: state.muzzleFlashes,
    currentWeapon: state.currentWeapon,
    weapons: state.weapons,
    weaponAnims: state.weaponAnims,
    mechX: state.mechX,
    mechY: state.mechY,
    turretAngle: state.turretAngle,
    mouseX: state.mouseX,
    mouseY: state.mouseY,
    canvasWidth: state.canvasWidth,
    canvasHeight: state.canvasHeight
  };
}
