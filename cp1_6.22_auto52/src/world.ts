export const MAP_WIDTH = 8;
export const MAP_HEIGHT = 8;
export const TILE_SIZE = 60;
export const VIEW_RADIUS = 2;

export type TileType = 'wall' | 'corridor' | 'room' | 'door';

export interface Tile {
  type: TileType;
  locked?: boolean;
  description: string;
}

export interface Item {
  id: string;
  name: string;
  alias: string[];
  description: string;
  x: number;
  y: number;
  collected: boolean;
  usable?: boolean;
}

export interface NPC {
  id: string;
  name: string;
  alias: string[];
  x: number;
  y: number;
  dialogues: string[];
  dialogueIndex: number;
  questTrigger?: string;
  questDone?: boolean;
}

export interface PlayerState {
  x: number;
  y: number;
  inventory: Item[];
  hp: number;
  maxHp: number;
}

export interface QuestState {
  letterDelivered: boolean;
  treasureFound: boolean;
  doorUnlocked: boolean;
}

export interface WorldState {
  map: Tile[][];
  player: PlayerState;
  items: Item[];
  npcs: NPC[];
  quests: QuestState;
  gameWon: boolean;
}

const TILE_DESCRIPTIONS: Record<TileType, string[]> = {
  wall: ['冰冷的石墙挡住了去路。', '墙壁上爬满了枯萎的藤蔓。', '青苔覆盖的石墙散发着古老的气息。'],
  corridor: ['一条昏暗的走廊延伸向远方，墙上的火把闪烁不定。', '走廊里弥漫着陈年的灰尘味。', '脚下的石板发出咯吱的声响。'],
  room: ['你来到一个空旷的房间，角落里堆满了破旧的木箱。', '房间中央有一张布满灰尘的桌子。', '微弱的光线从破损的窗户透进来。'],
  door: ['一扇沉重的木门立在前方，门上嵌着一个金色的锁孔。', '门上刻着神秘的符文，似乎需要钥匙才能打开。']
};

export function getTileDescription(type: TileType): string {
  const arr = TILE_DESCRIPTIONS[type];
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildInitialMap(): Tile[][] {
  const map: Tile[][] = [];
  for (let y = 0; y < MAP_HEIGHT; y++) {
    const row: Tile[] = [];
    for (let x = 0; x < MAP_WIDTH; x++) {
      row.push({ type: 'wall', description: getTileDescription('wall') });
    }
    map.push(row);
  }

  const room1 = { x1: 1, y1: 1, x2: 3, y2: 3 };
  for (let y = room1.y1; y <= room1.y2; y++) {
    for (let x = room1.x1; x <= room1.x2; x++) {
      map[y][x] = { type: 'room', description: getTileDescription('room') };
    }
  }

  const room2 = { x1: 5, y1: 1, x2: 7, y2: 3 };
  for (let y = room2.y1; y <= room2.y2; y++) {
    for (let x = room2.x1; x <= room2.x2; x++) {
      map[y][x] = { type: 'room', description: getTileDescription('room') };
    }
  }

  const room3 = { x1: 1, y1: 5, x2: 3, y2: 7 };
  for (let y = room3.y1; y <= room3.y2; y++) {
    for (let x = room3.x1; x <= room3.x2; x++) {
      map[y][x] = { type: 'room', description: getTileDescription('room') };
    }
  }

  const treasureRoom = { x1: 5, y1: 5, x2: 7, y2: 7 };
  for (let y = treasureRoom.y1; y <= treasureRoom.y2; y++) {
    for (let x = treasureRoom.x1; x <= treasureRoom.x2; x++) {
      map[y][x] = { type: 'room', description: getTileDescription('room') };
    }
  }

  const corridor1 = { y: 2, x1: 4, x2: 4 };
  for (let x = corridor1.x1; x <= corridor1.x2; x++) {
    map[corridor1.y][x] = { type: 'corridor', description: getTileDescription('corridor') };
  }

  const corridor2 = { y: 6, x1: 4, x2: 4 };
  for (let x = corridor2.x1; x <= corridor2.x2; x++) {
    map[corridor2.y][x] = { type: 'corridor', description: getTileDescription('corridor') };
  }

  const corridor3 = { x: 2, y1: 4, y2: 4 };
  for (let y = corridor3.y1; y <= corridor3.y2; y++) {
    map[y][corridor3.x] = { type: 'corridor', description: getTileDescription('corridor') };
  }

  map[4][4] = { type: 'corridor', description: getTileDescription('corridor') };
  map[5][4] = { type: 'door', locked: true, description: getTileDescription('door') };

  return map;
}

function buildInitialItems(): Item[] {
  return [
    {
      id: 'key',
      name: '钥匙',
      alias: ['钥匙', 'key', '金钥匙'],
      description: '一把闪烁着金光的古老钥匙，可能能打开某扇门。',
      x: 2, y: 1,
      collected: false,
      usable: true
    },
    {
      id: 'sword',
      name: '剑',
      alias: ['剑', 'sword', '铁剑', '宝剑'],
      description: '一把锋利的铁剑，虽然有些锈迹但依然寒光逼人。',
      x: 6, y: 2,
      collected: false
    },
    {
      id: 'potion',
      name: '药水',
      alias: ['药水', 'potion', '治疗药水', '红药水'],
      description: '一瓶散发着淡淡红光的药水，似乎有治疗的功效。',
      x: 1, y: 7,
      collected: false,
      usable: true
    },
    {
      id: 'coin',
      name: '金币',
      alias: ['金币', 'coin', '钱'],
      description: '一袋沉甸甸的金币，在阳光下闪闪发光。',
      x: 3, y: 3,
      collected: false
    },
    {
      id: 'letter',
      name: '信',
      alias: ['信', 'letter', '信件', '书信'],
      description: '一封密封的信件，信封上写着「致村中长老」。',
      x: 7, y: 1,
      collected: false
    }
  ];
}

function buildInitialNPCs(): NPC[] {
  return [
    {
      id: 'guard',
      name: '守卫',
      alias: ['守卫', 'guard', '卫兵'],
      x: 4, y: 2,
      dialogues: [
        '守卫瞥了你一眼：「旅行者，前面的门锁着，只有钥匙才能通过。那把钥匙据说藏在西北的房间里。」',
        '守卫：「小心行事，这片遗迹里危机四伏。」',
        '守卫：「别再问了，我什么都不知道。」'
      ],
      dialogueIndex: 0
    },
    {
      id: 'elder',
      name: '老人',
      alias: ['老人', 'elder', '长老', '村中长老'],
      x: 2, y: 7,
      dialogues: [
        '老人颤颤巍巍地抬起头：「年轻的冒险者……如果你能帮我找到那封失散已久的信，我会感激不尽……」',
        '老人：「信……据说被东边房间的商人捡到了。」',
        '老人：「谢谢你把信带来！这是给你的酬劳——一瓶神秘药水的配方，还有……拿着这个护身符，它会保佑你的。」',
        '老人慈祥地笑了笑：「愿你一路平安，宝藏就在东南方的房间里。」'
      ],
      dialogueIndex: 0,
      questTrigger: 'letterDelivered'
    },
    {
      id: 'merchant',
      name: '商人',
      alias: ['商人', 'merchant', '商贩'],
      x: 6, y: 1,
      dialogues: [
        '商人搓了搓手：「嘿！旅行者，要买些什么吗？哦……你说那封信？它就在我这里，不过——你得用剑来换！」',
        '商人：「把剑给我，我就把信交给你。这可是公平交易。」',
        '商人哈哈笑道：「成交！好剑，真是好剑！信是你的了。」',
        '商人：「下次再来光顾啊！」'
      ],
      dialogueIndex: 0
    }
  ];
}

export function createInitialWorld(): WorldState {
  return {
    map: buildInitialMap(),
    player: {
      x: 2,
      y: 2,
      inventory: [],
      hp: 100,
      maxHp: 100
    },
    items: buildInitialItems(),
    npcs: buildInitialNPCs(),
    quests: {
      letterDelivered: false,
      treasureFound: false,
      doorUnlocked: false
    },
    gameWon: false
  };
}

export function isWalkable(state: WorldState, x: number, y: number): boolean {
  if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) return false;
  const tile = state.map[y][x];
  if (tile.type === 'wall') return false;
  if (tile.type === 'door' && tile.locked) return false;
  return true;
}

export function hasItemAt(state: WorldState, x: number, y: number): Item | null {
  return state.items.find(i => i.x === x && i.y === y && !i.collected) || null;
}

export function hasNPCAt(state: WorldState, x: number, y: number): NPC | null {
  return state.npcs.find(n => n.x === x && n.y === y) || null;
}

export function findItemById(state: WorldState, id: string): Item | null {
  return state.items.find(i => i.id === id) || null;
}

export function findItemInInventory(state: WorldState, name: string): Item | null {
  const lower = name.toLowerCase();
  return state.player.inventory.find(i =>
    i.name === name || i.alias.some(a => a.toLowerCase() === lower)
  ) || null;
}

export function findItemOnGround(state: WorldState, name: string): Item | null {
  const lower = name.toLowerCase();
  return state.items.find(i =>
    !i.collected && (i.name === name || i.alias.some(a => a.toLowerCase() === lower))
  ) || null;
}

export function findNPC(state: WorldState, name: string): NPC | null {
  const lower = name.toLowerCase();
  return state.npcs.find(n =>
    n.name === name || n.alias.some(a => a.toLowerCase() === lower)
  ) || null;
}

export function getDirectionDelta(dir: string): { dx: number; dy: number } | null {
  switch (dir) {
    case '北':
    case '上':
    case 'n':
    case 'north':
      return { dx: 0, dy: -1 };
    case '南':
    case '下':
    case 's':
    case 'south':
      return { dx: 0, dy: 1 };
    case '东':
    case '右':
    case 'e':
    case 'east':
      return { dx: 1, dy: 0 };
    case '西':
    case '左':
    case 'w':
    case 'west':
      return { dx: -1, dy: 0 };
    case '东北':
    case 'ne':
      return { dx: 1, dy: -1 };
    case '西北':
    case 'nw':
      return { dx: -1, dy: -1 };
    case '东南':
    case 'se':
      return { dx: 1, dy: 1 };
    case '西南':
    case 'sw':
      return { dx: -1, dy: 1 };
    default:
      return null;
  }
}

export function getDirectionName(dx: number, dy: number): string {
  if (dx === 0 && dy === -1) return '北';
  if (dx === 0 && dy === 1) return '南';
  if (dx === 1 && dy === 0) return '东';
  if (dx === -1 && dy === 0) return '西';
  if (dx === 1 && dy === -1) return '东北';
  if (dx === -1 && dy === -1) return '西北';
  if (dx === 1 && dy === 1) return '东南';
  if (dx === -1 && dy === 1) return '西南';
  return '';
}

export function isTreasureRoom(x: number, y: number): boolean {
  return x >= 5 && x <= 7 && y >= 5 && y <= 7;
}
