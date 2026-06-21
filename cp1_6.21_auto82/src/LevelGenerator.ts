import type { LevelData, Pitch } from './types';
import { MusicParser } from './MusicParser';
import type { BeatSequence } from './types';

export class LevelGenerator {
  static readonly COLORS = {
    low: { fill: 0x4a9eff, glow: 0x7dc4ff },
    mid: { fill: 0x2ecc71, glow: 0x5eff9d },
    high: { fill: 0xff8c42, glow: 0xffb880 }
  };

  static readonly OBSTACLE_COLOR = { fill: 0xff4757, glow: 0xff8080 };
  static readonly COLLECTIBLE_COLOR = { fill: 0xffd700, glow: 0xffea66 };

  static generate(sequence: BeatSequence): LevelData {
    const levelData = MusicParser.generateLevelData(sequence);
    return this.enrichLevelData(levelData);
  }

  private static enrichLevelData(levelData: LevelData): LevelData {
    const enrichedElements = levelData.elements.map((element, _index) => {
      const enriched = { ...element };
      if (enriched.type === 'moving') {
        enriched.moveRange = 30 + Math.random() * 40;
        enriched.moveSpeed = 1.5 + Math.random() * 1.5;
      }
      return enriched;
    });

    return {
      ...levelData,
      elements: enrichedElements
    };
  }

  static getColorByPitch(pitch: Pitch): { fill: number; glow: number } {
    switch (pitch) {
      case 'low':
        return this.COLORS.low;
      case 'mid':
        return this.COLORS.mid;
      case 'high':
        return this.COLORS.high;
      default:
        return this.COLORS.mid;
    }
  }

  static getObstacleColor(): { fill: number; glow: number } {
    return this.OBSTACLE_COLOR;
  }

  static getCollectibleColor(): { fill: number; glow: number } {
    return this.COLLECTIBLE_COLOR;
  }

  static getGrade(accuracy: number): 'S' | 'A' | 'B' | 'C' {
    if (accuracy >= 0.9) return 'S';
    if (accuracy >= 0.75) return 'A';
    if (accuracy >= 0.6) return 'B';
    return 'C';
  }

  static getGradeColor(grade: 'S' | 'A' | 'B' | 'C'): number {
    switch (grade) {
      case 'S': return 0xffd700;
      case 'A': return 0xc0c0c0;
      case 'B': return 0xcd7f32;
      case 'C': return 0x808080;
    }
  }

  static calculateScore(timeDiffMs: number): number {
    const diff = Math.abs(timeDiffMs) / 1000;
    if (diff < 0.1) return 3;
    if (diff < 0.2) return 1;
    return 0;
  }

  static getMaxScore(totalNotes: number): number {
    return totalNotes * 3;
  }
}
