import {
  BasePairData,
  BaseType,
  BASE_INFO_MAP,
  HELIX_CONFIG,
  isBaseType,
  getComplement
} from './BasePairData';

export class SequenceParser {
  private helixRadius: number = HELIX_CONFIG.radius;
  private basePairsPerTurn: number = HELIX_CONFIG.basePairsPerTurn;
  private verticalPitch: number = HELIX_CONFIG.verticalPitch;

  public setHelixParams(radius: number, basePairsPerTurn: number, verticalPitch: number): void {
    this.helixRadius = radius;
    this.basePairsPerTurn = basePairsPerTurn;
    this.verticalPitch = verticalPitch;
  }

  public parse(sequence: string): BasePairData[] {
    const sanitized = this.sanitizeSequence(sequence);
    const result: BasePairData[] = [];
    const totalBases = sanitized.length;
    const centerOffset = (totalBases - 1) * this.verticalPitch * 0.5;

    for (let i = 0; i < totalBases; i++) {
      const baseA = sanitized[i] as BaseType;
      const baseB = getComplement(baseA);
      const angle = (i / this.basePairsPerTurn) * Math.PI * 2;
      const y = i * this.verticalPitch - centerOffset;

      const positionA = {
        x: Math.cos(angle) * this.helixRadius,
        y: y,
        z: Math.sin(angle) * this.helixRadius
      };

      const positionB = {
        x: Math.cos(angle + Math.PI) * this.helixRadius,
        y: y,
        z: Math.sin(angle + Math.PI) * this.helixRadius
      };

      const hydrogenDirection = {
        x: (positionB.x - positionA.x),
        y: 0,
        z: (positionB.z - positionA.z)
      };

      const len = Math.sqrt(
        hydrogenDirection.x * hydrogenDirection.x +
        hydrogenDirection.z * hydrogenDirection.z
      );
      hydrogenDirection.x /= len;
      hydrogenDirection.z /= len;

      result.push({
        index: i,
        baseA: baseA,
        baseB: baseB,
        colorA: BASE_INFO_MAP[baseA].color,
        colorB: BASE_INFO_MAP[baseB].color,
        positionA,
        positionB,
        hydrogenDirection,
        hydrogenBonds: BASE_INFO_MAP[baseA].hydrogenBonds
      });
    }

    return result;
  }

  public sanitizeSequence(input: string): string {
    if (!input) return this.generateDefaultSequence();
    
    let sanitized = input.toUpperCase().replace(/[^ATCG]/g, '');
    
    if (sanitized.length > 64) {
      sanitized = sanitized.substring(0, 64);
    }
    
    if (sanitized.length === 0) {
      sanitized = this.generateDefaultSequence();
    }
    
    return sanitized;
  }

  private generateDefaultSequence(): string {
    const defaults = ['A', 'T', 'C', 'G'];
    let sequence = '';
    for (let i = 0; i < 24; i++) {
      sequence += defaults[i % 4];
    }
    return sequence;
  }

  public validate(input: string): { valid: boolean; message: string; sanitized: string } {
    const originalLength = input.length;
    const sanitized = this.sanitizeSequence(input);
    
    if (sanitized.length !== originalLength && input.length > 0) {
      const invalidChars = input.toUpperCase().split('').filter(c => !isBaseType(c)).join('');
      return {
        valid: false,
        message: `序列包含无效字符: ${invalidChars || '空'}。仅支持A/T/C/G，最大64字符。`,
        sanitized
      };
    }
    
    return {
      valid: true,
      message: `有效序列: ${sanitized.length}个碱基`,
      sanitized
    };
  }

  public static hasInvalidCharacters(input: string): boolean {
    if (!input) return false;
    return /[^ATCGatcg]/.test(input);
  }

  public static getInvalidCharacters(input: string): string {
    if (!input) return '';
    const invalidSet = new Set<string>();
    for (const char of input.toUpperCase()) {
      if (!isBaseType(char)) {
        invalidSet.add(char);
      }
    }
    return Array.from(invalidSet).join(', ');
  }
}

export default SequenceParser;
