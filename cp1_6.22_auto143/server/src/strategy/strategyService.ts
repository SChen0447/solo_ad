import { SavedSetup, CarStats } from '../types';
import { tracks, calculateTrackMatch, Track } from './trackService';

export interface Recommendation {
  setupId: string;
  setupName: string;
  matchScore: number;
  stats: CarStats;
  selection: SavedSetup['selection'];
  pros: string[];
  cons: string[];
}

type WeightEntry = [keyof CarStats, number];

function analyzeProsCons(track: Track, stats: CarStats): { pros: string[]; cons: string[] } {
  const pros: string[] = [];
  const cons: string[] = [];
  const w = track.weights;

  const sortedWeights = (Object.entries(w) as WeightEntry[]).sort((a, b) => b[1] - a[1]);
  const dominant = sortedWeights[0][0];
  const secondary = sortedWeights[1][0];

  const statLabels: Record<keyof CarStats, string> = {
    acceleration: '加速',
    topSpeed: '极速',
    grip: '抓地力',
    cornering: '过弯稳定性'
  };

  const trackLabels: Record<keyof CarStats, string> = {
    acceleration: '起步',
    topSpeed: '直线',
    grip: '湿滑路面',
    cornering: '弯道'
  };

  if (stats[dominant] >= 28) {
    pros.push(`此方案在${track.name}下${statLabels[dominant]}表现极佳，${trackLabels[dominant]}成绩优异`);
  } else if (stats[dominant] >= 22) {
    pros.push(`${statLabels[dominant]}参数良好，能够适应${trackLabels[dominant]}需求`);
  } else {
    cons.push(`${statLabels[dominant]}不足，在${trackLabels[dominant]}路段可能处于劣势`);
  }

  if (stats[secondary] >= 25) {
    pros.push(`${statLabels[secondary]}充足，辅助表现出色`);
  } else if (stats[secondary] < 20) {
    cons.push(`${statLabels[secondary]}偏弱，影响综合表现`);
  }

  const sortedStats = (Object.entries(stats) as WeightEntry[]).sort((a, b) => b[1] - a[1]);
  const maxStat = sortedStats[0][0];
  const minStat = sortedStats[sortedStats.length - 1][0];

  if (stats[maxStat] >= 30 && pros.length < 2) {
    pros.push(`${statLabels[maxStat]}达到优秀水平`);
  }

  if (stats[minStat] <= 18 && cons.length < 2) {
    cons.push(`${statLabels[minStat]}参数偏低，建议关注`);
  }

  if (pros.length === 0) {
    pros.push('整体表现较为均衡');
  }
  if (cons.length === 0) {
    cons.push('暂无明显短板');
  }

  return { pros, cons };
}

export function generateRecommendations(trackId: string, setups: SavedSetup[]): Recommendation[] {
  const track = tracks.find(t => t.id === trackId);
  if (!track) return [];

  const scored = setups.map(setup => {
    const match = calculateTrackMatch(trackId, setup.stats);
    if (!match) return null;
    const { pros, cons } = analyzeProsCons(track, setup.stats);
    return {
      setupId: setup.id,
      setupName: setup.name,
      matchScore: match.matchScore,
      stats: setup.stats,
      selection: setup.selection,
      pros,
      cons
    } as Recommendation;
  }).filter(Boolean) as Recommendation[];

  scored.sort((a, b) => b.matchScore - a.matchScore);
  return scored.slice(0, 3);
}

export function generateRecommendationsWithDefault(
  trackId: string,
  setups: SavedSetup[],
  defaultSetups: SavedSetup[]
): Recommendation[] {
  const allSetups = [...setups, ...defaultSetups];
  return generateRecommendations(trackId, allSetups);
}
