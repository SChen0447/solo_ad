import type { GestureSequence, Point } from './gestureGrid';

export interface AnalysisResult {
  score: number;
  level: 'weak' | 'medium' | 'strong';
  length: number;
  intersections: number;
  repeatRatio: number;
  turnCount: number;
  suggestions: string[];
}

interface LineSegment {
  start: Point;
  end: Point;
}

export class GestureAnalyzer {
  private gridSize: number;

  constructor(gridSize: number = 3) {
    this.gridSize = gridSize;
  }

  public setGridSize(size: number): void {
    this.gridSize = size;
  }

  public analyze(sequence: GestureSequence): AnalysisResult {
    const length = sequence.length;
    const intersections = this.countIntersections(sequence);
    const repeatRatio = this.calculateRepeatRatio(sequence);
    const turnCount = this.countTurns(sequence);

    const lengthScore = this.calculateLengthScore(length);
    const intersectionScore = this.calculateIntersectionScore(intersections);
    const repeatScore = this.calculateRepeatScore(repeatRatio);
    const turnScore = this.calculateTurnScore(turnCount);

    const totalScore = Math.round(
      lengthScore * 0.4 +
      intersectionScore * 0.25 +
      repeatScore * 0.2 +
      turnScore * 0.15
    );

    const level = this.getLevel(totalScore);
    const suggestions = this.generateSuggestions({
      length,
      intersections,
      repeatRatio,
      turnCount,
      score: totalScore
    });

    return {
      score: totalScore,
      level,
      length,
      intersections,
      repeatRatio,
      turnCount,
      suggestions
    };
  }

  private calculateLengthScore(length: number): number {
    const maxLength = this.gridSize * this.gridSize;
    const ratio = length / maxLength;
    
    if (ratio >= 0.8) return 100;
    if (ratio >= 0.6) return 80;
    if (ratio >= 0.4) return 60;
    if (ratio >= 0.25) return 40;
    return 20;
  }

  private calculateIntersectionScore(intersections: number): number {
    const maxIntersections = this.gridSize === 3 ? 6 : 12;
    const ratio = Math.min(intersections / maxIntersections, 1);
    return Math.round(ratio * 100);
  }

  private calculateRepeatScore(repeatRatio: number): number {
    return Math.round((1 - repeatRatio) * 100);
  }

  private calculateTurnScore(turnCount: number): number {
    const maxTurns = (this.gridSize * this.gridSize) - 2;
    const ratio = Math.min(turnCount / maxTurns, 1);
    return Math.round(ratio * 100);
  }

  private getLevel(score: number): 'weak' | 'medium' | 'strong' {
    if (score < 33) return 'weak';
    if (score < 66) return 'medium';
    return 'strong';
  }

  private countIntersections(sequence: GestureSequence): number {
    if (sequence.length < 4) return 0;

    const segments: LineSegment[] = [];
    for (let i = 0; i < sequence.length - 1; i++) {
      segments.push({
        start: sequence[i],
        end: sequence[i + 1]
      });
    }

    let intersections = 0;
    for (let i = 0; i < segments.length; i++) {
      for (let j = i + 2; j < segments.length; j++) {
        if (this.doSegmentsIntersect(segments[i], segments[j])) {
          intersections++;
        }
      }
    }

    return intersections;
  }

  private doSegmentsIntersect(seg1: LineSegment, seg2: LineSegment): boolean {
    const o1 = this.orientation(seg1.start, seg1.end, seg2.start);
    const o2 = this.orientation(seg1.start, seg1.end, seg2.end);
    const o3 = this.orientation(seg2.start, seg2.end, seg1.start);
    const o4 = this.orientation(seg2.start, seg2.end, seg1.end);

    if (o1 !== o2 && o3 !== o4) {
      return true;
    }

    if (o1 === 0 && this.onSegment(seg1.start, seg2.start, seg1.end)) return true;
    if (o2 === 0 && this.onSegment(seg1.start, seg2.end, seg1.end)) return true;
    if (o3 === 0 && this.onSegment(seg2.start, seg1.start, seg2.end)) return true;
    if (o4 === 0 && this.onSegment(seg2.start, seg1.end, seg2.end)) return true;

    return false;
  }

  private orientation(p: Point, q: Point, r: Point): number {
    const val = (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
    if (val === 0) return 0;
    return val > 0 ? 1 : 2;
  }

  private onSegment(p: Point, q: Point, r: Point): boolean {
    return q.x <= Math.max(p.x, r.x) && q.x >= Math.min(p.x, r.x) &&
           q.y <= Math.max(p.y, r.y) && q.y >= Math.min(p.y, r.y);
  }

  private calculateRepeatRatio(sequence: GestureSequence): number {
    if (sequence.length <= 1) return 0;
    
    const uniquePoints = new Set<string>();
    for (const point of sequence) {
      uniquePoints.add(`${point.row}-${point.col}`);
    }
    
    return (sequence.length - uniquePoints.size) / sequence.length;
  }

  private countTurns(sequence: GestureSequence): number {
    if (sequence.length < 3) return 0;

    let turns = 0;
    for (let i = 1; i < sequence.length - 1; i++) {
      const prev = sequence[i - 1];
      const curr = sequence[i];
      const next = sequence[i + 1];

      const dir1 = {
        x: curr.col - prev.col,
        y: curr.row - prev.row
      };
      const dir2 = {
        x: next.col - curr.col,
        y: next.row - curr.row
      };

      const dot = dir1.x * dir2.x + dir1.y * dir2.y;
      const mag1 = Math.sqrt(dir1.x * dir1.x + dir1.y * dir1.y);
      const mag2 = Math.sqrt(dir2.x * dir2.x + dir2.y * dir2.y);

      if (mag1 > 0 && mag2 > 0) {
        const cosAngle = dot / (mag1 * mag2);
        const angle = Math.acos(Math.max(-1, Math.min(1, cosAngle)));
        const degrees = angle * 180 / Math.PI;

        if (degrees > 30 && degrees < 180) {
          turns++;
        }
      }
    }

    return turns;
  }

  private generateSuggestions(metrics: {
    length: number;
    intersections: number;
    repeatRatio: number;
    turnCount: number;
    score: number;
  }): string[] {
    const suggestions: string[] = [];
    const maxLength = this.gridSize * this.gridSize;

    if (metrics.length < maxLength * 0.5) {
      suggestions.push('使用更长的路径，连接更多节点');
    }

    if (metrics.turnCount < 2) {
      suggestions.push('增加拐角数量，避免直线型手势');
    }

    if (metrics.repeatRatio > 0.2) {
      suggestions.push('避免重复经过相同节点');
    }

    if (metrics.intersections === 0 && metrics.length >= 4) {
      suggestions.push('尝试让路径交叉以增加复杂度');
    }

    if (suggestions.length === 0 && metrics.score >= 80) {
      suggestions.push('很棒！这是一个高强度的手势密码');
    } else if (suggestions.length === 0) {
      suggestions.push('手势密码强度良好，可以继续优化');
    }

    return suggestions;
  }
}
