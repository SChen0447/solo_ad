import { CarStats } from '../types';

export interface TrackWeights {
  acceleration: number;
  topSpeed: number;
  grip: number;
  cornering: number;
}

export interface Track {
  id: string;
  name: string;
  description: string;
  surface: string;
  condition: string;
  weights: TrackWeights;
  icon: string;
}

export const tracks: Track[] = [
  {
    id: 'track-dry-straight',
    name: '干燥直线赛道',
    description: '长直道为主的高速赛道，路面干燥抓地力充足，考验赛车的极速与加速能力',
    surface: '沥青',
    condition: '干燥',
    weights: {
      acceleration: 0.30,
      topSpeed: 0.45,
      grip: 0.10,
      cornering: 0.15
    },
    icon: '🏁'
  },
  {
    id: 'track-wet-curves',
    name: '多弯潮湿赛道',
    description: '弯道密集且路面湿滑，对赛车的抓地力和过弯稳定性要求极高',
    surface: '沥青',
    condition: '潮湿',
    weights: {
      acceleration: 0.15,
      topSpeed: 0.10,
      grip: 0.40,
      cornering: 0.35
    },
    icon: '🌧️'
  },
  {
    id: 'track-mixed-offroad',
    name: '混合越野赛道',
    description: '包含沥青、砂石、泥泞多种路面，考验赛车的综合适应能力',
    surface: '混合',
    condition: '多变',
    weights: {
      acceleration: 0.25,
      topSpeed: 0.15,
      grip: 0.35,
      cornering: 0.25
    },
    icon: '🏔️'
  }
];

export interface TrackEfficiency {
  accelerationEfficiency: number;
  topSpeedEfficiency: number;
  gripEfficiency: number;
  corneringEfficiency: number;
}

export interface TrackMatchResult {
  trackId: string;
  matchScore: number;
  efficiency: TrackEfficiency;
  weightedContribution: {
    acceleration: number;
    topSpeed: number;
    grip: number;
    cornering: number;
  };
}

export function calculateTrackMatch(trackId: string, stats: CarStats): TrackMatchResult | null {
  const track = tracks.find(t => t.id === trackId);
  if (!track) return null;

  const w = track.weights;
  const accelerationEfficiency = Math.round(stats.acceleration * w.acceleration * (1 / 0.45));
  const topSpeedEfficiency = Math.round(stats.topSpeed * w.topSpeed * (1 / 0.45));
  const gripEfficiency = Math.round(stats.grip * w.grip * (1 / 0.45));
  const corneringEfficiency = Math.round(stats.cornering * w.cornering * (1 / 0.45));

  const matchScore = Math.round(
    stats.acceleration * w.acceleration +
    stats.topSpeed * w.topSpeed +
    stats.grip * w.grip +
    stats.cornering * w.cornering
  );

  return {
    trackId,
    matchScore,
    efficiency: {
      accelerationEfficiency: Math.min(100, accelerationEfficiency),
      topSpeedEfficiency: Math.min(100, topSpeedEfficiency),
      gripEfficiency: Math.min(100, gripEfficiency),
      corneringEfficiency: Math.min(100, corneringEfficiency)
    },
    weightedContribution: {
      acceleration: Math.round(stats.acceleration * w.acceleration),
      topSpeed: Math.round(stats.topSpeed * w.topSpeed),
      grip: Math.round(stats.grip * w.grip),
      cornering: Math.round(stats.cornering * w.cornering)
    }
  };
}
