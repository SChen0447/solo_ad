import type { Creative, Category, LeaderboardItem } from './types';
import { useDataStore } from './dataStore';

export class VoteEngine {
  private previousRanks: Map<string, number> = new Map();

  getHotScore(creative: Creative): number {
    const hoursSinceCreation = (Date.now() - creative.createdAt) / (1000 * 60 * 60);
    return (creative.votes * 1000) / Math.pow(hoursSinceCreation + 2, 1.5);
  }

  formatVoteCount(votes: number): string {
    const rounded = Math.ceil(votes);
    if (rounded >= 1000) {
      return (rounded / 1000).toFixed(rounded % 1000 === 0 ? 0 : 1) + 'k';
    }
    return rounded.toString();
  }

  getTrend(currentRank: number, previousRank: number | null): 'up' | 'down' | 'stable' | 'new' {
    if (previousRank === null) return 'new';
    if (currentRank < previousRank) return 'up';
    if (currentRank > previousRank) return 'down';
    return 'stable';
  }

  getLeaderboard(category: Category = 'all', limit: number = 10): LeaderboardItem[] {
    const state = useDataStore.getState();
    let creatives = [...state.creatives];

    if (category !== 'all') {
      creatives = creatives.filter((c) => c.category === category);
    }

    creatives.sort((a, b) => b.votes - a.votes || this.getHotScore(b) - this.getHotScore(a));

    const items: LeaderboardItem[] = creatives.slice(0, limit).map((creative, index) => {
      const currentRank = index + 1;
      const previousRank = this.previousRanks.get(creative.id) || null;
      const trend = this.getTrend(currentRank, previousRank);

      this.previousRanks.set(creative.id, currentRank);

      return {
        creative,
        rank: currentRank,
        previousRank,
        trend,
        hotScore: this.getHotScore(creative),
      };
    });

    return items;
  }

  getTrendIcon(trend: LeaderboardItem['trend']): string {
    switch (trend) {
      case 'up':
        return '↑';
      case 'down':
        return '↓';
      case 'new':
        return '★';
      default:
        return '—';
    }
  }

  getTrendColor(trend: LeaderboardItem['trend']): string {
    switch (trend) {
      case 'up':
        return '#4ecdc4';
      case 'down':
        return '#e94560';
      case 'new':
        return '#ffd93d';
      default:
        return '#888';
    }
  }

  getRankColor(rank: number): string {
    switch (rank) {
      case 1:
        return '#ffd700';
      case 2:
        return '#c0c0c0';
      case 3:
        return '#cd7f32';
      default:
        return '#e0e0e0';
    }
  }

  clearRankHistory(): void {
    this.previousRanks.clear();
  }
}

export const voteEngine = new VoteEngine();

export function useLeaderboard(category: Category = 'all', limit: number = 10): LeaderboardItem[] {
  const creatives = useDataStore((state) => state.creatives);
  const currentCategory = useDataStore((state) => state.category);
  const activeCategory = category === 'all' ? currentCategory : category;

  let filtered = [...creatives];
  if (activeCategory !== 'all') {
    filtered = filtered.filter((c) => c.category === activeCategory);
  }

  filtered.sort((a, b) => b.votes - a.votes || voteEngine.getHotScore(b) - voteEngine.getHotScore(a));

  return filtered.slice(0, limit).map((creative, index) => {
    const currentRank = index + 1;
    const previousRank = voteEngine['previousRanks'].get(creative.id) || null;
    const trend = voteEngine.getTrend(currentRank, previousRank);
    voteEngine['previousRanks'].set(creative.id, currentRank);

    return {
      creative,
      rank: currentRank,
      previousRank,
      trend,
      hotScore: voteEngine.getHotScore(creative),
    };
  });
}
