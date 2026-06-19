import {
  GameState, Formation, Side, ShipType,
  CANVAS_HEIGHT, FORMATION_NAMES,
  SHATTER_ANIMATION_DURATION, SHIP_COLORS, SHIP_SIZES
} from './types';
import { Renderer } from './Renderer';
import { InputHandler } from './InputHandler';
import {
  createFleet, createEnemyFleet, moveFleet, switchFormation,
  activateFocusFire, updateShips, updateProjectiles, updateParticles,
  getFleetHealthPercent, getHealthBarColor, formatTime
} from './ShipManager';

export class GameEngine {
  private renderer: Renderer;
  private inputHandler: InputHandler;
  private state: GameState;
  private lastTime: number = 0;
  private animationId: number = 0;
  private isRunning: boolean = false;

  private uiElements: {
    healthBar: HTMLElement;
    healthText: HTMLElement;
    sinkCount: HTMLElement;
    gameTime: HTMLElement;
    formationName: HTMLElement;
    focusStatus: HTMLElement;
    shipList: HTMLElement;
    shatterOverlay: HTMLElement;
  };

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new Renderer(canvas);
    this.inputHandler = new InputHandler(canvas);

    this.state = this.createInitialState();
    this.uiElements = this.getUIElements();
    this.setupEventHandlers();
    this.updateShipListUI();
  }

  private createInitialState(): GameState {
    const playerShips = createFleet(Side.PLAYER, 150, CANVAS_HEIGHT / 2, Formation.ARROW);
    const enemyShips = createEnemyFleet();

    return {
      currentFormation: Formation.ARROW,
      isFocusFire: false,
      focusFireEndTime: 0,
      targetShipId: null,
      sinkCount: 0,
      gameStartTime: performance.now(),
      playerShips,
      enemyShips,
      projectiles: [],
      particles: [],
      fleetCenterX: 150,
      fleetCenterY: CANVAS_HEIGHT / 2,
      fleetTargetX: 150,
      fleetTargetY: CANVAS_HEIGHT / 2,
      shatterAnimationTime: 0
    };
  }

  private getUIElements() {
    const healthBar = document.getElementById('fleet-health-bar');
    const healthText = document.getElementById('fleet-health-text');
    const sinkCount = document.getElementById('sink-count');
    const gameTime = document.getElementById('game-time');
    const formationName = document.getElementById('formation-name');
    const focusStatus = document.getElementById('focus-status');
    const shipList = document.getElementById('ship-list');
    const shatterOverlay = document.getElementById('shatter-overlay');

    if (!healthBar || !healthText || !sinkCount || !gameTime ||
        !formationName || !focusStatus || !shipList || !shatterOverlay) {
      throw new Error('Missing required UI elements');
    }

    return { healthBar, healthText, sinkCount, gameTime, formationName, focusStatus, shipList, shatterOverlay };
  }

  private setupEventHandlers(): void {
    this.inputHandler.onClick((x, y) => {
      moveFleet(this.state, x, y);
    });

    this.inputHandler.onKeyDown((key) => {
      switch (key) {
        case '1':
          switchFormation(this.state, Formation.ARROW);
          break;
        case '2':
          switchFormation(this.state, Formation.LINE);
          break;
        case '3':
          switchFormation(this.state, Formation.CIRCLE);
          break;
        case ' ':
          activateFocusFire(this.state);
          break;
      }
    });
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.gameLoop();
  }

  stop(): void {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.inputHandler.detach();
  }

  private gameLoop(): void {
    if (!this.isRunning) return;

    const now = performance.now();
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;

    const updateStart = performance.now();
    this.update(dt, now);
    const updateTime = performance.now() - updateStart;

    if (updateTime > 8) {
      console.warn(`Update took ${updateTime.toFixed(2)}ms, exceeds 8ms target`);
    }

    this.render(now);
    this.updateUI(now);

    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private update(dt: number, now: number): void {
    updateShips(this.state, dt, now);
    updateProjectiles(this.state, dt, now);
    updateParticles(this.state, dt, now);

    const alivePlayers = this.state.playerShips.filter(s => !s.isSinking).length;
    const aliveEnemies = this.state.enemyShips.filter(s => !s.isSinking).length;

    if (alivePlayers === 0 || aliveEnemies === 0) {
      this.handleGameEnd(aliveEnemies === 0);
    }
  }

  private render(now: number): void {
    this.renderer.render(this.state, now);
  }

  private updateUI(now: number): void {
    const healthPercent = getFleetHealthPercent(this.state);
    const healthColor = getHealthBarColor(healthPercent);

    this.uiElements.healthBar.style.width = `${healthPercent}%`;
    this.uiElements.healthBar.style.backgroundColor = healthColor;
    this.uiElements.healthText.textContent = `编队生命值: ${healthPercent.toFixed(0)}%`;

    this.uiElements.sinkCount.textContent = this.state.sinkCount.toString();
    this.uiElements.gameTime.textContent = formatTime(now - this.state.gameStartTime);

    this.uiElements.formationName.textContent = FORMATION_NAMES[this.state.currentFormation];

    if (this.state.isFocusFire) {
      const remaining = Math.max(0, Math.ceil((this.state.focusFireEndTime - now) / 1000));
      this.uiElements.focusStatus.textContent = `激活中 (${remaining}s)`;
      this.uiElements.focusStatus.classList.add('focus-active');
    } else {
      this.uiElements.focusStatus.textContent = '未激活';
      this.uiElements.focusStatus.classList.remove('focus-active');
    }

    if (this.state.shatterAnimationTime > 0 && now - this.state.shatterAnimationTime < SHATTER_ANIMATION_DURATION) {
      this.showShatterAnimation();
    }

    this.updateShipListUI();
  }

  private updateShipListUI(): void {
    const ships = [ShipType.DESTROYER, ShipType.CRUISER, ShipType.CRUISER, ShipType.BATTLESHIP, ShipType.BATTLESHIP];

    let html = '';
    for (let i = 0; i < ships.length; i++) {
      const ship = this.state.playerShips[i];
      const isSunk = !ship || ship.isSinking;
      const healthPercent = ship && !ship.isSinking ? (ship.health / ship.maxHealth) * 100 : 0;
      const healthColor = getHealthBarColor(healthPercent);

      html += `
        <div class="ship-list-item ${isSunk ? 'sunk' : ''}">
          <div class="ship-icon ${isSunk ? 'sunk' : ''}">
            <svg width="20" height="20" viewBox="-12 -12 24 24">
              ${this.getShipSvg(ships[i], isSunk ? '#666666' : SHIP_COLORS[ships[i]])}
            </svg>
          </div>
          <div class="ship-mini-health">
            <div class="ship-mini-health-fill" style="width: ${healthPercent}%; background-color: ${healthColor};"></div>
          </div>
        </div>
      `;
    }

    this.uiElements.shipList.innerHTML = html;
  }

  private getShipSvg(type: ShipType, color: string): string {
    const size = SHIP_SIZES[type];
    const w = size.width * 0.7;
    const h = size.height * 0.7;

    switch (type) {
      case ShipType.DESTROYER:
        return `<polygon points="0,${-h/2} ${-w/2},${h/2} ${w/2},${h/2}" fill="${color}" stroke="rgba(255,255,255,0.6)" stroke-width="1"/>`;
      case ShipType.CRUISER:
        return `<polygon points="0,${-h/2} ${-w/2},0 0,${h/2} ${w/2},0" fill="${color}" stroke="rgba(255,255,255,0.6)" stroke-width="1"/>`;
      case ShipType.BATTLESHIP:
        return `<rect x="${-w/2}" y="${-h/2}" width="${w}" height="${h}" rx="3" fill="${color}" stroke="rgba(255,255,255,0.6)" stroke-width="1"/>`;
    }
  }

  private showShatterAnimation(): void {
    const overlay = this.uiElements.shatterOverlay;
    if (overlay.classList.contains('active')) return;

    overlay.classList.add('active');
    overlay.innerHTML = '';

    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    for (let i = 0; i < 8; i++) {
      const angle = (i * 45) * Math.PI / 180;
      const line = document.createElement('div');
      line.className = 'shatter-line';
      line.style.left = `${centerX}px`;
      line.style.top = `${centerY}px`;
      line.style.width = '200px';
      line.style.height = '3px';
      line.style.transform = `translate(-50%, -50%) rotate(${angle}rad)`;
      line.style.animationDelay = `${i * 0.02}s`;
      overlay.appendChild(line);
    }

    setTimeout(() => {
      overlay.classList.remove('active');
      overlay.innerHTML = '';
    }, SHATTER_ANIMATION_DURATION + 100);
  }

  private handleGameEnd(victory: boolean): void {
    this.stop();
    setTimeout(() => {
      const message = victory ? '🎉 胜利！所有敌舰已被击沉！' : '💀 失败！我方舰队已全军覆没...';
      alert(message);
    }, 500);
  }
}
