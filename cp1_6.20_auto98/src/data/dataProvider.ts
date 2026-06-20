export interface RoadNode {
  id: number;
  x: number;
  z: number;
}

export interface RoadSegment {
  id: number;
  from: number;
  to: number;
}

export interface SegmentTraffic {
  segmentId: number;
  density: number;
  speed: number;
}

export interface TrafficFrame {
  frameIndex: number;
  segments: SegmentTraffic[];
}

export interface RoadNetworkData {
  nodes: RoadNode[];
  segments: RoadSegment[];
}

export interface SegmentStats {
  segmentId: number;
  currentDensity: number;
  currentSpeed: number;
  densityHistory: number[];
}

const NODE_COUNT = 20;
const SEGMENT_COUNT = 40;
const FRAME_COUNT = 60;

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function generateRoadNetwork(): RoadNetworkData {
  const rand = seededRandom(42);
  const nodes: RoadNode[] = [];
  const usedPositions = new Set<string>();

  for (let i = 0; i < NODE_COUNT; i++) {
    let x: number, z: number, key: string;
    do {
      x = Math.round((rand() * 100 - 50) * 10) / 10;
      z = Math.round((rand() * 100 - 50) * 10) / 10;
      key = `${x},${z}`;
    } while (usedPositions.has(key));
    usedPositions.add(key);
    nodes.push({ id: i, x, z });
  }

  const segments: RoadSegment[] = [];
  const usedPairs = new Set<string>();

  for (let i = 0; i < SEGMENT_COUNT; i++) {
    let from: number, to: number, pair: string;
    let attempts = 0;
    do {
      from = Math.floor(rand() * NODE_COUNT);
      to = Math.floor(rand() * NODE_COUNT);
      if (from === to) { to = (from + 1) % NODE_COUNT; }
      pair = from < to ? `${from}-${to}` : `${to}-${from}`;
      attempts++;
    } while (usedPairs.has(pair) && attempts < 200);
    usedPairs.add(pair);
    segments.push({ id: i, from, to });
  }

  return { nodes, segments };
}

export function generateTrafficData(network: RoadNetworkData): TrafficFrame[] {
  const frames: TrafficFrame[] = [];
  const rand = seededRandom(123);

  const baseDensities = network.segments.map(() => rand() * 60 + 10);
  const baseSpeeds = network.segments.map(() => rand() * 40 + 20);
  const frequencies = network.segments.map(() => rand() * 0.3 + 0.05);
  const phases = network.segments.map(() => rand() * Math.PI * 2);

  for (let f = 0; f < FRAME_COUNT; f++) {
    const segData: SegmentTraffic[] = network.segments.map((seg, i) => {
      const t = f / FRAME_COUNT;
      const wave = Math.sin(t * Math.PI * 2 * frequencies[i] * 10 + phases[i]);
      const noise = (rand() - 0.5) * 15;
      let density = baseDensities[i] + wave * 25 + noise;
      density = Math.max(0, Math.min(100, density));

      const speedFactor = 1 - density / 130;
      let speed = baseSpeeds[i] * speedFactor + (rand() - 0.5) * 5;
      speed = Math.max(0, Math.min(80, speed));

      return {
        segmentId: seg.id,
        density: Math.round(density * 10) / 10,
        speed: Math.round(speed * 10) / 10,
      };
    });
    frames.push({ frameIndex: f, segments: segData });
  }

  return frames;
}

export function getSegmentStats(
  segmentId: number,
  currentFrame: number,
  trafficData: TrafficFrame[]
): SegmentStats {
  const densityHistory: number[] = [];
  for (let f = 0; f <= currentFrame && f < trafficData.length; f++) {
    const seg = trafficData[f].segments.find((s) => s.segmentId === segmentId);
    densityHistory.push(seg ? seg.density : 0);
  }

  const current = trafficData[currentFrame];
  const seg = current
    ? current.segments.find((s) => s.segmentId === segmentId)
    : null;

  return {
    segmentId,
    currentDensity: seg ? seg.density : 0,
    currentSpeed: seg ? seg.speed : 0,
    densityHistory,
  };
}
