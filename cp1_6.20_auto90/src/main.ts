import { Player, SPELLS, PlayerData } from './player';
import { SCENES, Scene, SceneObject, SceneExit, MonsterData, triggerRandomEvent, RandomEvent, ObjectOption } from './scene';
import { NPCManager, NPC, DialogueOption } from './npc';

const BASE_WIDTH = 1280;
const BASE_HEIGHT = 720;
const GAME_WIDTH = 800;
const GAME_HEIGHT = 450;
const PANEL_WIDTH = 480;

type GameState = 'menu' | 'playing' | 'dialogue' | 'object_interact' | 'combat' | 'random_event' | 'save_menu' | 'load_menu';
type CombatTurn = 'player' | 'enemy' | 'none';

interface UIButton {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  onClick: () => void;
  scale?: number;
  hovered?: boolean;
  visible?: boolean;
  enabled?: boolean;
  disabledReason?: string;
  color?: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface SaveData {
  timestamp: number;
  player: PlayerData;
  npcs: Record<string, NPC>;
  description: string;
}

const SAVE_KEY = 'magic_academy_save_';
const AUTO_SAVE_KEY = 'magic_academy_autosave';

class Game {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number = BASE_WIDTH;
  height: number = BASE_HEIGHT;
  scale: number = 1;
  offsetX: number = 0;
  offsetY: number = 0;

  gameState: GameState = 'menu';
  player: Player;
  npcManager: NPCManager;
  currentScene: Scene;
  currentNPC: NPC | null = null;
  currentObject: SceneObject | null = null;
  currentRandomEvent: RandomEvent | null = null;
  combatMonster: MonsterData | null = null;
  combatTurn: CombatTurn = 'none';
  combatMessage: string = '';
  combatBuffActive: boolean = false;
  combatShieldActive: number = 0;
  combatSlowActive: boolean = false;
  combatBurnActive: number = 0;
  combatFreezeActive: number = 0;

  buttons: UIButton[] = [];
  particles: Particle[] = [];
  hoveredButton: UIButton | null = null;
  sceneTransitionAlpha: number = 0;
  sceneTransitionDirection: 'in' | 'out' | 'none' = 'none';
  nextSceneId: string | null = null;
  currentMessage: string = '';
  messageAlpha: number = 0;
  messageTimer: number = 0;
  lastTime: number = 0;
  manaRegenTimer: number = 0;
  needAutoSave: boolean = false;
  combatAnimTime: number = 0;
  combatShakeTime: number = 0;
  spellFlashTime: number = 0;
  spellFlashColor: string = '#ffffff';

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.player = new Player();
    this.npcManager = new NPCManager();
    this.currentScene = SCENES['hall'];

    this.setupCanvas();
    this.setupEventListeners();
    this.checkAutoSave();
    this.gameLoop(0);
  }

  setupCanvas() {
    const resize = () => {
      const container = document.getElementById('game-container')!;
      const cw = container.clientWidth;
      const ch = container.clientHeight;

      const scale = Math.max(0.5, Math.min(cw / BASE_WIDTH, ch / BASE_HEIGHT));
      this.width = Math.max(800, Math.floor(BASE_WIDTH * scale));
      this.height = Math.max(450, Math.floor(BASE_HEIGHT * scale));
      this.scale = scale;

      this.canvas.width = this.width;
      this.canvas.height = this.height;
      this.canvas.style.width = this.width + 'px';
      this.canvas.style.height = this.height + 'px';

      this.offsetX = 0;
      this.offsetY = 0;
    };
    resize();
    window.addEventListener('resize', resize);
  }

  setupEventListeners() {
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / this.scale;
      const y = (e.clientY - rect.top) / this.scale;
      this.handleMouseMove(x, y);
    });

    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / this.scale;
      const y = (e.clientY - rect.top) / this.scale;
      this.handleClick(x, y);
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.hoveredButton = null;
    });
  }

  handleMouseMove(x: number, y: number) {
    this.hoveredButton = null;
    for (const btn of this.buttons) {
      if (btn.visible === false) continue;
      const scale = btn.scale || 1;
      const bw = btn.w * scale;
      const bh = btn.h * scale;
      const bx = btn.x - (bw - btn.w) / 2;
      const by = btn.y - (bh - btn.h) / 2;
      if (x >= bx && x <= bx + bw && y >= by && y <= by + bh) {
        this.hoveredButton = btn;
        btn.hovered = true;
        btn.scale = 1.05;
      } else {
        btn.hovered = false;
        btn.scale = 1;
      }
    }
  }

  handleClick(x: number, y: number) {
    for (const btn of this.buttons) {
      if (btn.visible === false) continue;
      if (btn.enabled === false) continue;
      const scale = btn.scale || 1;
      const bw = btn.w * scale;
      const bh = btn.h * scale;
      const bx = btn.x - (bw - btn.w) / 2;
      const by = btn.y - (bh - btn.h) / 2;
      if (x >= bx && x <= bx + bw && y >= by && y <= by + bh) {
        btn.onClick();
        return;
      }
    }

    if (this.gameState === 'playing' && this.sceneTransitionDirection === 'none') {
      this.handleSceneClick(x, y);
    }
  }

  handleSceneClick(x: number, y: number) {
    const gx = x;
    const gy = y;
    if (gx > BASE_WIDTH - PANEL_WIDTH) return;

    const sx = (gx / (BASE_WIDTH - PANEL_WIDTH)) * GAME_WIDTH;
    const sy = (gy / BASE_HEIGHT) * GAME_HEIGHT;

    for (const exit of this.currentScene.exits) {
      const dx = sx - exit.position.x;
      const dy = sy - exit.position.y;
      if (Math.sqrt(dx * dx + dy * dy) < 45) {
        const targetScene = SCENES[exit.targetSceneId];
        if (targetScene && this.player.data.unlockedScenes.includes(exit.targetSceneId)) {
          this.changeScene(exit.targetSceneId);
          return;
        } else if (targetScene) {
          this.showMessage('该场景尚未解锁！');
          return;
        }
      }
    }

    for (const obj of this.currentScene.objects) {
      const dx = sx - obj.position.x;
      const dy = sy - obj.position.y;
      if (Math.sqrt(dx * dx + dy * dy) < 40) {
        this.openObjectInteraction(obj);
        return;
      }
    }

    for (const npcId of this.currentScene.npcIds) {
      const npc = this.npcManager.getNPC(npcId);
      if (!npc) continue;
      const dx = sx - npc.position.x;
      const dy = sy - npc.position.y;
      if (Math.sqrt(dx * dx + dy * dy) < 45) {
        this.openNPCDialogue(npc);
        return;
      }
    }
  }

  changeScene(sceneId: string) {
    this.nextSceneId = sceneId;
    this.sceneTransitionDirection = 'out';
    this.sceneTransitionAlpha = 0;
  }

  finishSceneChange() {
    if (this.nextSceneId) {
      this.currentScene = SCENES[this.nextSceneId];
      this.player.setScene(this.nextSceneId);
      this.nextSceneId = null;
      this.needAutoSave = true;

      const event = triggerRandomEvent(this.currentScene);
      if (event) {
        this.currentRandomEvent = event;
        this.gameState = 'random_event';
        this.buildRandomEventButtons();
      }
    }
    this.sceneTransitionDirection = 'in';
  }

  openObjectInteraction(obj: SceneObject) {
    this.currentObject = obj;
    this.gameState = 'object_interact';
    this.buildObjectButtons();
  }

  openNPCDialogue(npc: NPC) {
    this.currentNPC = npc;
    this.gameState = 'dialogue';
    this.buildDialogueButtons();
  }

  startCombat(monster: MonsterData) {
    this.combatMonster = JSON.parse(JSON.stringify(monster));
    this.combatTurn = 'player';
    this.combatMessage = `遭遇了 ${monster.name}！`;
    this.combatBuffActive = false;
    this.combatShieldActive = 0;
    this.combatSlowActive = false;
    this.combatBurnActive = 0;
    this.combatFreezeActive = 0;
    this.gameState = 'combat';
    this.buildCombatButtons();
  }

  endCombat(victory: boolean) {
    if (victory && this.combatMonster) {
      const exp = this.combatMonster.expReward;
      const leveledUp = this.player.addExp(exp);
      let msg = `击败了 ${this.combatMonster.name}！获得 ${exp} 经验值！`;

      if (this.combatMonster.drops) {
        for (const drop of this.combatMonster.drops) {
          if (Math.random() < drop.chance) {
            this.player.addItem(drop.id, drop.name, drop.type, drop.description);
            msg += ` 获得了 ${drop.name}！`;
          }
        }
      }

      if (leveledUp) {
        msg += ` 升级了！等级提升至 ${this.player.data.stats.level}！`;
      }

      this.showMessage(msg);
      this.spawnVictoryParticles();
    } else if (!victory) {
      this.showMessage('你被击败了...回到宿舍休息');
      this.player.data.stats.hp = Math.floor(this.player.data.stats.maxHp * 0.3);
      this.player.data.stats.mana = Math.floor(this.player.data.stats.maxMana * 0.3);
      this.changeScene('dormitory');
    }

    this.needAutoSave = true;
    this.combatMonster = null;
    this.combatTurn = 'none';
    this.gameState = 'playing';
  }

  playerAttack() {
    if (this.combatTurn !== 'player' || !this.combatMonster) return;
    if (!this.player.useMana(5)) {
      this.combatMessage = '魔力不足！';
      return;
    }
    let damage = 10 + this.player.data.stats.combatLevel * 3 + Math.floor(Math.random() * 6);
    if (this.combatBuffActive) {
      damage = Math.floor(damage * 1.5);
      this.combatBuffActive = false;
    }
    damage = Math.max(1, damage - this.combatMonster.defense);
    this.combatMonster.hp -= damage;
    this.combatMessage = `你发动攻击，造成 ${damage} 点伤害！`;
    this.combatShakeTime = 0.3;
    this.spawnAttackParticles();

    if (this.combatMonster.hp <= 0) {
      setTimeout(() => this.endCombat(true), 800);
      this.combatTurn = 'none';
      return;
    }
    this.combatTurn = 'enemy';
    setTimeout(() => this.enemyTurn(), 1000);
  }

  playerDefend() {
    if (this.combatTurn !== 'player') return;
    this.combatShieldActive = 999;
    this.combatMessage = '你进入防御姿态，下次伤害减半！';
    this.combatTurn = 'enemy';
    setTimeout(() => this.enemyTurn(), 800);
  }

  playerUseSpell(spellId: string) {
    if (this.combatTurn !== 'player' || !this.combatMonster) return;
    const spell = this.player.useSpell(spellId);
    if (!spell) {
      this.combatMessage = '无法使用该魔法！';
      return;
    }
    this.spellFlashTime = 0.4;
    let msg = `你释放了「${spell.name}」！`;

    switch (spell.effect) {
      case 'damage': {
        let dmg = spell.damage + Math.floor(Math.random() * 10);
        if (this.combatBuffActive) { dmg = Math.floor(dmg * 1.5); this.combatBuffActive = false; }
        dmg = Math.max(1, dmg - this.combatMonster.defense);
        this.combatMonster.hp -= dmg;
        msg += ` 造成 ${dmg} 点伤害！`;
        this.spellFlashColor = '#ef4444';
        this.spawnSpellParticles('#ef4444');
        this.combatShakeTime = 0.5;
        break;
      }
      case 'heal': {
        const heal = spell.damage;
        this.player.heal(heal);
        msg += ` 恢复 ${heal} 点生命！`;
        this.spellFlashColor = '#22c55e';
        this.spawnSpellParticles('#22c55e');
        break;
      }
      case 'slow': {
        this.combatSlowActive = 3;
        msg += ' 敌人行动减缓！';
        this.spellFlashColor = '#60a5fa';
        this.spawnSpellParticles('#60a5fa');
        break;
      }
      case 'freeze': {
        let dmg = spell.damage;
        if (this.combatBuffActive) { dmg = Math.floor(dmg * 1.5); this.combatBuffActive = false; }
        dmg = Math.max(1, dmg - this.combatMonster.defense);
        this.combatMonster.hp -= dmg;
        this.combatFreezeActive = 2;
        msg += ` 造成 ${dmg} 伤害并冻结敌人！`;
        this.spellFlashColor = '#38bdf8';
        this.spawnSpellParticles('#38bdf8');
        this.combatShakeTime = 0.3;
        break;
      }
      case 'burn': {
        let dmg = spell.damage;
        if (this.combatBuffActive) { dmg = Math.floor(dmg * 1.5); this.combatBuffActive = false; }
        dmg = Math.max(1, dmg - this.combatMonster.defense);
        this.combatMonster.hp -= dmg;
        this.combatBurnActive = 3;
        msg += ` 造成 ${dmg} 伤害并附加中毒！`;
        this.spellFlashColor = '#a855f7';
        this.spawnSpellParticles('#a855f7');
        this.combatShakeTime = 0.3;
        break;
      }
      case 'shield': {
        this.combatShieldActive = spell.damage;
        msg += ` 获得 ${spell.damage} 点护盾！`;
        this.spellFlashColor = '#fbbf24';
        this.spawnSpellParticles('#fbbf24');
        break;
      }
      case 'aoe': {
        let dmg = spell.damage + Math.floor(Math.random() * 15);
        if (this.combatBuffActive) { dmg = Math.floor(dmg * 1.5); this.combatBuffActive = false; }
        dmg = Math.max(1, dmg - this.combatMonster.defense);
        this.combatMonster.hp -= dmg;
        msg += ` 造成 ${dmg} 点雷电伤害！`;
        this.spellFlashColor = '#facc15';
        this.spawnSpellParticles('#facc15');
        this.combatShakeTime = 0.6;
        break;
      }
      case 'buff': {
        this.combatBuffActive = true;
        msg += ' 下次攻击伤害提升50%！';
        this.spellFlashColor = '#f97316';
        this.spawnSpellParticles('#f97316');
        break;
      }
    }
    this.combatMessage = msg;

    if (this.combatMonster.hp <= 0) {
      setTimeout(() => this.endCombat(true), 800);
      this.combatTurn = 'none';
      return;
    }
    this.combatTurn = 'enemy';
    setTimeout(() => this.enemyTurn(), 1200);
  }

  enemyTurn() {
    if (!this.combatMonster || this.combatTurn !== 'enemy') return;

    if (this.combatFreezeActive > 0) {
      this.combatFreezeActive--;
      this.combatMessage = `${this.combatMonster.name} 被冻住了，无法行动！`;
      this.combatTurn = 'player';
      setTimeout(() => this.buildCombatButtons(), 600);
      return;
    }

    if (this.combatBurnActive > 0) {
      this.combatBurnActive--;
      const burnDmg = 8;
      this.combatMonster.hp -= burnDmg;
      this.combatMessage = `${this.combatMonster.name} 受到 ${burnDmg} 点持续伤害！`;
      if (this.combatMonster.hp <= 0) {
        setTimeout(() => this.endCombat(true), 600);
        this.combatTurn = 'none';
        return;
      }
    }

    setTimeout(() => {
      if (!this.combatMonster) return;
      let atk = this.combatMonster.attack + Math.floor(Math.random() * 5);
      if (this.combatSlowActive) {
        atk = Math.floor(atk * 0.5);
        this.combatSlowActive = false;
      }

      if (this.combatShieldActive > 0) {
        if (this.combatShieldActive >= 900) {
          atk = Math.floor(atk * 0.5);
          this.combatMessage = `${this.combatMonster.name} 攻击！伤害减半，造成 ${atk} 点伤害！`;
        } else {
          const absorbed = Math.min(atk, this.combatShieldActive);
          atk -= absorbed;
          this.combatShieldActive -= absorbed;
          this.combatMessage = `${this.combatMonster.name} 攻击！护盾吸收 ${absorbed}，受到 ${atk} 点伤害！`;
        }
        if (this.combatShieldActive < 900 && this.combatShieldActive <= 0) this.combatShieldActive = 0;
        if (this.combatShieldActive >= 900) this.combatShieldActive = 0;
      } else {
        this.combatMessage = `${this.combatMonster.name} 攻击！造成 ${atk} 点伤害！`;
      }
      this.combatShakeTime = 0.4;
      const dead = this.player.takeDamage(atk);
      if (dead) {
        setTimeout(() => this.endCombat(false), 1000);
        this.combatTurn = 'none';
        return;
      }
      this.combatTurn = 'player';
      this.buildCombatButtons();
    }, 600);
  }

  tryFlee() {
    if (this.combatTurn !== 'player') return;
    const success = Math.random() < 0.6;
    if (success) {
      this.combatMessage = '你成功逃跑了！';
      this.combatMonster = null;
      this.combatTurn = 'none';
      this.gameState = 'playing';
      this.showMessage('成功逃离战斗！');
    } else {
      this.combatMessage = '逃跑失败！';
      this.combatTurn = 'enemy';
      setTimeout(() => this.enemyTurn(), 800);
    }
  }

  useItemCombat(itemId: string) {
    if (this.combatTurn !== 'player') return;
    if (itemId === 'hp_potion' && this.player.hasItem('hp_potion')) {
      this.player.removeItem('hp_potion');
      this.player.heal(40);
      this.combatMessage = '使用生命药水，恢复40点生命！';
      this.combatTurn = 'enemy';
      setTimeout(() => this.enemyTurn(), 800);
    } else if (itemId === 'mana_potion' && this.player.hasItem('mana_potion')) {
      this.player.removeItem('mana_potion');
      this.player.restoreMana(30);
      this.combatMessage = '使用魔力药水，恢复30点魔力！';
      this.combatTurn = 'enemy';
      setTimeout(() => this.enemyTurn(), 800);
    } else if (itemId === 'elixir' && this.player.hasItem('elixir')) {
      this.player.removeItem('elixir');
      this.player.heal(this.player.data.stats.maxHp);
      this.player.restoreMana(this.player.data.stats.maxMana);
      this.combatMessage = '使用万能药剂，完全恢复！';
      this.combatTurn = 'enemy';
      setTimeout(() => this.enemyTurn(), 800);
    }
  }

  buildMenuButtons() {
    this.buttons = [];
    const cx = BASE_WIDTH / 2;
    const cy = BASE_HEIGHT / 2;

    this.buttons.push({
      x: cx, y: cy - 40, w: 280, h: 60,
      label: '✨ 开始新游戏',
      onClick: () => this.startNewGame()
    });

    const autoSave = this.loadAutoSaveData();
    this.buttons.push({
      x: cx, y: cy + 40, w: 280, h: 60,
      label: autoSave ? '📖 继续游戏' : '📖 继续游戏（无存档）',
      enabled: !!autoSave,
      onClick: () => this.loadAutoSave()
    });

    this.buttons.push({
      x: cx, y: cy + 120, w: 280, h: 60,
      label: '💾 读取存档',
      onClick: () => { this.gameState = 'load_menu'; this.buildLoadMenuButtons(); }
    });
  }

  buildPlayingButtons() {
    this.buttons = [];

    this.buttons.push({
      x: BASE_WIDTH - 110, y: 30, w: 90, h: 36,
      label: '💾 存档',
      onClick: () => { this.gameState = 'save_menu'; this.buildSaveMenuButtons(); }
    });

    this.buttons.push({
      x: BASE_WIDTH - 220, y: 30, w: 90, h: 36,
      label: '📖 读档',
      onClick: () => { this.gameState = 'load_menu'; this.buildLoadMenuButtons(); }
    });

    this.buttons.push({
      x: BASE_WIDTH - 330, y: 30, w: 90, h: 36,
      label: '🏠 主菜单',
      onClick: () => { this.gameState = 'menu'; this.buildMenuButtons(); }
    });

    if (this.player.hasItem('hp_potion')) {
      this.buttons.push({
        x: BASE_WIDTH - PANEL_WIDTH + 30, y: 560, w: 130, h: 40,
        label: `❤️ 生命药水 x${this.player.data.inventory.find(i => i.id === 'hp_potion')?.count}`,
        onClick: () => {
          this.player.removeItem('hp_potion');
          this.player.heal(40);
          this.showMessage('使用生命药水，恢复40点生命！');
          this.needAutoSave = true;
        }
      });
    }
    if (this.player.hasItem('mana_potion')) {
      this.buttons.push({
        x: BASE_WIDTH - PANEL_WIDTH + 175, y: 560, w: 130, h: 40,
        label: `💧 魔力药水 x${this.player.data.inventory.find(i => i.id === 'mana_potion')?.count}`,
        onClick: () => {
          this.player.removeItem('mana_potion');
          this.player.restoreMana(30);
          this.showMessage('使用魔力药水，恢复30点魔力！');
          this.needAutoSave = true;
        }
      });
    }
    if (this.player.hasItem('elixir')) {
      this.buttons.push({
        x: BASE_WIDTH - PANEL_WIDTH + 320, y: 560, w: 130, h: 40,
        label: `✨ 万能药剂 x${this.player.data.inventory.find(i => i.id === 'elixir')?.count}`,
        onClick: () => {
          this.player.removeItem('elixir');
          this.player.heal(this.player.data.stats.maxHp);
          this.player.restoreMana(this.player.data.stats.maxMana);
          this.showMessage('使用万能药剂，完全恢复！');
          this.needAutoSave = true;
        }
      });
    }
  }

  buildDialogueButtons() {
    this.buttons = [];
    if (!this.currentNPC) return;

    const options = this.npcManager.getAvailableOptions(this.currentNPC.id, this.player);
    const startY = 480;
    options.forEach((opt, idx) => {
      let enabled = true;
      let label = opt.text;
      if (opt.condition && !opt.condition(this.player)) {
        enabled = false;
        if (opt.conditionText) label += ` (${opt.conditionText})`;
      }
      this.buttons.push({
        x: 100, y: startY + idx * 55, w: BASE_WIDTH - 200, h: 45,
        label,
        enabled,
        onClick: () => this.selectDialogueOption(idx, opt)
      });
    });

    this.buttons.push({
      x: BASE_WIDTH / 2, y: startY + options.length * 55 + 20, w: 200, h: 45,
      label: '← 离开',
      onClick: () => {
        this.currentNPC = null;
        this.gameState = 'playing';
        this.buildPlayingButtons();
      }
    });
  }

  selectDialogueOption(idx: number, _opt: DialogueOption) {
    if (!this.currentNPC) return;
    const result = this.npcManager.executeDialogue(this.currentNPC.id, idx, this.player);
    if (result) {
      this.showMessage(result.message);
      this.needAutoSave = true;
    }
    this.buildDialogueButtons();
  }

  buildObjectButtons() {
    this.buttons = [];
    if (!this.currentObject) return;

    const startY = 420;
    this.currentObject.options.forEach((opt, idx) => {
      let enabled = true;
      let label = opt.text;
      if (opt.condition && !opt.condition(this.player)) {
        enabled = false;
        if (opt.conditionText) label += ` (${opt.conditionText})`;
      }
      this.buttons.push({
        x: 100, y: startY + idx * 55, w: BASE_WIDTH - 200, h: 45,
        label,
        enabled,
        onClick: () => this.selectObjectOption(opt)
      });
    });

    this.buttons.push({
      x: BASE_WIDTH / 2, y: startY + this.currentObject.options.length * 55 + 20, w: 200, h: 45,
      label: '← 取消',
      onClick: () => {
        this.currentObject = null;
        this.gameState = 'playing';
        this.buildPlayingButtons();
      }
    });
  }

  selectObjectOption(opt: ObjectOption) {
    const result = opt.action(this.player);
    if (result) {
      this.showMessage(result.message);
      if (result.unlockScene) {
        this.player.unlockScene(result.unlockScene);
      }
      this.needAutoSave = true;
    }
    if (this.currentObject) this.buildObjectButtons();
  }

  buildRandomEventButtons() {
    this.buttons = [];
    if (!this.currentRandomEvent) return;

    const startY = 450;
    this.currentRandomEvent.options.forEach((opt, idx) => {
      let enabled = true;
      let label = opt.text;
      if (opt.condition && !opt.condition(this.player)) {
        enabled = false;
      }
      this.buttons.push({
        x: 150, y: startY + idx * 55, w: BASE_WIDTH - 300, h: 45,
        label,
        enabled,
        onClick: () => {
          const res = opt.resolve(this.player);
          this.showMessage(res.message);
          if (res.result === 'fight' && this.currentRandomEvent?.monster) {
            this.startCombat(this.currentRandomEvent.monster);
          } else if (res.result === 'flee_fail' && this.currentRandomEvent?.monster) {
            setTimeout(() => this.startCombat(this.currentRandomEvent!.monster!), 800);
          } else {
            this.needAutoSave = true;
            this.currentRandomEvent = null;
            this.gameState = 'playing';
            this.buildPlayingButtons();
          }
        }
      });
    });
  }

  buildCombatButtons() {
    this.buttons = [];
    if (this.combatTurn !== 'player') return;

    this.buttons.push({
      x: 80, y: 620, w: 130, h: 50,
      label: '⚔️ 攻击 (-5MP)',
      enabled: this.player.data.stats.mana >= 5,
      onClick: () => this.playerAttack()
    });

    this.buttons.push({
      x: 230, y: 620, w: 130, h: 50,
      label: '🛡️ 防御',
      onClick: () => this.playerDefend()
    });

    this.buttons.push({
      x: 380, y: 620, w: 130, h: 50,
      label: '🏃 逃跑 (60%)',
      onClick: () => this.tryFlee()
    });

    if (this.player.hasItem('hp_potion')) {
      this.buttons.push({
        x: 530, y: 620, w: 130, h: 50,
        label: `❤️ HP药水`,
        onClick: () => this.useItemCombat('hp_potion')
      });
    }
    if (this.player.hasItem('mana_potion')) {
      this.buttons.push({
        x: 680, y: 620, w: 130, h: 50,
        label: `💧 MP药水`,
        onClick: () => this.useItemCombat('mana_potion')
      });
    }

    const learnedSpells = this.player.data.learnedSpells;
    learnedSpells.forEach((ls, idx) => {
      const spell = SPELLS[ls.spellId];
      if (!spell) return;
      const canUse = this.player.canUseSpell(ls.spellId);
      const cd = Math.ceil(ls.cooldownRemaining);
      this.buttons.push({
        x: 80 + (idx % 5) * 145, y: 675, w: 135, h: 38,
        label: cd > 0 ? `${spell.icon} ${spell.name} (CD:${cd}s)` : `${spell.icon} ${spell.name} (-${spell.manaCost}MP)`,
        enabled: canUse && this.combatTurn === 'player',
        onClick: () => this.playerUseSpell(ls.spellId)
      });
    });
  }

  buildSaveMenuButtons() {
    this.buttons = [];
    const cx = BASE_WIDTH / 2;
    const cy = BASE_HEIGHT / 2;

    for (let i = 1; i <= 3; i++) {
      const save = this.loadSaveSlot(i);
      const label = save
        ? `存档 ${i} - ${new Date(save.timestamp).toLocaleString('zh-CN')}\n   Lv.${save.player.stats.level} ${this.describeProgress(save)}`
        : `存档 ${i} - (空)`;
      this.buttons.push({
        x: cx, y: cy - 120 + (i - 1) * 90, w: 500, h: 70,
        label,
        onClick: () => { this.saveToSlot(i); this.showMessage(`已保存到存档 ${i}！`); }
      });
    }

    this.buttons.push({
      x: cx, y: cy + 170, w: 200, h: 45,
      label: '← 返回',
      onClick: () => { this.gameState = this.currentScene ? 'playing' : 'menu'; this.currentScene ? this.buildPlayingButtons() : this.buildMenuButtons(); }
    });
  }

  buildLoadMenuButtons() {
    this.buttons = [];
    const cx = BASE_WIDTH / 2;
    const cy = BASE_HEIGHT / 2;

    for (let i = 1; i <= 3; i++) {
      const save = this.loadSaveSlot(i);
      const label = save
        ? `读取存档 ${i} - ${new Date(save.timestamp).toLocaleString('zh-CN')}\n   Lv.${save.player.stats.level} ${this.describeProgress(save)}`
        : `存档 ${i} - (空)`;
      this.buttons.push({
        x: cx, y: cy - 120 + (i - 1) * 90, w: 500, h: 70,
        label,
        enabled: !!save,
        onClick: () => { this.loadFromSlot(i); this.showMessage(`读取存档 ${i} 成功！`); }
      });
    }

    this.buttons.push({
      x: cx, y: cy + 170, w: 200, h: 45,
      label: '← 返回',
      onClick: () => { this.gameState = this.currentScene && this.player.data.stats.level > 0 ? 'playing' : 'menu'; this.currentScene && this.player.data.stats.level > 0 ? this.buildPlayingButtons() : this.buildMenuButtons(); }
    });
  }

  describeProgress(save: SaveData): string {
    const scene = SCENES[save.player.currentSceneId];
    return scene ? `· ${scene.name}` : '';
  }

  startNewGame() {
    this.player = new Player();
    this.npcManager = new NPCManager();
    this.currentScene = SCENES['hall'];
    this.currentNPC = null;
    this.currentObject = null;
    this.currentRandomEvent = null;
    this.combatMonster = null;
    this.gameState = 'playing';
    this.showMessage('欢迎来到魔法学院！你的冒险开始了...');
    this.buildPlayingButtons();
    this.autoSave();
  }

  saveToSlot(slot: number) {
    const data: SaveData = {
      timestamp: Date.now(),
      player: this.player.serialize(),
      npcs: this.npcManager.serialize(),
      description: `等级 ${this.player.data.stats.level} · ${this.currentScene.name}`
    };
    localStorage.setItem(SAVE_KEY + slot, JSON.stringify(data));
  }

  loadSaveSlot(slot: number): SaveData | null {
    try {
      const raw = localStorage.getItem(SAVE_KEY + slot);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  loadFromSlot(slot: number) {
    const data = this.loadSaveSlot(slot);
    if (!data) return;
    this.applySaveData(data);
  }

  loadAutoSaveData(): SaveData | null {
    try {
      const raw = localStorage.getItem(AUTO_SAVE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  checkAutoSave() {
    const data = this.loadAutoSaveData();
    this.gameState = 'menu';
    this.buildMenuButtons();
  }

  loadAutoSave() {
    const data = this.loadAutoSaveData();
    if (data) this.applySaveData(data);
  }

  applySaveData(data: SaveData) {
    this.player.deserialize(data.player);
    this.npcManager.deserialize(data.npcs);
    this.currentScene = SCENES[data.player.currentSceneId] || SCENES['hall'];
    this.currentNPC = null;
    this.currentObject = null;
    this.currentRandomEvent = null;
    this.combatMonster = null;
    this.gameState = 'playing';
    this.buildPlayingButtons();
  }

  autoSave() {
    const data: SaveData = {
      timestamp: Date.now(),
      player: this.player.serialize(),
      npcs: this.npcManager.serialize(),
      description: `等级 ${this.player.data.stats.level} · ${this.currentScene.name}`
    };
    try { localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(data)); } catch {}
    this.needAutoSave = false;
  }

  showMessage(msg: string) {
    this.currentMessage = msg;
    this.messageAlpha = 1;
    this.messageTimer = 3.5;
  }

  spawnParticles(x: number, y: number, color: string, count: number = 15, speed: number = 150) {
    for (let i = 0; i < count && this.particles.length < 100; i++) {
      const angle = Math.random() * Math.PI * 2;
      const s = Math.random() * speed + 50;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * s,
        vy: Math.sin(angle) * s - 50,
        life: 0.6 + Math.random() * 0.4,
        maxLife: 1,
        color,
        size: 3 + Math.random() * 4
      });
    }
  }

  spawnAttackParticles() {
    this.spawnParticles(GAME_WIDTH * 0.65, GAME_HEIGHT * 0.4, '#ef4444', 12, 120);
  }

  spawnSpellParticles(color: string) {
    this.spawnParticles(GAME_WIDTH * 0.35, GAME_HEIGHT * 0.4, color, 20, 180);
  }

  spawnVictoryParticles() {
    for (let i = 0; i < 6; i++) {
      setTimeout(() => {
        this.spawnParticles(
          GAME_WIDTH * (0.2 + Math.random() * 0.6),
          GAME_HEIGHT * (0.2 + Math.random() * 0.5),
          ['#fbbf24', '#22c55e', '#60a5fa', '#ec4899'][i % 4],
          8, 100
        );
      }, i * 100);
    }
  }

  update(dt: number) {
    if (this.messageTimer > 0) {
      this.messageTimer -= dt;
      if (this.messageTimer <= 0.5) {
        this.messageAlpha = Math.max(0, this.messageTimer / 0.5);
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 200 * dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    if (this.gameState === 'playing') {
      this.player.updateCooldowns(dt);
      this.manaRegenTimer += dt;
      if (this.manaRegenTimer >= 2) {
        this.player.restoreMana(1);
        this.manaRegenTimer = 0;
      }
      if (this.needAutoSave) this.autoSave();
    }

    if (this.gameState === 'combat') {
      this.player.updateCooldowns(dt);
      if (this.combatTurn === 'player') this.buildCombatButtons();
    }

    if (this.sceneTransitionDirection === 'out') {
      this.sceneTransitionAlpha += dt * 3;
      if (this.sceneTransitionAlpha >= 1) {
        this.sceneTransitionAlpha = 1;
        this.finishSceneChange();
      }
    } else if (this.sceneTransitionDirection === 'in') {
      this.sceneTransitionAlpha -= dt * 3;
      if (this.sceneTransitionAlpha <= 0) {
        this.sceneTransitionAlpha = 0;
        this.sceneTransitionDirection = 'none';
        this.buildPlayingButtons();
      }
    }

    if (this.combatShakeTime > 0) this.combatShakeTime = Math.max(0, this.combatShakeTime - dt);
    if (this.spellFlashTime > 0) this.spellFlashTime = Math.max(0, this.spellFlashTime - dt);
  }

  render() {
    const ctx = this.ctx;
    ctx.save();
    ctx.scale(this.scale, this.scale);

    this.renderBackground();

    if (this.gameState === 'menu') {
      this.renderMenu();
    } else if (this.gameState === 'save_menu' || this.gameState === 'load_menu') {
      this.renderSaveLoadBackground();
    } else {
      this.renderScene();
      this.renderPanel();
      this.renderSpells();

      if (this.gameState === 'dialogue') this.renderDialogueBox();
      else if (this.gameState === 'object_interact') this.renderObjectInteraction();
      else if (this.gameState === 'random_event') this.renderRandomEvent();
      else if (this.gameState === 'combat') this.renderCombat();
    }

    this.renderButtons();
    this.renderMessage();
    this.renderParticles();

    if (this.sceneTransitionAlpha > 0) {
      ctx.fillStyle = `rgba(10, 10, 20, ${this.sceneTransitionAlpha})`;
      ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);
    }

    ctx.restore();
  }

  renderBackground() {
    const ctx = this.ctx;
    const grad = ctx.createLinearGradient(0, 0, 0, BASE_HEIGHT);
    grad.addColorStop(0, '#1a0a2e');
    grad.addColorStop(1, '#0d1b2a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    for (let i = 0; i < 50; i++) {
      const sx = (i * 97) % BASE_WIDTH;
      const sy = (i * 53) % BASE_HEIGHT;
      const r = ((i * 13) % 20) / 10 + 0.5;
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  renderMenu() {
    const ctx = this.ctx;
    const cx = BASE_WIDTH / 2;
    const cy = BASE_HEIGHT / 2;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#a78bfa';
    ctx.font = 'bold 64px "JetBrains Mono", monospace';
    ctx.shadowColor = '#8b5cf6';
    ctx.shadowBlur = 30;
    ctx.fillText('✨ 魔法学院 ✨', cx, cy - 180);
    ctx.shadowBlur = 0;

    ctx.font = '22px "JetBrains Mono", monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('Magic Academy Simulation', cx, cy - 130);

    ctx.font = '16px "JetBrains Mono", monospace';
    ctx.fillStyle = '#64748b';
    ctx.fillText('探索 · 学习魔法 · 解开学院的秘密', cx, cy - 90);
    ctx.restore();
  }

  renderSaveLoadBackground() {
    const ctx = this.ctx;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#a78bfa';
    ctx.font = 'bold 40px "JetBrains Mono", monospace';
    ctx.fillText(this.gameState === 'save_menu' ? '💾 保存游戏' : '📖 读取存档', BASE_WIDTH / 2, 120);
    ctx.restore();
  }

  renderScene() {
    const ctx = this.ctx;
    const sx = 0;
    const sy = 0;
    const sw = BASE_WIDTH - PANEL_WIDTH;
    const sh = BASE_HEIGHT;

    const scene = this.currentScene;
    const grad = ctx.createLinearGradient(sx, sy, sx, sy + sh);
    grad.addColorStop(0, scene.ambientColor.start);
    grad.addColorStop(1, scene.ambientColor.end);
    ctx.fillStyle = grad;
    ctx.fillRect(sx, sy, sw, sh);

    const scaleX = sw / GAME_WIDTH;
    const scaleY = sh / GAME_HEIGHT;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.scale(scaleX, scaleY);

    let shakeX = 0, shakeY =  0;
    if (this.combatShakeTime > 0 && this.gameState === 'combat') {
      shakeX = (Math.random() - 0.5) * 8;
      shakeY = (Math.random() - 0.5) * 8;
    }
    ctx.translate(shakeX, shakeY);

    for (const decor of scene.decor) {
      ctx.fillStyle = decor.color || '#ffffff40';
      ctx.strokeStyle = decor.color || '#ffffff40';
      ctx.lineWidth = 4;
      if (decor.type === 'rect') {
        ctx.fillRect(decor.x, decor.y, decor.w || 10, decor.h || 10);
      } else if (decor.type === 'circle') {
        ctx.beginPath();
        ctx.arc(decor.x, decor.y, decor.r || 10, 0, Math.PI * 2);
        ctx.fill();
      } else if (decor.type === 'line') {
        ctx.beginPath();
        ctx.moveTo(decor.x, decor.y);
        ctx.lineTo(decor.w || 0, decor.h || 0);
        ctx.stroke();
      } else if (decor.type === 'text') {
        ctx.fillStyle = decor.color || '#e0e0e0';
        ctx.font = `bold ${decor.fontSize || 18}px "JetBrains Mono", monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(decor.text || '', decor.x, decor.y);
      }
    }

    ctx.textAlign = 'center';
    for (const exit of scene.exits) {
      const unlocked = this.player.data.unlockedScenes.includes(exit.targetSceneId);
      ctx.save();
      ctx.globalAlpha = unlocked ? 1 : 0.4;
      ctx.fillStyle = unlocked ? '#8b5cf680' : '#64748b40';
      ctx.strokeStyle = unlocked ? '#8b5cf6' : '#64748b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(exit.position.x - 55, exit.position.y - 22, 110, 44, 12);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#e0e0e0';
      ctx.font = '14px "JetBrains Mono", monospace';
      ctx.fillText(exit.label, exit.position.x, exit.position.y + 5);
      ctx.restore();
    }

    for (const obj of scene.objects) {
      this.renderSceneIcon(obj.icon, obj.position.x, obj.position.y, obj.name);
    }

    for (const npcId of scene.npcIds) {
      const npc = this.npcManager.getNPC(npcId);
      if (!npc) continue;
      this.renderSceneIcon(npc.icon, npc.position.x, npc.position.y, npc.name, npc.color);
    }

    ctx.fillStyle = '#e0e0e0';
    ctx.font = 'bold 20px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`📍 ${scene.name}`, 20, 35);

    ctx.restore();
  }

  renderSceneIcon(icon: string, x: number, y: number, label: string, color: string = '#8b5cf6') {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = color + '30';
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 32, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.font = '30px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#e0e0e0';
    ctx.fillText(icon, x, y);
    ctx.font = '12px "JetBrains Mono", monospace';
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText(label, x, y + 48);
    ctx.textBaseline = 'alphabetic';
    ctx.restore();
  }

  renderPanel() {
    const ctx = this.ctx;
    const px = BASE_WIDTH - PANEL_WIDTH;
    const pw = PANEL_WIDTH;
    const ph = BASE_HEIGHT;

    ctx.fillStyle = 'rgba(15, 15, 30, 0.95)';
    ctx.fillRect(px, 0, pw, ph);
    ctx.strokeStyle = '#8b5cf640';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px, 0);
    ctx.lineTo(px, ph);
    ctx.stroke();

    const s = this.player.data.stats;

    ctx.save();
    ctx.fillStyle = '#e0e0e0';
    ctx.font = 'bold 20px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('🧙 玩家状态', px + 20, 85);

    ctx.font = '15px "JetBrains Mono", monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`等级:`, px + 20, 120);
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 22px "JetBrains Mono", monospace';
    ctx.fillText(`${s.level}`, px + 95, 122);
    ctx.fillStyle = '#a78bfa';
    ctx.font = '13px "JetBrains Mono", monospace';
    ctx.fillText(`(技能点: ${s.skillPoints})`, px + 145, 122);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '13px "JetBrains Mono", monospace';
    ctx.fillText('生命值', px + 20, 150);
    this.renderBar(px + 20, 160, pw - 40, 20, s.hp, s.maxHp, '#22c55e', '#16a34a');
    ctx.fillStyle = '#e0e0e0';
    ctx.font = '12px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${s.hp} / ${s.maxHp}`, px + pw / 2, 175);
    ctx.textAlign = 'left';

    ctx.fillStyle = '#94a3b8';
    ctx.font = '13px "JetBrains Mono", monospace';
    ctx.fillText('魔力值', px + 20, 205);
    this.renderBar(px + 20, 215, pw - 40, 20, s.mana, s.maxMana, '#3b82f6', '#1d4ed8');
    ctx.fillStyle = '#e0e0e0';
    ctx.font = '12px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${s.mana} / ${s.maxMana}`, px + pw / 2, 230);
    ctx.textAlign = 'left';

    ctx.fillStyle = '#94a3b8';
    ctx.font = '13px "JetBrains Mono", monospace';
    ctx.fillText('经验值', px + 20, 260);
    this.renderBar(px + 20, 270, pw - 40, 20, s.exp, s.expToNext, '#22c55e', '#16a34a');
    ctx.fillStyle = '#e0e0e0';
    ctx.font = '12px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${s.exp} / ${s.expToNext}`, px + pw / 2, 285);
    ctx.textAlign = 'left';

    ctx.fillStyle = '#94a3b8';
    ctx.font = '13px "JetBrains Mono", monospace';
    const stats = [
      { label: '📚 知识', val: s.knowledge },
      { label: '⚗️ 炼金', val: `Lv.${s.alchemyLevel}` },
      { label: '⚔️ 战斗', val: `Lv.${s.combatLevel}` }
    ];
    stats.forEach((st, i) => {
      ctx.fillText(`${st.label}: ${st.val}`, px + 20 + i * 150, 320);
    });

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 16px "JetBrains Mono", monospace';
    ctx.fillText('🎒 背包', px + 20, 360);

    const items = this.player.data.inventory;
    ctx.font = '12px "JetBrains Mono", monospace';
    ctx.fillStyle = '#cbd5e1';
    if (items.length === 0) {
      ctx.fillText('(空)', px + 20, 385);
    } else {
      items.slice(0, 6).forEach((item, i) => {
        const iy = 385 + i * 22;
        if (iy > 540) return;
        ctx.fillStyle = '#e0e0e0';
        ctx.fillText(`• ${item.name} x${item.count}`, px + 20, iy);
      });
      if (items.length > 6) {
        ctx.fillStyle = '#64748b';
        ctx.fillText(`... 还有 ${items.length - 6} 件物品`, px + 20, 385 + 6 * 22);
      }
    }

    if (this.currentScene.npcIds.length > 0) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 14px "JetBrains Mono", monospace';
      ctx.fillText('💬 当前场景NPC', px + 20, 520);
      ctx.font = '12px "JetBrains Mono", monospace';
      this.currentScene.npcIds.forEach((id, i) => {
        const npc = this.npcManager.getNPC(id);
        if (!npc) return;
        const aff = this.npcManager.getAffectionLevel(id);
        ctx.fillStyle = npc.color;
        ctx.fillText(`${npc.icon} ${npc.name} (${aff}: ${npc.affection}/100)`, px + 20, 545 + i * 20);
      });
    }

    ctx.restore();
  }

  renderBar(x: number, y: number, w: number, h: number, cur: number, max: number, c1: string, c2: string) {
    const ctx = this.ctx;
    const pct = Math.max(0, Math.min(1, cur / max));
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 6);
    ctx.fill();
    const grad = ctx.createLinearGradient(x, y, x + w, y);
    grad.addColorStop(0, c1);
    grad.addColorStop(1, c2);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(x, y, Math.max(0, w * pct), h, 6);
    ctx.fill();
    ctx.strokeStyle = '#ffffff20';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 6);
    ctx.stroke();
  }

  renderSpells() {
    const ctx = this.ctx;
    const spells = this.player.data.learnedSpells;
    if (spells.length === 0) return;

    const startX = 20;
    const startY = 55;
    const size = 50;
    const gap = 12;

    spells.forEach((ls, idx) => {
      const spell = SPELLS[ls.spellId];
      if (!spell) return;
      const x = startX + idx * (size + gap);
      const y = startY;

      ctx.save();
      const cdPct = ls.cooldownRemaining > 0 ? ls.cooldownRemaining / spell.cooldown : 0;
      const canUse = this.player.canUseSpell(ls.spellId);

      ctx.fillStyle = canUse ? 'rgba(139, 92, 246, 0.25)' : 'rgba(100, 116, 139, 0.2)';
      ctx.strokeStyle = canUse ? '#8b5cf6' : '#64748b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(x, y, size, size, 10);
      ctx.fill();
      ctx.stroke();

      ctx.font = '26px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = canUse ? '#e0e0e0' : '#64748b';
      ctx.fillText(spell.icon, x + size / 2, y + size / 2);

      if (cdPct > 0) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.beginPath();
        ctx.moveTo(x + size / 2, y + size / 2);
        ctx.arc(x + size / 2, y + size / 2, size / 2, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * cdPct);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px "JetBrains Mono", monospace';
        ctx.fillText(Math.ceil(ls.cooldownRemaining).toString(), x + size / 2, y + size / 2);
      }

      ctx.textBaseline = 'alphabetic';
      ctx.font = '11px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#cbd5e1';
      ctx.fillText(spell.name, x + size / 2, y + size + 14);
      ctx.restore();
    });
  }

  renderDialogueBox() {
    if (!this.currentNPC) return;
    const ctx = this.ctx;
    const bx = 60;
    const by = 80;
    const bw = BASE_WIDTH - PANEL_WIDTH - 120;
    const bh = 380;

    ctx.save();
    ctx.fillStyle = 'rgba(10, 10, 25, 0.95)';
    ctx.strokeStyle = this.currentNPC.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 16);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = this.currentNPC.color;
    ctx.beginPath();
    ctx.arc(bx + 60, by + 55, 35, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = '36px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(this.currentNPC.icon, bx + 60, by + 55);
    ctx.textBaseline = 'alphabetic';

    ctx.textAlign = 'left';
    ctx.font = 'bold 20px "JetBrains Mono", monospace';
    ctx.fillStyle = this.currentNPC.color;
    ctx.fillText(`${this.currentNPC.name} · ${this.currentNPC.title}`, bx + 115, by + 50);
    ctx.font = '13px "JetBrains Mono", monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`好感度: ${this.currentNPC.affection}/100 (${this.npcManager.getAffectionLevel(this.currentNPC.id)})`, bx + 115, by + 72);

    const greeting = this.npcManager.getGreeting(this.currentNPC.id);
    ctx.fillStyle = '#e0e0e0';
    ctx.font = '15px "JetBrains Mono", monospace';
    const lines = this.wrapText(greeting, bw - 80, 15);
    lines.forEach((line, i) => ctx.fillText(line, bx + 40, by + 120 + i * 24));

    ctx.restore();
  }

  renderObjectInteraction() {
    if (!this.currentObject) return;
    const ctx = this.ctx;
    const bx = 60;
    const by = 80;
    const bw = BASE_WIDTH - PANEL_WIDTH - 120;
    const bh = 320;

    ctx.save();
    ctx.fillStyle = 'rgba(10, 10, 25, 0.95)';
    ctx.strokeStyle = '#8b5cf6';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 16);
    ctx.fill();
    ctx.stroke();

    ctx.font = '48px serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(this.currentObject.icon, bx + 70, by + 80);
    ctx.textAlign = 'left';

    ctx.font = 'bold 22px "JetBrains Mono", monospace';
    ctx.fillStyle = '#a78bfa';
    ctx.fillText(this.currentObject.name, bx + 140, by + 65);

    ctx.fillStyle = '#e0e0e0';
    ctx.font = '15px "JetBrains Mono", monospace';
    const lines = this.wrapText(this.currentObject.description, bw - 80, 15);
    lines.forEach((line, i) => ctx.fillText(line, bx + 40, by + 120 + i * 24));
    ctx.restore();
  }

  renderRandomEvent() {
    if (!this.currentRandomEvent) return;
    const ctx = this.ctx;
    const bx = 60;
    const by = 80;
    const bw = BASE_WIDTH - PANEL_WIDTH - 120;
    const bh = 340;

    const colors: Record<string, string> = { combat: '#ef4444', treasure: '#fbbf24', mystery: '#8