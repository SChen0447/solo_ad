import { 
  Character, 
  Inventory, 
  Skill, 
  CLASS_COLORS, 
  CLASS_NAMES, 
  CLASS_INITIALS,
  RARITY_COLORS,
  Equipment,
  EquipmentSlot,
  Item,
  Rarity
} from './character';
import { Cell, CellType, CELL_COLORS, MazeGenerator } from './mazeGenerator';
import { BattleManager, Enemy, LootItem } from './battleManager';

export class UIManager {
  private mazeGenerator: MazeGenerator | null = null;
  private party: Character[] = [];
  private inventory: Inventory = new Inventory();
  private battleManager: BattleManager | null = null;
  private playerPosition: { x: number; y: number } = { x: 0, y: 0 };
  
  private miniMapCanvas: HTMLCanvasElement;
  private miniMapCtx: CanvasRenderingContext2D;
  private partyListEl: HTMLElement;
  private logListEl: HTMLElement;
  private eventModal: HTMLElement;
  private eventTitle: HTMLElement;
  private eventDesc: HTMLElement;
  private eventBtn1: HTMLButtonElement;
  private eventBtn2: HTMLButtonElement;
  private battleScreen: HTMLElement;
  private enemyListEl: HTMLElement;
  private playerPartyEl: HTMLElement;
  private skillPanel: HTMLElement;
  private skillListEl: HTMLElement;
  private battleLogEl: HTMLElement;
  private startScreen: HTMLElement;
  private classSelectionEl: HTMLElement;
  private selectedPartyEl: HTMLElement;
  private startBtn: HTMLButtonElement;
  private transitionOverlay: HTMLElement;
  
  private selectedClasses: string[] = [];
  private onStartGame: ((classes: string[]) => void) | null = null;
  private onEventChoice: ((choice: number) => void) | null = null;

  constructor() {
    this.miniMapCanvas = document.getElementById('mini-map') as HTMLCanvasElement;
    this.miniMapCtx = this.miniMapCanvas.getContext('2d')!;
    this.partyListEl = document.getElementById('party-list')!;
    this.logListEl = document.getElementById('log-list')!;
    this.eventModal = document.getElementById('event-modal')!;
    this.eventTitle = document.getElementById('event-title')!;
    this.eventDesc = document.getElementById('event-description')!;
    this.eventBtn1 = document.getElementById('event-btn1') as HTMLButtonElement;
    this.eventBtn2 = document.getElementById('event-btn2') as HTMLButtonElement;
    this.battleScreen = document.getElementById('battle-screen')!;
    this.enemyListEl = document.getElementById('enemy-list')!;
    this.playerPartyEl = document.getElementById('player-party')!;
    this.skillPanel = document.getElementById('skill-panel')!;
    this.skillListEl = document.getElementById('skill-list')!;
    this.battleLogEl = document.getElementById('battle-log')!;
    this.startScreen = document.getElementById('start-screen')!;
    this.classSelectionEl = document.getElementById('class-selection')!;
    this.selectedPartyEl = document.getElementById('selected-party')!;
    this.startBtn = document.getElementById('start-btn') as HTMLButtonElement;
    this.transitionOverlay = document.getElementById('transition-overlay')!;
    
    this.setupEventListeners();
    this.setupStartScreen();
  }

  public setMazeGenerator(mg: MazeGenerator): void {
    this.mazeGenerator = mg;
  }

  public setParty(party: Character[]): void {
    this.party = party;
    this.updatePartyPanel();
  }

  public setInventory(inv: Inventory): void {
    this.inventory = inv;
  }

  public setBattleManager(bm: BattleManager): void {
    this.battleManager = bm;
  }

  public setPlayerPosition(pos: { x: number; y: number }): void {
    this.playerPosition = pos;
    this.renderMiniMap();
  }

  public setOnStartGame(callback: (classes: string[]) => void): void {
    this.onStartGame = callback;
  }

  public setOnEventChoice(callback: (choice: number) => void): void {
    this.onEventChoice = callback;
  }

  private setupEventListeners(): void {
    this.eventBtn1.addEventListener('click', () => {
      if (this.onEventChoice) {
        this.onEventChoice(0);
      }
    });
    
    this.eventBtn2.addEventListener('click', () => {
      if (this.onEventChoice) {
        this.onEventChoice(1);
      }
    });
    
    this.startBtn.addEventListener('click', () => {
      if (this.onStartGame && this.selectedClasses.length >= 3) {
        this.startScreen.classList.add('hidden');
        this.onStartGame(this.selectedClasses);
      }
    });
  }

  private setupStartScreen(): void {
    const classes = [
      { id: 'warrior', name: '战士', desc: '高生命高防御，近战物理输出', color: CLASS_COLORS.warrior, initial: '战' },
      { id: 'mage', name: '法师', desc: '高法术伤害，范围攻击', color: CLASS_COLORS.mage, initial: '法' },
      { id: 'rogue', name: '盗贼', desc: '高暴击高闪避，单体爆发', color: CLASS_COLORS.rogue, initial: '盗' },
      { id: 'priest', name: '牧师', desc: '治疗辅助，神圣伤害', color: CLASS_COLORS.priest, initial: '牧' },
      { id: 'hunter', name: '猎人', desc: '远程物理输出，多重射击', color: CLASS_COLORS.hunter, initial: '猎' }
    ];
    
    this.classSelectionEl.innerHTML = '';
    for (const cls of classes) {
      const card = document.createElement('div');
      card.className = 'class-card';
      card.dataset.classId = cls.id;
      card.innerHTML = `
        <div class="class-icon" style="background-color: ${cls.color}">${cls.initial}</div>
        <div class="class-name">${cls.name}</div>
        <div class="class-desc">${cls.desc}</div>
      `;
      card.addEventListener('click', () => this.toggleClassSelection(cls.id));
      this.classSelectionEl.appendChild(card);
    }
    
    this.updateSelectedParty();
  }

  private toggleClassSelection(classId: string): void {
    const index = this.selectedClasses.indexOf(classId);
    if (index > -1) {
      this.selectedClasses.splice(index, 1);
    } else if (this.selectedClasses.length < 4) {
      this.selectedClasses.push(classId);
    }
    
    this.updateSelectedParty();
    this.updateClassCards();
  }

  private updateSelectedParty(): void {
    this.selectedPartyEl.innerHTML = '';
    
    if (this.selectedClasses.length === 0) {
      this.selectedPartyEl.innerHTML = '<p class="empty-text">请选择职业组建队伍</p>';
    } else {
      for (const classId of this.selectedClasses) {
        const name = CLASS_NAMES[classId as keyof typeof CLASS_NAMES];
        const color = CLASS_COLORS[classId as keyof typeof CLASS_COLORS];
        const initial = CLASS_INITIALS[classId as keyof typeof CLASS_INITIALS];
        
        const charEl = document.createElement('div');
        charEl.className = 'selected-char';
        charEl.innerHTML = `
          <div class="char-avatar-small" style="background-color: ${color}">${initial}</div>
          <span>${name}</span>
        `;
        this.selectedPartyEl.appendChild(charEl);
      }
    }
    
    this.startBtn.disabled = this.selectedClasses.length < 3;
  }

  private updateClassCards(): void {
    const cards = this.classSelectionEl.querySelectorAll('.class-card');
    cards.forEach(card => {
      const classId = card.dataset.classId;
      if (this.selectedClasses.includes(classId!)) {
        card.classList.add('selected');
      } else {
        card.classList.remove('selected');
      }
    });
  }

  public renderMiniMap(): void {
    if (!this.mazeGenerator) return;
    
    const width = this.mazeGenerator.getWidth();
    const height = this.mazeGenerator.getHeight();
    const cellSize = Math.min(this.miniMapCanvas.width / width, this.miniMapCanvas.height / height);
    
    this.miniMapCtx.fillStyle = '#0a0a0a';
    this.miniMapCtx.fillRect(0, 0, this.miniMapCanvas.width, this.miniMapCanvas.height);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const cell = this.mazeGenerator.getCell(x, y);
        if (!cell) continue;
        
        const px = x * cellSize;
        const py = y * cellSize;
        
        if (cell.explored) {
          this.miniMapCtx.fillStyle = CELL_COLORS[cell.type];
        } else {
          this.miniMapCtx.fillStyle = '#1a1a1a';
        }
        
        this.miniMapCtx.fillRect(px + 1, py + 1, cellSize - 2, cellSize - 2);
      }
    }
    
    const playerX = this.playerPosition.x * cellSize + cellSize / 2;
    const playerY = this.playerPosition.y * cellSize + cellSize / 2;
    
    const pulse = Math.sin(Date.now() / 200) * 0.3 + 0.7;
    this.miniMapCtx.fillStyle = `rgba(255, 255, 255, ${pulse})`;
    this.miniMapCtx.beginPath();
    this.miniMapCtx.arc(playerX, playerY, cellSize / 3, 0, Math.PI * 2);
    this.miniMapCtx.fill();
  }

  public updatePartyPanel(): void {
    this.partyListEl.innerHTML = '';
    
    for (const char of this.party) {
      const charEl = document.createElement('div');
      charEl.className = 'party-member';
      charEl.dataset.charId = char.id;
      
      const hpPercent = char.getHpPercentage() * 100;
      const mpPercent = char.getMpPercentage() * 100;
      const hpColor = hpPercent < 30 ? '#e74c3c' : '#2ecc71';
      const color = CLASS_COLORS[char.class];
      const initial = CLASS_INITIALS[char.class];
      
      charEl.innerHTML = `
        <div class="char-avatar" style="background-color: ${color}">${initial}</div>
        <div class="char-info">
          <div class="char-name">${char.name}</div>
          <div class="hp-bar">
            <div class="hp-fill" style="width: ${hpPercent}%; background: ${hpColor}"></div>
          </div>
          <div class="mp-bar">
            <div class="mp-fill" style="width: ${mpPercent}%"></div>
          </div>
        </div>
      `;
      
      if (!char.isAlive) {
        charEl.classList.add('dead');
      }
      
      this.partyListEl.appendChild(charEl);
    }
  }

  public addLog(message: string, type: string = 'normal'): void {
    const logEl = document.createElement('div');
    logEl.className = `log-entry log-${type}`;
    logEl.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    this.logListEl.appendChild(logEl);
    this.logListEl.scrollTop = this.logListEl.scrollHeight;
    
    while (this.logListEl.children.length > 100) {
      this.logListEl.removeChild(this.logListEl.firstChild);
    }
  }

  public showEventModal(
    title: string, 
    description: string, 
    btn1Text: string, 
    btn2Text: string | null = null
  ): void {
    this.eventTitle.textContent = title;
    this.eventDesc.textContent = description;
    this.eventBtn1.textContent = btn1Text;
    
    if (btn2Text) {
      this.eventBtn2.textContent = btn2Text;
      this.eventBtn2.style.display = 'inline-block';
    } else {
      this.eventBtn2.style.display = 'none';
    }
    
    this.eventModal.classList.remove('hidden');
  }

  public hideEventModal(): void {
    this.eventModal.classList.add('hidden');
  }

  public showBattleScreen(): void {
    this.playTransition(() => {
      this.battleScreen.classList.remove('hidden');
    });
  }

  public hideBattleScreen(): void {
    this.playTransition(() => {
      this.battleScreen.classList.add('hidden');
    });
  }

  public updateBattleUI(): void {
    if (!this.battleManager) return;
    
    const state = this.battleManager.getState();
    
    this.enemyListEl.innerHTML = '';
    for (const enemy of state.enemies) {
      const enemyEl = this.createEnemyElement(enemy);
      this.enemyListEl.appendChild(enemyEl);
    }
    
    this.playerPartyEl.innerHTML = '';
    for (let i = 0; i < state.playerParty.length; i++) {
      const char = state.playerParty[i];
      const charEl = this.createBattleCharacterElement(char, i === state.currentCharacterIndex && state.turn === 'player');
      this.playerPartyEl.appendChild(charEl);
    }
    
    this.battleLogEl.innerHTML = '';
    for (const log of state.battleLog.slice(-8)) {
      const logEl = document.createElement('div');
      logEl.className = 'battle-log-entry';
      logEl.textContent = log;
      this.battleLogEl.appendChild(logEl);
    }
    this.battleLogEl.scrollTop = this.battleLogEl.scrollHeight;
  }

  private createEnemyElement(enemy: Enemy): HTMLElement {
    const el = document.createElement('div');
    el.className = 'battle-enemy';
    el.dataset.enemyId = enemy.id;
    
    const hpPercent = (enemy.currentHp / enemy.maxHp) * 100;
    const hpColor = hpPercent < 30 ? '#e74c3c' : '#2ecc71';
    
    el.innerHTML = `
      <div class="enemy-sprite ${enemy.sprite}"></div>
      <div class="enemy-name">${enemy.name}</div>
      <div class="enemy-hp-bar">
        <div class="enemy-hp-fill" style="width: ${hpPercent}%; background: ${hpColor}"></div>
      </div>
    `;
    
    if (!enemy.isAlive) {
      el.classList.add('dead');
    } else {
      el.addEventListener('click', () => {
        if (this.battleManager && this.battleManager.isPlayerTurn()) {
          const state = this.battleManager.getState();
          if (state.selectedSkill) {
            this.battleManager.useSkillOnTarget(enemy);
          }
        }
      });
    }
    
    return el;
  }

  private createBattleCharacterElement(char: Character, isActive: boolean): HTMLElement {
    const el = document.createElement('div');
    el.className = 'battle-character';
    el.dataset.charId = char.id;
    
    if (isActive) {
      el.classList.add('active');
    }
    if (!char.isAlive) {
      el.classList.add('dead');
    }
    
    const hpPercent = char.getHpPercentage() * 100;
    const mpPercent = char.getMpPercentage() * 100;
    const hpColor = hpPercent < 30 ? '#e74c3c' : '#2ecc71';
    const color = CLASS_COLORS[char.class];
    const initial = CLASS_INITIALS[char.class];
    
    el.innerHTML = `
      <div class="battle-char-avatar" style="background-color: ${color}">${initial}</div>
      <div class="battle-char-name">${char.name}</div>
      <div class="battle-char-hp-bar">
        <div class="battle-char-hp-fill" style="width: ${hpPercent}%; background: ${hpColor}"></div>
      </div>
      <div class="battle-char-mp-bar">
        <div class="battle-char-mp-fill" style="width: ${mpPercent}%"></div>
      </div>
    `;
    
    el.addEventListener('click', () => {
      if (this.battleManager && this.battleManager.isPlayerTurn() && isActive) {
        this.showSkillPanel(char);
      }
    });
    
    return el;
  }

  private showSkillPanel(char: Character): void {
    this.skillListEl.innerHTML = '';
    
    for (const skill of char.skills) {
      const skillEl = document.createElement('div');
      skillEl.className = 'skill-btn';
      
      const canUse = char.canUseSkill(skill.id);
      if (!canUse) {
        skillEl.classList.add('disabled');
      }
      
      skillEl.innerHTML = `
        <div class="skill-name">${skill.name}</div>
        <div class="skill-info">
          <span>MP: ${skill.manaCost}</span>
          ${skill.cooldown > 0 ? `<span>CD: ${skill.currentCooldown}/${skill.cooldown}</span>` : ''}
        </div>
        <div class="skill-desc">${skill.description}</div>
      `;
      
      if (canUse) {
        skillEl.addEventListener('click', () => {
          if (this.battleManager) {
            this.battleManager.selectSkill(skill, char);
            
            if (skill.target === 'self' || (skill.type === 'heal' && skill.target === 'single')) {
              this.battleManager.useSkillOnTarget(char);
              this.hideSkillPanel();
            } else if (skill.type === 'heal' && skill.target === 'all') {
              this.battleManager.useSkillOnTarget(char);
              this.hideSkillPanel();
            } else if (skill.target === 'all') {
              const firstEnemy = this.battleManager.getState().enemies.find(e => e.isAlive);
              if (firstEnemy) {
                this.battleManager.useSkillOnTarget(firstEnemy);
              }
              this.hideSkillPanel();
            }
          }
        });
      }
      
      this.skillListEl.appendChild(skillEl);
    }
    
    this.skillPanel.classList.remove('hidden');
  }

  public hideSkillPanel(): void {
    this.skillPanel.classList.add('hidden');
  }

  public showLootScreen(loot: LootItem[]): void {
    let lootHtml = '<h3>战利品</h3><div class="loot-list">';
    
    for (const lootItem of loot) {
      const color = RARITY_COLORS[lootItem.item.rarity];
      lootHtml += `
        <div class="loot-item" style="border-color: ${color}">
          <div class="loot-item-name" style="color: ${color}">${lootItem.item.name}</div>
          <div class="loot-item-type">${this.getSlotName(lootItem.item.slot)}</div>
        </div>
      `;
    }
    
    lootHtml += '</div><button class="game-btn" id="loot-ok-btn">确定</button>';
    
    this.showEventModal('战斗胜利！', '', '', null);
    this.eventDesc.innerHTML = lootHtml;
    
    document.getElementById('loot-ok-btn')?.addEventListener('click', () => {
      this.hideEventModal();
    });
  }

  private getSlotName(slot: EquipmentSlot): string {
    const names: Record<EquipmentSlot, string> = {
      [EquipmentSlot.WEAPON]: '武器',
      [EquipmentSlot.ARMOR]: '防具',
      [EquipmentSlot.ACCESSORY]: '饰品'
    };
    return names[slot];
  }

  public playTransition(callback: () => void): void {
    this.transitionOverlay.classList.add('active');
    
    setTimeout(() => {
      callback();
      setTimeout(() => {
        this.transitionOverlay.classList.remove('active');
      }, 150);
    }, 150);
  }

  public updateUI(): void {
    this.renderMiniMap();
    this.updatePartyPanel();
  }
}
