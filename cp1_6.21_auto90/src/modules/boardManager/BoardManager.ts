import localforage from 'localforage';
import { v4 as uuidv4 } from 'uuid';

export interface Board {
  id: string;
  name: string;
  coverColor: string;
  colorName: string;
  createdAt: number;
}

export interface ThemeColors {
  [key: string]: {
    name: string;
    base: string;
    gradient: string;
  };
}

export const PRESET_COLORS: ThemeColors = {
  vermilion: {
    name: '朱红',
    base: '#e74c3c',
    gradient: 'linear-gradient(135deg, #ffd4ce 0%, #ff9b8a 100%)'
  },
  cobalt: {
    name: '钴蓝',
    base: '#2e5cb8',
    gradient: 'linear-gradient(135deg, #d0deff 0%, #8aa9e8 100%)'
  },
  emerald: {
    name: '翡翠绿',
    base: '#2ecc71',
    gradient: 'linear-gradient(135deg, #d1f5e0 0%, #7bdca4 100%)'
  },
  amber: {
    name: '琥珀黄',
    base: '#f39c12',
    gradient: 'linear-gradient(135deg, #ffeccd 0%, #ffcd74 100%)'
  },
  violet: {
    name: '紫罗兰',
    base: '#8e44ad',
    gradient: 'linear-gradient(135deg, #ecd9f5 0%, #c59cdb 100%)'
  },
  coral: {
    name: '珊瑚粉',
    base: '#ff7f7f',
    gradient: 'linear-gradient(135deg, #ffe0e0 0%, #ffb3b3 100%)'
  },
  sky: {
    name: '天蓝',
    base: '#3498db',
    gradient: 'linear-gradient(135deg, #d6ebff 0%, #8bc4f0 100%)'
  },
  mint: {
    name: '薄荷绿',
    base: '#1abc9c',
    gradient: 'linear-gradient(135deg, #d1f5ed 0%, #7bdcc7 100%)'
  }
};

const BOARDS_KEY = 'inspiration_boards';

class BoardManager {
  private boards: Board[] = [];

  async init(): Promise<void> {
    const stored = await localforage.getItem<Board[]>(BOARDS_KEY);
    if (stored) {
      this.boards = stored;
    }
  }

  async createBoard(name: string, colorKey: string): Promise<Board> {
    const color = PRESET_COLORS[colorKey];
    const board: Board = {
      id: uuidv4(),
      name: name.trim(),
      coverColor: color.gradient,
      colorName: color.name,
      createdAt: Date.now()
    };
    this.boards.push(board);
    await this.save();
    return board;
  }

  async deleteBoard(boardId: string): Promise<void> {
    this.boards = this.boards.filter(b => b.id !== boardId);
    await this.save();
    await localforage.removeItem(`cards_${boardId}`);
    await localforage.removeItem(`tags_${boardId}`);
  }

  getBoards(): Board[] {
    return [...this.boards].sort((a, b) => b.createdAt - a.createdAt);
  }

  getBoard(boardId: string): Board | undefined {
    return this.boards.find(b => b.id === boardId);
  }

  private async save(): Promise<void> {
    await localforage.setItem(BOARDS_KEY, this.boards);
  }
}

export const boardManager = new BoardManager();
