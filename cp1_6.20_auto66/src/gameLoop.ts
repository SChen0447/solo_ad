import {
  DungeonData,
  Monster,
  Treasure,
  FightResponse,
  GenerateLevelRequest,
  ApiError,
} from './backendClient';
import { backendClient } from './backendClient';
import { Player } from './player';
import { Renderer, Particle, RenderState } from './renderer';

const TARGET_FPS = 30;
const FRAME_TIME = 1000 / TARGET_FPS;
const WARNING_INTERVAL = 60;

class GameLoop {
  private canvas: HTMLCanvasElement;
  private renderer: Renderer;
  private player: Player;
  
  private dungeon: DungeonData | null = null;
  private monsters: Monster[] = [];
  private treasures: Treasure[] = [];
  
  private animationFrameId: number | null = null;
  private lastFrameTime: number = 0;
  private lastWarningTime: number = 0;
  private gameStartTime: number = 0;
  private elapsedTime: number = 0;
  private floorStartTime: number = 0;
  
  private isRunning: boolean = false;
  private gameOver: boolean = false;
  private victory: boolean = false;
  private isGenerating: boolean = false;
  
  private particles: Particle[] = [];
  private bleedingMonsters: Map<string, number> = new Map();
  
  private keysPressed: Set<string> = new Set();
  private pendingDirection: 'up' | 'down' | 'left' | 'right' | null = null;
  private pendingAttack: boolean = false;
  
  private exitBlinkPhase: number = 0;
  private lowHealthBlinkPhase: number = 0;
  private warningBorderActive: boolean = false;
  private warningBorderTimer: number = 0;
  
  private uiElements: {
    timer: HTMLElement;
    hpText: HTMLElement;
    attackText: HTMLElement;
    floorInfo: HTMLElement;
    heartIcon: HTMLElement;
    warningBorder: HTMLElement;
    gameOverOverlay: HTMLElement;
    gameOverTitle: HTMLElement;
    finalFloor: HTMLElement;
    finalTreasures: HTMLElement;
    finalTime: HTMLElement;
    finalHp: HTMLElement;
    finalScore: HTMLElement;
    loadingOverlay: HTMLElement;
    newDungeonBtn: HTMLElement;
    restartBtn: HTMLElement;
  } | null = null;

  constructor() {
    const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    if (!canvas) {
      throw new Error('找不到Canvas元素');
    }
    this.canvas = canvas;
    this.renderer = new Renderer(canvas);
    this.player = new Player();
    
    this.initUI();
    this.bindEvents();
  }

  private initUI(): void {
    this.uiElements = {
      timer: document.getElementById('timer')!,
      hpText: document.getElementById('hpText')!,
      attackText: document.getElementById('attackText')!,
      floorInfo: document.getElementById('floorInfo')!,
      heartIcon: document.getElementById('heartIcon')!,
      warningBorder: document.getElementById('warningBorder')!,
      gameOverOverlay: document.getElementById('gameOverOverlay')!,
      gameOverTitle: document.getElementById('gameOverTitle')!,
      finalFloor: document.getElementById('finalFloor')!,
      finalTreasures: document.getElementById('finalTreasures')!,
      finalTime: document.getElementById('finalTime')!,
      finalHp: document.getElementById('finalHp')!,
      finalScore: document.getElementById('finalScore')!,
      loadingOverlay: document.getElementById('loadingOverlay')!,
      newDungeonBtn: document.getElementById('newDungeonBtn')!,
      restartBtn: document.getElementById('restartBtn')!,
    };
  }

  private bindEvents(): void {
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
    window.addEventListener('keyup', this.handleKeyUp.bind(this));
    window.addEventListener('resize', this.handleResize.bind(this));
    
    const dpadBtns = document.querySelectorAll('.dpad-btn');
    dpadBtns.forEach((btn) => {
      btn.addEventListener('touchstart', this.handleDpadTouch.bind(this));
      btn.addEventListener('click', this.handleDpadClick.bind(this));
    });
    
    const attackBtn = document.getElementById('attackBtn');
    if (attackBtn) {
      attackBtn.addEventListener('touchstart', this.handleAttackTouch.bind(this));
      attackBtn.addEventListener('click', this.handleAttackClick.bind(this));
    }
    
    if (this.uiElements) {
      this.uiElements.newDungeonBtn.addEventListener('click', this.generateNewDungeon.bind(this));
      this.uiElements.restartBtn.addEventListener('click', this.restartGame.bind(this));
    }
    
    this.canvas.addEventListener('click', this.handleCanvasClick.bind(this));
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (this.gameOver || this.isGenerating) return;
    
    const key = e.key.toLowerCase();
    this.keysPressed.add(key);
    
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
      e.preventDefault();
      const direction = this.keyToDirection(key);
      if (direction && !this.pendingDirection) {
        this.pendingDirection = direction;
      }
    }
    
    if (key === ' ' || key === 'spacebar') {
      e.preventDefault();
      if (!this.pendingAttack) {
        this.pendingAttack = true;
      }
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    const key = e.key.toLowerCase();
    this.keysPressed.delete(key);
  }

  private keyToDirection(key: string): 'up' | 'down' | 'left' | 'right' | null {
    switch (key) {
      case 'w':
      case 'arrowup':
        return 'up';
      case 's':
      case 'arrowdown':
        return 'down';
      case 'a':
      case 'arrowleft':
        return 'left';
      case 'd':
      case 'arrowright':
        return 'right';
      default:
        return null;
    }
  }

  private handleDpadTouch(e: Event): void {
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;
    const direction = target.dataset.direction as 'up' | 'down' | 'left' | 'right';
    if (direction && !this.pendingDirection) {
      this.pendingDirection = direction;
    }
  }

  private handleDpadClick(e: Event): void {
    const target = e.currentTarget as HTMLElement;
    const direction = target.dataset.direction as 'up' | 'down' | 'left' | 'right';
    if (direction && !this.pendingDirection) {
      this.pendingDirection = direction;
    }
  }

  private handleAttackTouch(e: Event): void {
    e.preventDefault();
    if (!this.pendingAttack) {
      this.pendingAttack = true;
    }
  }

  private handleAttackClick(): void {
    if (!this.pendingAttack) {
      this.pendingAttack = true;
    }
  }

  private handleCanvasClick(e: MouseEvent): void {
    if (this.gameOver || this.isGenerating || !this.dungeon) return;
    
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const cellSize = this.canvas.width / 10;
    const gridX = Math.floor(x / cellSize);
    const gridY = Math.floor(y / cellSize);
    
    const playerPos = this.player.state.position;
    const dx = gridX - playerPos.x;
    const dy = gridY - playerPos.y;
    
    for (const monster of this.monsters) {
      if (monster.hp > 0 && monster.position.x === gridX && monster.position.y === gridY) {
        if (this.player.isAdjacentToMonster(monster)) {
          this.pendingAttack = true;
          return;
        }
      }
    }
    
    if (Math.abs(dx) + Math.abs(dy) === 1) {
      if (dx === 1) this.pendingDirection = 'right';
      else if (dx === -1) this.pendingDirection = 'left';
      else if (dy === 1) this.pendingDirection = 'down';
      else if (dy === -1) this.pendingDirection = 'up';
    }
  }

  private handleResize(): void {
    this.renderer.updateCanvasSize();
  }

  public async start(): Promise<void> {
    await this.generateNewDungeon();
    this.gameStartTime = performance.now();
    this.floorStartTime = this.gameStartTime;
    this.isRunning = true;
    this.lastFrameTime = performance.now();
    this.gameLoop();
  }

  private async generateNewDungeon(): Promise<void> {
    if (this.isGenerating) return;
    
    this.isGenerating = true;
    this.showLoading(true);
    
    try {
      const request: GenerateLevelRequest = {
        difficulty: 1,
        floor: this.player.state.floor,
      };
      
      const dungeon = await backendClient.generateLevel(request);
      this.dungeon = dungeon;
      this.monsters = [...dungeon.monsters];
      this.treasures = dungeon.treasures.map((t) => ({ ...t }));
      
      this.player.setPosition(dungeon.entrance);
      this.floorStartTime = performance.now();
      this.lastWarningTime = 0;
      this.particles = [];
      this.bleedingMonsters.clear();
      
      this.updateUI();
    } catch (error) {
      console.error('生成地牢失败:', error);
      this.handleApiError(error as ApiError);
    } finally {
      this.isGenerating = false;
      this.showLoading(false);
    }
  }

  private handleApiError(error: ApiError): void {
    alert(`错误: ${error.message}\n\n请确保后端服务已启动 (python server/app.py)`);
  }

  private showLoading(show: boolean): void {
    if (this.uiElements) {
      if (show) {
        this.uiElements.loadingOverlay.classList.remove('hidden');
      } else {
        this.uiElements.loadingOverlay.classList.add('hidden');
      }
    }
  }

  private gameLoop(): void {
    if (!this.isRunning) return;
    
    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastFrameTime;
    
    if (deltaTime >= FRAME_TIME) {
      this.lastFrameTime = currentTime - (deltaTime % FRAME_TIME);
      
      if (!this.gameOver && !this.isGenerating) {
        this.update(deltaTime, currentTime);
      }
      
      this.render(currentTime);
    }
    
    this.animationFrameId = requestAnimationFrame(this.gameLoop.bind(this));
  }

  private update(deltaTime: number, currentTime: number): void {
    if (!this.dungeon) return;
    
    this.elapsedTime = (currentTime - this.gameStartTime) / 1000;
    const floorElapsedTime = (currentTime - this.floorStartTime) / 1000;
    
    if (Math.floor(floorElapsedTime / WARNING_INTERVAL) > Math.floor(this.lastWarningTime / WARNING_INTERVAL)) {
      this.triggerWarning();
    }
    this.lastWarningTime = floorElapsedTime;
    
    this.exitBlinkPhase = (currentTime / 500) % 1;
    this.lowHealthBlinkPhase = (currentTime / 250) % 1;
    
    if (this.warningBorderActive) {
      this.warningBorderTimer -= deltaTime;
      if (this.warningBorderTimer <= 0) {
        this.warningBorderActive = false;
        this.hideWarningBorder();
      }
    }
    
    this.player.updateMoveAnimation(currentTime);
    this.player.updateAttackAnimation(currentTime);
    this.player.updateCollectAnimation(currentTime);
    
    this.processInput(currentTime);
    
    this.updateBleedingEffects(deltaTime);
    
    this.particles = this.renderer.updateParticles(this.particles, deltaTime);
    
    const treasure = this.player.checkTreasureCollection(this.treasures, currentTime);
    if (treasure) {
      this.collectTreasure(treasure, currentTime);
    }
    
    if (this.player.isOnExit(this.dungeon.exit)) {
      this.nextFloor();
    }
    
    if (this.player.isDead()) {
      this.endGame(false);
    }
    
    this.updateUI();
  }

  private processInput(currentTime: number): void {
    if (!this.dungeon) return;
    
    if (this.pendingDirection) {
      const direction = this.pendingDirection;
      this.pendingDirection = null;
      
      if (this.player.canMove(direction, this.dungeon.grid, this.monsters, currentTime)) {
        this.player.move(direction, currentTime);
      }
    }
    
    if (this.pendingAttack) {
      this.pendingAttack = false;
      
      const targetMonster = this.player.getAdjacentMonster(this.monsters);
      if (targetMonster) {
        this.performAttack(targetMonster, currentTime);
      }
    }
  }

  private async performAttack(monster: Monster, currentTime: number): Promise<void> {
    try {
      const response = await this.player.attack(monster, currentTime);
      if (!response) return;
      
      this.applyFightResult(monster, response, currentTime);
    } catch (error) {
      console.error('攻击失败:', error);
    }
  }

  private applyFightResult(monster: Monster, response: FightResponse, currentTime: number): void {
    monster.hp = response.monsterHp;
    this.bleedingMonsters.set(monster.id, 300);
    
    if (response.monsterDefeated) {
      const deathParticles = this.renderer.createDeathParticles(monster.position);
      this.particles.push(...deathParticles);
    }
    
    if (response.playerDefeated) {
      this.endGame(false);
    }
  }

  private updateBleedingEffects(deltaTime: number): void {
    for (const [monsterId, time] of this.bleedingMonsters.entries()) {
      const newTime = time - deltaTime;
      if (newTime <= 0) {
        this.bleedingMonsters.delete(monsterId);
      } else {
        this.bleedingMonsters.set(monsterId, newTime);
      }
    }
  }

  private collectTreasure(treasure: Treasure, currentTime: number): void {
    treasure.collected = true;
    this.player.collectTreasure(treasure, currentTime);
  }

  private nextFloor(): void {
    const timeBonus = Math.max(0, 300 - Math.floor(this.elapsedTime)) * 10;
    this.player.state.score += timeBonus;
    this.player.nextFloor();
    this.generateNewDungeon();
  }

  private endGame(victory: boolean): void {
    this.gameOver = true;
    this.victory = victory;
    this.isRunning = false;
    
    this.showGameOver(victory);
  }

  private showGameOver(victory: boolean): void {
    if (!this.uiElements) return;
    
    const finalScore = this.player.calculateScore(0);
    
    this.uiElements.gameOverTitle.textContent = victory ? '恭喜通关！' : '游戏结束';
    this.uiElements.gameOverTitle.className = `game-over-title ${victory ? 'victory-title' : ''}`;
    this.uiElements.finalFloor.textContent = this.player.state.floor.toString();
    this.uiElements.finalTreasures.textContent = this.player.state.treasuresCollected.toString();
    this.uiElements.finalTime.textContent = this.formatTime(this.elapsedTime);
    this.uiElements.finalHp.textContent = `${this.player.state.hp}/${this.player.state.maxHp}`;
    this.uiElements.finalScore.textContent = finalScore.toString();
    
    this.uiElements.gameOverOverlay.classList.add('show');
  }

  private restartGame(): void {
    if (this.uiElements) {
      this.uiElements.gameOverOverlay.classList.remove('show');
    }
    
    this.player.reset();
    this.gameOver = false;
    this.victory = false;
    this.elapsedTime = 0;
    this.gameStartTime = performance.now();
    
    this.start();
  }

  private triggerWarning(): void {
    this.warningBorderActive = true;
    this.warningBorderTimer = 1000;
    this.showWarningBorder();
  }

  private showWarningBorder(): void {
    if (this.uiElements) {
      this.uiElements.warningBorder.classList.add('active');
      setTimeout(() => {
        if (this.uiElements) {
          this.uiElements.warningBorder.classList.remove('active');
        }
      }, 1000);
    }
  }

  private hideWarningBorder(): void {
    if (this.uiElements) {
      this.uiElements.warningBorder.classList.remove('active');
    }
  }

  private updateUI(): void {
    if (!this.uiElements) return;
    
    this.uiElements.timer.textContent = this.formatTime(this.elapsedTime);
    this.uiElements.hpText.textContent = `${this.player.state.hp}/${this.player.state.maxHp}`;
    this.uiElements.attackText.textContent = this.player.state.attack.toString();
    
    const totalTreasures = this.treasures.length;
    this.uiElements.floorInfo.textContent = `楼层: ${this.player.state.floor} | 宝物: ${this.player.state.treasuresCollected}/${totalTreasures}`;
    
    if (this.player.isLowHealth()) {
      this.uiElements.heartIcon.classList.add('heart-beating');
    } else {
      this.uiElements.heartIcon.classList.remove('heart-beating');
    }
  }

  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  private render(currentTime: number): void {
    if (!this.dungeon) return;
    
    const renderState: RenderState = {
      dungeon: this.dungeon,
      player: this.player,
      monsters: this.monsters,
      treasures: this.treasures,
      elapsedTime: this.elapsedTime,
      isInCombat: this.player.state.isAttacking,
      targetMonster: this.player.getAdjacentMonster(this.monsters),
      gameOver: this.gameOver,
      victory: this.victory,
      exitBlinkPhase: this.exitBlinkPhase,
      lowHealthBlinkPhase: this.lowHealthBlinkPhase,
      warningBorderActive: this.warningBorderActive,
      particles: this.particles,
      bleedingMonsters: this.bleedingMonsters,
      collectingTreasureId: this.player.state.collectingTreasureId,
    };
    
    this.renderer.render(renderState, currentTime);
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const game = new GameLoop();
    await game.start();
  } catch (error) {
    console.error('游戏初始化失败:', error);
    alert(`游戏初始化失败: ${error instanceof Error ? error.message : String(error)}`);
  }
});

export default GameLoop;
