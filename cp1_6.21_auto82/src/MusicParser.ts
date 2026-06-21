import { v4 as uuidv4 } from 'uuid';
import type { BeatNote, BeatSequence, LevelData, LevelElement, Pitch } from './types';

export class MusicParser {
  private static readonly GROUND_Y = 560;
  private static readonly MID_Y = 400;
  private static readonly HIGH_Y = 240;
  private static readonly START_X = 300;
  private static readonly MIN_WIDTH = 30;
  private static readonly MAX_WIDTH = 120;
  private static readonly HEIGHT = 20;
  private static readonly X_SPACING = 110;

  static parseBeatSequence(sequence: BeatSequence): BeatNote[] {
    return [...sequence.notes].sort((a, b) => a.timestamp - b.timestamp);
  }

  static generateLevelData(sequence: BeatSequence): LevelData {
    const notes = this.parseBeatSequence(sequence);
    const elements: LevelElement[] = [];

    if (notes.length === 0) {
      return {
        totalDuration: sequence.duration,
        bpm: sequence.bpm,
        elements: [],
        totalNotes: 0
      };
    }

    const totalTime = notes[notes.length - 1].timestamp - notes[0].timestamp;
    const maxIndex = notes.length - 1;

    notes.forEach((note, index) => {
      const timeProgress = totalTime > 0 ? (note.timestamp - notes[0].timestamp) / totalTime : 0;
      const x = this.START_X + timeProgress * (maxIndex * this.X_SPACING);

      const element = this.createLevelElement(note, x, index);
      elements.push(element);
    });

    return {
      totalDuration: sequence.duration,
      bpm: sequence.bpm,
      elements,
      totalNotes: elements.filter(e => e.hasCollectible).length
    };
  }

  private static createLevelElement(note: BeatNote, x: number, _index: number): LevelElement {
    const y = this.getYByPitch(note.pitch);
    const width = this.calculateWidth(note.intensity);
    const type = this.getPlatformType(note.intensity);
    const hasCollectible = this.shouldHaveCollectible(note, type);

    const element: LevelElement = {
      id: uuidv4(),
      type,
      x,
      y,
      width,
      height: this.HEIGHT,
      spawnTime: note.timestamp,
      pitch: note.pitch,
      intensity: note.intensity,
      hasCollectible
    };

    if (type === 'moving') {
      element.moveRange = 40;
      element.moveSpeed = 2;
    }

    return element;
  }

  private static getYByPitch(pitch: Pitch): number {
    switch (pitch) {
      case 'low':
        return this.GROUND_Y;
      case 'mid':
        return this.MID_Y;
      case 'high':
        return this.HIGH_Y;
      default:
        return this.MID_Y;
    }
  }

  private static calculateWidth(intensity: number): number {
    const clampedIntensity = Math.max(1, Math.min(5, intensity));
    const ratio = (clampedIntensity - 1) / 4;
    return this.MIN_WIDTH + ratio * (this.MAX_WIDTH - this.MIN_WIDTH);
  }

  private static getPlatformType(intensity: number): 'moving' | 'fixed' | 'obstacle' {
    if (intensity >= 4) {
      return 'moving';
    } else if (intensity >= 2) {
      return 'fixed';
    } else {
      return 'obstacle';
    }
  }

  private static shouldHaveCollectible(note: BeatNote, type: string): boolean {
    if (type === 'obstacle') return false;
    if (note.intensity >= 3) return true;
    return note.intensity === 2 && Math.random() > 0.3;
  }
}
