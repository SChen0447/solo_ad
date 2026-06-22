import type { GameStats, LogEntry, FormationType, ShipType, Team } from '../types';
import type { SceneManager } from '../scene/sceneManager';

export class UIPanel {
  private container: HTMLElement;
  private sceneManager: SceneManager;
  private leftPanel: HTMLElement;
  private rightPanel: HTMLElement;
  private topBar: HTMLElement;
  private modalOverlay: HTMLElement | null = null;
  private panelCollapsed: boolean = false;

  private playerUnits: number = 0;
  private enemyUnits: number = 0;

  private valueAnimation: {
    playerHealth: { current: number; target: number };
    enemyHealth: { current: number; target: number };
    playerDPS: { current: number; target: number };
    enemyDPS: { current: number; target: number };
  } = {
    playerHealth: { current: 0, target: 0 },
    enemyHealth: { current: 0, target: 0 },
    playerDPS: { current: 0, target: 0 },
    enemyDPS: { current: 0, target: 0 }
  };

  private pulseAnimations: {
    playerHealth: { active: boolean; startTime: number };
    enemyHealth: { active: boolean; startTime: number };
    playerDPS: { active: boolean; startTime: number };
    enemyDPS: { active: boolean; startTime: number };
  } = {
    playerHealth: { active: false, startTime: 0 },
    enemyHealth: { active: false, startTime: 0 },
    playerDPS: { active: false, startTime: 0 },
    enemyDPS: { active: false, startTime: 0 }
  };

  private previousValues: {
    playerHealth: number;
    enemyHealth: number;
    playerDPS: number;
    enemyDPS: number;
  } = {
    playerHealth: 0,
    enemyHealth: 0,
    playerDPS: 0,
    enemyDPS: 0
  };

  constructor(container: HTMLElement, sceneManager: SceneManager) {
    this.container = container;
    this.sceneManager = sceneManager;
    this.leftPanel = document.createElement('div');
    this.rightPanel = document.createElement('div');
    this.topBar = document.createElement('div');

    this.createLeftPanel();
    this.createRightPanel();
    this.createTopBar();
    this.setupEventListeners();
    this.animateNumbers();
  }

  private createLeftPanel(): void {
    this.leftPanel.className = 'left-panel';
    this.leftPanel.style.cssText = `
      position: fixed;
      left: 0;
      top: 80px;
      width: 280px;
      height: calc(100% - 80px);
      background: rgba(10, 14, 39, 0.8);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border-right: 1px solid rgba(74, 158, 255, 0.3);
      padding: 20px;
      z-index: 100;
      transition: width 0.3s ease, transform 0.3s ease;
      overflow-y: auto;
      font-family: 'Roboto', sans-serif;
    `;

    this.leftPanel.innerHTML = `
      <h2 style="font-family: 'Orbitron', sans-serif; color: #4a9eff; margin-bottom: 20px; font-size: 18px; letter-spacing: 2px;">
        指挥中心
      </h2>

      <div class="section" style="margin-bottom: 25px;">
        <h3 style="color: #fff; font-size: 14px; margin-bottom: 12px; opacity: 0.8;">创建舰船</h3>
        <div class="ship-buttons" style="display: flex; flex-direction: column; gap: 10px;">
          <button data-ship="fighter" class="ship-btn" style="
            background: linear-gradient(135deg, rgba(74, 158, 255, 0.2), rgba(74, 158, 255, 0.05));
            border: 1px solid rgba(74, 158, 255, 0.5);
            color: #4a9eff;
            padding: 12px 16px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-family: 'Roboto', sans-serif;
            transition: all 0.2s ease;
            text-align: left;
          ">
            <div style="font-weight: 500;">🚀 战斗机</div>
            <div style="font-size: 11px; opacity: 0.7; margin-top: 4px;">速度: 4 | 生命: 50 | 攻击: 10</div>
          </button>
          <button data-ship="frigate" class="ship-btn" style="
            background: linear-gradient(135deg, rgba(74, 158, 255, 0.2), rgba(74, 158, 255, 0.05));
            border: 1px solid rgba(74, 158, 255, 0.5);
            color: #4a9eff;
            padding: 12px 16px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-family: 'Roboto', sans-serif;
            transition: all 0.2s ease;
            text-align: left;
          ">
            <div style="font-weight: 500;">🛡️ 护卫舰</div>
            <div style="font-size: 11px; opacity: 0.7; margin-top: 4px;">速度: 2.5 | 生命: 150 | 攻击: 25</div>
          </button>
          <button data-ship="command" class="ship-btn" style="
            background: linear-gradient(135deg, rgba(74, 158, 255, 0.2), rgba(74, 158, 255, 0.05));
            border: 1px solid rgba(74, 158, 255, 0.5);
            color: #4a9eff;
            padding: 12px 16px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-family: 'Roboto', sans-serif;
            transition: all 0.2s ease;
            text-align: left;
          ">
            <div style="font-weight: 500;">👑 指挥舰</div>
            <div style="font-size: 11px; opacity: 0.7; margin-top: 4px;">速度: 1.5 | 生命: 300 | 攻击: 40</div>
          </button>
        </div>
      </div>

      <div class="section" style="margin-bottom: 25px;">
        <h3 style="color: #fff; font-size: 14px; margin-bottom: 12px; opacity: 0.8;">编队阵型</h3>
        <div class="formation-buttons" style="display: flex; flex-direction: column; gap: 8px;">
          <button data-formation="triangle" class="formation-btn" style="
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: #fff;
            padding: 10px 14px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 13px;
            font-family: 'Roboto', sans-serif;
            transition: all 0.2s ease;
            text-align: left;
          ">
            ▲ 三角形阵型
          </button>
          <button data-formation="wedge" class="formation-btn" style="
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: #fff;
            padding: 10px 14px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 13px;
            font-family: 'Roboto', sans-serif;
            transition: all 0.2s ease;
            text-align: left;
          ">
            ⋀ 雁形阵型
          </button>
          <button data-formation="column" class="formation-btn" style="
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: #fff;
            padding: 10px 14px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 13px;
            font-family: 'Roboto', sans-serif;
            transition: all 0.2s ease;
            text-align: left;
          ">
            ❘❘❘ 纵队阵型
          </button>
        </div>
      </div>

      <div class="section" style="margin-bottom: 25px;">
        <h3 style="color: #fff; font-size: 14px; margin-bottom: 12px; opacity: 0.8;">操作说明</h3>
        <div style="font-size: 12px; color: rgba(255, 255, 255, 0.6); line-height: 1.8;">
          <p>• 左键点击/拖拽选择舰船</p>
          <p>• Shift+点击添加到选择</p>
          <p>• 右键点击移动编队</p>
          <p>• 舰船自动攻击范围内敌人</p>
        </div>
      </div>

      <div class="section">
        <h3 style="color: #fff; font-size: 14px; margin-bottom: 12px; opacity: 0.8;">已选择: <span id="selected-count">0</span> 艘</h3>
      </div>
    `;

    this.container.appendChild(this.leftPanel);

    const buttons = this.leftPanel.querySelectorAll('.ship-btn, .formation-btn');
    buttons.forEach(btn => {
      btn.addEventListener('mouseenter', () => {
        (btn as HTMLElement).style.background = 'rgba(74, 158, 255, 0.3)';
        (btn as HTMLElement).style.transform = 'translateX(4px)';
      });
      btn.addEventListener('mouseleave', () => {
        if (!btn.classList.contains('active')) {
          (btn as HTMLElement).style.background = btn.classList.contains('ship-btn')
            ? 'linear-gradient(135deg, rgba(74, 158, 255, 0.2), rgba(74, 158, 255, 0.05))'
            : 'rgba(255, 255, 255, 0.05)';
        }
        (btn as HTMLElement).style.transform = 'translateX(0)';
      });
    });
  }

  private createRightPanel(): void {
    this.rightPanel.className = 'right-panel';
    this.rightPanel.style.cssText = `
      position: fixed;
      right: 0;
      top: 80px;
      width: 300px;
      height: calc(100% - 80px);
      background: rgba(10, 14, 39, 0.8);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border-left: 1px solid rgba(255, 74, 74, 0.3);
      padding: 20px;
      z-index: 100;
      font-family: 'Roboto', sans-serif;
    `;

    this.rightPanel.innerHTML = `
      <h2 style="font-family: 'Orbitron', sans-serif; color: #ff4a4a; margin-bottom: 15px; font-size: 18px; letter-spacing: 2px;">
        战斗日志
      </h2>
      <div id="log-container" style="
        height: calc(100% - 50px);
        overflow-y: auto;
        padding-right: 10px;
      "></div>
    `;

    const logContainer = this.rightPanel.querySelector('#log-container') as HTMLElement;
    logContainer.style.scrollbarWidth = 'thin';
    logContainer.style.scrollbarColor = 'rgba(255, 255, 255, 0.3) transparent';

    this.container.appendChild(this.rightPanel);
  }

  private createTopBar(): void {
    this.topBar.className = 'top-bar';
    this.topBar.style.cssText = `
      position: fixed;
      left: 0;
      top: 0;
      width: 100%;
      height: 80px;
      background: rgba(10, 14, 39, 0.9);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      padding: 0 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      z-index: 100;
      font-family: 'Roboto', sans-serif;
    `;

    this.topBar.innerHTML = `
      <div style="display: flex; align-items: center; gap: 40px;">
        <h1 style="font-family: 'Orbitron', sans-serif; color: #fff; font-size: 22px; letter-spacing: 3px;">
          ⚔️ 太空舰队对战
        </h1>
        <div class="stats-player" style="display: flex; gap: 30px; align-items: center;">
          <div style="text-align: center;">
            <div style="font-size: 11px; color: rgba(74, 158, 255, 0.7); margin-bottom: 4px;">生命值</div>
            <div id="player-health" style="font-family: 'Orbitron', sans-serif; font-size: 24px; color: #4a9eff; font-weight: 700; display: inline-block; transform-origin: center center; line-height: 1;">0</div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 11px; color: rgba(74, 158, 255, 0.7); margin-bottom: 4px;">存活单位</div>
            <div id="player-units" style="font-family: 'Orbitron', sans-serif; font-size: 24px; color: #4a9eff; font-weight: 700;">0</div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 11px; color: rgba(74, 158, 255, 0.7); margin-bottom: 4px;">DPS</div>
            <div id="player-dps" style="font-family: 'Orbitron', sans-serif; font-size: 24px; color: #4a9eff; font-weight: 700; display: inline-block; transform-origin: center center; line-height: 1;">0</div>
          </div>
        </div>
      </div>

      <div style="width: 2px; height: 50px; background: linear-gradient(to bottom, transparent, rgba(255,255,255,0.3), transparent);"></div>

      <div class="stats-enemy" style="display: flex; gap: 30px; align-items: center;">
        <div style="text-align: center;">
          <div style="font-size: 11px; color: rgba(255, 74, 74, 0.7); margin-bottom: 4px;">DPS</div>
          <div id="enemy-dps" style="font-family: 'Orbitron', sans-serif; font-size: 24px; color: #ff4a4a; font-weight: 700; display: inline-block; transform-origin: center center; line-height: 1;">0</div>
        </div>
        <div style="text-align: center;">
          <div style="font-size: 11px; color: rgba(255, 74, 74, 0.7); margin-bottom: 4px;">存活单位</div>
          <div id="enemy-units" style="font-family: 'Orbitron', sans-serif; font-size: 24px; color: #ff4a4a; font-weight: 700;">0</div>
        </div>
        <div style="text-align: center;">
          <div style="font-size: 11px; color: rgba(255, 74, 74, 0.7); margin-bottom: 4px;">生命值</div>
          <div id="enemy-health" style="font-family: 'Orbitron', sans-serif; font-size: 24px; color: #ff4a4a; font-weight: 700; display: inline-block; transform-origin: center center; line-height: 1;">0</div>
        </div>
      </div>
    `;

    this.container.appendChild(this.topBar);
  }

  private setupEventListeners(): void {
    const shipButtons = this.leftPanel.querySelectorAll('[data-ship]');
    shipButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const shipType = btn.getAttribute('data-ship') as ShipType;
        const canvas = this.sceneManager.getCanvas();
        const x = 150 + Math.random() * 100;
        const y = 200 + Math.random() * (canvas.height - 400);
        this.sceneManager.createShip(shipType, 'player', x, y);
      });
    });

    const formationButtons = this.leftPanel.querySelectorAll('[data-formation]');
    formationButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const formation = btn.getAttribute('data-formation') as FormationType;
        this.sceneManager.setFleetFormation(formation);

        formationButtons.forEach(b => {
          (b as HTMLElement).style.background = 'rgba(255, 255, 255, 0.05)';
          (b as HTMLElement).classList.remove('active');
        });
        (btn as HTMLElement).style.background = 'rgba(74, 158, 255, 0.3)';
        (btn as HTMLElement).classList.add('active');
      });
    });

    window.addEventListener('resize', () => this.handleResize());
    this.handleResize();
  }

  private handleResize(): void {
    if (window.innerWidth <= 1280 && !this.panelCollapsed) {
      this.collapsePanel();
    } else if (window.innerWidth > 1280 && this.panelCollapsed) {
      this.expandPanel();
    }
  }

  private collapsePanel(): void {
    this.panelCollapsed = true;
    this.leftPanel.style.width = '60px';
    this.leftPanel.style.overflow = 'hidden';

    const sections = this.leftPanel.querySelectorAll('.section');
    sections.forEach(s => {
      (s as HTMLElement).style.display = 'none';
    });

    const title = this.leftPanel.querySelector('h2');
    if (title) {
      title.innerHTML = '⚙️';
      title.style.textAlign = 'center';
    }
  }

  private expandPanel(): void {
    this.panelCollapsed = false;
    this.leftPanel.style.width = '280px';
    this.leftPanel.style.overflow = 'auto';

    const sections = this.leftPanel.querySelectorAll('.section');
    sections.forEach(s => {
      (s as HTMLElement).style.display = 'block';
    });

    const title = this.leftPanel.querySelector('h2');
    if (title) {
      title.innerHTML = '指挥中心';
      title.style.textAlign = 'left';
    }
  }

  updateStats(stats: GameStats): void {
    const now = performance.now();
    const newPlayerHealth = stats.player.totalHealth;
    const newEnemyHealth = stats.enemy.totalHealth;
    const newPlayerDPS = stats.player.dps;
    const newEnemyDPS = stats.enemy.dps;

    this.checkAndTriggerPulse('playerHealth', this.previousValues.playerHealth, newPlayerHealth, now);
    this.checkAndTriggerPulse('enemyHealth', this.previousValues.enemyHealth, newEnemyHealth, now);
    this.checkAndTriggerPulse('playerDPS', this.previousValues.playerDPS, newPlayerDPS, now);
    this.checkAndTriggerPulse('enemyDPS', this.previousValues.enemyDPS, newEnemyDPS, now);

    this.previousValues.playerHealth = newPlayerHealth;
    this.previousValues.enemyHealth = newEnemyHealth;
    this.previousValues.playerDPS = newPlayerDPS;
    this.previousValues.enemyDPS = newEnemyDPS;

    this.valueAnimation.playerHealth.target = newPlayerHealth;
    this.valueAnimation.enemyHealth.target = newEnemyHealth;
    this.valueAnimation.playerDPS.target = newPlayerDPS;
    this.valueAnimation.enemyDPS.target = newEnemyDPS;

    this.playerUnits = stats.player.aliveUnits;
    this.enemyUnits = stats.enemy.aliveUnits;

    const selectedCount = this.sceneManager.getSelectedCount();
    const selectedEl = this.leftPanel.querySelector('#selected-count');
    if (selectedEl) {
      selectedEl.textContent = selectedCount.toString();
    }
  }

  private checkAndTriggerPulse(
    key: 'playerHealth' | 'enemyHealth' | 'playerDPS' | 'enemyDPS',
    oldValue: number,
    newValue: number,
    now: number
  ): void {
    if (oldValue === 0 && newValue === 0) return;
    if (oldValue === 0 && newValue > 0) {
      this.pulseAnimations[key].active = true;
      this.pulseAnimations[key].startTime = now;
      return;
    }

    const changePercent = Math.abs((newValue - oldValue) / oldValue);
    if (changePercent >= 0.2) {
      this.pulseAnimations[key].active = true;
      this.pulseAnimations[key].startTime = now;
    }
  }

  private animateNumbers(): void {
    const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);
    const lerp = (start: number, end: number, t: number) => start + (end - start) * t;

    const update = () => {
      const now = performance.now();
      const smoothFactor = 0.15;

      this.valueAnimation.playerHealth.current = lerp(
        this.valueAnimation.playerHealth.current,
        this.valueAnimation.playerHealth.target,
        easeOutCubic(smoothFactor)
      );
      this.valueAnimation.enemyHealth.current = lerp(
        this.valueAnimation.enemyHealth.current,
        this.valueAnimation.enemyHealth.target,
        easeOutCubic(smoothFactor)
      );
      this.valueAnimation.playerDPS.current = lerp(
        this.valueAnimation.playerDPS.current,
        this.valueAnimation.playerDPS.target,
        easeOutCubic(smoothFactor)
      );
      this.valueAnimation.enemyDPS.current = lerp(
        this.valueAnimation.enemyDPS.current,
        this.valueAnimation.enemyDPS.target,
        easeOutCubic(smoothFactor)
      );

      const playerHealthEl = this.topBar.querySelector('#player-health');
      const enemyHealthEl = this.topBar.querySelector('#enemy-health');
      const playerUnitsEl = this.topBar.querySelector('#player-units');
      const enemyUnitsEl = this.topBar.querySelector('#enemy-units');
      const playerDpsEl = this.topBar.querySelector('#player-dps');
      const enemyDpsEl = this.topBar.querySelector('#enemy-dps');

      if (playerHealthEl) {
        playerHealthEl.textContent = Math.round(this.valueAnimation.playerHealth.current).toString();
        this.applyPulseTransform(playerHealthEl, 'playerHealth', now);
      }
      if (enemyHealthEl) {
        enemyHealthEl.textContent = Math.round(this.valueAnimation.enemyHealth.current).toString();
        this.applyPulseTransform(enemyHealthEl, 'enemyHealth', now);
      }
      if (playerDpsEl) {
        playerDpsEl.textContent = Math.round(this.valueAnimation.playerDPS.current).toString();
        this.applyPulseTransform(playerDpsEl, 'playerDPS', now);
      }
      if (enemyDpsEl) {
        enemyDpsEl.textContent = Math.round(this.valueAnimation.enemyDPS.current).toString();
        this.applyPulseTransform(enemyDpsEl, 'enemyDPS', now);
      }

      if (playerUnitsEl) playerUnitsEl.textContent = this.playerUnits.toString();
      if (enemyUnitsEl) enemyUnitsEl.textContent = this.enemyUnits.toString();

      requestAnimationFrame(() => update());
    };

    update();
  }

  private applyPulseTransform(
    element: Element,
    key: 'playerHealth' | 'enemyHealth' | 'playerDPS' | 'enemyDPS',
    now: number
  ): void {
    const pulse = this.pulseAnimations[key];
    if (!pulse.active) {
      (element as HTMLElement).style.transform = 'scale(1)';
      return;
    }

    const pulseDuration = 300;
    const elapsed = now - pulse.startTime;

    if (elapsed >= pulseDuration) {
      pulse.active = false;
      (element as HTMLElement).style.transform = 'scale(1)';
      return;
    }

    const progress = elapsed / pulseDuration;
    const scale = this.calculatePulseScale(progress);
    (element as HTMLElement).style.transform = `scale(${scale})`;
    (element as HTMLElement).style.transition = 'none';
  }

  private calculatePulseScale(progress: number): number {
    const peakPoint = 0.3;
    const maxScale = 1.2;

    if (progress <= peakPoint) {
      const t = progress / peakPoint;
      return 1 + (maxScale - 1) * easeOutBack(t);
    } else {
      const t = (progress - peakPoint) / (1 - peakPoint);
      return maxScale - (maxScale - 1) * easeOutCubic(t);
    }

    function easeOutBack(t: number): number {
      const c1 = 1.70158;
      const c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    }

    function easeOutCubic(t: number): number {
      return 1 - Math.pow(1 - t, 3);
    }
  }

  updateLogs(logs: LogEntry[]): void {
    const container = this.rightPanel.querySelector('#log-container');
    if (!container) return;

    container.innerHTML = '';

    logs.slice(-50).forEach(log => {
      const entry = document.createElement('div');
      const time = new Date(log.timestamp);
      const timeStr = time.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      let color = '#fff';
      if (log.team === 'player') color = '#4a9eff';
      else if (log.team === 'enemy') color = '#ff4a4a';
      else color = '#fbbf24';

      entry.style.cssText = `
        padding: 8px 10px;
        margin-bottom: 6px;
        background: rgba(255, 255, 255, 0.03);
        border-radius: 4px;
        border-left: 2px solid ${color};
        font-size: 12px;
        line-height: 1.4;
        animation: fadeIn 0.3s ease;
      `;

      entry.innerHTML = `
        <span style="color: ${color}; font-family: 'Orbitron', monospace; font-size: 11px;">[${timeStr}]</span>
        <span style="color: rgba(255, 255, 255, 0.9); margin-left: 8px;">${log.message}</span>
      `;

      container.appendChild(entry);
    });

    container.scrollTop = container.scrollHeight;
  }

  showGameOver(winner: Team, stats: GameStats): void {
    if (this.modalOverlay) {
      this.modalOverlay.remove();
    }

    this.modalOverlay = document.createElement('div');
    this.modalOverlay.style.cssText = `
      position: fixed;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      animation: fadeIn 0.5s ease;
    `;

    const isVictory = winner === 'player';
    const duration = Math.floor((Date.now() - stats.startTime) / 1000);
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;

    this.modalOverlay.innerHTML = `
      <div style="
        background: linear-gradient(135deg, rgba(10, 14, 39, 0.95), rgba(20, 26, 59, 0.95));
        border: 2px solid ${isVictory ? '#4a9eff' : '#ff4a4a'};
        border-radius: 16px;
        padding: 40px 60px;
        text-align: center;
        max-width: 500px;
        box-shadow: 0 0 60px ${isVictory ? 'rgba(74, 158, 255, 0.4)' : 'rgba(255, 74, 74, 0.4)'};
        animation: scaleIn 0.5s ease;
      ">
        <h1 style="
          font-family: 'Orbitron', sans-serif;
          font-size: 48px;
          color: ${isVictory ? '#4a9eff' : '#ff4a4a'};
          margin-bottom: 20px;
          letter-spacing: 4px;
          text-shadow: 0 0 20px ${isVictory ? 'rgba(74, 158, 255, 0.8)' : 'rgba(255, 74, 74, 0.8)'};
        ">
          ${isVictory ? '🎉 胜利！' : '💀 失败'}
        </h1>

        <div style="margin: 30px 0; text-align: left;">
          <h3 style="color: #fff; font-size: 16px; margin-bottom: 15px; opacity: 0.9;">战斗统计</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 14px;">
            <div style="color: rgba(255, 255, 255, 0.7);">战斗时长:</div>
            <div style="color: #fff; font-family: 'Orbitron', monospace;">${minutes}分${seconds}秒</div>
            <div style="color: rgba(74, 158, 255, 0.7);">己方击杀:</div>
            <div style="color: #4a9eff; font-family: 'Orbitron', monospace;">${stats.playerKills}</div>
            <div style="color: rgba(255, 74, 74, 0.7);">敌方击杀:</div>
            <div style="color: #ff4a4a; font-family: 'Orbitron', monospace;">${stats.enemyKills}</div>
            <div style="color: rgba(74, 158, 255, 0.7);">己方存活:</div>
            <div style="color: #4a9eff; font-family: 'Orbitron', monospace;">${stats.player.aliveUnits}</div>
            <div style="color: rgba(255, 74, 74, 0.7);">敌方存活:</div>
            <div style="color: #ff4a4a; font-family: 'Orbitron', monospace;">${stats.enemy.aliveUnits}</div>
          </div>
        </div>

        <button id="restart-btn" style="
          background: linear-gradient(135deg, ${isVictory ? '#4a9eff' : '#ff4a4a'}, ${isVictory ? '#2563eb' : '#dc2626'});
          border: none;
          color: white;
          padding: 14px 40px;
          font-size: 16px;
          font-family: 'Orbitron', sans-serif;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s ease;
          letter-spacing: 2px;
          margin-top: 20px;
        ">
          🔄 重新开始
        </button>
      </div>
    `;

    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      @keyframes scaleIn { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      #restart-btn:hover { transform: scale(1.05); box-shadow: 0 0 30px ${isVictory ? 'rgba(74, 158, 255, 0.6)' : 'rgba(255, 74, 74, 0.6)'}; }
    `;
    this.modalOverlay.appendChild(style);

    this.container.appendChild(this.modalOverlay);

    const restartBtn = this.modalOverlay.querySelector('#restart-btn');
    if (restartBtn) {
      restartBtn.addEventListener('click', () => {
        this.restartGame();
      });
    }
  }

  private restartGame(): void {
    if (this.modalOverlay) {
      this.modalOverlay.remove();
      this.modalOverlay = null;
    }

    this.sceneManager.restart();

    this.valueAnimation = {
      playerHealth: { current: 0, target: 0 },
      enemyHealth: { current: 0, target: 0 },
      playerDPS: { current: 0, target: 0 },
      enemyDPS: { current: 0, target: 0 }
    };

    this.pulseAnimations = {
      playerHealth: { active: false, startTime: 0 },
      enemyHealth: { active: false, startTime: 0 },
      playerDPS: { active: false, startTime: 0 },
      enemyDPS: { active: false, startTime: 0 }
    };

    this.previousValues = {
      playerHealth: 0,
      enemyHealth: 0,
      playerDPS: 0,
      enemyDPS: 0
    };

    const logContainer = this.rightPanel.querySelector('#log-container');
    if (logContainer) {
      logContainer.innerHTML = '';
    }

    this.initDefaultShips();
  }

  initDefaultShips(): void {
    const canvas = this.sceneManager.getCanvas();

    for (let i = 0; i < 6; i++) {
      const x = 150 + Math.random() * 100;
      const y = 150 + i * 80;
      const type: ShipType = i < 3 ? 'fighter' : i < 5 ? 'frigate' : 'command';
      this.sceneManager.createShip(type, 'player', x, y);
    }

    for (let i = 0; i < 6; i++) {
      const x = canvas.width - 150 - Math.random() * 100;
      const y = 150 + i * 80;
      const type: ShipType = i < 3 ? 'fighter' : i < 5 ? 'frigate' : 'command';
      this.sceneManager.createShip(type, 'enemy', x, y);
    }
  }
}
