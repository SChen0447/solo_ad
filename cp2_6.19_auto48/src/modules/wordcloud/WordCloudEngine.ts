import { v4 as uuidv4 } from 'uuid';
import type { WordData, WordCloudConfig } from '../../types';

export class WordCloudEngine {
  private config: WordCloudConfig;
  private placedWords: WordData[] = [];

  constructor(config: WordCloudConfig) {
    this.config = config;
  }

  updateConfig(config: Partial<WordCloudConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): WordCloudConfig {
    return { ...this.config };
  }

  generate(words: Map<string, number>): WordData[] {
    const startTime = performance.now();
    
    const sortedWords = Array.from(words.entries())
      .sort((a, b) => b[1] - a[1]);

    if (sortedWords.length === 0) {
      this.placedWords = [];
      return [];
    }

    const maxWeight = sortedWords[0][1];
    const minWeight = sortedWords[sortedWords.length - 1][1];
    const weightRange = maxWeight - minWeight || 1;

    const result: WordData[] = [];
    const centerX = this.config.width / 2;
    const centerY = this.config.height / 2;

    for (let i = 0; i < sortedWords.length; i++) {
      const [text, weight] = sortedWords[i];
      
      const normalizedWeight = (weight - minWeight) / weightRange;
      const fontSize = this.config.minFontSize + 
        normalizedWeight * (this.config.maxFontSize - this.config.minFontSize);

      const colorIndex = i % this.config.colors.length;
      const color = this.config.colors[colorIndex];

      const rotation = this.config.rotationRange[0] + 
        Math.random() * (this.config.rotationRange[1] - this.config.rotationRange[0]);

      const wordData: WordData = {
        id: uuidv4(),
        text,
        weight,
        x: centerX,
        y: centerY,
        fontSize,
        color,
        rotation
      };

      const position = this.findPosition(wordData, centerX, centerY);
      if (position) {
        wordData.x = position.x;
        wordData.y = position.y;
        result.push(wordData);
      }

      if (performance.now() - startTime > 40) {
        break;
      }
    }

    this.placedWords = result;
    return result;
  }

  private findPosition(
    word: WordData,
    centerX: number,
    centerY: number
  ): { x: number; y: number } | null {
    const wordWidth = this.measureWordWidth(word);
    const wordHeight = word.fontSize * 1.2;

    const step = 2;
    const maxRadius = Math.min(this.config.width, this.config.height) / 2;

    for (let radius = 0; radius < maxRadius; radius += step) {
      const angleStep = (step * 2) / Math.max(radius, 1);
      
      for (let angle = 0; angle < 2 * Math.PI; angle += angleStep) {
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);

        if (this.isWithinBounds(x, y, wordWidth, wordHeight) &&
            !this.checkCollision(x, y, wordWidth, wordHeight)) {
          return { x, y };
        }
      }
    }

    return null;
  }

  private measureWordWidth(word: WordData): number {
    const charWidth = word.fontSize * 0.6;
    return word.text.length * charWidth;
  }

  private isWithinBounds(
    x: number,
    y: number,
    width: number,
    height: number
  ): boolean {
    return (
      x - width / 2 >= 10 &&
      x + width / 2 <= this.config.width - 10 &&
      y - height / 2 >= 10 &&
      y + height / 2 <= this.config.height - 10
    );
  }

  private checkCollision(
    x: number,
    y: number,
    width: number,
    height: number
  ): boolean {
    const padding = 4;
    
    for (const placedWord of this.placedWords) {
      const placedWidth = this.measureWordWidth(placedWord);
      const placedHeight = placedWord.fontSize * 1.2;

      if (
        x - width / 2 - padding < placedWord.x + placedWidth / 2 &&
        x + width / 2 + padding > placedWord.x - placedWidth / 2 &&
        y - height / 2 - padding < placedWord.y + placedHeight / 2 &&
        y + height / 2 + padding > placedWord.y - placedHeight / 2
      ) {
        return true;
      }
    }

    return false;
  }
}
