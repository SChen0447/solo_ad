export type Strategy = 'lead' | 'follow' | 'sprint';

export interface HorseConfig {
  id: string;
  name: string;
  color: string;
  stamina: number;
  speed: number;
  strategy: Strategy;
  isAI: boolean;
}

export interface HorseState {
  id: string;
  name: string;
  color: string;
  strategy: Strategy;
  isAI: boolean;
  position: number;
  currentSpeed: number;
  currentStamina: number;
  maxStamina: number;
  maxSpeed: number;
  acceleration: number;
  finished: boolean;
  finishTime: number;
  lane: number;
}

export interface RaceState {
  horses: HorseState[];
  trackLength: number;
  elapsedTime: number;
  phase: 'waiting' | 'countdown' | 'racing' | 'finished';
  countdown: number;
  rankings: string[];
}

const TRACK_LENGTH = 1200;
const TICK_MS = 50;
const BASE_MAX_SPEED = 8;
const BASE_ACCELERATION = 0.15;
const STAMINA_DRAIN_BASE = 0.12;
const STAMINA_REGEN = 0.02;

const AI_NAMES = [
  '疾风', '雷电', '烈焰', '暴风',
  '流星', '旋风', '烈日', '寒冰',
];

const HORSE_COLORS = [
  '#e94560', '#6c63ff', '#00bcd4', '#4caf50',
  '#ff9800', '#e91e63', '#9c27b0', '#ffeb3b',
];

function createHorseState(config: HorseConfig, lane: number): HorseState {
  const staminaMultiplier = 0.5 + (config.stamina / 100) * 1.5;
  const speedMultiplier = 0.5 + (config.speed / 100) * 1.5;

  let accelBonus = 0;
  let speedBonus = 0;
  let staminaMod = 1.0;

  switch (config.strategy) {
    case 'lead':
      accelBonus = 0.06;
      speedBonus = 1.2;
      staminaMod = 1.4;
      break;
    case 'follow':
      accelBonus = 0.02;
      speedBonus = 1.0;
      staminaMod = 0.8;
      break;
    case 'sprint':
      accelBonus = -0.02;
      speedBonus = 0.85;
      staminaMod = 0.6;
      break;
  }

  return {
    id: config.id,
    name: config.name,
    color: config.color,
    strategy: config.strategy,
    isAI: config.isAI,
    position: 0,
    currentSpeed: 0,
    currentStamina: 100 * staminaMultiplier,
    maxStamina: 100 * staminaMultiplier,
    maxSpeed: BASE_MAX_SPEED * speedMultiplier * (0.9 + Math.random() * 0.2),
    acceleration: BASE_ACCELERATION + accelBonus + Math.random() * 0.02,
    finished: false,
    finishTime: 0,
    lane,
  };
}

export function createAIConfigs(count: number, startIndex: number): HorseConfig[] {
  const strategies: Strategy[] = ['lead', 'follow', 'sprint'];
  const configs: HorseConfig[] = [];
  for (let i = 0; i < count; i++) {
    const idx = startIndex + i;
    const strategy = strategies[idx % 3];
    const stamina = 30 + Math.floor(Math.random() * 60);
    const speed = Math.min(100, 150 - stamina - Math.floor(Math.random() * 20));
    configs.push({
      id: `ai-${idx}`,
      name: AI_NAMES[idx % AI_NAMES.length],
      color: HORSE_COLORS[idx % HORSE_COLORS.length],
      stamina,
      speed,
      strategy,
      isAI: true,
    });
  }
  return configs;
}

export class GameEngine {
  state: RaceState;
  private tickInterval: ReturnType<typeof setInterval> | null = null;
  private broadcastCallback: ((state: RaceState) => void) | null = null;
  private lastTickTime: number = 0;
  private accumulatedTime: number = 0;
  private countdownInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.state = {
      horses: [],
      trackLength: TRACK_LENGTH,
      elapsedTime: 0,
      phase: 'waiting',
      countdown: 3,
      rankings: [],
    };
  }

  onBroadcast(cb: (state: RaceState) => void) {
    this.broadcastCallback = cb;
  }

  addPlayer(config: HorseConfig): number {
    const lane = this.state.horses.length;
    const horse = createHorseState(config, lane);
    this.state.horses.push(horse);
    return lane;
  }

  fillWithAI() {
    const currentCount = this.state.horses.length;
    const needed = 8 - currentCount;
    if (needed <= 0) return;
    const aiConfigs = createAIConfigs(needed, currentCount);
    for (const cfg of aiConfigs) {
      this.addPlayer(cfg);
    }
  }

  startCountdown() {
    this.state.phase = 'countdown';
    this.state.countdown = 3;
    this.broadcast();

    this.countdownInterval = setInterval(() => {
      this.state.countdown--;
      if (this.state.countdown <= 0) {
        if (this.countdownInterval) clearInterval(this.countdownInterval);
        this.startRace();
      } else {
        this.broadcast();
      }
    }, 1000);
  }

  startRace() {
    this.state.phase = 'racing';
    this.state.elapsedTime = 0;
    this.lastTickTime = Date.now();
    this.accumulatedTime = 0;

    this.tickInterval = setInterval(() => {
      const now = Date.now();
      const delta = now - this.lastTickTime;
      this.lastTickTime = now;
      this.accumulatedTime += delta;

      const dt = delta / 1000;
      this.update(dt);
      this.state.elapsedTime += dt;

      if (this.state.phase === 'finished') {
        this.stop();
      }

      this.broadcast();
    }, TICK_MS);
  }

  private update(dt: number) {
    const positions = this.state.horses.map(h => h.position);
    const avgPosition = positions.reduce((a, b) => a + b, 0) / positions.length;
    const raceProgress = avgPosition / this.state.trackLength;

    for (const horse of this.state.horses) {
      if (horse.finished) continue;

      let targetSpeed: number;
      let staminaDrain: number;
      const staminaRatio = horse.currentStamina / horse.maxStamina;

      switch (horse.strategy) {
        case 'lead': {
          targetSpeed = horse.maxSpeed * (0.7 + 0.3 * staminaRatio);
          staminaDrain = STAMINA_DRAIN_BASE * 1.4 * (horse.currentSpeed / horse.maxSpeed);
          if (staminaRatio < 0.2) {
            targetSpeed *= 0.6;
          }
          break;
        }
        case 'follow': {
          const nearbyHorses = this.state.horses.filter(
            h => h.id !== horse.id && Math.abs(h.position - horse.position) < 50
          );
          const draftBonus = nearbyHorses.length > 0 ? 1.15 : 1.0;
          targetSpeed = horse.maxSpeed * draftBonus * (0.6 + 0.4 * staminaRatio);
          staminaDrain = STAMINA_DRAIN_BASE * 0.8 * (horse.currentSpeed / horse.maxSpeed);
          if (staminaRatio < 0.15) {
            targetSpeed *= 0.55;
          }
          break;
        }
        case 'sprint': {
          const sprintPhase = 0.7;
          if (raceProgress < sprintPhase) {
            targetSpeed = horse.maxSpeed * 0.65;
            staminaDrain = STAMINA_DRAIN_BASE * 0.5;
          } else {
            const sprintMultiplier = 1.6 + (1 - staminaRatio) * 0.3;
            targetSpeed = horse.maxSpeed * sprintMultiplier;
            staminaDrain = STAMINA_DRAIN_BASE * 2.0;
          }
          if (staminaRatio < 0.1) {
            targetSpeed *= 0.4;
          }
          break;
        }
      }

      const speedDiff = targetSpeed - horse.currentSpeed;
      const accel = speedDiff > 0 ? horse.acceleration : horse.acceleration * 2;
      horse.currentSpeed += Math.sign(speedDiff) * Math.min(Math.abs(speedDiff), accel * dt * 60);
      horse.currentSpeed = Math.max(0, horse.currentSpeed);

      horse.position += horse.currentSpeed * dt * 60;
      horse.currentStamina -= staminaDrain * dt * 60;
      horse.currentStamina = Math.max(0, horse.currentStamina);

      if (horse.currentStamina <= 0) {
        horse.currentSpeed *= 0.98;
      }

      if (horse.position >= this.state.trackLength) {
        horse.position = this.state.trackLength;
        horse.finished = true;
        horse.finishTime = this.state.elapsedTime;
        horse.currentSpeed = 0;
        this.state.rankings.push(horse.id);
      }
    }

    const allFinished = this.state.horses.every(h => h.finished);
    if (allFinished) {
      this.state.phase = 'finished';
    }
  }

  private broadcast() {
    if (this.broadcastCallback) {
      this.broadcastCallback(this.state);
    }
  }

  stop() {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }

  reset() {
    this.stop();
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
    this.state = {
      horses: [],
      trackLength: TRACK_LENGTH,
      elapsedTime: 0,
      phase: 'waiting',
      countdown: 3,
      rankings: [],
    };
  }

  getPlayerCount(): number {
    return this.state.horses.filter(h => !h.isAI).length;
  }

  isFull(): boolean {
    return this.state.horses.length >= 8;
  }
}
