import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

export type Faction = 'player' | 'enemy';
export type CardType = 'hero' | 'mirror' | 'obstacle' | 'base';
export type Phase = 'place' | 'move' | 'attack' | 'aim' | 'ai' | 'gameover';

export interface Position {
  x: number;
  y: number;
}

export interface Card {
  id: string;
  type: CardType;
  faction: Faction;
  position: Position;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  energy: number;
  maxEnergy: number;
  name: string;
  avatar: string;
  isMirror?: boolean;
}

export interface BeamPoint {
  x: number;
  y: number;
  reflectionCount: number;
}

export interface BeamRecord {
  id: string;
  sourceId: string;
  path: BeamPoint[];
  angle: number;
  timestamp: number;
  hits: string[];
  hitPositions: Position[];
}

export interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'damage' | 'death' | 'turn';
  isDeleted?: boolean;
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface GameState {
  turn: number;
  currentPlayer: Faction;
  phase: Phase;
  cards: Card[];
  selectedCardId: string | null;
  beamRecords: BeamRecord[];
  activeBeam: BeamRecord | null;
  logs: LogEntry[];
  hasMoved: boolean;
  hasAttacked: boolean;
  aimAngle: number;
  aimSourceId: string | null;
  winner: Faction | null;
  particles: Particle[];
  draggingCardId: string | null;
  dragPosition: { x: number; y: number } | null;
  animationSpeed: number;
}

interface Actions {
  initializeGame: () => void;
  selectCard: (cardId: string | null) => void;
  placeCard: (cardId: string, position: Position) => void;
  moveCard: (cardId: string, position: Position) => void;
  startAim: (sourceId: string) => void;
  setAimAngle: (angle: number) => void;
  fireBeam: (sourceId: string, angle: number) => void;
  setActiveBeam: (beam: BeamRecord | null) => void;
  nextTurn: () => void;
  addLog: (message: string, type: LogEntry['type']) => void;
  addParticles: (x: number, y: number, color: string, count: number) => void;
  updateParticles: (deltaTime: number) => void;
  setDraggingCard: (cardId: string | null, position?: { x: number; y: number }) => void;
  updateDragPosition: (x: number, y: number) => void;
  removeDeadCards: () => void;
  checkWinCondition: () => void;
  calculateBeamPath: (source: Card, angle: number) => { path: BeamPoint[]; hits: string[]; hitPositions: Position[] };
}

const BOARD_SIZE = 8;
const MAX_REFLECTIONS = 3;

const createInitialCards = (): Card[] => {
  const cards: Card[] = [];

  cards.push({
    id: uuidv4(),
    type: 'base',
    faction: 'player',
    position: { x: 3, y: 7 },
    hp: 20,
    maxHp: 20,
    attack: 3,
    defense: 2,
    energy: 100,
    maxEnergy: 100,
    name: '玩家基地',
    avatar: '🏰',
  });

  cards.push({
    id: uuidv4(),
    type: 'base',
    faction: 'enemy',
    position: { x: 4, y: 0 },
    hp: 20,
    maxHp: 20,
    attack: 3,
    defense: 2,
    energy: 100,
    maxEnergy: 100,
    name: '敌方基地',
    avatar: '🏯',
  });

  const playerHeroes = [
    { name: '光剑士', avatar: '⚔️', attack: 2, defense: 1, hp: 8, pos: { x: 2, y: 6 } },
    { name: '镜法师', avatar: '🔮', attack: 1, defense: 1, hp: 6, pos: { x: 4, y: 6 }, isMirror: true },
    { name: '盾卫士', avatar: '🛡️', attack: 1, defense: 3, hp: 12, pos: { x: 3, y: 6 } },
  ];

  playerHeroes.forEach((hero) => {
    cards.push({
      id: uuidv4(),
      type: 'hero',
      faction: 'player',
      position: hero.pos,
      hp: hero.hp,
      maxHp: hero.hp,
      attack: hero.attack,
      defense: hero.defense,
      energy: 100,
      maxEnergy: 100,
      name: hero.name,
      avatar: hero.avatar,
      isMirror: hero.isMirror,
    });
  });

  const enemyHeroes = [
    { name: '暗影刺客', avatar: '🗡️', attack: 3, defense: 0, hp: 6, pos: { x: 3, y: 1 } },
    { name: '折射者', avatar: '💎', attack: 1, defense: 1, hp: 6, pos: { x: 5, y: 1 }, isMirror: true },
    { name: '重甲兵', avatar: '⚙️', attack: 1, defense: 3, hp: 12, pos: { x: 4, y: 1 } },
  ];

  enemyHeroes.forEach((hero) => {
    cards.push({
      id: uuidv4(),
      type: 'hero',
      faction: 'enemy',
      position: hero.pos,
      hp: hero.hp,
      maxHp: hero.hp,
      attack: hero.attack,
      defense: hero.defense,
      energy: 100,
      maxEnergy: 100,
      name: hero.name,
      avatar: hero.avatar,
      isMirror: hero.isMirror,
    });
  });

  const obstacles = [
    { x: 1, y: 3 },
    { x: 6, y: 4 },
    { x: 3, y: 3 },
    { x: 4, y: 4 },
  ];

  obstacles.forEach((pos, idx) => {
    cards.push({
      id: uuidv4(),
      type: 'obstacle',
      faction: 'player',
      position: pos,
      hp: 999,
      maxHp: 999,
      attack: 0,
      defense: 999,
      energy: 0,
      maxEnergy: 0,
      name: `障碍物${idx + 1}`,
      avatar: '🪨',
    });
  });

  return cards;
};

const getTimestamp = (): string => {
  const now = new Date();
  return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
};

export const useGameStore = create<GameState & Actions>((set, get) => ({
  turn: 1,
  currentPlayer: 'player',
  phase: 'move',
  cards: [],
  selectedCardId: null,
  beamRecords: [],
  activeBeam: null,
  logs: [],
  hasMoved: false,
  hasAttacked: false,
  aimAngle: 0,
  aimSourceId: null,
  winner: null,
  particles: [],
  draggingCardId: null,
  dragPosition: null,
  animationSpeed: 1,

  initializeGame: () => {
    const cards = createInitialCards();
    set({
      turn: 1,
      currentPlayer: 'player',
      phase: 'move',
      cards,
      selectedCardId: null,
      beamRecords: [],
      activeBeam: null,
      logs: [],
      hasMoved: false,
      hasAttacked: false,
      aimAngle: 0,
      aimSourceId: null,
      winner: null,
      particles: [],
      draggingCardId: null,
      dragPosition: null,
      animationSpeed: 1,
    });
    get().addLog('游戏开始！玩家回合', 'turn');
  },

  selectCard: (cardId: string | null) => {
    set({ selectedCardId: cardId });
  },

  placeCard: (cardId: string, position: Position) => {
    const state = get();
    const card = state.cards.find((c) => c.id === cardId);
    if (!card) return;

    const occupied = state.cards.some(
      (c) => c.position.x === position.x && c.position.y === position.y
    );
    if (occupied) return;

    set({
      cards: state.cards.map((c) =>
        c.id === cardId ? { ...c, position } : c
      ),
    });
    get().addLog(`${card.name} 放置到 (${position.x}, ${position.y})`, 'info');
  },

  moveCard: (cardId: string, position: Position) => {
    const state = get();
    if (state.hasMoved || state.phase !== 'move') return;

    const card = state.cards.find((c) => c.id === cardId);
    if (!card || card.faction !== state.currentPlayer) return;
    if (card.type === 'base' || card.type === 'obstacle') return;

    const occupied = state.cards.some(
      (c) => c.id !== cardId && c.position.x === position.x && c.position.y === position.y
    );
    if (occupied) return;

    const dx = Math.abs(position.x - card.position.x);
    const dy = Math.abs(position.y - card.position.y);
    if (dx > 1 || dy > 1) return;

    set({
      cards: state.cards.map((c) =>
        c.id === cardId ? { ...c, position } : c
      ),
      hasMoved: true,
      selectedCardId: null,
    });
    get().addLog(`${card.name} 移动到 (${position.x}, ${position.y})`, 'info');
  },

  startAim: (sourceId: string) => {
    const state = get();
    if (state.hasAttacked) return;
    if (state.phase !== 'move' && state.phase !== 'attack') return;

    const source = state.cards.find((c) => c.id === sourceId);
    if (!source || source.faction !== state.currentPlayer) return;
    if (source.type === 'obstacle') return;

    set({
      phase: 'aim',
      aimSourceId: sourceId,
      aimAngle: 0,
    });
    get().addLog(`选择 ${source.name} 准备发射`, 'info');
  },

  setAimAngle: (angle: number) => {
    const snappedAngle = Math.round(angle / 5) * 5;
    const normalizedAngle = ((snappedAngle % 360) + 360) % 360;
    set({ aimAngle: normalizedAngle });
  },

  calculateBeamPath: (source: Card, angle: number) => {
    const state = get();
    const path: BeamPoint[] = [];
    const hits: string[] = [];
    const hitPositions: Position[] = [];

    const radians = (angle * Math.PI) / 180;
    let dx = Math.cos(radians);
    let dy = -Math.sin(radians);

    let x = source.position.x + 0.5;
    let y = source.position.y + 0.5;
    let reflectionCount = 0;

    path.push({ x, y, reflectionCount });

    const step = 0.1;
    let lastGridX = Math.floor(x);
    let lastGridY = Math.floor(y);

    for (let i = 0; i < 200; i++) {
      x += dx * step;
      y += dy * step;

      if (x < 0 || x >= BOARD_SIZE || y < 0 || y >= BOARD_SIZE) {
        path.push({ x, y, reflectionCount });
        break;
      }

      const gridX = Math.floor(x);
      const gridY = Math.floor(y);

      if (gridX !== lastGridX || gridY !== lastGridY) {
        const cardAtPos = state.cards.find(
          (c) => c.position.x === gridX && c.position.y === gridY
        );

        if (cardAtPos) {
          if (cardAtPos.faction !== source.faction && cardAtPos.type !== 'obstacle') {
            path.push({ x: gridX + 0.5, y: gridY + 0.5, reflectionCount });
            hits.push(cardAtPos.id);
            hitPositions.push({ x: gridX, y: gridY });
            break;
          } else if (cardAtPos.type === 'obstacle') {
            path.push({ x: gridX + 0.5, y: gridY + 0.5, reflectionCount });
            get().addParticles(gridX + 0.5, gridY + 0.5, '#ff6b6b', 15);
            break;
          } else if (cardAtPos.isMirror && cardAtPos.id !== source.id) {
            if (reflectionCount >= MAX_REFLECTIONS) {
              path.push({ x: gridX + 0.5, y: gridY + 0.5, reflectionCount });
              break;
            }
            reflectionCount++;
            path.push({ x: gridX + 0.5, y: gridY + 0.5, reflectionCount });

            const centerX = gridX + 0.5;
            const centerY = gridY + 0.5;
            const enterX = x - dx * step;
            const enterY = y - dy * step;

            const localX = enterX - centerX;
            const localY = enterY - centerY;

            if (Math.abs(localX) > Math.abs(localY)) {
              dx = -dx;
            } else {
              dy = -dy;
            }
          }
        }

        lastGridX = gridX;
        lastGridY = gridY;
      }
    }

    if (path.length === 1) {
      path.push({ x, y, reflectionCount });
    }

    return { path, hits, hitPositions };
  },

  fireBeam: (sourceId: string, angle: number) => {
    const state = get();
    if (state.hasAttacked) return;

    const source = state.cards.find((c) => c.id === sourceId);
    if (!source) return;

    const { path, hits, hitPositions } = get().calculateBeamPath(source, angle);

    const beam: BeamRecord = {
      id: uuidv4(),
      sourceId,
      path,
      angle,
      timestamp: Date.now(),
      hits,
      hitPositions,
    };

    set({
      beamRecords: [...state.beamRecords, beam],
      activeBeam: beam,
      hasAttacked: true,
      phase: 'move',
      aimSourceId: null,
    });

    get().addLog(`${source.name} 发射光束 (角度: ${angle}°)`, 'info');

    if (hits.length > 0) {
      const newCards = [...state.cards];
      hits.forEach((hitId, idx) => {
        const hitCard = newCards.find((c) => c.id === hitId);
        if (hitCard) {
          const damage = Math.max(1, source.attack - hitCard.defense);
          hitCard.hp = Math.max(0, hitCard.hp - damage);
          get().addLog(
            `${source.name} 对 ${hitCard.name} 造成 ${damage} 点伤害！`,
            'damage'
          );
          if (hitPositions[idx]) {
            get().addParticles(
              hitPositions[idx].x + 0.5,
              hitPositions[idx].y + 0.5,
              hitCard.faction === 'player' ? '#3498db' : '#e74c3c',
              20
            );
          }
        }
      });
      set({ cards: newCards });
      get().removeDeadCards();
      get().checkWinCondition();
    }

    setTimeout(() => {
      set({ activeBeam: null });
    }, 1000 / state.animationSpeed);
  },

  setActiveBeam: (beam: BeamRecord | null) => {
    set({ activeBeam: beam });
  },

  nextTurn: () => {
    const state = get();
    const nextPlayer: Faction = state.currentPlayer === 'player' ? 'enemy' : 'player';
    const nextTurn = nextPlayer === 'player' ? state.turn + 1 : state.turn;

    set({
      currentPlayer: nextPlayer,
      turn: nextTurn,
      phase: nextPlayer === 'player' ? 'move' : 'ai',
      hasMoved: false,
      hasAttacked: false,
      selectedCardId: null,
      aimSourceId: null,
      animationSpeed: nextPlayer === 'enemy' ? 1.5 : 1,
    });

    get().addLog(
      `第 ${nextTurn} 回合 - ${nextPlayer === 'player' ? '玩家' : 'AI'} 回合`,
      'turn'
    );
  },

  addLog: (message: string, type: LogEntry['type']) => {
    const state = get();
    const entry: LogEntry = {
      id: uuidv4(),
      timestamp: getTimestamp(),
      message,
      type,
    };
    set({ logs: [...state.logs, entry] });
  },

  addParticles: (x: number, y: number, color: string, count: number) => {
    const state = get();
    const newParticles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3 + 1;
      newParticles.push({
        id: uuidv4(),
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: 1,
        color,
        size: Math.random() * 4 + 2,
      });
    }
    set({ particles: [...state.particles, ...newParticles] });
  },

  updateParticles: (deltaTime: number) => {
    const state = get();
    const updated = state.particles
      .map((p) => ({
        ...p,
        x: p.x + p.vx * deltaTime * 60,
        y: p.y + p.vy * deltaTime * 60,
        life: p.life - deltaTime * 2,
      }))
      .filter((p) => p.life > 0);
    set({ particles: updated });
  },

  setDraggingCard: (cardId: string | null, position?: { x: number; y: number }) => {
    set({
      draggingCardId: cardId,
      dragPosition: position || null,
    });
  },

  updateDragPosition: (x: number, y: number) => {
    set({ dragPosition: { x, y } });
  },

  removeDeadCards: () => {
    const state = get();
    const deadCards = state.cards.filter(
      (c) => c.hp <= 0 && c.type !== 'obstacle' && c.type !== 'base'
    );
    const deadBases = state.cards.filter(
      (c) => c.hp <= 0 && c.type === 'base'
    );

    if (deadCards.length > 0 || deadBases.length > 0) {
      const newCards = state.cards.filter((c) => c.hp > 0 || c.type === 'obstacle');
      set({ cards: newCards });

      [...deadCards, ...deadBases].forEach((card) => {
        get().addLog(`💀 ${card.name} 被消灭！`, 'death');
      });
    }
  },

  checkWinCondition: () => {
    const state = get();
    const playerBase = state.cards.find(
      (c) => c.type === 'base' && c.faction === 'player'
    );
    const enemyBase = state.cards.find(
      (c) => c.type === 'base' && c.faction === 'enemy'
    );

    if (!playerBase || playerBase.hp <= 0) {
      set({ winner: 'enemy', phase: 'gameover' });
      get().addLog('🏴 玩家基地被摧毁，AI 获胜！', 'turn');
    } else if (!enemyBase || enemyBase.hp <= 0) {
      set({ winner: 'player', phase: 'gameover' });
      get().addLog('🏆 敌方基地被摧毁，玩家获胜！', 'turn');
    }
  },
}));
