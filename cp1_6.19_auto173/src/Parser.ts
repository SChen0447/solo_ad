import { v4 as uuidv4 } from 'uuid';

export type FurnitureType = 'sofa' | 'table' | 'bookshelf' | 'lamp';

export interface FurnitureSize {
  x: number;
  y: number;
  z: number;
}

export interface FurniturePosition {
  x: number;
  y: number;
  z: number;
}

export interface Furniture {
  id: string;
  type: FurnitureType;
  position: FurniturePosition;
  size: FurnitureSize;
  rotation?: number;
}

const DEFAULT_SIZES: Record<FurnitureType, FurnitureSize> = {
  sofa: { x: 1.5, y: 0.4, z: 0.8 },
  table: { x: 1.2, y: 0.3, z: 0.6 },
  bookshelf: { x: 1.0, y: 1.8, z: 0.3 },
  lamp: { x: 0.4, y: 0.4, z: 0.4 },
};

const FURNITURE_KEYWORDS: Record<FurnitureType, string[]> = {
  sofa: ['沙发', 'L型沙发', '长沙发', '布艺沙发'],
  table: ['茶几', '桌子', '玻璃茶几', '咖啡桌'],
  bookshelf: ['书架', '书柜', '置物架'],
  lamp: ['台灯', '灯', '落地灯', '床头灯'],
};

interface ParsedFurniture {
  type: FurnitureType;
  positionHints: string[];
  relativeTo?: string;
}

export class Parser {
  private roomKeywords = ['客厅', '卧室', '书房', '房间', '空间', '办公室'];

  parse(text: string): Furniture[] {
    const cleanText = text.trim();
    if (!cleanText) return [];

    const furnitureList: ParsedFurniture[] = [];
    let remaining = cleanText;

    for (const [type, keywords] of Object.entries(FURNITURE_KEYWORDS)) {
      for (const keyword of keywords) {
        const index = remaining.indexOf(keyword);
        if (index !== -1) {
          const beforeText = remaining.substring(0, index);
          const positionHints = this.extractPositionHints(beforeText);
          const relativeTo = this.extractRelativeReference(beforeText);

          furnitureList.push({
            type: type as FurnitureType,
            positionHints,
            relativeTo,
          });

          remaining = remaining.substring(index + keyword.length);
          break;
        }
      }
    }

    if (furnitureList.length === 0) {
      return [];
    }

    return this.calculatePositions(furnitureList);
  }

  private extractPositionHints(text: string): string[] {
    const hints: string[] = [];
    const positionWords = [
      '中央', '中间', '中心', '左边', '右侧', '右边', '左侧',
      '前面', '前方', '后面', '后方', '旁边', '靠墙', '角落',
      '东边', '西边', '南边', '北边', '左上', '右上', '左下', '右下',
    ];

    for (const word of positionWords) {
      if (text.includes(word)) {
        hints.push(word);
      }
    }

    return hints;
  }

  private extractRelativeReference(text: string): string | undefined {
    const pattern = /(沙发|茶几|桌子|书架|台灯|灯)[的]?(前面|后面|左边|右边|旁边|前方|后方|左侧|右侧)/;
    const match = text.match(pattern);
    if (match) {
      return match[1];
    }
    return undefined;
  }

  private calculatePositions(parsed: ParsedFurniture[]): Furniture[] {
    const result: Furniture[] = [];
    const placedMap = new Map<string, Furniture>();

    const centerPiece = parsed.find(p => 
      p.positionHints.some(h => ['中央', '中间', '中心'].includes(h))
    ) || parsed[0];

    const centerFurniture: Furniture = {
      id: uuidv4(),
      type: centerPiece.type,
      position: { x: 0, y: 0, z: 0 },
      size: { ...DEFAULT_SIZES[centerPiece.type] },
    };
    result.push(centerFurniture);
    placedMap.set(centerPiece.type, centerFurniture);

    for (const item of parsed) {
      if (item === centerPiece) continue;

      let position = { x: 0, y: 0, z: 0 };
      const size = { ...DEFAULT_SIZES[item.type] };

      const reference = item.relativeTo
        ? this.findTypeByKeyword(item.relativeTo)
        : null;
      const refFurniture = reference ? placedMap.get(reference) : null;

      if (refFurniture) {
        position = this.getPositionRelativeTo(item, refFurniture);
      } else if (item.positionHints.length > 0) {
        position = this.getPositionFromHints(item.positionHints, size);
      } else {
        const offset = result.length * 2;
        position = { x: -3 + offset, y: 0, z: -2 + (result.length % 2) * 2 };
      }

      const furniture: Furniture = {
        id: uuidv4(),
        type: item.type,
        position,
        size,
      };
      result.push(furniture);
      placedMap.set(item.type, furniture);
    }

    return result;
  }

  private findTypeByKeyword(keyword: string): FurnitureType | null {
    for (const [type, keywords] of Object.entries(FURNITURE_KEYWORDS)) {
      if (keywords.some(k => k.includes(keyword) || keyword.includes(k))) {
        return type as FurnitureType;
      }
    }
    return null;
  }

  private getPositionRelativeTo(
    item: ParsedFurniture,
    reference: Furniture
  ): FurniturePosition {
    const refSize = reference.size;
    const itemSize = DEFAULT_SIZES[item.type];
    const pos = { ...reference.position };

    for (const hint of item.positionHints) {
      switch (hint) {
        case '前面':
        case '前方':
          pos.z = reference.position.z + refSize.z / 2 + itemSize.z / 2 + 0.3;
          break;
        case '后面':
        case '后方':
          pos.z = reference.position.z - refSize.z / 2 - itemSize.z / 2 - 0.3;
          break;
        case '左边':
        case '左侧':
          pos.x = reference.position.x - refSize.x / 2 - itemSize.x / 2 - 0.3;
          break;
        case '右边':
        case '右侧':
          pos.x = reference.position.x + refSize.x / 2 + itemSize.x / 2 + 0.3;
          break;
        case '旁边':
          pos.x = reference.position.x + refSize.x / 2 + itemSize.x / 2 + 0.3;
          break;
      }
    }

    if (item.positionHints.length === 0) {
      pos.x = reference.position.x + refSize.x / 2 + itemSize.x / 2 + 0.3;
    }

    return pos;
  }

  private getPositionFromHints(
    hints: string[],
    size: FurnitureSize
  ): FurniturePosition {
    let x = 0;
    let z = 0;

    const spread = 3;

    for (const hint of hints) {
      switch (hint) {
        case '中央':
        case '中间':
        case '中心':
          x = 0;
          z = 0;
          break;
        case '左边':
        case '左侧':
          x = -spread;
          break;
        case '右边':
        case '右侧':
          x = spread;
          break;
        case '前面':
        case '前方':
          z = spread;
          break;
        case '后面':
        case '后方':
          z = -spread;
          break;
        case '靠墙':
          z = -spread + 0.5;
          break;
        case '角落':
          x = -spread + 1;
          z = -spread + 1;
          break;
      }
    }

    return { x, y: 0, z };
  }
}
