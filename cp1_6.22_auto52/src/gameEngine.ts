import {
  WorldState,
  createInitialWorld,
  isWalkable,
  hasItemAt,
  hasNPCAt,
  findItemOnGround,
  findItemInInventory,
  findItemById,
  findNPC,
  getDirectionDelta,
  getDirectionName,
  getTileDescription,
  isTreasureRoom,
  MAP_WIDTH,
  MAP_HEIGHT
} from './world.js';
import { parseInput, ParsedAction, getHelpText } from './parser.js';
import { Renderer, TextType } from './renderer.js';

class GameEngine {
  private state: WorldState;
  private renderer: Renderer;
  private inputEl: HTMLInputElement;
  private canvas: HTMLCanvasElement;
  private lastTime: number = 0;
  private isProcessing: boolean = false;
  private commandHistory: string[] = [];
  private historyIndex: number = -1;

  constructor() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    this.inputEl = document.getElementById('command-input') as HTMLInputElement;

    if (!this.canvas || !this.inputEl) {
      throw new Error('找不到必要的DOM元素');
    }

    this.state = createInitialWorld();
    this.renderer = new Renderer(this.canvas);

    this.bindEvents();
    this.showIntro();

    requestAnimationFrame(this.loop.bind(this));
  }

  private bindEvents(): void {
    this.inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const text = this.inputEl.value.trim();
        if (text) {
          this.commandHistory.push(text);
          this.historyIndex = this.commandHistory.length;
          this.inputEl.value = '';
          if (!this.renderer.isAllTextDisplayed()) {
            this.renderer.skipTextAnimation();
          }
          this.processInput(text);
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (this.historyIndex > 0) {
          this.historyIndex--;
          this.inputEl.value = this.commandHistory[this.historyIndex];
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (this.historyIndex < this.commandHistory.length - 1) {
          this.historyIndex++;
          this.inputEl.value = this.commandHistory[this.historyIndex];
        } else {
          this.historyIndex = this.commandHistory.length;
          this.inputEl.value = '';
        }
      } else if (e.key === 'Escape') {
        this.inputEl.blur();
      }
    });

    document.addEventListener('click', (e) => {
      const wrapper = document.getElementById('game-wrapper');
      if (wrapper && wrapper.contains(e.target as Node)) {
        this.inputEl.focus();
      }
    });
  }

  private showIntro(): void {
    this.renderer.addTextLine('===== 迷雾遗迹 · 宝藏传说 =====', 'system');
    this.renderer.addTextLine('古老的传说在村民间流传：在这片被迷雾笼罩的遗迹深处，藏着一件失落已久的绝世宝藏。', 'environment');
    this.renderer.addTextLine('无数冒险者前赴后继，却从未有人能活着回来……', 'environment');
    this.renderer.addTextLine('你握紧手中的火把，踏入了遗迹的大门。', 'action');
    this.renderer.addTextLine('提示：输入「帮助」查看所有指令。', 'system');
    this.renderer.addTextLine('', 'environment');
    this.describeCurrentRoom();
  }

  private loop(timestamp: number): void {
    const deltaTime = this.lastTime ? timestamp - this.lastTime : 16;
    this.lastTime = timestamp;

    this.renderer.update(deltaTime);
    this.renderer.render(this.state);

    requestAnimationFrame(this.loop.bind(this));
  }

  private processInput(raw: string): void {
    if (this.state.gameWon) {
      this.renderer.addTextLine('你已经找到了传说中的宝藏！输入「刷新页面」重新开始冒险。', 'system');
      return;
    }

    const action = parseInput(raw);
    this.renderer.addTextLine(`> ${raw}`, 'action');

    switch (action.type) {
      case 'move':
        this.handleMove(action);
        break;
      case 'take':
        this.handleTake(action);
        break;
      case 'look':
        this.handleLook(action);
        break;
      case 'use':
        this.handleUse(action);
        break;
      case 'talk':
        this.handleTalk(action);
        break;
      case 'inventory':
        this.handleInventory();
        break;
      case 'help':
        this.handleHelp();
        break;
      case 'invalid':
      default:
        this.renderer.addTextLine('你不明白如何做那件事。输入「帮助」查看可用指令。', 'system');
        break;
    }

    this.checkWinCondition();
  }

  private handleMove(action: ParsedAction): void {
    if (!action.direction) {
      this.renderer.addTextLine('请告诉我要往哪个方向走？（北/南/东/西等）', 'system');
      return;
    }
    const delta = getDirectionDelta(action.direction);
    if (!delta) {
      this.renderer.addTextLine('你不明白那是什么方向。', 'system');
      return;
    }

    const newX = this.state.player.x + delta.dx;
    const newY = this.state.player.y + delta.dy;

    if (newX < 0 || newX >= MAP_WIDTH || newY < 0 || newY >= MAP_HEIGHT) {
      this.renderer.addTextLine(`${action.direction}方是遗迹的尽头，你无法再前进了。`, 'environment');
      return;
    }

    const targetTile = this.state.map[newY][newX];

    if (targetTile.type === 'wall') {
      this.renderer.addTextLine(`${action.direction}方是一堵${getTileDescription('wall')}`, 'environment');
      return;
    }

    if (targetTile.type === 'door' && targetTile.locked) {
      this.renderer.addTextLine('前方的门紧紧锁着。门上金色的锁孔在火把下闪烁——你需要一把钥匙。', 'environment');
      return;
    }

    if (!isWalkable(this.state, newX, newY)) {
      this.renderer.addTextLine(`${action.direction}方无路可走。`, 'environment');
      return;
    }

    const npcBlocking = hasNPCAt(this.state, newX, newY);
    if (npcBlocking) {
      this.renderer.addTextLine(`${npcBlocking.name}挡住了${action.direction}方的道路。你可以尝试和「${npcBlocking.name}」对话。`, 'environment');
      return;
    }

    this.state.player.x = newX;
    this.state.player.y = newY;

    const dirName = getDirectionName(delta.dx, delta.dy);
    let desc = '';
    if (targetTile.type === 'corridor') {
      desc = `你向${dirName}走进一条昏暗的走廊。${getTileDescription('corridor')}`;
    } else if (targetTile.type === 'door') {
      desc = `你推开门，向${dirName}走去。`;
    } else {
      desc = `你向${dirName}走去。${getTileDescription('room')}`;
    }
    this.renderer.addTextLine(desc, 'action');

    this.describeCurrentRoom();
  }

  private describeCurrentRoom(): void {
    const { x, y } = this.state.player;
    const tile = this.state.map[y][x];

    if (tile.type === 'corridor') {
      this.renderer.addTextLine(`${getTileDescription('corridor')}`, 'environment');
    } else if (tile.type === 'room') {
      this.renderer.addTextLine(`${getTileDescription('room')}`, 'environment');
    }

    const item = hasItemAt(this.state, x, y);
    if (item) {
      const emojiMap: Record<string, string> = {
        key: '🗝', sword: '⚔', potion: '🧪', coin: '💰', letter: '✉'
      };
      this.renderer.addTextLine(`你注意到地上有${emojiMap[item.id] || '?'}「${item.name}」。`, 'environment');
    }

    const npc = hasNPCAt(this.state, x, y);
    if (npc) {
      this.renderer.addTextLine(`这里站着一位${npc.name}，也许可以和他说说话。`, 'environment');
    }

    if (isTreasureRoom(x, y) && this.state.quests.doorUnlocked && x === 7 && y === 7 && !this.state.gameWon) {
      this.renderer.addTextLine('在房间的正中央，一个华丽的宝箱静静地躺在那里，散发着诱人的光芒……★', 'environment');
    }
  }

  private handleTake(action: ParsedAction): void {
    const { x, y } = this.state.player;
    const itemHere = hasItemAt(this.state, x, y);

    if (!action.itemName) {
      if (itemHere) {
        this.takeItem(itemHere.id);
      } else {
        this.renderer.addTextLine('这里没有什么可以捡起来的。', 'system');
      }
      return;
    }

    const targetItem = findItemOnGround(this.state, action.itemName);
    if (!targetItem) {
      this.renderer.addTextLine(`你找不到叫做「${action.itemName}」的东西。`, 'system');
      return;
    }
    if (targetItem.x !== x || targetItem.y !== y) {
      this.renderer.addTextLine(`「${targetItem.name}」似乎不在这里，你需要先走到它所在的位置。`, 'system');
      return;
    }

    this.takeItem(targetItem.id);
  }

  private takeItem(itemId: string): void {
    const item = findItemById(this.state, itemId);
    if (!item || item.collected) return;

    item.collected = true;
    this.state.player.inventory.push(item);

    const takeDesc: Record<string, string> = {
      key: '你小心翼翼地捡起那把金色的钥匙，它在你的手中沉甸甸的。',
      sword: '你拿起剑，挥舞了一下——寒光闪过，确实是把好剑！',
      potion: '你收好红色的药水，以备不时之需。',
      coin: '金币叮当作响，你的口袋变得沉甸甸的。',
      letter: '你拿起这封密封的信件，信封上写着「致村中长老」。'
    };

    this.renderer.addTextLine(takeDesc[itemId] || `你捡起了${item.name}。`, 'action');
  }

  private handleLook(action: ParsedAction): void {
    if (!action.targetName || action.targetName === '四周' || action.targetName === '周围' || action.targetName === '房间') {
      this.describeCurrentRoom();
      this.renderer.addTextLine(this.buildSurroundingHint(), 'system');
      return;
    }

    const target = action.targetName.toLowerCase();
    if (target.includes('背包') || target.includes('物品') || target.includes('bag') || target.includes('inventory')) {
      this.handleInventory();
      return;
    }
    if (target.includes('地图') || target.includes('小地图') || target.includes('map')) {
      this.renderer.addTextLine('你观察着地图。金色光点是你当前的位置，红色标记是门的位置。迷雾之外是你还未探索的区域。', 'environment');
      return;
    }
    if (target.includes('自己') || target.includes('我') || target.includes('状态') || target.includes('hp') || target.includes('health')) {
      this.renderer.addTextLine(`你的状态：HP ${this.state.player.hp}/${this.state.player.maxHp}，背包中有${this.state.player.inventory.length}件物品。`, 'action');
      return;
    }

    const item = findItemOnGround(this.state, action.targetName) || findItemInInventory(this.state, action.targetName);
    if (item) {
      this.renderer.addTextLine(`【${item.name}】${item.description}`, 'environment');
      return;
    }

    const npc = findNPC(this.state, action.targetName);
    if (npc) {
      const dist = Math.abs(npc.x - this.state.player.x) + Math.abs(npc.y - this.state.player.y);
      if (dist <= 1) {
        const npcDesc: Record<string, string> = {
          guard: '守卫穿着银色的铠甲，腰间佩着长剑，眼神警惕地注视着四周。',
          elder: '老人佝偻着背，雪白的胡须垂到胸前，浑浊的眼睛里闪着智慧的光芒。',
          merchant: '商人穿着华丽的长袍，手指上戴着好几个宝石戒指，脸上挂着精明的笑容。'
        };
        this.renderer.addTextLine(npcDesc[npc.id] || `你仔细打量着${npc.name}。`, 'environment');
      } else {
        this.renderer.addTextLine(`${npc.name}在距离你不远处，但你看不太清楚。走近一些试试？`, 'environment');
      }
      return;
    }

    const directions = ['北', '南', '东', '西'];
    for (const d of directions) {
      if (target.includes(d)) {
        const delta = getDirectionDelta(d);
        if (delta) {
          const tx = this.state.player.x + delta.dx;
          const ty = this.state.player.y + delta.dy;
          if (tx < 0 || tx >= MAP_WIDTH || ty < 0 || ty >= MAP_HEIGHT) {
            this.renderer.addTextLine(`${d}方是一片迷雾，什么也看不清。`, 'environment');
          } else {
            const t = this.state.map[ty][tx];
            if (t.type === 'wall') this.renderer.addTextLine(`${d}方是一堵石墙。`, 'environment');
            else if (t.type === 'door') this.renderer.addTextLine(t.locked ? `${d}方是一扇锁着的门。` : `${d}方是一扇开着的门。`, 'environment');
            else if (t.type === 'corridor') this.renderer.addTextLine(`${d}方似乎是一条走廊。`, 'environment');
            else this.renderer.addTextLine(`${d}方似乎是一个房间。`, 'environment');
          }
          return;
        }
      }
    }

    this.renderer.addTextLine(`你仔细看了看「${action.targetName}」，但没发现什么特别的。`, 'environment');
  }

  private buildSurroundingHint(): string {
    const hints: string[] = [];
    const dirs = [
      { d: '北', dx: 0, dy: -1 },
      { d: '南', dx: 0, dy: 1 },
      { d: '东', dx: 1, dy: 0 },
      { d: '西', dx: -1, dy: 0 }
    ];
    for (const { d, dx, dy } of dirs) {
      const tx = this.state.player.x + dx;
      const ty = this.state.player.y + dy;
      if (tx >= 0 && tx < MAP_WIDTH && ty >= 0 && ty < MAP_HEIGHT) {
        const t = this.state.map[ty][tx];
        if (t.type !== 'wall') hints.push(d);
      }
    }
    return hints.length ? `你可以走的方向：${hints.join('、')}。` : '这里似乎无路可走。';
  }

  private handleUse(action: ParsedAction): void {
    if (!action.itemName) {
      this.renderer.addTextLine('请告诉我你想使用什么物品？', 'system');
      return;
    }

    const item = findItemInInventory(this.state, action.itemName);
    if (!item) {
      this.renderer.addTextLine(`你的背包里没有「${action.itemName}」。`, 'system');
      return;
    }

    if (item.id === 'key') {
      return this.useKey(action.targetName);
    }
    if (item.id === 'potion') {
      return this.usePotion();
    }
    if (item.id === 'sword') {
      this.renderer.addTextLine('你挥舞了几下宝剑，感觉威风凛凛！但目前似乎没什么需要战斗的。', 'action');
      return;
    }
    if (item.id === 'letter') {
      if (action.targetName && (action.targetName.includes('老人') || action.targetName.includes('长老') || action.targetName.toLowerCase().includes('elder'))) {
        return this.deliverLetterToElder();
      }
      this.renderer.addTextLine('这封信是给「村中长老」的——也许你应该找到他并把信交给他。', 'action');
      return;
    }
    if (item.id === 'coin') {
      this.renderer.addTextLine('你掏出金币数了数——叮当作响，让人心情愉悦。但现在花钱的地方好像不多……', 'action');
      return;
    }

    this.renderer.addTextLine(`你尝试使用${item.name}，但似乎没什么效果。`, 'action');
  }

  private useKey(targetName?: string): void {
    const { x, y } = this.state.player;

    const neighbors = [
      { x: x, y: y - 1, dir: '北' },
      { x: x, y: y + 1, dir: '南' },
      { x: x + 1, y: y, dir: '东' },
      { x: x - 1, y: y, dir: '西' }
    ];

    let targetDoor: { x: number; y: number; dir: string } | null = null;

    if (targetName && targetName.includes('门')) {
      for (const n of neighbors) {
        if (n.x >= 0 && n.x < MAP_WIDTH && n.y >= 0 && n.y < MAP_HEIGHT) {
          const t = this.state.map[n.y][n.x];
          if (t.type === 'door' && t.locked) {
            targetDoor = n;
            break;
          }
        }
      }
    } else {
      for (const n of neighbors) {
        if (n.x >= 0 && n.x < MAP_WIDTH && n.y >= 0 && n.y < MAP_HEIGHT) {
          const t = this.state.map[n.y][n.x];
          if (t.type === 'door' && t.locked) {
            targetDoor = n;
            break;
          }
        }
      }
    }

    if (!targetDoor) {
      this.renderer.addTextLine('你掏出钥匙，但是附近没有锁着的门。', 'action');
      return;
    }

    this.state.map[targetDoor.y][targetDoor.x].locked = false;
    this.state.quests.doorUnlocked = true;

    this.renderer.addTextLine(`你把金色钥匙插入${targetDoor.dir}方门上的锁孔——「咔哒」一声，门缓缓打开了！`, 'action');
    this.renderer.addTextLine('一阵清新的空气从门后涌来，你仿佛看到远处闪耀着金色的光芒……宝藏就在前方！', 'environment');
  }

  private usePotion(): void {
    if (this.state.player.hp >= this.state.player.maxHp) {
      this.renderer.addTextLine('你感觉精力充沛，暂时不需要使用药水。', 'action');
      return;
    }
    this.state.player.hp = Math.min(this.state.player.maxHp, this.state.player.hp + 50);
    const idx = this.state.player.inventory.findIndex(i => i.id === 'potion');
    if (idx >= 0) this.state.player.inventory.splice(idx, 1);
    this.renderer.addTextLine('你一饮而尽，红色的液体顺着喉咙滑下——一股暖流流遍全身，你感觉好多了！(HP恢复) ★', 'action');
  }

  private deliverLetterToElder(): void {
    const elder = findNPC(this.state, '老人');
    if (!elder) return;

    const dist = Math.abs(elder.x - this.state.player.x) + Math.abs(elder.y - this.state.player.y);
    if (dist > 1) {
      this.renderer.addTextLine('你需要先走到老人身边才能把信交给他。', 'system');
      return;
    }

    if (this.state.quests.letterDelivered) {
      this.renderer.addTextLine('你已经把信交给老人了。', 'action');
      return;
    }

    const letterIdx = this.state.player.inventory.findIndex(i => i.id === 'letter');
    if (letterIdx < 0) {
      this.renderer.addTextLine('你身上并没有那封信。先去找找看吧！', 'system');
      return;
    }

    this.state.player.inventory.splice(letterIdx, 1);
    this.state.quests.letterDelivered = true;
    elder.dialogueIndex = 2;
    elder.questDone = true;

    this.renderer.addTextLine('你从背包中取出那封密封的信件，双手递给老人。', 'action');
    this.renderer.addTextLine('老人：「谢谢你把信带来！这是给你的酬劳——一瓶神秘药水的配方，还有……拿着这个护身符，它会保佑你的。」', 'dialogue');

    const hasPotion = this.state.player.inventory.some(i => i.id === 'potion');
    if (!hasPotion) {
      const potionItem = findItemById(this.state, 'potion');
      if (potionItem && potionItem.collected === false) {
        potionItem.collected = true;
      }
      const fakePotion = {
        id: 'potion',
        name: '药水',
        alias: ['药水', 'potion'],
        description: '长老赠送的治疗药水。',
        x: -1, y: -1, collected: true
      };
      if (!this.state.player.inventory.some(i => i.id === 'potion')) {
        this.state.player.inventory.push(fakePotion as any);
      }
    }

    this.renderer.addTextLine('你获得了额外的治疗药水！长老的话让你更加坚定了找到宝藏的信念。★', 'action');
  }

  private handleTalk(action: ParsedAction): void {
    if (!action.npcName) {
      const here = hasNPCAt(this.state, this.state.player.x, this.state.player.y);
      if (here) {
        this.talkToNPC(here.id);
      } else {
        const near = this.findNearbyNPC();
        if (near) {
          this.renderer.addTextLine(`附近有「${near.name}」，你可以尝试和他对话。`, 'system');
        } else {
          this.renderer.addTextLine('附近没有可以对话的人。', 'system');
        }
      }
      return;
    }

    const npc = findNPC(this.state, action.npcName);
    if (!npc) {
      this.renderer.addTextLine(`这里没有叫做「${action.npcName}」的人。`, 'system');
      return;
    }

    this.talkToNPC(npc.id);
  }

  private findNearbyNPC() {
    for (const n of this.state.npcs) {
      const dist = Math.abs(n.x - this.state.player.x) + Math.abs(n.y - this.state.player.y);
      if (dist <= 2) return n;
    }
    return null;
  }

  private talkToNPC(npcId: string): void {
    const npc = this.state.npcs.find(n => n.id === npcId);
    if (!npc) return;

    const dist = Math.abs(npc.x - this.state.player.x) + Math.abs(npc.y - this.state.player.y);
    if (dist > 1) {
      this.renderer.addTextLine(`${npc.name}离你太远了。走近一些再和他说话吧。`, 'system');
      return;
    }

    if (npcId === 'merchant') {
      const hasSword = this.state.player.inventory.some(i => i.id === 'sword');
      const hasLetter = this.state.player.inventory.some(i => i.id === 'letter');

      if (hasLetter) {
        this.renderer.addTextLine(`${npc.name}：「你已经拿到信了？快把它送给长老吧！」`, 'dialogue');
        return;
      }

      if (hasSword && npc.dialogueIndex < 2) {
        this.renderer.addTextLine(`${npc.name}搓了搓手：「嘿！旅行者，要买些什么吗？哦……你说那封信？它就在我这里，不过——你得用剑来换！」`, 'dialogue');
        this.renderer.addTextLine('提示：使用「使用 剑 对 商人」来完成交易。', 'system');

        const swordIdx = this.state.player.inventory.findIndex(i => i.id === 'sword');
        if (swordIdx >= 0) {
          this.state.player.inventory.splice(swordIdx, 1);
        }
        const letter = findItemById(this.state, 'letter');
        if (letter) {
          letter.x = this.state.player.x;
          letter.y = this.state.player.y;
        }
        npc.dialogueIndex = 2;

        this.renderer.addTextLine('你略一思索，解下腰间的剑递给了商人。', 'action');
        this.renderer.addTextLine('商人哈哈笑道：「成交！好剑，真是好剑！信是你的了。」', 'dialogue');
        this.renderer.addTextLine('你把信收入背包。现在应该去找那位老人了。★', 'action');
        return;
      }

      if (!hasSword && npc.dialogueIndex < 2) {
        this.renderer.addTextLine(`${npc.name}：「年轻人，去东边的房间找找看，那里应该有一把宝剑。拿到剑后再来找我吧！」`, 'dialogue');
        return;
      }

      this.renderer.addTextLine(npc.dialogues[npc.dialogueIndex] || npc.dialogues[npc.dialogues.length - 1], 'dialogue');
      return;
    }

    if (npcId === 'elder') {
      if (this.state.quests.letterDelivered && npc.dialogueIndex < 2) {
        npc.dialogueIndex = 2;
      }
      this.renderer.addTextLine(npc.dialogues[npc.dialogueIndex] || npc.dialogues[npc.dialogues.length - 1], 'dialogue');
      if (npc.dialogueIndex < npc.dialogues.length - 2) {
        npc.dialogueIndex = Math.min(npc.dialogueIndex + 1, npc.dialogues.length - 2);
      }
      return;
    }

    if (npcId === 'guard') {
      this.renderer.addTextLine(npc.dialogues[npc.dialogueIndex] || npc.dialogues[npc.dialogues.length - 1], 'dialogue');
      if (npc.dialogueIndex < npc.dialogues.length - 1) {
        npc.dialogueIndex++;
      }
      return;
    }

    const line = npc.dialogues[npc.dialogueIndex] || npc.dialogues[0];
    this.renderer.addTextLine(`${npc.name}：${line}`, 'dialogue');
    if (npc.dialogueIndex < npc.dialogues.length - 1) {
      npc.dialogueIndex++;
    }
  }

  private handleInventory(): void {
    const inv = this.state.player.inventory;
    this.renderer.addTextLine('—— 你的背包 ——', 'system');
    if (inv.length === 0) {
      this.renderer.addTextLine('空空如也……去探险吧！', 'environment');
    } else {
      for (let i = 0; i < inv.length; i++) {
        const it = inv[i];
        const emojiMap: Record<string, string> = {
          key: '🗝', sword: '⚔', potion: '🧪', coin: '💰', letter: '✉'
        };
        this.renderer.addTextLine(`  ${i + 1}. ${emojiMap[it.id] || '?'} ${it.name} —— ${it.description}`, 'environment');
      }
    }
    this.renderer.addTextLine('——————————', 'system');
  }

  private handleHelp(): void {
    const lines = getHelpText().split('\n');
    for (const line of lines) {
      this.renderer.addTextLine(line, 'system');
    }
  }

  private checkWinCondition(): void {
    if (this.state.gameWon) return;
    if (this.state.quests.doorUnlocked &&
      this.state.player.x === 7 &&
      this.state.player.y === 7) {
      this.state.gameWon = true;
      this.state.quests.treasureFound = true;

      this.renderer.addTextLine('', 'environment');
      this.renderer.addTextLine('========================================', 'system');
      this.renderer.addTextLine('你走到宝箱前，深吸一口气，缓缓掀开了箱盖——', 'action');
      this.renderer.addTextLine('刹那间，万丈金光从宝箱中涌出，照亮了整个遗迹！', 'environment');
      this.renderer.addTextLine('你找到了传说中的宝藏！无数的金币、闪亮的珠宝、神秘的卷轴……', 'environment');
      this.renderer.addTextLine('你成为了第一个征服迷雾遗迹的冒险者！', 'action');
      this.renderer.addTextLine('', 'environment');
      this.renderer.addTextLine('恭喜通关！🎉 感谢你游玩《迷雾遗迹·宝藏传说》', 'system');
      this.renderer.addTextLine('如需重新开始，请刷新页面。', 'system');
      this.renderer.addTextLine('========================================', 'system');
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  try {
    new GameEngine();
  } catch (err) {
    console.error('游戏初始化失败:', err);
    document.body.innerHTML = `<pre style="color:#ef4444;padding:20px;">游戏初始化失败: ${err}</pre>`;
  }
});
