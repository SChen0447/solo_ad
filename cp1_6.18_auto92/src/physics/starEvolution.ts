export type EvolutionStage = 'mainSequence' | 'redGiant' | 'whiteDwarf' | 'supernova';

export interface StarPhysicsState {
  radius: number;
  temperature: number;
  color: { r: number; g: number; b: number };
  particleIntensity: number;
  particleSpeed: number;
  particleColor: { r: number; g: number; b: number };
  stage: EvolutionStage;
  stageProgress: number;
}

export interface StageInfo {
  name: string;
  nameCN: string;
  description: string;
  icon: string;
}

export const STAGE_INFO: Record<EvolutionStage, StageInfo> = {
  mainSequence: {
    name: 'Main Sequence',
    nameCN: '主序星',
    description: '恒星生命中最稳定的阶段，核心进行氢核聚变反应，辐射压力与引力平衡。',
    icon: '☀️'
  },
  redGiant: {
    name: 'Red Giant',
    nameCN: '红巨星',
    description: '核心氢燃料耗尽，恒星外层膨胀冷却，呈现红色。核心收缩并开始氦聚变。',
    icon: '🔴'
  },
  whiteDwarf: {
    name: 'White Dwarf',
    nameCN: '白矮星',
    description: '低质量恒星的最终归宿，核心聚变停止，由电子简并压力支撑，逐渐冷却变暗。',
    icon: '⚪'
  },
  supernova: {
    name: 'Supernova',
    nameCN: '超新星',
    description: '大质量恒星死亡时的剧烈爆炸，核心坍缩引发外层物质高速抛射，亮度可达整个星系。',
    icon: '💥'
  }
};

const SOLAR_RADIUS = 1.0;
const SOLAR_TEMPERATURE = 5778;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function tempToRGB(temperature: number): { r: number; g: number; b: number } {
  const t = temperature / 100;
  let r: number, g: number, b: number;

  if (t <= 66) {
    r = 255;
    g = clamp(99.4708025861 * Math.log(t) - 161.1195681661, 0, 255);
  } else {
    r = clamp(329.698727446 * Math.pow(t - 60, -0.1332047592), 0, 255);
    g = clamp(288.1221695283 * Math.pow(t - 60, -0.0755148492), 0, 255);
  }

  if (t >= 66) {
    b = 255;
  } else if (t <= 19) {
    b = 0;
  } else {
    b = clamp(138.5177312231 * Math.log(t - 10) - 305.0447927307, 0, 255);
  }

  return { r: r / 255, g: g / 255, b: b / 255 };
}

function getMainSequenceRadius(mass: number): number {
  return Math.pow(mass, 0.8) * SOLAR_RADIUS;
}

function getMainSequenceTemperature(mass: number): number {
  return Math.pow(mass, 0.5) * SOLAR_TEMPERATURE;
}

function getRedGiantRadius(mass: number): number {
  return Math.pow(mass, 0.5) * SOLAR_RADIUS * 15;
}

function getRedGiantTemperature(mass: number): number {
  return 3000 + mass * 200;
}

function getWhiteDwarfRadius(mass: number): number {
  return SOLAR_RADIUS * 0.01 * Math.pow(mass, -0.33);
}

function getWhiteDwarfTemperature(mass: number): number {
  return 10000 + mass * 2000;
}

function getSupernovaRadius(mass: number, progress: number): number {
  const baseRadius = getRedGiantRadius(mass);
  const explosionRadius = baseRadius * (1 + progress * 8);
  return explosionRadius;
}

function getSupernovaTemperature(mass: number, progress: number): number {
  const peakTemp = 100000 + mass * 5000;
  const coolTemp = 5000;
  return lerp(peakTemp, coolTemp, progress);
}

function getParticleIntensity(stage: EvolutionStage, mass: number, stageProgress: number): number {
  switch (stage) {
    case 'mainSequence':
      return 0.3 + mass * 0.1;
    case 'redGiant':
      return 0.8 + mass * 0.15;
    case 'whiteDwarf':
      return 0.15;
    case 'supernova':
      return 2.0 * (1 - Math.abs(stageProgress - 0.3) * 1.5);
    default:
      return 0.5;
  }
}

function getParticleSpeed(stage: EvolutionStage, mass: number, stageProgress: number): number {
  switch (stage) {
    case 'mainSequence':
      return 0.5 + mass * 0.2;
    case 'redGiant':
      return 0.3 + mass * 0.1;
    case 'whiteDwarf':
      return 0.2;
    case 'supernova':
      return 2.0 + stageProgress * 3.0;
    default:
      return 0.5;
  }
}

function getParticleColor(stage: EvolutionStage, temp: number, stageProgress: number): { r: number; g: number; b: number } {
  switch (stage) {
    case 'mainSequence': {
      const starColor = tempToRGB(temp);
      return {
        r: starColor.r * 0.8,
        g: starColor.g * 0.8,
        b: starColor.b * 1.2
      };
    }
    case 'redGiant':
      return { r: 1.0, g: 0.6, b: 0.2 };
    case 'whiteDwarf':
      return { r: 0.7, g: 0.8, b: 1.0 };
    case 'supernova': {
      const coolProgress = stageProgress;
      return {
        r: lerp(1.0, 0.5, coolProgress),
        g: lerp(0.95, 0.5, coolProgress),
        b: lerp(0.8, 0.8, coolProgress)
      };
    }
    default:
      return { r: 1, g: 1, b: 1 };
  }
}

export function calculateStarState(
  mass: number,
  stage: EvolutionStage,
  stageProgress: number = 0
): StarPhysicsState {
  const clampedMass = clamp(mass, 0.5, 50);
  const clampedProgress = clamp(stageProgress, 0, 1);

  let radius: number;
  let temperature: number;

  switch (stage) {
    case 'mainSequence':
      radius = getMainSequenceRadius(clampedMass);
      temperature = getMainSequenceTemperature(clampedMass);
      break;
    case 'redGiant':
      radius = getRedGiantRadius(clampedMass);
      temperature = getRedGiantTemperature(clampedMass);
      break;
    case 'whiteDwarf':
      radius = getWhiteDwarfRadius(clampedMass);
      temperature = getWhiteDwarfTemperature(clampedMass);
      break;
    case 'supernova':
      radius = getSupernovaRadius(clampedMass, clampedProgress);
      temperature = getSupernovaTemperature(clampedMass, clampedProgress);
      break;
    default:
      radius = getMainSequenceRadius(clampedMass);
      temperature = getMainSequenceTemperature(clampedMass);
  }

  const color = tempToRGB(temperature);
  const particleIntensity = getParticleIntensity(stage, clampedMass, clampedProgress);
  const particleSpeed = getParticleSpeed(stage, clampedMass, clampedProgress);
  const particleColor = getParticleColor(stage, temperature, clampedProgress);

  return {
    radius,
    temperature,
    color,
    particleIntensity,
    particleSpeed,
    particleColor,
    stage,
    stageProgress: clampedProgress
  };
}

export function interpolateStages(
  mass: number,
  fromStage: EvolutionStage,
  toStage: EvolutionStage,
  t: number
): StarPhysicsState {
  const fromState = calculateStarState(mass, fromStage, 0);
  const toState = calculateStarState(mass, toStage, 0);
  const clampedT = clamp(t, 0, 1);
  const smoothT = clampedT < 0.5
    ? 2 * clampedT * clampedT
    : 1 - Math.pow(-2 * clampedT + 2, 2) / 2;

  return {
    radius: lerp(fromState.radius, toState.radius, smoothT),
    temperature: lerp(fromState.temperature, toState.temperature, smoothT),
    color: {
      r: lerp(fromState.color.r, toState.color.r, smoothT),
      g: lerp(fromState.color.g, toState.color.g, smoothT),
      b: lerp(fromState.color.b, toState.color.b, smoothT)
    },
    particleIntensity: lerp(fromState.particleIntensity, toState.particleIntensity, smoothT),
    particleSpeed: lerp(fromState.particleSpeed, toState.particleSpeed, smoothT),
    particleColor: {
      r: lerp(fromState.particleColor.r, toState.particleColor.r, smoothT),
      g: lerp(fromState.particleColor.g, toState.particleColor.g, smoothT),
      b: lerp(fromState.particleColor.b, toState.particleColor.b, smoothT)
    },
    stage: smoothT < 0.5 ? fromStage : toStage,
    stageProgress: smoothT
  };
}

export function getTotalLifetime(mass: number): number {
  return Math.pow(mass, -2.5) * 10;
}

export function getStageDuration(mass: number, stage: EvolutionStage): number {
  const total = getTotalLifetime(mass);
  switch (stage) {
    case 'mainSequence':
      return total * 0.8;
    case 'redGiant':
      return total * 0.15;
    case 'whiteDwarf':
      return total * 0.05;
    case 'supernova':
      return total * 0.001;
    default:
      return total * 0.8;
  }
}

export function getEvolutionTimeline(mass: number): Array<{ stage: EvolutionStage; start: number; end: number }> {
  const stages: EvolutionStage[] = mass >= 8
    ? ['mainSequence', 'redGiant', 'supernova']
    : ['mainSequence', 'redGiant', 'whiteDwarf'];

  const timeline: Array<{ stage: EvolutionStage; start: number; end: number }> = [];
  let current = 0;

  for (const stage of stages) {
    const duration = getStageDuration(mass, stage);
    timeline.push({ stage, start: current, end: current + duration });
    current += duration;
  }

  const total = current;
  return timeline.map(t => ({
    ...t,
    start: t.start / total,
    end: t.end / total
  }));
}

export function getStageFromTimeline(
  mass: number,
  progress: number
): { stage: EvolutionStage; stageProgress: number } {
  const timeline = getEvolutionTimeline(mass);
  const clampedProgress = clamp(progress, 0, 0.999);

  for (const t of timeline) {
    if (clampedProgress >= t.start && clampedProgress < t.end) {
      const stageProgress = (clampedProgress - t.start) / (t.end - t.start);
      return { stage: t.stage, stageProgress };
    }
  }

  const last = timeline[timeline.length - 1];
  return { stage: last.stage, stageProgress: 1 };
}
