import { v4 as uuidv4 } from 'uuid';
import { Board, BaseElement, Operation, HistorySnapshot, BoardInfo } from './types';
import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = path.join(__dirname, '..', 'data');
const BOARDS_FILE = path.join(DATA_DIR, 'boards.json');
const MAX_HISTORY_STEPS = 100;
const SAVE_INTERVAL = 5000;

class BoardManager {
  private boards: Map<string, Board> = new Map();
  private operations: Map<string, Operation[]> = new Map();
  private redoStack: Map<string, Operation[]> = new Map();

  constructor() {
    this.ensureDataDir();
    this.loadBoards();
    this.startAutoSave();
  }

  private ensureDataDir(): void {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private loadBoards(): void {
    try {
      if (fs.existsSync(BOARDS_FILE)) {
        const data = fs.readFileSync(BOARDS_FILE, 'utf-8');
        const savedBoards = JSON.parse(data) as Board[];
        savedBoards.forEach(board => {
          this.boards.set(board.id, board);
          this.operations.set(board.id, []);
          this.redoStack.set(board.id, []);
        });
        console.log(`Loaded ${savedBoards.length} boards from disk`);
      }
    } catch (error) {
      console.error('Error loading boards:', error);
    }
  }

  private saveBoards(): void {
    try {
      const boardsArray = Array.from(this.boards.values());
      fs.writeFileSync(BOARDS_FILE, JSON.stringify(boardsArray, null, 2));
    } catch (error) {
      console.error('Error saving boards:', error);
    }
  }

  private startAutoSave(): void {
    setInterval(() => this.saveBoards(), SAVE_INTERVAL);
  }

  createBoard(name: string): BoardInfo {
    const boardId = uuidv4();
    const now = Date.now();
    const board: Board = {
      id: boardId,
      name,
      elements: [],
      createdAt: now,
      updatedAt: now,
      history: []
    };
    this.boards.set(boardId, board);
    this.operations.set(boardId, []);
    this.redoStack.set(boardId, []);
    return {
      id: boardId,
      name,
      createdAt: now,
      updatedAt: now,
      participantCount: 0
    };
  }

  getBoardList(): BoardInfo[] {
    return Array.from(this.boards.values()).map(board => ({
      id: board.id,
      name: board.name,
      createdAt: board.createdAt,
      updatedAt: board.updatedAt,
      participantCount: 0
    }));
  }

  getBoard(boardId: string): Board | undefined {
    return this.boards.get(boardId);
  }

  getElements(boardId: string): BaseElement[] {
    const board = this.boards.get(boardId);
    return board ? board.elements : [];
  }

  addElement(boardId: string, element: BaseElement, userId: string): BaseElement | null {
    const board = this.boards.get(boardId);
    if (!board) return null;

    const existingIndex = board.elements.findIndex(e => e.id === element.id);
    if (existingIndex !== -1) return null;

    board.elements.push(element);
    board.updatedAt = Date.now();

    const operation: Operation = {
      type: 'add',
      element: { ...element },
      timestamp: Date.now(),
      userId
    };
    this.pushOperation(boardId, operation);

    return element;
  }

  updateElement(boardId: string, elementId: string, updates: Partial<BaseElement>, userId: string): BaseElement | null {
    const board = this.boards.get(boardId);
    if (!board) return null;

    const elementIndex = board.elements.findIndex(e => e.id === elementId);
    if (elementIndex === -1) return null;

    const oldElement = { ...board.elements[elementIndex] };
    const newElement = { ...board.elements[elementIndex], ...updates, updatedAt: Date.now() };
    board.elements[elementIndex] = newElement;
    board.updatedAt = Date.now();

    const operation: Operation = {
      type: 'update',
      element: { ...newElement },
      oldElement: { ...oldElement },
      timestamp: Date.now(),
      userId
    };
    this.pushOperation(boardId, operation);

    return newElement;
  }

  deleteElement(boardId: string, elementId: string, userId: string): BaseElement | null {
    const board = this.boards.get(boardId);
    if (!board) return null;

    const elementIndex = board.elements.findIndex(e => e.id === elementId);
    if (elementIndex === -1) return null;

    const deletedElement = board.elements.splice(elementIndex, 1)[0];
    board.updatedAt = Date.now();

    const operation: Operation = {
      type: 'delete',
      element: { ...deletedElement },
      timestamp: Date.now(),
      userId
    };
    this.pushOperation(boardId, operation);

    return deletedElement;
  }

  private pushOperation(boardId: string, operation: Operation): void {
    const ops = this.operations.get(boardId) || [];
    ops.push(operation);
    if (ops.length > MAX_HISTORY_STEPS) {
      ops.shift();
    }
    this.operations.set(boardId, ops);
    this.redoStack.set(boardId, []);
  }

  undo(boardId: string, userId: string): Operation | null {
    const board = this.boards.get(boardId);
    const ops = this.operations.get(boardId) || [];
    if (!board || ops.length === 0) return null;

    const lastOp = ops.pop()!;
    this.operations.set(boardId, ops);

    const redoOps = this.redoStack.get(boardId) || [];
    redoOps.push(lastOp);
    this.redoStack.set(boardId, redoOps);

    let result: Operation | null = null;

    switch (lastOp.type) {
      case 'add': {
        const index = board.elements.findIndex(e => e.id === lastOp.element!.id);
        if (index !== -1) {
          board.elements.splice(index, 1);
          result = {
            type: 'delete',
            element: { ...lastOp.element! },
            timestamp: Date.now(),
            userId
          };
        }
        break;
      }
      case 'delete': {
        board.elements.push({ ...lastOp.element! });
        result = {
          type: 'add',
          element: { ...lastOp.element! },
          timestamp: Date.now(),
          userId
        };
        break;
      }
      case 'update': {
        const index = board.elements.findIndex(e => e.id === lastOp.element!.id);
        if (index !== -1) {
          board.elements[index] = { ...lastOp.oldElement! };
          result = {
            type: 'update',
            element: { ...lastOp.oldElement! },
            timestamp: Date.now(),
            userId
          };
        }
        break;
      }
    }

    board.updatedAt = Date.now();
    return result;
  }

  redo(boardId: string, userId: string): Operation | null {
    const board = this.boards.get(boardId);
    const redoOps = this.redoStack.get(boardId) || [];
    if (!board || redoOps.length === 0) return null;

    const op = redoOps.pop()!;
    this.redoStack.set(boardId, redoOps);

    const ops = this.operations.get(boardId) || [];
    ops.push(op);
    this.operations.set(boardId, ops);

    let result: Operation | null = null;

    switch (op.type) {
      case 'add': {
        board.elements.push({ ...op.element! });
        result = {
          type: 'add',
          element: { ...op.element! },
          timestamp: Date.now(),
          userId
        };
        break;
      }
      case 'delete': {
        const index = board.elements.findIndex(e => e.id === op.element!.id);
        if (index !== -1) {
          board.elements.splice(index, 1);
          result = {
            type: 'delete',
            element: { ...op.element! },
            timestamp: Date.now(),
            userId
          };
        }
        break;
      }
      case 'update': {
        const index = board.elements.findIndex(e => e.id === op.element!.id);
        if (index !== -1) {
          board.elements[index] = { ...op.element! };
          result = {
            type: 'update',
            element: { ...op.element! },
            timestamp: Date.now(),
            userId
          };
        }
        break;
      }
    }

    board.updatedAt = Date.now();
    return result;
  }

  saveSnapshot(boardId: string, userId: string, userName: string): HistorySnapshot | null {
    const board = this.boards.get(boardId);
    if (!board) return null;

    const snapshot: HistorySnapshot = {
      id: uuidv4(),
      elements: JSON.parse(JSON.stringify(board.elements)),
      createdAt: Date.now(),
      createdBy: userId,
      createdByName: userName
    };

    board.history.push(snapshot);
    board.updatedAt = Date.now();

    return snapshot;
  }

  getHistory(boardId: string): HistorySnapshot[] {
    const board = this.boards.get(boardId);
    return board ? board.history : [];
  }

  restoreSnapshot(boardId: string, snapshotId: string, userId: string, userName: string): BaseElement[] | null {
    const board = this.boards.get(boardId);
    if (!board) return null;

    const snapshot = board.history.find(h => h.id === snapshotId);
    if (!snapshot) return null;

    const oldElements = JSON.parse(JSON.stringify(board.elements));
    board.elements = JSON.parse(JSON.stringify(snapshot.elements));
    board.updatedAt = Date.now();

    const operation: Operation = {
      type: 'restore',
      element: {
        id: 'restore',
        type: 'rectangle',
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        rotation: 0,
        color: '',
        lineWidth: 0,
        createdAt: Date.now(),
        updatedAt: Date.now()
      } as BaseElement,
      oldElement: {
        id: 'restore',
        type: 'rectangle',
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        rotation: 0,
        color: '',
        lineWidth: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        points: oldElements
      } as BaseElement,
      timestamp: Date.now(),
      userId
    };
    this.pushOperation(boardId, operation);

    return board.elements;
  }
}

export const boardManager = new BoardManager();
