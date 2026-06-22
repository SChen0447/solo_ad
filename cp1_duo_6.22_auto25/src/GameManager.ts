import { ResourceNode, ResourceType, OwnerType, BattleResult, ResourceNodeData } from './ResourceNode.js';

export type DiscipleStatus = 'idle' | 'marching' | 'resting';

export interface Disciple {
  id: number;
  name: string;
  level: number;
  basePower: number;
  status: DiscipleStatus;
  restTimer: number;
  targetNodeId: number | null;
  path: { x: number; y: number }[];
  pathIndex: number;
  moveProgress: number;
  faction: 'player' | 'ai';
  pixelX: number;
  pixelY: number;
}

export interface TechNode {
  id: string;
  name: string;
  description: string;
  cost: { ore: number; herb: number; spring: number };
  effect: string;
  researched: boolean;
  researching: boolean;
  researchTimer: number;
  researchDuration: number;
  prerequisites: string[];
}

export interface Resources {
  ore: number;
  herb: number;
  spring: number;
}

type EventCallback = (...args: any[]) => void;

export class EventEmitter {
  private listeners: Map<string, EventCallback[]> = new Map();

  on(event: string, callback: EventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: EventCallback): void {
    const list = this.listeners.get(event);
    if (list) {
      const idx = list.indexOf(callback);
      if (idx >= 0) list.splice(idx, 1);
    }
  }

  emit(event: string, ...args: any[]): void {
    const list = this.listeners.get(event);
    if (list) {
      for (const cb of list) cb(...args);
    }
  }
}

const GRID_COLS = 20;
const GRID_ROWS = 14;
const CELL_SIZE = 60;
const MOVE_TIME_PER_CELL = 0.5;
const REST_DURATION = 3;
const AI_EVAL_INTERVAL = 15;
const MAX_DISPATCH_TEAMS = 3;
const TECH_RESEARCH_DURATION = 5;

const DISCIPLE_NAMES = [
  '云飞扬', '风清扬', '萧无涯', '李沧海', '张玄机',
  '赵子龙', '周灵溪', '沐星辰', '柳随风', '白露霜',
  '楚天阔', '燕归来', '叶知秋', '苏梦枕', '段无极',
];

const TECH_TREE: TechNode[] = [
  {
    id: 'power_up',
    name: '强兵诀',
    description: '弟子战力提升10%',
    cost: { ore: 30, herb: 10, spring: 10 },
    effect: 'power_boost',
    researched: false,
    researching: false,
    researchTimer: 0,
    researchDuration: TECH_RESEARCH_DURATION,
    prerequisites: [],
  },
  {
    id: 'fast_rest',
    name: '急行军',
    description: '休整时间缩短2秒',
    cost: { ore: 10, herb: 30, spring: 10 },
    effect: 'rest_reduce',
    researched: false,
    researching: false,
    researchTimer: 0,
    researchDuration: TECH_RESEARCH_DURATION,
    prerequisites: [],
  },
  {
    id: 'harvest',
    name: '丰收术',
    description: '资源采集效率提升20%',
    cost: { ore: 10, herb: 10, spring: 30 },
    effect: 'yield_boost',
    researched: false,
    researching: false,
    researchTimer: 0,
    researchDuration: TECH_RESEARCH_DURATION,
    prerequisites: [],
  },
  {
    id: 'iron_wall',
    name: '铁壁阵',
    description: '驻守防御力提升15%',
    cost: { ore: 25, herb: 25, spring: 10 },
    effect: 'defense_boost',
    researched: false,
    researching: false,
    researchTimer: 0,
    researchDuration: TECH_RESEARCH_DURATION,
    prerequisites: ['power_up'],
  },
  {
    id: 'camp_chain',
    name: '连营术',
    description: '可同时派遣队伍+1',
    cost: { ore: 20, herb: 20, spring: 20 },
    effect: 'extra_team',
    researched: false,
    researching: false,
    researchTimer: 0,
    researchDuration: TECH_RESEARCH_DURATION,
    prerequisites: ['fast_rest'],
  },
  {
    id: 'mandate',
    name: '天命归',
    description: '攻击力额外提升25%',
    cost: { ore: 40, herb: 40, spring: 40 },
    effect: 'attack_boost',
    researched: false,
    researching: false,
    researchTimer: 0,
    researchDuration: TECH_RESEARCH_DURATION,
    prerequisites: ['harvest', 'iron_wall'],
  },
];

export class GameManager {
  public emitter: EventEmitter;
  public resourceNodes: ResourceNode[] = [];
  public playerDisciples: Disciple[] = [];
  public aiDisciples: Disciple[] = [];
  public playerResources: Resources = { ore: 50, herb: 50, spring: 50 };
  public aiResources: Resources = { ore: 50, herb: 50, spring: 50 };
  public techTree: TechNode[] = [];
  public playerBase: { gridX: number; gridY: number };
  public aiBase: { gridX: number; gridY: number };
  public gridCols = GRID_COLS;
  public gridRows = GRID_ROWS;
  public cellSize = CELL_SIZE;

  private aiEvalTimer: number = 0;
  private collectTimer: number = 0;
  private nextDiscipleId: number = 1;
  private gridOccupied: Set<string> = new Set();

  constructor() {
    this.emitter = new EventEmitter();
    this.playerBase = { gridX: 2, gridY: Math.floor(GRID_ROWS / 2) };
    this.aiBase = { gridX: GRID_COLS - 3, gridY: Math.floor(GRID_ROWS / 2) };
  }

  init(): void {
    this.generateResourceNodes();
    this.createPlayerDisciples();
    this.createAiDisciples();
    this.techTree = TECH_TREE.map(t => ({ ...t, cost: { ...t.cost }, prerequisites: [...t.prerequisites] }));

    this.gridOccupied.add(`${this.playerBase.gridX},${this.playerBase.gridY}`);
    this.gridOccupied.add(`${this.aiBase.gridX},${this.aiBase.gridY}`);
    for (const node of this.resourceNodes) {
      this.gridOccupied.add(`${node.gridX},${node.gridY}`);
    }

    this.emitter.emit('game-initialized', {
      nodes: this.resourceNodes.map(n => n.getInfo()),
      disciples: this.playerDisciples,
      resources: { ...this.playerResources },
      techTree: this.techTree,
    });
  }

  private generateResourceNodes(): void {
    const count = 5 + Math.floor(Math.random() * 3);
    const types: ResourceType[] = ['mine', 'herb', 'spring'];
    const usedPositions = new Set<string>();
    const placed: { x: number; y: number }[] = [];
    usedPositions.add(`${this.playerBase.gridX},${this.playerBase.gridY}`);
    usedPositions.add(`${this.aiBase.gridX},${this.aiBase.gridY}`);
    placed.push({ x: this.playerBase.gridX, y: this.playerBase.gridY });
    placed.push({ x: this.aiBase.gridX, y: this.aiBase.gridY });
    const MIN_DISTANCE = 3;

    for (let attempts = 0; attempts < count; attempts++) {
      let gx: number, gy: number;
      let safeCount = 0;
      do {
        gx = 3 + Math.floor(Math.random() * (GRID_COLS - 6));
        gy = 1 + Math.floor(Math.random() * (GRID_ROWS - 2));
        safeCount++;
        if (safeCount > 500) break;
      } while (
        usedPositions.has(`${gx},${gy}`) ||
        placed.some(p => Math.abs(p.x - gx) + Math.abs(p.y - gy) < MIN_DISTANCE)
      );
      usedPositions.add(`${gx},${gy}`);
      placed.push({ x: gx, y: gy });

      const type = types[attempts % 3];
      const baseYield = 2 + Math.floor(Math.random() * 4);
      const guardianPower = 15 + Math.floor(Math.random() * 25);

      const node = new ResourceNode({
        id: attempts,
        type,
        gridX: gx,
        gridY: gy,
        baseYield,
        guardianPower,
        owner: 'neutral',
        contestCount: 0,
      });

      this.resourceNodes.push(node);
    }
  }

  private createPlayerDisciples(): void {
    const powers = [20, 25, 30, 18, 22];
    for (let i = 0; i < 5; i++) {
      this.playerDisciples.push({
        id: this.nextDiscipleId++,
        name: DISCIPLE_NAMES[i],
        level: 1 + Math.floor(i / 2),
        basePower: powers[i],
        status: 'idle',
        restTimer: 0,
        targetNodeId: null,
        path: [],
        pathIndex: 0,
        moveProgress: 0,
        faction: 'player',
        pixelX: this.playerBase.gridX * CELL_SIZE + CELL_SIZE / 2,
        pixelY: this.playerBase.gridY * CELL_SIZE + CELL_SIZE / 2,
      });
    }
  }

  private createAiDisciples(): void {
    const powers = [22, 24, 28];
    for (let i = 0; i < 3; i++) {
      this.aiDisciples.push({
        id: this.nextDiscipleId++,
        name: `AI弟子${i + 1}`,
        level: 2,
        basePower: powers[i],
        status: 'idle',
        restTimer: 0,
        targetNodeId: null,
        path: [],
        pathIndex: 0,
        moveProgress: 0,
        faction: 'ai',
        pixelX: this.aiBase.gridX * CELL_SIZE + CELL_SIZE / 2,
        pixelY: this.aiBase.gridY * CELL_SIZE + CELL_SIZE / 2,
      });
    }
  }

  private bfsPath(
    startX: number, startY: number,
    endX: number, endY: number,
    obstacles: Set<string>
  ): { x: number; y: number }[] {
    if (startX === endX && startY === endY) return [{ x: startX, y: startY }];

    const visited = new Set<string>();
    const queue: { x: number; y: number; path: { x: number; y: number }[] }[] = [];
    const key = (x: number, y: number) => `${x},${y}`;
    const endKey = key(endX, endY);

    visited.add(key(startX, startY));
    queue.push({ x: startX, y: startY, path: [{ x: startX, y: startY }] });

    const dirs = [
      { dx: 1, dy: 0 }, { dx: -1, dy: 0 },
      { dx: 0, dy: 1 }, { dx: 0, dy: -1 },
    ];

    while (queue.length > 0) {
      const current = queue.shift()!;

      for (const d of dirs) {
        const nx = current.x + d.dx;
        const ny = current.y + d.dy;
        const nk = key(nx, ny);

        if (nx < 0 || nx >= GRID_COLS || ny < 0 || ny >= GRID_ROWS) continue;
        if (visited.has(nk)) continue;
        if (nk !== endKey && obstacles.has(nk)) continue;

        const newPath = [...current.path, { x: nx, y: ny }];
        if (nx === endX && ny === endY) return newPath;

        visited.add(nk);
        queue.push({ x: nx, y: ny, path: newPath });
      }
    }

    return [{ x: startX, y: startY }];
  }

  getEffectivePower(disciple: Disciple): number {
    let power = disciple.basePower;
    for (const tech of this.techTree) {
      if (!tech.researched) continue;
      switch (tech.effect) {
        case 'power_boost':
          if (disciple.faction === 'player') power *= 1.1;
          break;
        case 'attack_boost':
          if (disciple.faction === 'player') power *= 1.25;
          break;
      }
    }
    return Math.round(power);
  }

  private getMaxDispatchTeams(faction: 'player' | 'ai'): number {
    let max = MAX_DISPATCH_TEAMS;
    if (faction === 'player') {
      for (const tech of this.techTree) {
        if (tech.researched && tech.effect === 'extra_team') max++;
      }
    }
    return max;
  }

  private getRestDuration(faction: 'player' | 'ai'): number {
    let duration = REST_DURATION;
    if (faction === 'player') {
      for (const tech of this.techTree) {
        if (tech.researched && tech.effect === 'rest_reduce') duration -= 2;
      }
    }
    return Math.max(1, duration);
  }

  private getYieldMultiplier(faction: 'player' | 'ai'): number {
    let mult = 1;
    if (faction === 'player') {
      for (const tech of this.techTree) {
        if (tech.researched && tech.effect === 'yield_boost') mult += 0.2;
      }
    }
    return mult;
  }

  private getDefenseBonus(faction: 'player' | 'ai'): number {
    let bonus = 0;
    if (faction === 'player') {
      for (const tech of this.techTree) {
        if (tech.researched && tech.effect === 'defense_boost') bonus += 0.15;
      }
    }
    return bonus;
  }

  dispatchDisciple(discipleId: number, targetNodeId: number): boolean {
    const disciple = this.playerDisciples.find(d => d.id === discipleId);
    if (!disciple) return false;
    if (disciple.status !== 'idle') return false;

    const marchingCount = this.playerDisciples.filter(d => d.status === 'marching').length;
    if (marchingCount >= this.getMaxDispatchTeams('player')) return false;

    const node = this.resourceNodes.find(n => n.id === targetNodeId);
    if (!node) return false;

    const path = this.bfsPath(
      this.playerBase.gridX, this.playerBase.gridY,
      node.gridX, node.gridY,
      this.gridOccupied
    );
    if (path.length <= 1) return false;

    disciple.status = 'marching';
    disciple.targetNodeId = targetNodeId;
    disciple.path = path;
    disciple.pathIndex = 0;
    disciple.moveProgress = 0;
    disciple.pixelX = this.playerBase.gridX * CELL_SIZE + CELL_SIZE / 2;
    disciple.pixelY = this.playerBase.gridY * CELL_SIZE + CELL_SIZE / 2;

    this.emitter.emit('disciple-dispatched', {
      disciple: { ...disciple, path },
      path,
      targetNode: node.getInfo(),
    });

    return true;
  }

  private dispatchAiDisciple(disciple: Disciple, targetNodeId: number): boolean {
    if (disciple.status !== 'idle') return false;

    const marchingCount = this.aiDisciples.filter(d => d.status === 'marching').length;
    if (marchingCount >= this.getMaxDispatchTeams('ai')) return false;

    const node = this.resourceNodes.find(n => n.id === targetNodeId);
    if (!node) return false;

    const path = this.bfsPath(
      this.aiBase.gridX, this.aiBase.gridY,
      node.gridX, node.gridY,
      this.gridOccupied
    );
    if (path.length <= 1) return false;

    disciple.status = 'marching';
    disciple.targetNodeId = targetNodeId;
    disciple.path = path;
    disciple.pathIndex = 0;
    disciple.moveProgress = 0;
    disciple.pixelX = this.aiBase.gridX * CELL_SIZE + CELL_SIZE / 2;
    disciple.pixelY = this.aiBase.gridY * CELL_SIZE + CELL_SIZE / 2;

    this.emitter.emit('ai-disciple-dispatched', {
      disciple: { ...disciple, path },
      path,
      targetNode: node.getInfo(),
    });

    return true;
  }

  researchTech(techId: string): boolean {
    const tech = this.techTree.find(t => t.id === techId);
    if (!tech || tech.researched || tech.researching) return false;

    for (const preId of tech.prerequisites) {
      const pre = this.techTree.find(t => t.id === preId);
      if (!pre || !pre.researched) return false;
    }

    if (this.playerResources.ore < tech.cost.ore ||
        this.playerResources.herb < tech.cost.herb ||
        this.playerResources.spring < tech.cost.spring) return false;

    this.playerResources.ore -= tech.cost.ore;
    this.playerResources.herb -= tech.cost.herb;
    this.playerResources.spring -= tech.cost.spring;

    tech.researching = true;
    tech.researchTimer = tech.researchDuration;

    this.emitter.emit('tech-start', { techId, tech: { ...tech } });
    this.emitter.emit('resource-change', { ...this.playerResources });

    return true;
  }

  handleNodeClick(nodeId: number): void {
    const node = this.resourceNodes.find(n => n.id === nodeId);
    if (!node) return;

    const idleDisciples = this.playerDisciples.filter(d => d.status === 'idle');
    const marchingCount = this.playerDisciples.filter(d => d.status === 'marching').length;
    const maxTeams = this.getMaxDispatchTeams('player');

    this.emitter.emit('node-selected', {
      node: node.getInfo(),
      idleDisciples: idleDisciples.map(d => ({
        id: d.id,
        name: d.name,
        level: d.level,
        basePower: d.basePower,
        effectivePower: this.getEffectivePower(d),
      })),
      canDispatch: marchingCount < maxTeams,
      remainingSlots: maxTeams - marchingCount,
    });
  }

  private executeBattle(disciple: Disciple, node: ResourceNode): void {
    const attackPower = disciple.faction === 'player'
      ? this.getEffectivePower(disciple)
      : disciple.basePower;

    const defenseFaction = node.owner;
    let defenseBonus = 0;
    if (defenseFaction === 'player') {
      defenseBonus = this.getDefenseBonus('player');
    }
    const result: BattleResult = node.battle(attackPower, disciple.faction, defenseBonus);

    this.emitter.emit('battle-start', {
      disciple: { id: disciple.id, name: disciple.name, faction: disciple.faction },
      node: node.getInfo(),
    });

    this.emitter.emit('battle-visual', {
      x: node.x,
      y: node.y,
    });

    this.emitter.emit('battle-result', {
      result,
      disciple: { id: disciple.id, name: disciple.name, faction: disciple.faction },
      node: node.getInfo(),
    });

    if (result.attackerWon) {
      this.emitter.emit('node-occupied', {
        nodeId: node.id,
        newOwner: disciple.faction,
        contestCount: node.contestCount,
        x: node.x,
        y: node.y,
      });
    } else {
      disciple.status = 'resting';
      disciple.restTimer = disciple.faction === 'player'
        ? this.getRestDuration('player')
        : REST_DURATION;
      disciple.targetNodeId = null;
      disciple.path = [];

      const base = disciple.faction === 'player' ? this.playerBase : this.aiBase;
      disciple.pixelX = base.gridX * CELL_SIZE + CELL_SIZE / 2;
      disciple.pixelY = base.gridY * CELL_SIZE + CELL_SIZE / 2;

      this.emitter.emit('disciple-resting', {
        disciple: { id: disciple.id, name: disciple.name, faction: disciple.faction },
        restTimer: disciple.restTimer,
      });
    }
  }

  private aiMakeDecision(): void {
    const idleAi = this.aiDisciples.filter(d => d.status === 'idle');
    if (idleAi.length === 0) return;

    const aiOwned = this.resourceNodes.filter(n => n.owner === 'ai');
    const oreCount = aiOwned.filter(n => n.type === 'mine').length;
    const herbCount = aiOwned.filter(n => n.type === 'herb').length;
    const springCount = aiOwned.filter(n => n.type === 'spring').length;

    const shortages: { type: ResourceType; count: number }[] = [
      { type: 'mine', count: oreCount },
      { type: 'herb', count: herbCount },
      { type: 'spring', count: springCount },
    ];
    shortages.sort((a, b) => a.count - b.count);

    const marchingCount = this.aiDisciples.filter(d => d.status === 'marching').length;
    if (marchingCount >= this.getMaxDispatchTeams('ai')) return;

    for (const shortage of shortages) {
      const targets = this.resourceNodes.filter(
        n => n.type === shortage.type && n.owner !== 'ai'
      );
      if (targets.length === 0) continue;

      const disciple = idleAi.shift();
      if (!disciple) break;

      const target = targets[Math.floor(Math.random() * targets.length)];
      this.dispatchAiDisciple(disciple, target.id);
    }
  }

  update(dt: number): void {
    this.aiEvalTimer += dt;
    if (this.aiEvalTimer >= AI_EVAL_INTERVAL) {
      this.aiEvalTimer -= AI_EVAL_INTERVAL;
      this.aiMakeDecision();
    }

    this.collectTimer += dt;
    if (this.collectTimer >= 1) {
      this.collectTimer -= 1;
      this.collectResources();
    }

    this.updateDisciples(dt, this.playerDisciples);
    this.updateDisciples(dt, this.aiDisciples);
    this.updateTechResearch(dt);
    this.updateNodePulses(dt);
  }

  private updateDisciples(dt: number, disciples: Disciple[]): void {
    for (const d of disciples) {
      if (d.status === 'marching') {
        d.moveProgress += dt / MOVE_TIME_PER_CELL;

        while (d.moveProgress >= 1 && d.pathIndex < d.path.length - 1) {
          d.moveProgress -= 1;
          d.pathIndex++;
        }

        if (d.pathIndex >= d.path.length - 1) {
          d.moveProgress = 0;
          const node = this.resourceNodes.find(n => n.id === d.targetNodeId);
          if (node) {
            d.status = 'idle';
            d.path = [];
            d.pathIndex = 0;
            this.executeBattle(d, node);
          }
        } else {
          const from = d.path[d.pathIndex];
          const toIdx = Math.min(d.pathIndex + 1, d.path.length - 1);
          const to = d.path[toIdx];
          const t = d.moveProgress;
          d.pixelX = (from.x + (to.x - from.x) * t) * CELL_SIZE + CELL_SIZE / 2;
          d.pixelY = (from.y + (to.y - from.y) * t) * CELL_SIZE + CELL_SIZE / 2;
        }
      } else if (d.status === 'resting') {
        d.restTimer -= dt;
        if (d.restTimer <= 0) {
          d.restTimer = 0;
          d.status = 'idle';
          const base = d.faction === 'player' ? this.playerBase : this.aiBase;
          d.pixelX = base.gridX * CELL_SIZE + CELL_SIZE / 2;
          d.pixelY = base.gridY * CELL_SIZE + CELL_SIZE / 2;
          this.emitter.emit('disciple-ready', {
            id: d.id,
            name: d.name,
            faction: d.faction,
          });
        }
      }
    }
  }

  private updateTechResearch(dt: number): void {
    for (const tech of this.techTree) {
      if (!tech.researching) continue;
      tech.researchTimer -= dt;
      this.emitter.emit('tech-progress', {
        techId: tech.id,
        remaining: Math.max(0, tech.researchTimer),
        total: tech.researchDuration,
      });

      if (tech.researchTimer <= 0) {
        tech.researching = false;
        tech.researched = true;
        tech.researchTimer = 0;
        this.emitter.emit('tech-complete', { techId: tech.id, tech: { ...tech } });
      }
    }
  }

  private updateNodePulses(dt: number): void {
    for (const node of this.resourceNodes) {
      node.updatePulse(dt);
    }
  }

  private collectResources(): void {
    for (const node of this.resourceNodes) {
      if (node.owner === 'player') {
        const mult = this.getYieldMultiplier('player');
        const amount = Math.round(node.baseYield * mult);
        switch (node.type) {
          case 'mine': this.playerResources.ore += amount; break;
          case 'herb': this.playerResources.herb += amount; break;
          case 'spring': this.playerResources.spring += amount; break;
        }
        this.emitter.emit('resource-collected', {
          type: node.type,
          amount,
          x: node.x,
          y: node.y,
        });
      } else if (node.owner === 'ai') {
        switch (node.type) {
          case 'mine': this.aiResources.ore += node.baseYield; break;
          case 'herb': this.aiResources.herb += node.baseYield; break;
          case 'spring': this.aiResources.spring += node.baseYield; break;
        }
      }
    }
    this.emitter.emit('resource-change', { ...this.playerResources });
  }

  getNodeById(id: number): ResourceNode | undefined {
    return this.resourceNodes.find(n => n.id === id);
  }

  getSelectedNodeInfo(nodeId: number): ResourceNodeData | null {
    const node = this.resourceNodes.find(n => n.id === nodeId);
    return node ? node.getInfo() : null;
  }
}
