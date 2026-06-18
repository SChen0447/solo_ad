import type {
  EarthLayer,
  Vector3,
  Wavefront,
  RayPath,
  RayPoint,
  ReceiverPoint,
  Hypocenter,
  WaveType,
} from './types';

export const EARTH_RADIUS = 6371;
export const SCALE_FACTOR = 0.01;

export const EARTH_LAYERS: EarthLayer[] = [
  {
    name: '内核',
    innerRadius: 0,
    outerRadius: 1220,
    pWaveSpeed: 11,
    sWaveSpeed: 3.5,
    color: '#e8e8f0',
  },
  {
    name: '外核',
    innerRadius: 1220,
    outerRadius: 3480,
    pWaveSpeed: 10,
    sWaveSpeed: 0,
    color: '#ffd700',
  },
  {
    name: '地幔',
    innerRadius: 3480,
    outerRadius: 6341,
    pWaveSpeed: 8,
    sWaveSpeed: 4.5,
    color: '#ff6b35',
  },
  {
    name: '地壳',
    innerRadius: 6341,
    outerRadius: 6371,
    pWaveSpeed: 6,
    sWaveSpeed: 3.5,
    color: '#b0b0b8',
  },
];

export function latLonToCartesian(
  lat: number,
  lon: number,
  radius: number
): Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return { x: x * SCALE_FACTOR, y: y * SCALE_FACTOR, z: z * SCALE_FACTOR };
}

export function hypocenterToPosition(h: Hypocenter): Vector3 {
  const radius = EARTH_RADIUS - h.depth;
  return latLonToCartesian(h.latitude, h.longitude, radius);
}

export function getLayerAtRadius(radius: number): number {
  for (let i = EARTH_LAYERS.length - 1; i >= 0; i--) {
    if (radius >= EARTH_LAYERS[i].innerRadius && radius <= EARTH_LAYERS[i].outerRadius) {
      return i;
    }
  }
  return EARTH_LAYERS.length - 1;
}

export function getWaveSpeed(radius: number, type: WaveType): number {
  const layerIndex = getLayerAtRadius(radius);
  const layer = EARTH_LAYERS[layerIndex];
  if (type === 'P') return layer.pWaveSpeed;
  return layer.sWaveSpeed;
}

export function vectorLength(v: Vector3): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

export function vectorNormalize(v: Vector3): Vector3 {
  const len = vectorLength(v);
  if (len === 0) return { x: 0, y: 0, z: 0 };
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

export function vectorAdd(a: Vector3, b: Vector3): Vector3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function vectorSub(a: Vector3, b: Vector3): Vector3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function vectorScale(v: Vector3, s: number): Vector3 {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

export function vectorDot(a: Vector3, b: Vector3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function snellLaw(
  incidentAngle: number,
  v1: number,
  v2: number
): number | null {
  if (v2 === 0) return null;
  const sinRefracted = (v2 / v1) * Math.sin(incidentAngle);
  if (Math.abs(sinRefracted) > 1) return null;
  return Math.asin(sinRefracted);
}

export function generateReceivers(count: number): ReceiverPoint[] {
  const receivers: ReceiverPoint[] = [];
  const n = Math.ceil(Math.sqrt(count));
  let idx = 0;

  for (let i = 0; i < n && idx < count; i++) {
    for (let j = 0; j < n && idx < count; j++) {
      const lat = -90 + (180 * i) / (n - 1);
      const lon = -180 + (360 * j) / (n - 1);
      const position = latLonToCartesian(lat, lon, EARTH_RADIUS);
      receivers.push({
        index: idx,
        position,
        latitude: lat,
        longitude: lon,
        pWaveArrived: false,
        sWaveArrived: false,
        flashTime: 0,
      });
      idx++;
    }
  }
  return receivers;
}

export function createInitialWavefronts(
  hypocenter: Hypocenter,
  waveTypes: Record<WaveType, boolean>
): Wavefront[] {
  const center = hypocenterToPosition(hypocenter);
  const wavefronts: Wavefront[] = [];
  const sourceRadius = (EARTH_RADIUS - hypocenter.depth);
  const layerIndex = getLayerAtRadius(sourceRadius);

  if (waveTypes.P) {
    wavefronts.push({
      id: 'p-primary',
      type: 'P',
      center,
      radius: 0,
      opacity: 0.7,
      isSecondary: false,
      layerIndex,
    });
  }
  if (waveTypes.S) {
    const sLayer = EARTH_LAYERS[layerIndex];
    if (sLayer.sWaveSpeed > 0) {
      wavefronts.push({
        id: 's-primary',
        type: 'S',
        center,
        radius: 0,
        opacity: 0.7,
        isSecondary: false,
        layerIndex,
      });
    }
  }
  return wavefronts;
}

export function propagateWavefront(
  wavefront: Wavefront,
  deltaTime: number
): { wavefront: Wavefront; newWavefronts: Wavefront[] } {
  const centerRadius = vectorLength(wavefront.center) / SCALE_FACTOR;
  const currentLayer = EARTH_LAYERS[wavefront.layerIndex];
  const speed = wavefront.type === 'P' ? currentLayer.pWaveSpeed : currentLayer.sWaveSpeed;
  
  if (speed === 0) {
    return { wavefront: { ...wavefront, opacity: 0 }, newWavefronts: [] };
  }

  const newRadius = wavefront.radius + (speed * deltaTime * SCALE_FACTOR);
  const newWavefronts: Wavefront[] = [];
  let updatedLayerIndex = wavefront.layerIndex;

  const frontOuterRadius = centerRadius + newRadius / SCALE_FACTOR;
  const frontInnerRadius = centerRadius - newRadius / SCALE_FACTOR;

  for (let i = 0; i < EARTH_LAYERS.length; i++) {
    if (i === wavefront.layerIndex) continue;
    const layer = EARTH_LAYERS[i];
    const boundaryCrossed =
      (frontOuterRadius >= layer.innerRadius && frontOuterRadius <= layer.outerRadius) ||
      (frontInnerRadius >= layer.innerRadius && frontInnerRadius <= layer.outerRadius);

    if (boundaryCrossed && !wavefront.isSecondary) {
      const newSpeed = wavefront.type === 'P' ? layer.pWaveSpeed : layer.sWaveSpeed;
      if (wavefront.type === 'S' && newSpeed === 0) continue;

      const boundaryNormal = vectorNormalize(wavefront.center);
      const boundaryRadius = (i > wavefront.layerIndex ? layer.innerRadius : layer.outerRadius);
      const distToBoundary = Math.abs(boundaryRadius - centerRadius);
      
      if (distToBoundary > 0 && distToBoundary < (newRadius / SCALE_FACTOR)) {
        const secondaryCenter = vectorScale(
          boundaryNormal,
          (i > wavefront.layerIndex ? layer.innerRadius : layer.outerRadius) * SCALE_FACTOR
        );

        newWavefronts.push({
          id: `${wavefront.type}-sec-${Date.now()}-${Math.random()}`,
          type: wavefront.type,
          center: secondaryCenter,
          radius: 0.01,
          opacity: 0.4,
          isSecondary: true,
          layerIndex: i,
        });
        updatedLayerIndex = i;
      }
    }
  }

  const maxOpacity = wavefront.isSecondary ? 0.4 : 0.7;
  const decayRate = wavefront.isSecondary ? 0.08 : 0.02;
  const opacity = Math.max(0, maxOpacity - newRadius * decayRate);

  return {
    wavefront: {
      ...wavefront,
      radius: newRadius,
      opacity,
      layerIndex: updatedLayerIndex,
    },
    newWavefronts,
  };
}

export function computeRayPath(
  hypocenter: Hypocenter,
  receiver: ReceiverPoint,
  type: WaveType
): RayPath {
  const sourcePos = hypocenterToPosition(hypocenter);
  const points: RayPoint[] = [];
  const segments = 50;
  let currentPos = { ...sourcePos };
  let currentTime = 0;

  points.push({
    position: { ...currentPos },
    time: 0,
    waveSpeed: getWaveSpeed(EARTH_RADIUS - hypocenter.depth, type),
  });

  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    const lerpPos = {
      x: sourcePos.x + (receiver.position.x - sourcePos.x) * t,
      y: sourcePos.y + (receiver.position.y - sourcePos.y) * t,
      z: sourcePos.z + (receiver.position.z - sourcePos.z) * t,
    };

    const radius = vectorLength(lerpPos) / SCALE_FACTOR;
    const layerIdx = getLayerAtRadius(radius);
    const layer = EARTH_LAYERS[layerIdx];
    const speed = type === 'P' ? layer.pWaveSpeed : layer.sWaveSpeed;

    if (speed === 0) {
      break;
    }

    const segmentDist =
      vectorLength(vectorSub(lerpPos, currentPos)) / SCALE_FACTOR;
    currentTime += segmentDist / speed;

    const radialDir = vectorNormalize(lerpPos);
    const perturbation = vectorScale(radialDir, Math.sin(t * Math.PI) * 0.02);

    points.push({
      position: vectorAdd(lerpPos, perturbation),
      time: currentTime,
      waveSpeed: speed,
    });

    currentPos = lerpPos;
  }

  const arrived = points.length > 1 && vectorLength(
    vectorSub(points[points.length - 1].position, receiver.position)
  ) < 0.5;

  return {
    id: `ray-${type}-${receiver.index}`,
    type,
    points,
    receiverIndex: receiver.index,
    arrived,
    arrivalTime: currentTime,
  };
}

export function computeAllRayPaths(
  hypocenter: Hypocenter,
  receivers: ReceiverPoint[],
  waveTypes: Record<WaveType, boolean>
): RayPath[] {
  const rays: RayPath[] = [];
  for (const receiver of receivers) {
    if (waveTypes.P) {
      rays.push(computeRayPath(hypocenter, receiver, 'P'));
    }
    if (waveTypes.S) {
      rays.push(computeRayPath(hypocenter, receiver, 'S'));
    }
  }
  return rays;
}

export function getWaveColor(type: WaveType): string {
  return type === 'P' ? '#2b7be4' : '#e44b2b';
}

export function speedToColor(speed: number, minSpeed: number, maxSpeed: number): string {
  const t = Math.max(0, Math.min(1, (speed - minSpeed) / (maxSpeed - minSpeed)));
  const r = Math.round(t * 228 + (1 - t) * 43);
  const g = Math.round((1 - t) * 123 + t * 75);
  const b = Math.round((1 - t) * 228 + t * 43);
  return `rgb(${r},${g},${b})`;
}
