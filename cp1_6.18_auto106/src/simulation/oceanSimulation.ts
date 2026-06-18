import {
  getCurrents,
  interpolatePath,
  latLonToVec3,
  getTemperature,
  getSpeed,
  getSalinity,
  temperatureToColor,
  EARTH_RADIUS,
  type OceanCurrentDef,
} from '../data/oceanData';

const TARGET_PARTICLES = 10000;
const TRAIL_LENGTH = 6;

export interface SimulationState {
  positions: Float32Array;
  colors: Float32Array;
  sizes: Float32Array;
  trailPositions: Float32Array[];
  trailAlphas: Float32Array[];
  currentIds: string[];
  particleCount: number;
  pathProgresses: Float32Array;
  currentSpeeds: Float32Array;
  currentTemps: Float32Array;
  currentSalinities: Float32Array;
  latitudes: Float32Array;
  longitudes: Float32Array;
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

export function initializeSimulation(month: number, visibleCurrents: string[]): SimulationState {
  const allCurrents = getCurrents();
  const currents = allCurrents.filter((c) => visibleCurrents.includes(c.id));
  if (currents.length === 0) {
    currents.push(...allCurrents);
  }

  const totalPathPoints = currents.reduce((sum, c) => sum + c.path.length, 0);
  const currentParticleCounts: Map<string, number> = new Map();
  let totalParticles = 0;

  for (const current of currents) {
    const ratio = current.path.length / totalPathPoints;
    const count = Math.round(TARGET_PARTICLES * ratio);
    currentParticleCounts.set(current.id, count);
    totalParticles += count;
  }

  totalParticles = Math.max(8000, Math.min(12000, totalParticles));
  const positions = new Float32Array(totalParticles * 3);
  const colors = new Float32Array(totalParticles * 3);
  const sizes = new Float32Array(totalParticles);
  const pathProgresses = new Float32Array(totalParticles);
  const currentSpeeds = new Float32Array(totalParticles);
  const currentTemps = new Float32Array(totalParticles);
  const currentSalinities = new Float32Array(totalParticles);
  const latitudes = new Float32Array(totalParticles);
  const longitudes = new Float32Array(totalParticles);
  const currentIds: string[] = new Array(totalParticles).fill('');

  const trailPositions: Float32Array[] = [];
  const trailAlphas: Float32Array[] = [];
  for (let t = 0; t < TRAIL_LENGTH; t++) {
    trailPositions.push(new Float32Array(totalParticles * 3));
    trailAlphas.push(new Float32Array(totalParticles));
  }

  const seasonFactor = (month % 12) / 12;
  let idx = 0;

  for (const current of currents) {
    const count = currentParticleCounts.get(current.id) || 0;
    for (let i = 0; i < count && idx < totalParticles; i++, idx++) {
      const progress = seededRandom(idx * 7 + 13) ;
      pathProgresses[idx] = progress;
      currentIds[idx] = current.id;

      const [lat, lon] = interpolatePath(current.path, progress, seasonFactor, current.seasonOffset);
      const spread = 0.8 + seededRandom(idx * 3 + 7) * 1.2;
      const spreadLat = lat + (seededRandom(idx * 11 + 3) - 0.5) * spread;
      const spreadLon = lon + (seededRandom(idx * 17 + 5) - 0.5) * spread;

      latitudes[idx] = spreadLat;
      longitudes[idx] = spreadLon;

      const heightOffset = 0.02 + seededRandom(idx * 23 + 11) * 0.08;
      const pos = latLonToVec3(spreadLat, spreadLon, EARTH_RADIUS + heightOffset);
      positions[idx * 3] = pos[0];
      positions[idx * 3 + 1] = pos[1];
      positions[idx * 3 + 2] = pos[2];

      const temp = getTemperature(current, progress, month);
      const speed = getSpeed(current, progress, month);
      const salinity = getSalinity(temp, spreadLat);

      currentTemps[idx] = temp;
      currentSpeeds[idx] = speed;
      currentSalinities[idx] = salinity;

      const color = temperatureToColor(temp);
      colors[idx * 3] = color[0];
      colors[idx * 3 + 1] = color[1];
      colors[idx * 3 + 2] = color[2];

      sizes[idx] = 2.0 + speed * 3.0;

      for (let t = 0; t < TRAIL_LENGTH; t++) {
        const trailProgress = Math.max(0, progress - (t + 1) * 0.008 * (speed + 0.5));
        const [tLat, tLon] = interpolatePath(current.path, trailProgress, seasonFactor, current.seasonOffset);
        const tSpreadLat = tLat + (seededRandom(idx * 11 + 3) - 0.5) * spread;
        const tSpreadLon = tLon + (seededRandom(idx * 17 + 5) - 0.5) * spread;
        const tPos = latLonToVec3(tSpreadLat, tSpreadLon, EARTH_RADIUS + heightOffset);
        trailPositions[t][idx * 3] = tPos[0];
        trailPositions[t][idx * 3 + 1] = tPos[1];
        trailPositions[t][idx * 3 + 2] = tPos[2];
        trailAlphas[t][idx] = 1.0 - (t + 1) / (TRAIL_LENGTH + 1);
      }
    }
  }

  for (let i = idx; i < totalParticles; i++) {
    currentIds[i] = currents[i % currents.length]?.id || '';
  }

  return {
    positions,
    colors,
    sizes,
    trailPositions,
    trailAlphas,
    currentIds,
    particleCount: totalParticles,
    pathProgresses,
    currentSpeeds,
    currentTemps,
    currentSalinities,
    latitudes,
    longitudes,
  };
}

const _tempVec = [0, 0, 0] as [number, number, number];
const _newPos = [0, 0, 0] as [number, number, number];

export function updateSimulation(
  state: SimulationState,
  month: number,
  deltaSeconds: number,
  visibleCurrents: string[],
): void {
  const currents = getCurrents();
  const currentMap = new Map<string, OceanCurrentDef>();
  for (const c of currents) {
    currentMap.set(c.id, c);
  }

  const seasonFactor = (month % 12) / 12;
  const speedMultiplier = deltaSeconds * 0.02;

  for (let i = 0; i < state.particleCount; i++) {
    const currentId = state.currentIds[i];
    if (!visibleCurrents.includes(currentId)) {
      state.sizes[i] = 0;
      for (let t = 0; t < TRAIL_LENGTH; t++) {
        state.trailAlphas[t][i] = 0;
      }
      continue;
    }

    const current = currentMap.get(currentId);
    if (!current) continue;

    const speed = state.currentSpeeds[i];
    state.pathProgresses[i] += speed * speedMultiplier;

    if (state.pathProgresses[i] > 1.0) {
      state.pathProgresses[i] -= 1.0;
    }

    const progress = state.pathProgresses[i];
    const [lat, lon] = interpolatePath(current.path, progress, seasonFactor, current.seasonOffset);

    const spread = 0.8 + seededRandom(i * 3 + 7) * 1.2;
    const spreadLat = lat + (seededRandom(i * 11 + 3) - 0.5) * spread;
    const spreadLon = lon + (seededRandom(i * 17 + 5) - 0.5) * spread;

    state.latitudes[i] = spreadLat;
    state.longitudes[i] = spreadLon;

    const heightOffset = 0.02 + seededRandom(i * 23 + 11) * 0.08;
    const pos = latLonToVec3(spreadLat, spreadLon, EARTH_RADIUS + heightOffset);

    _tempVec[0] = state.positions[i * 3] - pos[0];
    _tempVec[1] = state.positions[i * 3 + 1] - pos[1];
    _tempVec[2] = state.positions[i * 3 + 2] - pos[2];

    for (let t = TRAIL_LENGTH - 1; t > 0; t--) {
      state.trailPositions[t][i * 3] = state.trailPositions[t - 1][i * 3];
      state.trailPositions[t][i * 3 + 1] = state.trailPositions[t - 1][i * 3 + 1];
      state.trailPositions[t][i * 3 + 2] = state.trailPositions[t - 1][i * 3 + 2];
      state.trailAlphas[t][i] = state.trailAlphas[t - 1][i] * 0.75;
    }

    state.trailPositions[0][i * 3] = state.positions[i * 3];
    state.trailPositions[0][i * 3 + 1] = state.positions[i * 3 + 1];
    state.trailPositions[0][i * 3 + 2] = state.positions[i * 3 + 2];
    state.trailAlphas[0][i] = 0.8;

    state.positions[i * 3] = pos[0];
    state.positions[i * 3 + 1] = pos[1];
    state.positions[i * 3 + 2] = pos[2];

    const temp = getTemperature(current, progress, month);
    const newSpeed = getSpeed(current, progress, month);
    const salinity = getSalinity(temp, spreadLat);

    state.currentTemps[i] = temp;
    state.currentSpeeds[i] = newSpeed;
    state.currentSalinities[i] = salinity;

    const color = temperatureToColor(temp);
    state.colors[i * 3] = color[0];
    state.colors[i * 3 + 1] = color[1];
    state.colors[i * 3 + 2] = color[2];

    state.sizes[i] = 2.0 + newSpeed * 3.0;
  }
}

export function getParticleDetail(
  state: SimulationState,
  particleIndex: number,
): {
  latitude: number;
  longitude: number;
  speed: number;
  temperature: number;
  salinity: number;
  currentId: string;
  position: [number, number, number];
} | null {
  if (particleIndex < 0 || particleIndex >= state.particleCount) return null;

  return {
    latitude: state.latitudes[particleIndex],
    longitude: state.longitudes[particleIndex],
    speed: state.currentSpeeds[particleIndex],
    temperature: state.currentTemps[particleIndex],
    salinity: state.currentSalinities[particleIndex],
    currentId: state.currentIds[particleIndex],
    position: [
      state.positions[particleIndex * 3],
      state.positions[particleIndex * 3 + 1],
      state.positions[particleIndex * 3 + 2],
    ],
  };
}

export { TRAIL_LENGTH };
